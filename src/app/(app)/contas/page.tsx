import React from "react"
import { redirect } from "next/navigation"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { ContasCliente } from "@/components/financeiro/contas-cliente"

export const revalidate = 0

export default async function ContasPage() {
  const { user } = await getAuthenticatedUser()

  if (!user) redirect("/login")

  const supabase = createClient()

  const [contasRes, movimentacoesRes] = await Promise.all([
    supabase
      .from("contas_financeiras")
      .select("*")
      .order("principal", { ascending: false }),
    supabase
      .from("movimentacoes_financeiras")
      .select("id, conta_id, tipo, valor, status")
      .eq("status", "pago")
  ])

  return (
    <ContasCliente
      initialContas={contasRes.data || []}
      movimentacoes={movimentacoesRes.data || []}
    />
  )
}
