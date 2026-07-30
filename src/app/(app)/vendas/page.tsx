"use client"

import React, { Suspense, useState, useEffect, useMemo, useCallback, useTransition } from "react"
import { Plus, Search, Pencil, Trash2, FileText } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, type Column } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { VendaDrawer } from "@/components/vendas/venda-drawer"
import { useSearchParams, useRouter } from "next/navigation"

const STATUS_VARIANTS = {
  aberta: "warning",
  concluida: "success",
  cancelada: "danger",
} as const

function VendasContent() {
  const supabase = createClient()
  const { toast } = useToast()
  const [, startTransition] = useTransition()

  const [vendas, setVendas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [vendaEditando, setVendaEditando] = useState<any | null>(null)

  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [vendaExcluindo, setVendaExcluindo] = useState<any | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const agendamentoId = searchParams.get("agendamento_id")

  useEffect(() => {
    if (agendamentoId) {
      setVendaEditando(null)
      setDrawerOpen(true)
    }
  }, [agendamentoId])

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    if (agendamentoId) {
      router.replace("/vendas")
    }
  }

  const handleSalvo = () => {
    setDrawerOpen(false)
    if (agendamentoId) {
      router.replace("/vendas")
    }
    carregarVendas()
  }

  const carregarVendas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("vendas")
      .select(`
        id, numero_sequencial, status, desconto_tipo, desconto_valor, criado_em,
        clientes (id, nome),
        perfis (id, nome),
        venda_servicos (id, servico_id, preco_aplicado, servicos (id, nome)),
        pagamentos (id, metodo, parcelas, valor, status, data_pagamento)
      `)
      .order("numero_sequencial", { ascending: false })

    if (error) {
      toast({ variant: "error", title: "Erro ao carregar vendas", description: error.message })
    } else {
      setVendas(data || [])
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => { carregarVendas() }, [carregarVendas])

  const vendasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q
      ? vendas.filter(v => v.clientes?.nome?.toLowerCase().includes(q))
      : vendas
  }, [vendas, busca])

  const handleExcluir = async () => {
    if (!vendaExcluindo) return
    setExcluindo(true)
    try {
      const { error } = await supabase.from("vendas").delete().eq("id", vendaExcluindo.id)
      if (error) throw error
      toast({ variant: "success", title: "Venda excluída" })
      setModalExcluirOpen(false)
      setVendaExcluindo(null)
      carregarVendas()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao excluir", description: err.message })
    } finally {
      setExcluindo(false)
    }
  }

  const calcTotal = (venda: any) => {
    const sum = venda.venda_servicos?.reduce((a: number, s: any) => a + Number(s.preco_aplicado), 0) || 0
    const desc = Number(venda.desconto_valor || 0)
    return Math.max(0, venda.desconto_tipo === "percentual" ? sum * (1 - desc / 100) : sum - desc)
  }

  const columns: Column<any>[] = [
    {
      key: "numero",
      label: "Nº",
      render: row => (
        <span className="text-xs font-semibold text-text-secondary tabular-nums">
          #{String(row.numero_sequencial).padStart(4, "0")}
        </span>
      ),
    },
    {
      key: "cliente",
      label: "Cliente",
      render: row => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.clientes?.nome || "Cliente"} size="sm" />
          <span className="text-sm font-medium text-text-primary truncate">{row.clientes?.nome || "—"}</span>
        </div>
      ),
    },
    {
      key: "funcionario",
      label: "Profissional",
      render: row => <span className="text-xs text-text-secondary">{row.perfis?.nome || "—"}</span>,
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      render: row => (
        <span className="text-sm font-semibold text-text-primary tabular-nums">
          {calcTotal(row).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: row => (
        <Badge variant={STATUS_VARIANTS[row.status as keyof typeof STATUS_VARIANTS] || "neutral"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "data",
      label: "Data",
      render: row => (
        <span className="text-xs text-text-secondary tabular-nums">
          {new Date(row.criado_em).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "acoes",
      label: "",
      align: "right",
      render: row => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => { setVendaEditando(row); setDrawerOpen(true) }}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => { setVendaExcluindo(row); setModalExcluirOpen(true) }}
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Vendas"
        subtitle="Registre e acompanhe ordens de serviço e pagamentos"
        actions={
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => { setVendaEditando(null); setDrawerOpen(true) }}>
            Nova Venda
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por cliente..."
          className="w-full h-9 pl-9 pr-3 rounded bg-surface border border-border text-sm text-text-primary placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-accent focus:border-transparent hover:border-white/20 transition-colors"
        />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={vendasFiltradas}
          rowKey="id"
          loading={loading}
          emptyMessage="Nenhuma venda registrada"
        />
      </div>

      {/* Drawer */}
      <VendaDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        vendaInicial={vendaEditando}
        agendamentoId={agendamentoId}
        onSalvo={handleSalvo}
      />

      {/* Delete Modal */}
      <Modal
        open={modalExcluirOpen}
        onClose={() => { setModalExcluirOpen(false); setVendaExcluindo(null) }}
        title="Excluir Venda?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalExcluirOpen(false)} disabled={excluindo}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir} loading={excluindo}>Excluir</Button>
          </div>
        }
      >
        <p>Excluir a <strong className="text-text-primary">Venda #{String(vendaExcluindo?.numero_sequencial).padStart(4, "0")}</strong> de <strong className="text-text-primary">{vendaExcluindo?.clientes?.nome}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  )
}

export default function VendasPage() {
  return (
    <Suspense fallback={null}>
      <VendasContent />
    </Suspense>
  )
}
