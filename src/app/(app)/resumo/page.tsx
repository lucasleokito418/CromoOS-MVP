import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ResumoCliente } from "@/components/financeiro/resumo-cliente"

export const revalidate = 0

export default async function ResumoPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const primeiroDiaMes = `${ano}-${String(mes + 1).padStart(2, "0")}-01`
  const ultimoDiaMesDate = new Date(ano, mes + 1, 0)
  const mesDias = ultimoDiaMesDate.getDate()
  const ultimoDiaMes = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(mesDias).padStart(2, "0")}`

  const mesesNomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]
  const mesNome = mesesNomes[mes]

  const [contasRes, movimentacoesRes] = await Promise.all([
    supabase
      .from("contas_financeiras")
      .select("id, nome, tipo, principal, saldo_inicial")
      .order("principal", { ascending: false }),
    supabase
      .from("movimentacoes_financeiras")
      .select("id, conta_id, tipo, valor, data, status")
      .or(`and(data.gte.${primeiroDiaMes},data.lte.${ultimoDiaMes}),status.eq.pendente`)
  ])

  return (
    <ResumoCliente
      contas={contasRes.data || []}
      movimentacoes={movimentacoesRes.data || []}
      mesDias={mesDias}
      mesNome={mesNome}
      hojeStr={hojeStr}
    />
  )
}
