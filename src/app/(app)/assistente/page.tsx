import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { gerarBriefingDiario, BriefingDiario } from '@/lib/ia/briefing'
import { AssistenteClient } from './AssistenteClient'

export const revalidate = 0 // Evita cache para que o briefing esteja sempre atualizado

export default async function AssistentePage() {
  const supabase = createClient()
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

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

  return (
    <AssistenteClient
      initialBriefing={briefing}
      userDisplayName={session.user.email?.split('@')[0] || 'Usuário'}
    />
  )
}
