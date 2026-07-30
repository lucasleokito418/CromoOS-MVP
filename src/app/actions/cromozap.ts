"use server"

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const CROMOZAP_SERVICE_URL = process.env.CROMOZAP_SERVICE_URL || 'http://localhost:3001'
const CROMOZAP_INTERNAL_KEY = process.env.CROMOZAP_INTERNAL_KEY || ''

async function callService(path: string, method: string, body?: any) {
  try {
    const res = await fetch(`${CROMOZAP_SERVICE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': CROMOZAP_INTERNAL_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    })

    if (!res.ok) {
      throw new Error(`Erro na chamada ao serviço CromoZap: ${res.status} ${res.statusText}`)
    }

    return await res.json()
  } catch (err: any) {
    console.error(`[CromoZap Action Error] Path: ${path}`, err)
    return { error: err.message || 'Erro de comunicação com o serviço.' }
  }
}

export async function conectarCromoZap(empresaId: string) {
  const result = await callService(`/empresas/${empresaId}/conectar`, 'POST')
  revalidatePath('/cromozap')
  return result
}

export async function desconectarCromoZap(empresaId: string) {
  const result = await callService(`/empresas/${empresaId}/desconectar`, 'POST')
  revalidatePath('/cromozap')
  return result
}

export async function obterQrCodeCromoZap(empresaId: string) {
  const result = await callService(`/empresas/${empresaId}/qr`, 'GET')
  return result?.qr || null
}

export async function obterStatusCromoZap(empresaId: string) {
  const result = await callService(`/empresas/${empresaId}/status`, 'GET')
  return result?.status || 'desconectado'
}

export async function toggleAutomacao(id: string, ativo: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('automacoes_whatsapp')
    .update({ ativo })
    .eq('id', id)

  if (error) {
    console.error('[Action] Erro ao toggle automação:', error)
    return { error: error.message }
  }

  revalidatePath('/cromozap')
  return { success: true }
}

export async function atualizarTemplateAutomacao(id: string, templateMensagem: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('automacoes_whatsapp')
    .update({ template_mensagem: templateMensagem })
    .eq('id', id)

  if (error) {
    console.error('[Action] Erro ao atualizar template de automação:', error)
    return { error: error.message }
  }

  revalidatePath('/cromozap')
  return { success: true }
}
