import React from 'react'
import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { gerarBriefingDiario, BriefingDiario } from '@/lib/ia/briefing'
import { AssistenteClient } from './AssistenteClient'

export const revalidate = 0 // Evita cache para que o briefing esteja sempre atualizado

export default async function AssistentePage() {
  const { user, perfil } = await getAuthenticatedUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = createClient()

  // Busca o briefing diário com queries diretas e rápidas
  let briefing: BriefingDiario = {
    faturamentoOntem: 0,
    qtdAgendamentosHoje: 0,
    orcamentosPendentesMaisDeTresDias: 0,
    clientesAtrasados: []
  }

  try {
    briefing = await gerarBriefingDiario(supabase)
  } catch (err) {
    console.error('Erro ao gerar briefing diário:', err)
  }

  const userDisplayName = perfil?.nome || user.email?.split('@')[0] || 'Usuário'

  return (
    <AssistenteClient
      initialBriefing={briefing}
      userDisplayName={userDisplayName}
    />
  )
}
