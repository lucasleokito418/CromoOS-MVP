import { supabase } from './supabase'

function renderizarTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '')
  }
  return result
}

function formatarDataHora(dataIso: string | null): string {
  if (!dataIso) return ''
  try {
    const d = new Date(dataIso)
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Fortaleza', // Fuso local do Brasil
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dataIso
  }
}

async function enfileirarMensagem(empresaId: string, gatilho: string, clienteId: string, vars: Record<string, string>) {
  try {
    // 1. Busca se há automação ativa para este gatilho na empresa
    const { data: automacao, error } = await supabase
      .from('automacoes_whatsapp')
      .select('id, template_mensagem')
      .eq('empresa_id', empresaId)
      .eq('gatilho', gatilho)
      .eq('ativo', true)
      .maybeSingle()

    if (error) {
      console.error(`[Listeners] Erro ao buscar automação (${gatilho}) para empresa ${empresaId}:`, error)
      return
    }

    if (!automacao) {
      // Nenhuma automação ativa para este gatilho
      return
    }

    // 2. Renderiza a mensagem
    const mensagemRenderizada = renderizarTemplate(automacao.template_mensagem, vars)

    // 3. Insere a mensagem na fila
    const { error: errInsert } = await supabase
      .from('fila_envio_whatsapp')
      .insert({
        empresa_id: empresaId,
        automacao_id: automacao.id,
        cliente_id: clienteId,
        mensagem_renderizada: mensagemRenderizada,
        status: 'pendente',
        agendado_para: new Date().toISOString()
      })

    if (errInsert) {
      console.error(`[Listeners] Erro ao enfileirar mensagem de ${gatilho}:`, errInsert)
    } else {
      console.log(`[Listeners] Mensagem enfileirada! Gatilho: ${gatilho}, Cliente: ${clienteId}`)
    }
  } catch (err) {
    console.error(`[Listeners] Erro inesperado ao enfileirar mensagem de ${gatilho}:`, err)
  }
}

// Handler: agendamento_criado
async function handleAgendamentoCriado(payload: any) {
  const agendamento = payload.new
  console.log(`[Listeners] Novo agendamento detectado: ${agendamento.id}`)

  try {
    // 1. Busca dados do cliente e valida opt-in
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, whatsapp_opt_in')
      .eq('id', agendamento.cliente_id)
      .single()

    if (!cliente || cliente.whatsapp_opt_in === false) {
      console.log(`[Listeners] Envio cancelado: cliente opt-out ou não encontrado para cliente: ${agendamento.cliente_id}`)
      return
    }

    // 2. Busca nome da empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', agendamento.empresa_id)
      .single()

    // 3. Busca serviços
    const { data: agServicos } = await supabase
      .from('agendamento_servicos')
      .select('servicos(nome)')
      .eq('agendamento_id', agendamento.id)

    const nomesServicos = agServicos
      ?.map((item: any) => item.servicos?.nome)
      .filter(Boolean)
      .join(', ') || ''

    // 4. Busca veículo ou estofado
    let veiculoNome = ''
    let veiculoPlaca = ''

    if (agendamento.veiculo_id) {
      const { data: v } = await supabase
        .from('veiculos')
        .select('marca, modelo, placa')
        .eq('id', agendamento.veiculo_id)
        .single()
      if (v) {
        veiculoNome = `${v.marca} ${v.modelo}`
        veiculoPlaca = v.placa || ''
      }
    } else if (agendamento.estofado_id) {
      const { data: est } = await supabase
        .from('estofados')
        .select('descricao')
        .eq('id', agendamento.estofado_id)
        .single()
      if (est) {
        veiculoNome = est.descricao
      }
    }

    // 5. Monta variáveis
    const vars = {
      nomeCliente: cliente.nome,
      nomeEmpresa: empresa?.nome || '',
      data: formatarDataHora(agendamento.data_inicio),
      servicos: nomesServicos,
      veiculo: veiculoNome,
      placa: veiculoPlaca
    }

    await enfileirarMensagem(agendamento.empresa_id, 'agendamento_criado', agendamento.cliente_id, vars)
  } catch (err) {
    console.error('[Listeners] Erro ao processar agendamento criado:', err)
  }
}

