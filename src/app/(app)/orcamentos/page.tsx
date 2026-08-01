"use client"

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react"
import { Plus, Search, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, type Column } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/toast"
import { OrcamentoDrawer } from "@/components/orcamentos/orcamento-drawer"
import { ExcluirOrcamentoModal } from "@/components/orcamentos/excluir-orcamento-modal"

const STATUS_VARIANTS = {
  pendente: "warning",
  aprovado: "success",
  recusado: "danger",
  expirado: "neutral",
} as const

export default function OrcamentosPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // States
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")

  // Modals / Drawers
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [orcamentoEditando, setOrcamentoEditando] = useState<any | null>(null)
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [orcamentoExcluindo, setOrcamentoExcluindo] = useState<any | null>(null)

  const carregarOrcamentos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("orcamentos")
      .select(`
        id, data, validade, desconto_tipo, desconto_valor, status, observacoes, cliente_id,
        clientes (id, nome, whatsapp),
        orcamento_servicos (
          id, servico_id, preco_aplicado,
          servicos (id, nome)
        )
      `)
      .order("criado_em", { ascending: false })

    if (error) {
      toast({
        variant: "error",
        title: "Erro ao carregar orçamentos",
        description: error.message,
      })
    } else {
      setOrcamentos(data || [])
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    carregarOrcamentos()
  }, [carregarOrcamentos])

  // Filtered List
  const orcamentosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return orcamentos.filter((o) => {
      const nomeCliente = o.clientes?.nome?.toLowerCase() || ""
      return nomeCliente.includes(q)
    })
  }, [orcamentos, busca])

  // Quick Action: Update Status
  const handleUpdateStatus = (id: string, novoStatus: "aprovado" | "recusado") => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("orcamentos")
          .update({ status: novoStatus })
          .eq("id", id)

        if (error) throw error

        toast({
          variant: "success",
          title: `Orçamento ${novoStatus === "aprovado" ? "Aprovado" : "Recusado"}`,
          description: `O status do orçamento foi atualizado com sucesso.`,
        })

        carregarOrcamentos()
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Erro ao atualizar status",
          description: err.message,
        })
      }
    })
  }

  const handleNovoOrcamento = () => {
    setOrcamentoEditando(null)
    setDrawerOpen(true)
  }

  const handleEditarOrcamento = (orcamento: any) => {
    setOrcamentoEditando(orcamento)
    setDrawerOpen(true)
  }

  const handleExcluirOrcamento = (orcamento: any) => {
    setOrcamentoExcluindo(orcamento)
    setModalExcluirOpen(true)
  }

  const handleSalvo = () => {
    setDrawerOpen(false)
    startTransition(() => {
      carregarOrcamentos()
    })
  }

  const handleExcluido = () => {
    setModalExcluirOpen(false)
    setOrcamentoExcluindo(null)
    startTransition(() => {
      carregarOrcamentos()
    })
  }

  // Columns definition
  const columns: Column<any>[] = [
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
      key: "data",
      label: "Data",
      render: (row) => {
        const d = new Date(row.data + "T12:00:00") // Avoid timezone shifts
        return <span className="text-xs text-text-primary font-medium">{d.toLocaleDateString("pt-BR")}</span>
      },
    },
    {
      key: "validade",
      label: "Validade",
      render: (row) => {
        if (!row.validade) return <span className="text-text-secondary text-xs">—</span>
        const d = new Date(row.validade + "T12:00:00")
        return <span className="text-xs text-text-secondary">{d.toLocaleDateString("pt-BR")}</span>
      },
    },
    {
      key: "valor_total",
      label: "Valor Total",
      align: "right",
      render: (row) => {
        const sum = row.orcamento_servicos?.reduce((acc: number, s: any) => acc + Number(s.preco_aplicado), 0) || 0
        const desc = Number(row.desconto_valor || 0)
        const total = Math.max(
          0,
          row.desconto_tipo === "percentual" ? sum * (1 - desc / 100) : sum - desc
        )
        return (
          <span className="font-semibold text-text-primary tabular-nums text-sm">
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
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
        <div className="flex items-center justify-end gap-1">
          {row.status === "pendente" && (
            <>
              <button
                onClick={() => handleUpdateStatus(row.id, "aprovado")}
                className="p-1.5 rounded hover:bg-surface-hover text-success transition-colors"
                title="Aprovar orçamento"
              >
                <CheckCircle size={14} />
              </button>
              <button
                onClick={() => handleUpdateStatus(row.id, "recusado")}
                className="p-1.5 rounded hover:bg-surface-hover text-danger transition-colors"
                title="Recusar orçamento"
              >
                <XCircle size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => handleEditarOrcamento(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleExcluirOrcamento(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-danger transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Gerencie orçamentos comerciais, valide aprovações e anexe fotos"
        actions={
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={handleNovoOrcamento}>
            Novo Orçamento
          </Button>
        }
      />

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente..."
            className="w-full h-9 pl-9 pr-3 rounded bg-surface border border-border text-sm text-text-primary placeholder:text-text-secondary transition-colors duration-150 outline-none focus:ring-2 focus:ring-accent focus:border-transparent hover:border-white/20"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={orcamentosFiltrados}
          rowKey="id"
          loading={loading}
          emptyMessage="Nenhum orçamento encontrado"
        />
      </div>

      {/* Drawer */}
      <OrcamentoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orcamentoInicial={orcamentoEditando}
        onSalvo={handleSalvo}
      />

      {/* Excluir Modal */}
      <ExcluirOrcamentoModal
        open={modalExcluirOpen}
        onClose={() => {
          setModalExcluirOpen(false)
          setOrcamentoExcluindo(null)
        }}
        orcamento={orcamentoExcluindo}
        onExcluido={handleExcluido}
      />
    </div>
  )
}
