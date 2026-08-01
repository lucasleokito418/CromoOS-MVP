import React from "react"
import { redirect } from "next/navigation"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { FuncionariosCliente } from "@/components/equipe/funcionarios-cliente"

export const revalidate = 0

export default async function FuncionariosPage() {
  const { user } = await getAuthenticatedUser()
  if (!user) redirect("/login")

  const supabase = createClient()

  const [perfisRes, comissoesRes] = await Promise.all([
    supabase
      .from("perfis")
      .select("*")
      .order("nome"),
    supabase
      .from("comissoes")
      .select(`
        *,
        perfis (id, nome),
        vendas (id, numero_sequencial)
      `)
      .order("criado_em", { ascending: false })
  ])

  return (
    <FuncionariosCliente
      initialFuncionarios={perfisRes.data || []}
      initialComissoes={comissoesRes.data || []}
    />
  )
}
