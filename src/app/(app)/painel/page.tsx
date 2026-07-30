import React from 'react'
import { redirect } from 'next/navigation'
import { Calendar, FileText, Layers, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { LogoutButton } from '@/components/auth/logout-button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ClientRow extends Record<string, unknown> {
  id: string
  nome: string
  whatsapp: string | null
  criado_em: string
}

interface AppointmentRow extends Record<string, unknown> {
  id: string
  data_inicio: string
  status: string
  clientes: { nome: string } | { nome: string }[] | null
}

export default async function PainelPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  // 1. Dados de perfil e empresa do usuário logado
  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, empresa_id')
    .eq('id', session.user.id)
    .single()

  const { data: empresa } = perfil?.empresa_id
    ? await supabase
        .from('empresas')
        .select('nome')
        .eq('id', perfil.empresa_id)
        .single()
    : { data: null }

  // 2. Data boundaries para consultas
  const now = new Date()
  
  // Início e fim do dia de hoje (UTC-3 / Local do servidor aproximado)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // Início e fim do mês corrente
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const endOfMonth = new Date()
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)
  endOfMonth.setDate(0)
  endOfMonth.setHours(23, 59, 59, 999)

  // 3. Consultas em paralelo no Supabase
  const [
    { count: agendamentosHoje },
    { count: orcamentosPendentes },
    { count: vagasOcupadas },
    { count: totalVagas },
    { data: vendasMesaRaw },
    { data: agendamentosRaw },
    { data: clientesRaw }
  ] = await Promise.all([
    // Agendamentos hoje
    supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .gte('data_inicio', startOfToday.toISOString())
      .lte('data_inicio', endOfToday.toISOString()),
      
    // Orçamentos pendentes
    supabase
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente'),
      
    // Vagas ocupadas
    supabase
      .from('vagas_espaco')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ocupada'),
      
    // Total de vagas
    supabase
      .from('vagas_espaco')
      .select('*', { count: 'exact', head: true }),

    // Vendas do mês (precisa dos itens de venda_servicos para somar)
    supabase
      .from('vendas')
      .select('id, desconto_valor, venda_servicos(preco_aplicado)')
      .eq('status', 'concluida')
      .gte('criado_em', startOfMonth.toISOString())
      .lte('criado_em', endOfMonth.toISOString()),

    // Próximos 5 agendamentos
    supabase
      .from('agendamentos')
      .select('id, data_inicio, status, clientes(nome)')
      .gte('data_inicio', now.toISOString())
      .order('data_inicio', { ascending: true })
      .limit(5),

    // Últimos 5 clientes
      supabase
      .from('clientes')
      .select('id, nome, whatsapp, criado_em')
      .order('criado_em', { ascending: false })
      .limit(5)
  ])

  // Processamento de métricas complexas
  const vagasStatus = totalVagas && totalVagas > 0 
    ? `${vagasOcupadas || 0}/${totalVagas}` 
    : '0/0'

  const totalVendasMes = (vendasMesaRaw as any[])?.reduce((acc, venda) => {
    const totalServicos = venda.venda_servicos?.reduce(
      (sAcc: number, item: any) => sAcc + Number(item.preco_aplicado),
      0
    ) || 0
    const desconto = Number(venda.desconto_valor || 0)
    return acc + Math.max(0, totalServicos - desconto)
  }, 0) || 0

  // Formatação de moeda brasileira (BRL)
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  // Formatador de datas simples
  const formatarData = (dataStr: string) => {
    const d = new Date(dataStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const agendamentos = (agendamentosRaw || []) as AppointmentRow[]
  const clientes = (clientesRaw || []) as ClientRow[]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Painel"
        subtitle={`Operação da empresa ${empresa?.nome || '...'}`}
        actions={<LogoutButton />}
      />

      {/* Faixa de métricas horizontal única */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-surface border border-border rounded shadow-sm mb-8 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Card 1 */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center shrink-0">
            <Calendar size={20} className="text-accent" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-text-secondary uppercase tracking-wider">Agendamentos Hoje</span>
            <span className="text-2xl font-oswald font-semibold text-text-primary tabular-nums mt-0.5">
              {agendamentosHoje || 0}
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center shrink-0">
            <FileText size={20} className="text-accent" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-text-secondary uppercase tracking-wider">Orçamentos Pendentes</span>
            <span className="text-2xl font-oswald font-semibold text-text-primary tabular-nums mt-0.5">
              {orcamentosPendentes || 0}
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center shrink-0">
            <Layers size={20} className="text-accent" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-text-secondary uppercase tracking-wider">Vagas Ocupadas</span>
            <span className="text-2xl font-oswald font-semibold text-text-primary tabular-nums mt-0.5">
              {vagasStatus}
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center shrink-0">
            <DollarSign size={20} className="text-accent" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-text-secondary uppercase tracking-wider">Vendas do Mês</span>
            <span className="text-2xl font-oswald font-semibold text-text-primary tabular-nums mt-0.5">
              {formatarMoeda(totalVendasMes)}
            </span>
          </div>
        </div>
      </div>

      {/* Cards de tabelas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card Próximos Agendamentos */}
        <Card
          header={
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                Próximos Agendamentos
              </h2>
              <span className="text-xs text-text-secondary font-medium">
                Próximos 5
              </span>
            </div>
          }
          padding="p-0"
        >
          <div className="flex flex-col gap-0 overflow-hidden rounded border border-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-left">Cliente</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-center">Horário</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-16 text-center text-text-secondary text-sm">
                        Nenhum agendamento agendado
                      </td>
                    </tr>
                  ) : (
                    agendamentos.map((row) => {
                      const variants: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
                        confirmado: 'success',
                        pendente: 'warning',
                        cancelado: 'danger',
                      }
                      const nomeCliente = !row.clientes
                        ? '—'
                        : Array.isArray(row.clientes)
                        ? row.clientes[0]?.nome || '—'
                        : row.clientes.nome || '—'

                      return (
                        <tr key={row.id} className="border-b border-border/60 hover:bg-surface-hover transition-colors duration-100 last:border-0">
                          <td className="px-4 py-3 text-text-primary text-left font-medium">{nomeCliente}</td>
                          <td className="px-4 py-3 text-text-primary text-center tabular-nums">{formatarData(row.data_inicio)}</td>
                          <td className="px-4 py-3 text-text-primary text-right">
                            <Badge variant={variants[row.status] || 'neutral'}>
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Card Clientes Recentes */}
        <Card
          header={
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                Clientes Recentes
              </h2>
              <span className="text-xs text-text-secondary font-medium">
                Últimos 5
              </span>
            </div>
          }
          padding="p-0"
        >
          <div className="flex flex-col gap-0 overflow-hidden rounded border border-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-left">Nome</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-left">Telefone</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide text-right">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-16 text-center text-text-secondary text-sm">
                        Nenhum cliente cadastrado ainda
                      </td>
                    </tr>
                  ) : (
                    clientes.map((row) => {
                      let fone = '—'
                      if (row.whatsapp) {
                        const tel = row.whatsapp.replace(/\D/g, '')
                        fone = tel.length === 11
                          ? tel.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                          : tel.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
                      }

                      return (
                        <tr key={row.id} className="border-b border-border/60 hover:bg-surface-hover transition-colors duration-100 last:border-0">
                          <td className="px-4 py-3 text-text-primary text-left font-medium">{row.nome}</td>
                          <td className="px-4 py-3 text-text-primary text-left tabular-nums">{fone}</td>
                          <td className="px-4 py-3 text-text-primary text-right tabular-nums">
                            {new Date(row.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
