import React from "react"
import { redirect } from "next/navigation"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { CaixaCliente } from "@/components/caixa/caixa-cliente"

export const revalidate = 0

export default async function CaixaPage() {
  const { user, perfil, empresaId } = await getAuthenticatedUser()

  if (!user || !perfil || !empresaId) redirect("/login")

  const supabase = createClient()

  // 2. Busca sessão ativa de caixa para a empresa
  const { data: sessaoAtiva } = await supabase
    .from("caixa_sessoes")
    .select("*")
    .eq("empresa_id", perfil.empresa_id)
    .eq("status", "aberto")
    .maybeSingle()

  // 3. Buscar dados associados se houver caixa aberto
  let caixaMovimentacoesSessao: Record<string, unknown>[] = []
  let movimentacoesPeriodo: Record<string, unknown>[] = []

  if (sessaoAtiva) {
    const [caixaMovsRes, movsPeriodoRes] = await Promise.all([
      supabase
        .from("caixa_movimentacoes")
        .select("*")
        .eq("caixa_sessao_id", sessaoAtiva.id)
        .order("criado_em", { ascending: false }),
      supabase
        .from("movimentacoes_financeiras")
        .select("id, conta_id, tipo, valor, status, criado_em")
        .eq("status", "pago")
        .gte("criado_em", sessaoAtiva.data_abertura)
    ])
    caixaMovimentacoesSessao = caixaMovsRes.data || []
    movimentacoesPeriodo = movsPeriodoRes.data || []
  }

  // 4. Buscar histórico de caixas fechados
  const { data: historico } = await supabase
    .from("caixa_sessoes")
    .select("*, perfis(nome)")
    .eq("empresa_id", perfil.empresa_id)
    .eq("status", "fechado")
    .order("data_fechamento", { ascending: false })

  return (
    <CaixaCliente
      sessaoAtiva={sessaoAtiva}
      historicoSessoes={historico || []}
      movimentacoesPeriodo={movimentacoesPeriodo}
      caixaMovimentacoesSessao={caixaMovimentacoesSessao}
      perfilId={perfil.id}
    />
  )
}
