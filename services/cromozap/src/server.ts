import express from 'express'
import dotenv from 'dotenv'
import { supabase } from './supabase'
import { conectarEmpresa, desconectarEmpresa, qrCodes, socketInstances } from './whatsapp'
import { inicializarListeners } from './listeners'
import { inicializarQueueProcessor } from './queue-processor'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001
const internalKey = process.env.CROMOZAP_INTERNAL_KEY || ''

app.use(express.json())

// Middleware de autenticação de chaves internas
app.use((req, res, next) => {
  const incomingKey = req.headers['x-internal-key']
  if (!incomingKey || incomingKey !== internalKey) {
    return res.status(401).json({ error: 'Não autorizado. Chave interna inválida.' })
  }
  next()
})

// GET /empresas/:empresaId/qr → Retorna o QR em base64 ou null
app.get('/empresas/:empresaId/qr', (req, res) => {
  const { empresaId } = req.params
  const qr = qrCodes.get(empresaId) || null
  res.json({ qr })
})

// GET /empresas/:empresaId/status → Retorna o status de conexão
app.get('/empresas/:empresaId/status', async (req, res) => {
  const { empresaId } = req.params
  
  // Se está instanciado em memória e tem QR, está pareando
  if (socketInstances.has(empresaId) && qrCodes.has(empresaId)) {
    return res.json({ status: 'pareando' })
  }

  try {
    const { data, error } = await supabase
      .from('conexoes_whatsapp')
      .select('status')
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (error) throw error
    res.json({ status: data?.status || 'desconectado' })
  } catch (err) {
    console.error(`[Server] Erro ao buscar status no banco para ${empresaId}:`, err)
    res.status(500).json({ error: 'Erro interno ao consultar status.' })
  }
})

// POST /empresas/:empresaId/conectar → Inicia uma instância Baileys nova
app.post('/empresas/:empresaId/conectar', async (req, res) => {
  const { empresaId } = req.params
  try {
    conectarEmpresa(empresaId).catch((err) => {
      console.error(`[Server] Erro em background ao conectar empresa ${empresaId}:`, err)
    })
    res.json({ message: 'Conexão iniciada.' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /empresas/:empresaId/desconectar → Encerra a sessão e limpa os arquivos locais
app.post('/empresas/:empresaId/desconectar', async (req, res) => {
  const { empresaId } = req.params
  try {
    await desconectarEmpresa(empresaId)
    res.json({ message: 'Conexão encerrada e dados limpos.' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Inicia o Express
app.listen(port, async () => {
  console.log(`[CromoZap] Microsserviço escutando na porta ${port}`)

  // Inicializa o Listener de eventos do Supabase Realtime
  inicializarListeners()

  // Inicializa o processador periódico da fila de envios
  inicializarQueueProcessor()

  // Auto-reconecta as empresas que já estavam com status 'conectado' no banco
  try {
    const { data: conexoes } = await supabase
      .from('conexoes_whatsapp')
      .select('empresa_id')
      .eq('status', 'conectado')

    if (conexoes && conexoes.length > 0) {
      console.log(`[CromoZap] Auto-conectando ${conexoes.length} empresa(s) ativa(s)...`)
      for (const conn of conexoes) {
        conectarEmpresa(conn.empresa_id).catch((err) => {
          console.error(`[CromoZap] Falha ao auto-conectar empresa ${conn.empresa_id}:`, err)
        })
      }
    }
  } catch (err) {
    console.error('[CromoZap] Erro ao carregar conexões ativas no boot:', err)
  }
})
