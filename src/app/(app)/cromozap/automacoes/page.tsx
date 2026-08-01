import React from 'react'
import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { AutomacoesClient } from '@/components/cromozap/automacoes-client'

export const revalidate = 0

export default async function AutomacoesPage() {
  const { user, empresaId } = await getAuthenticatedUser()

  if (!user || !empresaId) redirect('/login')

  const supabase = createClient()

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
