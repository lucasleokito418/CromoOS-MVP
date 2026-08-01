import { redirect } from "next/navigation"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { ServicosCliente } from "@/components/servicos/servicos-cliente"

export const revalidate = 0

export default async function ServicosPage() {
  const { user } = await getAuthenticatedUser()
  if (!user) redirect("/login")

  const supabase = createClient()

  const { data: servicos } = await supabase
    .from("servicos")
    .select("*")
    .order("nome")

  return <ServicosCliente initialServicos={servicos || []} />
}
