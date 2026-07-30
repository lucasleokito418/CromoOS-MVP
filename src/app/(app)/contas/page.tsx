import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ContasCliente } from "@/components/financeiro/contas-cliente"

export const revalidate = 0

export default async function ContasPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

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