// Handler: orcamento_criado
async function handleOrcamentoCriado(payload: any) {
  const orcamento = payload.new
  console.log(`[Listeners] Novo orçamento detectado: ${orcamento.id}`)

  try {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, whatsapp_opt_in')
      .eq('id', orcamento.cliente_id)
      .single()

    if (!cliente || cliente.whatsapp_opt_in === false) return

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', orcamento.empresa_id)
      .single()

    const { data: orcServicos } = await supabase
      .from('orcamento_servicos')
      .select('servicos(nome)')
      .eq('orcamento_id', orcamento.id)

    const nomesServicos = orcServicos
      ?.map((item: any) => item.servicos?.nome)
      .filter(Boolean)
      .join(', ') || ''

    const vars = {
      nomeCliente: cliente.nome,
      nomeEmpresa: empresa?.nome || '',
      data: formatarDataHora(orcamento.criado_em),
      servicos: nomesServicos,
      veiculo: '',
      placa: ''
    }

    await enfileirarMensagem(orcamento.empresa_id, 'orcamento_criado', orcamento.cliente_id, vars)
  } catch (err) {
    console.error('[Listeners] Erro ao processar orçamento criado:', err)
  }
}

// Handler: vagas_espaco (vaga_ocupada / vaga_liberada)
async function handleVagasEspacoUpdate(payload: any) {
  const oldVaga = payload.old
  const newVaga = payload.new

  if (!oldVaga || !newVaga) return

  let gatilho = ''
  if (oldVaga.status === 'livre' && newVaga.status === 'ocupada') {
    gatilho = 'vaga_ocupada'
  } else if (oldVaga.status === 'ocupada' && newVaga.status === 'livre') {
    // Para vaga_liberada, o veículo/estofado foi limpo no novo registro (newVaga),
    // então precisamos buscar os dados do veículo/estofado a partir do oldVaga.
    gatilho = 'vaga_liberada'
  } else {
    return
  }

  console.log(`[Listeners] Vaga ${newVaga.identificador} alterada para status: ${newVaga.status} (gatilho: ${gatilho})`)

  try {
    const targetVaga = gatilho === 'vaga_liberada' ? oldVaga : newVaga

    let clienteId = ''
    let veiculoNome = ''
    let veiculoPlaca = ''

    if (targetVaga.veiculo_id) {
      const { data: v } = await supabase
        .from('veiculos')
        .select('cliente_id, marca, modelo, placa')
        .eq('id', targetVaga.veiculo_id)
        .single()
      if (v) {
        clienteId = v.cliente_id
        veiculoNome = `${v.marca} ${v.modelo}`
        veiculoPlaca = v.placa || ''
      }
    } else if (targetVaga.estofado_id) {
      const { data: est } = await supabase
        .from('estofados')
        .select('cliente_id, descricao')
        .eq('id', targetVaga.estofado_id)
        .single()
      if (est) {
        clienteId = est.cliente_id
        veiculoNome = est.descricao
      }
    }

    if (!clienteId) return

    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, whatsapp_opt_in')
      .eq('id', clienteId)
      .single()

    if (!cliente || cliente.whatsapp_opt_in === false) return

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', targetVaga.empresa_id)
      .single()

    const vars = {
      nomeCliente: cliente.nome,
      nomeEmpresa: empresa?.nome || '',
      data: formatarDataHora(new Date().toISOString()),
      servicos: '',
      veiculo: veiculoNome,
      placa: veiculoPlaca
    }

    await enfileirarMensagem(targetVaga.empresa_id, gatilho, clienteId, vars)
  } catch (err) {
    console.error('[Listeners] Erro ao processar alteração de vaga:', err)
  }
}

