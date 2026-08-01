"use client"

import React, { useState, useTransition, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, type Column } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Drawer } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface ServicosClienteProps {
  initialServicos: any[]
}

const servicoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  preco: z.number().min(0, "Preço inválido"),
  comissao_percentual: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  duracao_autoagendamento_minutos: z.number().optional().nullable(),
  ativo: z.boolean(),
})

type ServicoFormValues = {
  nome: string
  preco: number
  comissao_percentual: number
  duracao_autoagendamento_minutos?: number | null
  ativo: boolean
}

export function ServicosCliente({ initialServicos }: ServicosClienteProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { empresaId } = useEmpresa()
  const [isPending, startTransition] = useTransition()

  const [servicos, setServicos] = useState(initialServicos)
  const [busca, setBusca] = useState("")
  const [loading, setLoading] = useState(false)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)

  // Modal Excluir state
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      nome: "",
      preco: 0,
      comissao_percentual: 0,
      duracao_autoagendamento_minutos: null,
      ativo: true,
    },
  })

  const atualizarServicos = async () => {
    setLoading(true)
    const { data } = await supabase.from("servicos").select("*").order("nome")
    if (data) setServicos(data)
    setLoading(false)
  }

  const servicosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? servicos.filter(s => s.nome.toLowerCase().includes(q)) : servicos
  }, [servicos, busca])

  // Toggle ativo/inativo inline
  const handleToggleAtivo = async (servico: any) => {
    const novoStatus = !servico.ativo
    try {
      const { error } = await supabase
        .from("servicos")
        .update({ ativo: novoStatus })
        .eq("id", servico.id)

      if (error) throw error

      toast({ variant: "success", title: `Serviço ${novoStatus ? "ativado" : "desativado"}!` })
      await atualizarServicos()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao atualizar status", description: err.message })
    }
  }

  // Handlers CRUD
  const handleAbrirDrawer = (item: any = null) => {
    if (item) {
      setEditando(item)
      reset({
        nome: item.nome,
        preco: Number(item.preco),
        comissao_percentual: Number(item.comissao_percentual || 0),
        duracao_autoagendamento_minutos: item.duracao_autoagendamento_minutos || null,
        ativo: item.ativo,
      })
    } else {
      setEditando(null)
      reset({
        nome: "",
        preco: 0,
        comissao_percentual: 0,
        duracao_autoagendamento_minutos: null,
        ativo: true,
      })
    }
    setDrawerOpen(true)
  }

  const onSubmit = async (values: ServicoFormValues) => {
    if (!empresaId) return
    startTransition(async () => {
      try {
        const payload = {
          empresa_id: empresaId,
          nome: values.nome,
          preco: values.preco,
          comissao_percentual: values.comissao_percentual,
          duracao_autoagendamento_minutos: values.duracao_autoagendamento_minutos || null,
          ativo: values.ativo,
        }

        if (editando) {
          const { error } = await supabase
            .from("servicos")
            .update(payload)
            .eq("id", editando.id)
          if (error) throw error
          toast({ variant: "success", title: "Serviço atualizado com sucesso!" })
        } else {
          const { error } = await supabase
            .from("servicos")
            .insert(payload)
          if (error) throw error
          toast({ variant: "success", title: "Serviço criado com sucesso!" })
        }

        setDrawerOpen(false)
        await atualizarServicos()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao salvar", description: err.message })
      }
    })
  }

  const handleExcluir = async () => {
    if (!excluindoId) return
    try {
      const { error } = await supabase.from("servicos").delete().eq("id", excluindoId)
      if (error) throw error
      toast({ variant: "success", title: "Serviço excluído!" })
      setModalExcluirOpen(false)
      setExcluindoId(null)
      await atualizarServicos()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao excluir", description: "Verifique se o serviço possui agendamentos/vendas vinculados." })
    }
  }

  const columns: Column<any>[] = [
    {
      key: "nome",
      label: "Nome",
      render: (row) => <span className="font-medium text-text-primary">{row.nome}</span>,
    },
    {
      key: "preco",
      label: "Preço",
      render: (row) => (
        <span className="font-semibold text-text-primary tabular-nums">
          R$ {Number(row.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "comissao_percentual",
      label: "Comissão",
      render: (row) => <span className="tabular-nums">{row.comissao_percentual || 0}%</span>,
    },
    {
      key: "duracao_autoagendamento_minutos",
      label: "Duração Mínima",
      render: (row) => (
        <span className="text-text-secondary tabular-nums">
          {row.duracao_autoagendamento_minutos ? `${row.duracao_autoagendamento_minutos} min` : "Não definido"}
        </span>
      ),
    },
    {
      key: "ativo",
      label: "Ativo",
      render: (row) => (
        <button onClick={() => handleToggleAtivo(row)} className="focus:outline-none">
          {row.ativo ? (
            <ToggleRight className="text-success" size={22} />
          ) : (
            <ToggleLeft className="text-text-secondary" size={22} />
          )}
        </button>
      ),
    },
    {
      key: "acoes",
      label: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => handleAbrirDrawer(row)}>
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setExcluindoId(row.id)
              setModalExcluirOpen(true)
            }}
            className="text-text-secondary hover:text-danger"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Serviços"
        subtitle="Gerencie o catálogo de serviços oferecidos pela sua empresa"
        actions={
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => handleAbrirDrawer()}>
            Novo Serviço
          </Button>
        }
      />

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full h-9 pl-9 pr-3 rounded bg-surface border border-border text-sm text-text-primary placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-accent focus:border-transparent hover:border-white/20 transition-colors"
        />
      </div>

      {/* Tabela de Serviços */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <Table columns={columns} data={servicosFiltrados} rowKey="id" loading={loading} emptyMessage="Nenhum serviço registrado" />
      </div>

      {/* Drawer Criar/Editar */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editando ? "Editar Serviço" : "Novo Serviço"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nome do Serviço" {...register("nome")} placeholder="Ex: Higienização interna completa" error={errors.nome?.message} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Preço (R$)" type="number" step="0.01" {...register("preco", { valueAsNumber: true })} error={errors.preco?.message} />
            <Input label="Comissão (%)" type="number" step="0.01" {...register("comissao_percentual", { valueAsNumber: true })} error={errors.comissao_percentual?.message} />
          </div>

          <Input
            label="Duração Autoagendamento (minutos)"
            type="number"
            {...register("duracao_autoagendamento_minutos", { valueAsNumber: true })}
            placeholder="Opcional. Ex: 60"
            error={errors.duracao_autoagendamento_minutos?.message}
          />

          <div className="py-2">
            <Toggle
              label="Serviço Ativo para agendamentos e vendas"
              checked={watch("ativo")}
              onChange={(checked) => setValue("ativo", checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" type="button" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isPending}>Salvar</Button>
          </div>
        </form>
      </Drawer>

      {/* Modal Excluir */}
      <Modal
        open={modalExcluirOpen}
        onClose={() => setModalExcluirOpen(false)}
        title="Excluir Serviço?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalExcluirOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir}>Excluir</Button>
          </div>
        }
      >
        <p className="text-text-secondary text-sm">Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita e só será permitida se não existirem agendamentos associados.</p>
      </Modal>
    </div>
  )
}
