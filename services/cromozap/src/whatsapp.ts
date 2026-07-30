import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { supabase } from './supabase'

// Logger do pino desativado para evitar poluição de logs do Baileys
const logger = pino({ level: 'silent' })

export const socketInstances = new Map<string, WASocket>()
export const qrCodes = new Map<string, string>()

// Diretório base das sessões
const SESSIONS_DIR = path.join(__dirname, '../sessions')

// Inicializa a pasta de sessões se não existir
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

async function atualizarStatusConexao(empresaId: string, status: string) {
  try {
    const { data: existente } = await supabase
      .from('conexoes_whatsapp')
      .select('id')
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (existente) {
      await supabase
        .from('conexoes_whatsapp')
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq('id', existente.id)
    } else {
      await supabase
        .from('conexoes_whatsapp')
        .insert({
          empresa_id: empresaId,
          status,
          atualizado_em: new Date().toISOString()
        })
    }
  } catch (err) {
    console.error(`[WhatsApp] Erro ao atualizar status da conexão para ${empresaId}:`, err)
  }
}

export async function conectarEmpresa(empresaId: string): Promise<WASocket> {
  // Se já existe uma instância ativa, retorna ela
  if (socketInstances.has(empresaId)) {
    return socketInstances.get(empresaId)!
  }

  console.log(`[WhatsApp] Iniciando conexão para a empresa: ${empresaId}`)
  const sessionPath = path.join(SESSIONS_DIR, empresaId)
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger,
  })

  socketInstances.set(empresaId, sock)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      try {
        const qrBase64 = await QRCode.toDataURL(qr)
        qrCodes.set(empresaId, qrBase64)
        await atualizarStatusConexao(empresaId, 'pareando')
      } catch (err) {
        console.error('[WhatsApp] Erro ao gerar QR Code:', err)
      }
    }

    if (connection === 'open') {
      console.log(`[WhatsApp] Empresa ${empresaId} conectada com sucesso!`)
      qrCodes.delete(empresaId)
      await atualizarStatusConexao(empresaId, 'conectado')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.log(`[WhatsApp] Conexão encerrada para ${empresaId}. Código: ${statusCode}. Reconectar: ${shouldReconnect}`)

      // Limpa dados de memória
      qrCodes.delete(empresaId)

      if (!shouldReconnect) {
        // Usuário desconectou explicitamente
        socketInstances.delete(empresaId)
        await atualizarStatusConexao(empresaId, 'desconectado')
        
        // Remove arquivos de sessão física
        try {
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
          }
        } catch (err) {
          console.error(`[WhatsApp] Erro ao deletar pasta da sessão da empresa ${empresaId}:`, err)
        }
      } else {
        // Tenta reconectar reinstanciando o socket
        socketInstances.delete(empresaId)
        setTimeout(() => {
          conectarEmpresa(empresaId).catch((err) => console.error('[WhatsApp] Falha ao reconectar:', err))
        }, 3000)
      }
    }
  })

  return sock
}

export async function desconectarEmpresa(empresaId: string): Promise<void> {
  const sock = socketInstances.get(empresaId)
  if (sock) {
    try {
      sock.logout() // Envia logout para invalidar a sessão no WhatsApp e acionar a desconexão no connection.update
    } catch (err) {
      console.error(`[WhatsApp] Erro ao executar logout no socket da empresa ${empresaId}:`, err)
    }
    socketInstances.delete(empresaId)
  }
  
  qrCodes.delete(empresaId)
  await atualizarStatusConexao(empresaId, 'desconectado')

  const sessionPath = path.join(SESSIONS_DIR, empresaId)
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true })
    }
  } catch (err) {
    console.error(`[WhatsApp] Erro ao deletar pasta da sessão da empresa ${empresaId}:`, err)
  }
}
