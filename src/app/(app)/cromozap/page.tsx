import React from 'react'
import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { CromozapCliente } from '@/components/cromozap/cromozap-cliente'

export const revalidate = 0

export default async function CromozapPage() {
  const { user, perfil, empresaId } = await getAuthenticatedUser()

  if (!user || !empresaId) redirect('/login')

  const supabase = createClient()

  // 2. Busca conexão, automações e fila em paralelo
  const [conexaoRes, automacoesRes, filaRes] = await Promise.all([
    supabase
      .from('conexoes_whatsapp')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle(),
    supabase
      .from('automacoes_whatsapp')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('gatilho'),
    supabase
      .from('fila_envio_whatsapp')
      .select('*, clientes(nome)')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false })
  ])

  return (
    <CromozapCliente
      empresaId={empresaId}
      conexaoInicial={conexaoRes.data || null}
      automacoesIniciais={automacoesRes.data || []}
      filaInicial={filaRes.data || []}
    />
  )
}
