import { redirect } from 'next/navigation'

// Redireciona para o painel — o middleware decide o destino real
// (login se não autenticado, onboarding se sem empresa, painel se completo)
export default function Home() {
  redirect('/painel')
}
