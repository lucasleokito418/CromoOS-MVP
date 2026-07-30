import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ServicosCliente } from "@/components/servicos/servicos-cliente"

export const revalidate = 0

export default async function ServicosPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: servicos } = await supabase
    .from("servicos")
    .select("*")
    .order("nome")

  return <ServicosCliente initialServicos={servicos || []} />
}
