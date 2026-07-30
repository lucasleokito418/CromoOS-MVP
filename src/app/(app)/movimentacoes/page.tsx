import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MovimentacoesCliente } from "@/components/financeiro/movimentacoes-cliente"

export const revalidate = 0

export default async function MovimentacoesPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const [movimentacoesRes, contasRes, categoriasFinRes, categoriasDreRes] = await Promise.all([
    supabase
      .from("movimentacoes_financeiras")
      .select(`
        *,
        contas_financeiras (id, nome),
        categorias_financeiras (id, nome, tipo),
        categorias_dre (id, nome, grupo)
      `)
      .order("data", { ascending: false }),
    supabase
      .from("contas_financeiras")
      .select("id, nome, principal, tipo")
      .order("principal", { ascending: false }),
    supabase
      .from("categorias_financeiras")
      .select("id, nome, tipo")
      .order("nome"),
    supabase
      .from("categorias_dre")
      .select("id, nome, grupo")
      .order("nome")
  ])

  return (
    <MovimentacoesCliente
      initialMovimentacoes={movimentacoesRes.data || []}
      contas={contasRes.data || []}
      categoriasFinanceiras={categoriasFinRes.data || []}
      categoriasDre={categoriasDreRes.data || []}
    />
  )
}
