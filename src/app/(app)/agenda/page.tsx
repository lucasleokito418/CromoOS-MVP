"use client"

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List as ListIcon, Pencil, Trash2, DollarSign } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import { Table, type Column } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/toast"
import { AgendaDrawer } from "@/components/agenda/agenda-drawer"
import { ExcluirAgendamentoModal } from "@/components/agenda/excluir-agendamento-modal"

const STATUS_VARIANTS = {
  pendente: "warning",
  confirmado: "success",
  cancelado: "danger",
} as const

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

interface Agendamento {
  id: string
  titulo: string | null
  descricao: string | null
  data_inicio: string
  data_fim: string | null
  status: string
  desconto_tipo: string | null
  desconto_valor: number | null
  cliente_id: string | null
  veiculo_id: string | null
  estofado_id: string | null
  funcionario_id: string | null
  clientes: { id: string; nome: string; whatsapp: string | null } | null
  veiculos: { id: string; marca: string; modelo: string; placa: string } | null
  estofados: { id: string; descricao: string } | null
  agendamento_servicos: Array<{
    id: string
    servico_id: string
    preco_aplicado: number
    servicos: { id: string; nome: string } | null
  }>
}

export default function AgendaPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  // State
  const [activeTab, setActiveTab] = useState("calendario")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)

  // Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [agendamentoEditando, setAgendamentoEditando] = useState<Agendamento | null>(null)
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [agendamentoExcluindo, setAgendamentoExcluindo] = useState<Agendamento | null>(null)

  // Fetch agendamentos
  const carregarAgendamentos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("agendamentos")
      .select(`
        id, titulo, descricao, data_inicio, data_fim, status,
        desconto_tipo, desconto_valor, cliente_id, veiculo_id, estofado_id, funcionario_id,
        clientes (id, nome, whatsapp),
        veiculos (id, marca, modelo, placa),
        estofados (id, descricao),
        agendamento_servicos (
          id, servico_id, preco_aplicado,
          servicos (id, nome)
        )
      `)
      .order("data_inicio", { ascending: true })

    if (error) {
      toast({
        variant: "error",
        title: "Erro ao carregar agenda",
        description: error.message,
      })
    } else {
      setAgendamentos((data as unknown as Agendamento[]) || [])
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    carregarAgendamentos()
  }, [carregarAgendamentos])

  // Month navigation helpers
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Monthly Calendar Grid Generator
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const startOfViewMonth = new Date(year, month, 1)
    const endOfViewMonth = new Date(year, month + 1, 0)

    const startDayOfWeek = startOfViewMonth.getDay()
    const daysInMonth = endOfViewMonth.getDate()

    const daysArray: { date: Date; isCurrentMonth: boolean }[] = []

    // Padding previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      daysArray.push({ date: prevDate, isCurrentMonth: false })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i)
      daysArray.push({ date: currDate, isCurrentMonth: true })
    }

    // Padding next month days to fit 42 grid cells
    const remaining = 42 - daysArray.length
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i)
      daysArray.push({ date: nextDate, isCurrentMonth: false })
    }

    return daysArray
  }, [currentMonth])

  // Get appointments for a specific date
  const getAgendamentosDia = (date: Date) => {
    return agendamentos.filter((a) => {
      const start = new Date(a.data_inicio)
      return (
        start.getFullYear() === date.getFullYear() &&
        start.getMonth() === date.getMonth() &&
        start.getDate() === date.getDate()
      )
    })
  }

  // Handlers
  const handleNovoAgendamento = () => {
    setAgendamentoEditando(null)
    setDrawerOpen(true)
  }

  const handleEditarAgendamento = (agendamento: Agendamento) => {
    setAgendamentoEditando(agendamento)
    setDrawerOpen(true)
  }

  const handleExcluirAgendamento = (agendamento: Agendamento) => {
    setAgendamentoExcluindo(agendamento)
    setModalExcluirOpen(true)
  }

  const handleSalvo = () => {
    setDrawerOpen(false)
    startTransition(() => {
      carregarAgendamentos()
    })
  }

  const handleExcluido = () => {
    setModalExcluirOpen(false)
    setAgendamentoExcluindo(null)
    startTransition(() => {
      carregarAgendamentos()
    })
  }

  // Table Columns (Lista)
  const columns: Column<Agendamento>[] = [
    {
      key: "cliente",
      label: "Cliente",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.clientes?.nome || "Cliente"} size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text-primary truncate">
              {row.clientes?.nome || "Cliente"}
            </span>
            {row.clientes?.whatsapp && (
              <span className="text-xs text-text-secondary truncate">
                {row.clientes.whatsapp}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "ativo",
      label: "Ativo",
      render: (row) => {
        if (row.veiculos) {
          return (
            <div className="text-sm text-text-primary">
              {row.veiculos.marca} {row.veiculos.modelo}{" "}
              <span className="text-xs text-text-secondary">({row.veiculos.placa})</span>
            </div>
          )
        }
        if (row.estofados) {
          return <div className="text-sm text-text-primary">{row.estofados.descricao}</div>
        }
        return <span className="text-text-secondary text-xs">—</span>
      },
    },
    {
      key: "servicos",
      label: "Serviços",
      render: (row) => {
        const names = (row.agendamento_servicos as Array<{ servicos?: { nome?: string } }> | undefined)?.map((s) => s.servicos?.nome).filter(Boolean) || []
        return (
          <div className="max-w-[200px] truncate text-xs text-text-secondary" title={names.join(", ")}>
            {names.join(", ") || "Sem serviços"}
          </div>
        )
      },
    },
    {
      key: "data_inicio",
      label: "Data / Hora",
      render: (row) => {
        const start = new Date(row.data_inicio)
        return (
          <div className="text-xs flex flex-col">
            <span className="font-medium text-text-primary">
              {start.toLocaleDateString("pt-BR")}
            </span>
            <span className="text-text-secondary">
              {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status as keyof typeof STATUS_VARIANTS] || "neutral"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "acoes",
      label: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status !== "confirmado" && (
            <button
              onClick={() => router.push(`/vendas?agendamento_id=${row.id}`)}
              className="p-1.5 rounded hover:bg-surface-hover text-success transition-colors"
              title="Registrar pagamento"
            >
              <DollarSign size={14} />
            </button>
          )}
          <button
            onClick={() => handleEditarAgendamento(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            title="Editar agendamento"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleExcluirAgendamento(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-danger transition-colors"
            title="Excluir agendamento"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Agenda"
        subtitle="Gerencie agendamentos, serviços solicitados e faturamento"
        actions={
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={handleNovoAgendamento}>
            Novo Agendamento
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-border p-4 rounded-lg">
        <Tabs
          tabs={[
            { key: "calendario", label: "Calendário", icon: <CalendarIcon size={14} /> },
            { key: "lista", label: "Lista", icon: <ListIcon size={14} /> },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "calendario" && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </Button>
            <span className="font-semibold text-sm capitalize text-text-primary min-w-[120px] text-center">
              {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            <Button variant="secondary" size="sm" onClick={nextMonth}>
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      {activeTab === "calendario" ? (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-sidebar">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center text-xs font-semibold text-text-secondary">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-border bg-border/20">
            {calendarDays.map(({ date, isCurrentMonth }, idx) => {
              const localAppointments = getAgendamentosDia(date)
              const isToday = new Date().toDateString() === date.toDateString()

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 bg-surface flex flex-col justify-between group transition-colors hover:bg-surface-hover ${
                    isCurrentMonth ? "" : "opacity-40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? "bg-accent text-accent-on font-semibold" : "text-text-secondary"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 max-h-[70px] scrollbar-thin">
                    {localAppointments.map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditarAgendamento(a)
                        }}
                        className={`px-1.5 py-0.5 text-[10px] rounded font-medium cursor-pointer border truncate transition-all ${
                          a.status === "confirmado"
                            ? "bg-success/10 border-success/20 text-success hover:bg-success/20"
                            : a.status === "cancelado"
                            ? "bg-danger/10 border-danger/20 text-danger hover:bg-danger/20"
                            : "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20"
                        }`}
                        title={`${a.clientes?.nome || "Cliente"} - ${a.titulo || "Agendamento"}`}
                      >
                        {new Date(a.data_inicio).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        - {a.clientes?.nome || "Sem Nome"}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <Table
            columns={columns}
            data={agendamentos}
            rowKey="id"
            loading={loading}
            emptyMessage="Nenhum agendamento encontrado"
          />
        </div>
      )}

      {/* Drawer */}
      <AgendaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        agendamentoInicial={agendamentoEditando}
        onSalvo={handleSalvo}
      />

      {/* Excluir Modal */}
      <ExcluirAgendamentoModal
        open={modalExcluirOpen}
        onClose={() => {
          setModalExcluirOpen(false)
          setAgendamentoExcluindo(null)
        }}
        agendamento={agendamentoExcluindo}
        onExcluido={handleExcluido}
      />
    </div>
  )
}