// Handler: venda_concluida
async function handleVendasUpdate(payload: any) {
  const oldVenda = payload.old
  const newVenda = payload.new

  if (!oldVenda || !newVenda) return

  if (oldVenda.status !== 'concluida' && newVenda.status === 'concluida') {
    console.log(`[Listeners] Venda concluída detectada: ${newVenda.id}`)
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('nome, whatsapp_opt_in')
        .eq('id', newVenda.cliente_id)
        .single()

      if (!cliente || cliente.whatsapp_opt_in === false) return

      const { data: empresa } = await supabase
        .from('empresas')
        .select('nome')
        .eq('id', newVenda.empresa_id)
        .single()

      const { data: vServicos } = await supabase
        .from('venda_servicos')
        .select('servicos(nome)')
        .eq('venda_id', newVenda.id)

      const nomesServicos = vServicos
        ?.map((item: any) => item.servicos?.nome)
        .filter(Boolean)
        .join(', ') || ''

      const vars = {
        nomeCliente: cliente.nome,
        nomeEmpresa: empresa?.nome || '',
        data: formatarDataHora(newVenda.criado_em),
        servicos: nomesServicos,
        veiculo: '',
        placa: ''
      }

      await enfileirarMensagem(newVenda.empresa_id, 'venda_concluida', newVenda.cliente_id, vars)
    } catch (err) {
      console.error('[Listeners] Erro ao processar venda concluída:', err)
    }
  }
}

// Handler: autoagendamento_solicitado
async function handleAutoagendamentoSolicitado(payload: any) {
  const solicitacao = payload.new
  console.log(`[Listeners] Nova solicitação de autoagendamento: ${solicitacao.id}`)

  try {
    const telLimpo = solicitacao.telefone.replace(/\D/g, '')

    // Resolve o cliente: busca por telefone ou insere novo cliente
    let clienteId = ''
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id, whatsapp_opt_in')
      .eq('empresa_id', solicitacao.empresa_id)
      .eq('whatsapp', telLimpo)
      .maybeSingle()

    if (clienteExistente) {
      if (clienteExistente.whatsapp_opt_in === false) {
        console.log('[Listeners] Envio de autoagendamento bloqueado por opt-out do cliente existente.')
        return
      }
      clienteId = clienteExistente.id
    } else {
      // Cria cliente automaticamente
      const { data: novoCliente, error: errInsert } = await supabase
        .from('clientes')
        .insert({
          empresa_id: solicitacao.empresa_id,
          nome: solicitacao.nome_solicitante,
          whatsapp: telLimpo,
          origem: 'autoagendamento',
          whatsapp_opt_in: true
        })
        .select('id')
        .single()

      if (errInsert || !novoCliente) {
        console.error('[Listeners] Erro ao criar cliente automático para autoagendamento:', errInsert)
        return
      }
      clienteId = novoCliente.id
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', solicitacao.empresa_id)
      .single()

    const vars = {
      nomeCliente: solicitacao.nome_solicitante,
      nomeEmpresa: empresa?.nome || '',
      data: formatarDataHora(solicitacao.data_desejada),
      servicos: '',
      veiculo: '',
      placa: ''
    }

    await enfileirarMensagem(solicitacao.empresa_id, 'autoagendamento_solicitado', clienteId, vars)
  } catch (err) {
    console.error('[Listeners] Erro ao processar autoagendamento solicitado:', err)
  }
}

export function inicializarListeners() {
  console.log('[CromoZap] Inicializando ouvintes do Supabase Realtime...')

  supabase
    .channel('cromozap-db-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, handleAgendamentoCriado)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orcamentos' }, handleOrcamentoCriado)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vagas_espaco' }, handleVagasEspacoUpdate)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendas' }, handleVendasUpdate)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_autoagendamento' }, handleAutoagendamentoSolicitado)
    .subscribe((status) => {
      console.log(`[CromoZap] Canal Supabase Realtime assinado. Status: ${status}`)
    })
}
