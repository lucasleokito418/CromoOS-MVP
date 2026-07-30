import { supabase } from './supabase'
import { socketInstances, conectarEmpresa } from './whatsapp'

let isProcessing = false

async function processarFila() {
  if (isProcessing) return
  isProcessing = true

  try {
    const agora = new Date().toISOString()

    // 1. Busca mensagens com status 'pendente' e agendadas para agora ou antes
    const { data: mensagens, error } = await supabase
      .from('fila_envio_whatsapp')
      .select('id, empresa_id, cliente_id, mensagem_renderizada')
      .eq('status', 'pendente')
      .lte('agendado_para', agora)
      .order('agendado_para', { ascending: true })

    if (error) {
      console.error('[QueueProcessor] Erro ao buscar fila de mensagens:', error)
      isProcessing = false
      return
    }

    if (!mensagens || mensagens.length === 0) {
      isProcessing = false
      return
    }

    console.log(`[QueueProcessor] Processando ${mensagens.length} mensagem(ns) pendente(s)...`)

    // Controle de timestamp do último envio de cada empresa para rate-limiting (1 msg/seg por empresa)
    const ultimoEnvioEmpresa = new Map<string, number>()

    for (const msg of mensagens) {
      const empresaId = msg.empresa_id

      const agoraMs = Date.now()
      const ultimo = ultimoEnvioEmpresa.get(empresaId) || 0
      const diferenca = agoraMs - ultimo

      // Se o último envio para esta empresa foi há menos de 1000ms, espera a diferença
      if (diferenca < 1000) {
        const tempoEspera = 1000 - diferenca
        await new Promise((resolve) => setTimeout(resolve, tempoEspera))
      }

      ultimoEnvioEmpresa.set(empresaId, Date.now())

      // Processamento individual do item da fila
      await processarMensagem(msg)
    }

  } catch (err) {
    console.error('[QueueProcessor] Erro no processador de fila:', err)
  } finally {
    isProcessing = false
  }
}

async function processarMensagem(msg: any) {
  const { id, empresa_id, cliente_id, mensagem_renderizada } = msg

  try {
    // 1. Busca dados do cliente para obter telefone e validar opt-in
    const { data: cliente, error: errCli } = await supabase
      .from('clientes')
      .select('whatsapp, whatsapp_opt_in')
      .eq('id', cliente_id)
      .single()

    if (errCli || !cliente) {
      console.error(`[QueueProcessor] Erro ao obter cliente ${cliente_id} para mensagem ${id}:`, errCli)
      await marcarComoFalha(id)
      return
    }

    // Respeita opt-out tardio
    if (cliente.whatsapp_opt_in === false) {
      console.log(`[QueueProcessor] Envio bloqueado: Cliente ${cliente_id} tem whatsapp_opt_in desativado.`)
      await marcarComoFalha(id)
      return
    }

    const telDestino = cliente.whatsapp?.replace(/\D/g, '')
    if (!telDestino) {
      console.error(`[QueueProcessor] WhatsApp de destino ausente/inválido para o cliente ${cliente_id}`)
      await marcarComoFalha(id)
      return
    }

    // 2. Busca conexão ativa do WhatsApp para a empresa correspondente
    const { data: conexao } = await supabase
      .from('conexoes_whatsapp')
      .select('status')
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (!conexao || conexao.status !== 'conectado') {
      console.log(`[QueueProcessor] Empresa ${empresa_id} não possui WhatsApp conectado. Status: ${conexao?.status || 'inexistente'}. Falhando mensagem ${id}`)
      await marcarComoFalha(id)
      return
    }

    // 3. Resgata a conexão Baileys ativa em memória (ou auto-conecta se reiniciado)
    let sock = socketInstances.get(empresa_id)
    if (!sock) {
      console.log(`[QueueProcessor] Recriando conexão Baileys em memória para a empresa ${empresa_id}`)
      try {
        sock = await conectarEmpresa(empresa_id)
      } catch (err) {
        console.error(`[QueueProcessor] Falha ao restabelecer socket para a empresa ${empresa_id}:`, err)
        await marcarComoFalha(id)
        return
      }
    }

    // 4. Envia a mensagem via Baileys
    const jid = `${telDestino}@s.whatsapp.net`
    await sock.sendMessage(jid, { text: mensagem_renderizada })

    // 5. Atualiza o status na fila para 'enviado'
    await supabase
      .from('fila_envio_whatsapp')
      .update({
        status: 'enviado',
        enviado_em: new Date().toISOString()
      })
      .eq('id', id)

    console.log(`[QueueProcessor] Mensagem ${id} enviada com sucesso para ${jid}`)

  } catch (err) {
    console.error(`[QueueProcessor] Falha no processamento de envio da mensagem ${id}:`, err)
    await marcarComoFalha(id)
  }
}

async function marcarComoFalha(id: string) {
  try {
    await supabase
      .from('fila_envio_whatsapp')
      .update({
        status: 'falhou',
        enviado_em: new Date().toISOString()
      })
      .eq('id', id)
  } catch (err) {
    console.error(`[QueueProcessor] Erro ao marcar falha na mensagem ${id}:`, err)
  }
}

export function inicializarQueueProcessor() {
  console.log('[CromoZap] Inicializando processador de fila (10s)...')
  
  // Roda uma vez no início e depois a cada 10 segundos
  processarFila().catch((err) => console.error('[QueueProcessor] Erro no processamento inicial:', err))
  setInterval(() => {
    processarFila().catch((err) => console.error('[QueueProcessor] Erro no processamento periódico:', err))
  }, 10000)
}
