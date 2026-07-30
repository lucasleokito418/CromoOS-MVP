"use client"

import React, { useState, useTransition, useMemo } from "react"
import { Plus, ArrowDownRight, ArrowUpRight, CheckCircle2, History, Landmark, Lock } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, type Column } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface CaixaClienteProps {
  sessaoAtiva: any | null
  historicoSessoes: any[]
  movimentacoesPeriodo: any[]
  caixaMovimentacoesSessao: any[]
  perfilId: string
}

export function CaixaCliente({
  sessaoAtiva: initialSessaoAtiva,
  historicoSessoes: initialHistorico,
  movimentacoesPeriodo: initialMovsPeriodo,
  caixaMovimentacoesSessao: initialCaixaMovs,
  perfilId,
}: CaixaClienteProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { empresaId } = useEmpresa()
  const [isPending, startTransition] = useTransition()

  // State
  const [sessaoAtiva, setSessaoAtiva] = useState<any | null>(initialSessaoAtiva)
  const [historico, setHistorico] = useState(initialHistorico)
  const [movsPeriodo, setMovsPeriodo] = useState(initialMovsPeriodo)
  const [caixaMovs, setCaixaMovs] = useState(initialCaixaMovs)

  // Tab State
  const [activeTab, setActiveTab] = useState("geral")

  // Modal Abertura state
  const [valorAbertura, setValorAbertura] = useState(0)

  // Modal Fechamento state
  const [modalFecharOpen, setModalFecharOpen] = useState(false)
  const [valorFechamentoContado, setValorFechamentoContado] = useState(0)

  // Modal Sangria/Reforco state
  const [modalMovOpen, setModalMovOpen] = useState(false)
  const [movTipo, setMovTipo] = useState<"sangria" | "reforco">("sangria")
  const [movValor, setMovValor] = useState(0)
  const [movMotivo, setMovMotivo] = useState("")

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  // Cálculos do Caixa Ativo
  const reforcosTotal = useMemo(() => {
    return caixaMovs.filter(m => m.tipo === "reforco").reduce((sum, m) => sum + Number(m.valor), 0)
  }, [caixaMovs])

  const sangriasTotal = useMemo(() => {
    return caixaMovs.filter(m => m.tipo === "sangria").reduce((sum, m) => sum + Number(m.valor), 0)
  }, [caixaMovs])

  const fluxoFinanceiroTotal = useMemo(() => {
    const entradas = movsPeriodo.filter(m => m.tipo === "entrada").reduce((sum, m) => sum + Number(m.valor), 0)
    const saidas = movsPeriodo.filter(m => m.tipo === "saida").reduce((sum, m) => sum + Number(m.valor), 0)
    return entradas - saidas
  }, [movsPeriodo])

  const saldoEsperado = useMemo(() => {
    if (!sessaoAtiva) return 0
    return Number(sessaoAtiva.valor_abertura) + reforcosTotal - sangriasTotal + fluxoFinanceiroTotal
  }, [sessaoAtiva, reforcosTotal, sangriasTotal, fluxoFinanceiroTotal])

  // Recarregar dados do caixa atual
  const recarregarCaixa = async (sessao: any) => {
    if (!sessao) {
      setSessaoAtiva(null)
      setCaixaMovs([])
      setMovsPeriodo([])
      return
    }

    const [caixaMovsRes, movsPeriodoRes] = await Promise.all([
      supabase.from("caixa_movimentacoes").select("*").eq("caixa_sessao_id", sessao.id).order("criado_em", { ascending: false }),
      supabase.from("movimentacoes_financeiras").select("id, tipo, valor, status, criado_em").eq("status", "pago").gte("criado_em", sessao.data_abertura)
    ])

    setSessaoAtiva(sessao)
    setCaixaMovs(caixaMovsRes.data || [])
    setMovsPeriodo(movsPeriodoRes.data || [])
  }

  const recarregarHistorico = async () => {
    const { data } = await supabase
      .from("caixa_sessoes")
      .select("*, perfis(nome)")
      .eq("status", "fechado")
      .order("data_fechamento", { ascending: false })
    if (data) setHistorico(data)
  }

  // Abertura de Caixa
  const handleAbrirCaixa = async () => {
    if (!empresaId) return
    startTransition(async () => {
      try {
        const { data, error } = await supabase
          .from("caixa_sessoes")
          .insert({
            empresa_id: empresaId,
            perfil_id: perfilId,
            valor_abertura: valorAbertura,
            status: "aberto",
          })
          .select()
          .single()

        if (error) {
          if (error.code === "23505") { // Código de erro do índice único no Postgres (unique_violation)
            toast({ variant: "error", title: "Operação negada", description: "Já existe um caixa aberto para esta empresa!" })
            // Força a recarga para buscar a sessão ativa
            window.location.reload()
          } else {
            throw error
          }
        } else {
          toast({ variant: "success", title: "Caixa aberto com sucesso!" })
          await recarregarCaixa(data)
        }
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao abrir caixa", description: err.message })
      }
    })
  }

  // Sangria e Reforço
  const handleAdicionarMovimento = async () => {
    if (!sessaoAtiva || movValor <= 0 || !empresaId) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("caixa_movimentacoes")
          .insert({
            empresa_id: empresaId,
            caixa_sessao_id: sessaoAtiva.id,
            tipo: movTipo,
            valor: movValor,
            motivo: movMotivo.trim() || null,
          })

        if (error) throw error

        toast({ variant: "success", title: `${movTipo === "sangria" ? "Sangria" : "Reforço"} registrado!` })
        setModalMovOpen(false)
        setMovValor(0)
        setMovMotivo("")
        await recarregarCaixa(sessaoAtiva)
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao registrar", description: err.message })
      }
    })
  }

  // Fechamento de Caixa
  const handleFecharCaixa = async () => {
    if (!sessaoAtiva || !empresaId) return
    startTransition(async () => {
      try {
        const diferenca = valorFechamentoContado - saldoEsperado
        const { error } = await supabase
          .from("caixa_sessoes")
          .update({
            valor_fechamento_informado: valorFechamentoContado,
            valor_fechamento_sistema: saldoEsperado,
            diferenca,
            data_fechamento: new Date().toISOString(),
            status: "fechado",
          })
          .eq("id", sessaoAtiva.id)

        if (error) throw error

        toast({ variant: "success", title: "Caixa fechado com sucesso!" })
        setModalFecharOpen(false)
        setSessaoAtiva(null)
        await recarregarCaixa(null)
        await recarregarHistorico()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao fechar caixa", description: err.message })
      }
    })
  }

  const columnsHistorico: Column<any>[] = [
    {
      key: "abertura",
      label: "Abertura",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-primary">
            {new Date(row.data_abertura).toLocaleDateString("pt-BR")}
          </span>
          <span className="text-[10px] text-text-secondary">
            às {new Date(row.data_abertura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      ),
    },
    {
      key: "fechamento",
      label: "Fechamento",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-primary">
            {row.data_fechamento ? new Date(row.data_fechamento).toLocaleDateString("pt-BR") : "—"}
          </span>
          <span className="text-[10px] text-text-secondary">
            {row.data_fechamento ? `às ${new Date(row.data_fechamento).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "responsavel",
      label: "Operador",
      render: (row) => <span>{row.perfis?.nome || "Sistema"}</span>,
    },
    {
      key: "valores",
      label: "Valores (Ab. / Fech. / Sist.)",
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary tabular-nums">
          <span className="text-text-primary font-medium">{formatarMoeda(row.valor_abertura)}</span>
          <span>/</span>
          <span className="text-text-primary font-medium">{formatarMoeda(row.valor_fechamento_informado)}</span>
          <span>/</span>
          <span>{formatarMoeda(row.valor_fechamento_sistema)}</span>
        </div>
      ),
    },
    {
      key: "diferenca",
      label: "Diferença",
      align: "right",
      render: (row) => {
        const dif = Number(row.diferenca || 0)
        return (
          <span className={`font-semibold tabular-nums ${dif === 0 ? "text-text-secondary" : dif > 0 ? "text-success" : "text-danger"}`}>
            {dif > 0 ? "+" : ""}{formatarMoeda(dif)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader title="Caixa Operacional" subtitle="Controle diário de fechamentos, sangrias e reforços de caixa" />

      {/* Caixa Fechado - Tela de Abertura */}
      {!sessaoAtiva ? (
        <div className="max-w-md mx-auto py-12">
          <Card
            header={
              <div className="flex flex-col items-center text-center gap-2 pt-2">
                <div className="w-12 h-12 rounded bg-surface-hover flex items-center justify-center border border-border">
                  <Lock size={22} className="text-text-secondary" />
                </div>
                <h2 className="text-lg font-bold text-text-primary font-oswald uppercase tracking-wide">O Caixa está Fechado</h2>
                <p className="text-xs text-text-secondary">Informe o saldo inicial em dinheiro disponível para iniciar os atendimentos.</p>
              </div>
            }
            padding="p-6"
          >
            <div className="space-y-4">
              <Input
                label="Valor de Abertura (R$)"
                type="number"
                step="0.01"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(Number(e.target.value))}
                className="text-center font-bold text-lg"
              />
              <Button variant="primary" className="w-full" onClick={handleAbrirCaixa} loading={isPending}>
                Abrir Caixa
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* Caixa Aberto - Dashboard de Operação */
        <div className="space-y-6">
          <Tabs
            tabs={[
              { key: "geral", label: "Dados Gerais" },
              { key: "movimentacoes", label: "Sangrias & Reforços" },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "geral" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resumo do Caixa */}
              <Card className="lg:col-span-2 flex flex-col justify-between" padding="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Sessão Operacional Ativa</h3>
                      <p className="text-xs text-text-secondary mt-1">
                        Aberta em {new Date(sessaoAtiva.data_abertura).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="success">Caixa Aberto</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y border-border/40 py-5">
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Valor Abertura</span>
                      <p className="text-lg font-bold font-oswald text-text-primary mt-0.5 tabular-nums">
                        {formatarMoeda(sessaoAtiva.valor_abertura)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Reforços (+)</span>
                      <p className="text-lg font-bold font-oswald text-success mt-0.5 tabular-nums">
                        {formatarMoeda(reforcosTotal)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Sangrias (-)</span>
                      <p className="text-lg font-bold font-oswald text-danger mt-0.5 tabular-nums">
                        {formatarMoeda(sangriasTotal)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Vendas no Dia</span>
                      <p className="text-lg font-bold font-oswald text-text-primary mt-0.5 tabular-nums">
                        {formatarMoeda(fluxoFinanceiroTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-text-secondary font-medium">Saldo Esperado em Caixa</span>
                    <p className="text-2xl font-bold font-oswald text-text-primary tracking-wide mt-1 tabular-nums">
                      {formatarMoeda(saldoEsperado)}
                    </p>
                  </div>
                  <Button variant="ghost" className="border border-border text-danger hover:bg-danger/10" iconLeft={<Lock size={15} />} onClick={() => setModalFecharOpen(true)}>
                    Fechar Caixa
                  </Button>
                </div>
              </Card>

              {/* Informações Auxiliares */}
              <div className="space-y-6">
                <Card padding="p-5" className="bg-accent/5 border-accent/25">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Atenção no Fechamento</h4>
                  <p className="text-xs text-text-secondary leading-relaxed mt-2">
                    Antes de fechar a sessão, conte todo o dinheiro físico disponível no caixa. O sistema calculará automaticamente a diferença entre o valor contado e o saldo esperado para auditoria.
                  </p>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "movimentacoes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-text-primary">Movimentações Avulsas de Caixa</h3>
                <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setModalMovOpen(true)}>
                  Sangria / Reforço
                </Button>
              </div>

              {/* Tabela de Sangrias e Reforços */}
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface font-medium text-text-secondary text-xs uppercase tracking-wide">
                      <th className="px-4 py-3">Horário</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caixaMovs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-text-secondary text-sm">
                          Nenhuma sangria ou reforço registrado nesta sessão.
                        </td>
                      </tr>
                    ) : (
                      caixaMovs.map((m) => (
                        <tr key={m.id} className="border-b border-border/60 hover:bg-surface-hover last:border-0">
                          <td className="px-4 py-3 text-text-primary tabular-nums">
                            {new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={m.tipo === "reforco" ? "success" : "neutral"}>
                              {m.tipo === "reforco" ? "Reforço" : "Sangria"}
                            </Badge>
                          </td>
                          <td className={`px-4 py-3 font-semibold tabular-nums ${m.tipo === "reforco" ? "text-success" : "text-danger"}`}>
                            {m.tipo === "reforco" ? "+" : "-"} {formatarMoeda(m.valor)}
                          </td>
                          <td className="px-4 py-3 text-text-secondary max-w-[280px] truncate" title={m.motivo}>
                            {m.motivo || "Não informado"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico de Sessões Fechadas */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <History size={18} className="text-text-secondary" />
          Histórico de Caixas Fechados
        </h3>
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <Table columns={columnsHistorico} data={historico} rowKey="id" emptyMessage="Nenhum caixa fechado no histórico" />
        </div>
      </div>

      {/* Modal Fechar Caixa */}
      <Modal open={modalFecharOpen} onClose={() => setModalFecharOpen(false)} title="Fechar Sessão de Caixa">
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Digite o valor total em dinheiro que você contou fisicamente no caixa.
          </p>

          <Input
            label="Valor Contado (R$)"
            type="number"
            step="0.01"
            value={valorFechamentoContado}
            onChange={(e) => setValorFechamentoContado(Number(e.target.value))}
            className="text-center font-bold text-lg"
          />

          <div className="bg-surface-hover rounded border border-border/40 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Saldo Esperado (Sistema):</span>
              <span className="font-semibold text-text-primary tabular-nums">{formatarMoeda(saldoEsperado)}</span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-2 font-medium">
              <span className="text-text-secondary">Diferença de Caixa:</span>
              <span className={`font-bold tabular-nums ${valorFechamentoContado - saldoEsperado === 0 ? "text-text-primary" : valorFechamentoContado - saldoEsperado > 0 ? "text-success" : "text-danger"}`}>
                {valorFechamentoContado - saldoEsperado > 0 ? "+" : ""}{formatarMoeda(valorFechamentoContado - saldoEsperado)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setModalFecharOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleFecharCaixa} loading={isPending}>Confirmar Fechamento</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Sangria / Reforço */}
      <Modal open={modalMovOpen} onClose={() => setModalMovOpen(false)} title="Sangria / Reforço de Caixa">
        <div className="space-y-4">
          <Select
            label="Tipo de Movimento"
            value={movTipo}
            onChange={(val) => setMovTipo(val as any)}
            options={[{ value: "sangria", label: "Sangria (Retirar dinheiro)" }, { value: "reforco", label: "Reforço (Adicionar dinheiro)" }]}
          />

          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            value={movValor}
            onChange={(e) => setMovValor(Number(e.target.value))}
          />

          <Input
            label="Motivo / Descrição"
            placeholder="Ex: Pagamento de motoboy / Troco inicial"
            value={movMotivo}
            onChange={(e) => setMovMotivo(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setModalMovOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleAdicionarMovimento} loading={isPending}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
