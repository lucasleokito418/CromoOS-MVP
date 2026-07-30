import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientesCliente } from '@/components/clientes/clientes-cliente'
import type { Cliente } from '@/types/clientes'

export const revalidate = 0

export default async function ClientesPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data, error } = await supabase
    .from('clientes')
    .select(`
      id, nome, whatsapp, whatsapp_opt_in, telefone_extra, email,
      cpf_cnpj, origem, data_nascimento, endereco,
      observacoes, score, criado_em,
      veiculos (id, tipo, marca, modelo, cor, placa),
      estofados (id, descricao, cor)
    `)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('[ClientesPage] Erro ao buscar clientes:', error.message)
  }

  return <ClientesCliente clientesIniciais={(data as unknown as Cliente[]) ?? []} />
}
