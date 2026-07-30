import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AutomacoesClient } from '@/components/cromozap/automacoes-client'

export const revalidate = 0

export default async function AutomacoesPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, empresa_id')
    .eq('id', session.user.id)
    .single()

  if (!perfil || !perfil.empresa_id) redirect('/login')

  const empresaId = perfil.empresa_id

  const { data: automacoes } = await supabase
    .from('automacoes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  return (
    <AutomacoesClient
      empresaId={empresaId}
      automacoesIniciais={automacoes || []}
    />
  )
}
