import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EspacoCliente } from "@/components/espaco/espaco-cliente"

export const revalidate = 0

export default async function EspacoPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const [vagasRes, clientesRes] = await Promise.all([
    supabase
      .from("vagas_espaco")
      .select(`
        *,
        veiculos (
          id, marca, modelo, placa,
          clientes (id, nome)
        ),
        estofados (
          id, descricao,
          clientes (id, nome)
        )
      `)
      .order("identificador"),
    supabase
      .from("clientes")
      .select("id, nome, veiculos(id, marca, modelo, placa, cor), estofados(id, descricao, cor)")
      .order("nome"),
  ])

  return (
    <EspacoCliente
      initialVagas={vagasRes.data || []}
      clientes={clientesRes.data || []}
    />
  )
}
