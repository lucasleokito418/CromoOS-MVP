"use client"

import React, { useState, useTransition, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Pencil, Trash2, Search, SlidersHorizontal, Settings2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, type Column } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Drawer } from "@/components/ui/drawer"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface MovimentacoesClienteProps {
  initialMovimentacoes: any[]
  contas: any[]
  categoriasFinanceiras: any[]
  categoriasDre: any[]
}

const movimentacaoSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  conta_id: z.string().min(1, "Conta é obrigatória"),
  categoria_id: z.string().optional().nullable(),
  categoria_dre_id: z.string().optional().nullable(),
  tipo: z.enum(["entrada", "saida"]),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  data: z.string().min(1, "Data é obrigatória"),
  status: z.enum(["pendente", "pago"]),
})

type MovimentacaoFormValues = {
  descricao: string
  conta_id: string
  categoria_id?: string | null
  categoria_dre_id?: string | null
  tipo: "entrada" | "saida"
  valor: number
  data: string
  status: "pendente" | "pago"
}

export function MovimentacoesCliente({
  initialMovimentacoes,
  contas,
  categoriasFinanceiras: initialCategoriasFin,
  categoriasDre: initialCategoriasDre,
}: MovimentacoesClienteProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { empresaId } = useEmpresa()
  const [isPending, startTransition] = useTransition()

  // Data states
  const [movimentacoes, setMovimentacoes] = useState(initialMovimentacoes)
  const [categoriasFin, setCategoriasFin] = useState(initialCategoriasFin)
  const [categoriasDre, setCategoriasDre] = useState(initialCategoriasDre)
  const [loading, setLoading] = useState(false)

  // Filters state
  const [filtroConta, setFiltroConta] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroDataDe, setFiltroDataDe] = useState("")
  const [filtroDataAte, setFiltroDataAte] = useState("")

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)

  // Modal Categorias state
  const [modalCategoriasOpen, setModalCategoriasOpen] = useState(false)
  const [catFinNome, setCatFinNome] = useState("")
  const [catFinTipo, setCatFinTipo] = useState<"entrada" | "saida">("entrada")
  const [catDreNome, setCatDreNome] = useState("")
  const [catDreGrupo, setCatDreGrupo] = useState("Despesas Operacionais")

  // Modal Excluir state
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<MovimentacaoFormValues>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: {
      descricao: "",
      conta_id: "",
      categoria_id: "",
      categoria_dre_id: "",
      tipo: "saida",
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
      status: "pago",
    },
  })

  const formTipo = watch("tipo")

  // Refresh functions
  const atualizarMovimentacoes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("movimentacoes_financeiras")
      .select(`
        *,
        contas_financeiras (id, nome),
        categorias_financeiras (id, nome),
        categorias_dre (id, nome)
      `)
      .order("data", { ascending: false })
    if (data) setMovimentacoes(data)
    setLoading(false)
  }

  const filtrarMovimentacoes = useMemo(() => {
    return movimentacoes.filter((m) => {
      if (filtroConta && m.conta_id !== filtroConta) return false
      if (filtroCategoria && m.categoria_id !== filtroCategoria) return false
      if (filtroStatus && m.status !== filtroStatus) return false
      if (filtroDataDe && m.data < filtroDataDe) return false
      if (filtroDataAte && m.data > filtroDataAte) return false
      return true
    })
  }, [movimentacoes, filtroConta, filtroCategoria, filtroStatus, filtroDataDe, filtroDataAte])

  // Handlers CRUD Movimentacoes
  const handleAbrirDrawer = (item: any = null) => {
    if (item) {
      setEditando(item)
      reset({
        descricao: item.descricao || "",
        conta_id: item.conta_id,
        categoria_id: item.categoria_id || "",
        categoria_dre_id: item.categoria_dre_id || "",
        tipo: item.tipo,
        valor: Number(item.valor),
        data: item.data,
        status: item.status,
      })
    } else {
      setEditando(null)
      reset({
        descricao: "",
        conta_id: contas.find((c) => c.principal)?.id || contas[0]?.id || "",
        categoria_id: "",
        categoria_dre_id: "",
        tipo: "saida",
        valor: 0,
        data: new Date().toISOString().slice(0, 10),
        status: "pago",
      })
    }
    setDrawerOpen(true)
  }

  const onSubmit = async (values: MovimentacaoFormValues) => {
    if (!empresaId) return
    startTransition(async () => {
      try {
        const payload = {
          empresa_id: empresaId,
          descricao: values.descricao,
          conta_id: values.conta_id,
          categoria_id: values.categoria_id || null,
          categoria_dre_id: values.categoria_dre_id || null,
          tipo: values.tipo,
          valor: values.valor,
          data: values.data,
          status: values.status,
        }

        if (editando) {
          const { error } = await supabase
            .from("movimentacoes_financeiras")
            .update(payload)
            .eq("id", editando.id)
          if (error) throw error
          toast({ variant: "success", title: "Movimentação atualizada com sucesso!" })
        } else {
          const { error } = await supabase
            .from("movimentacoes_financeiras")
            .insert(payload)
          if (error) throw error
          toast({ variant: "success", title: "Movimentação criada com sucesso!" })
        }
        setDrawerOpen(false)
        await atualizarMovimentacoes()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao salvar", description: err.message })
      }
    })
  }

  const handleExcluir = async () => {
    if (!excluindoId) return
    try {
      const { error } = await supabase
        .from("movimentacoes_financeiras")
        .delete()
        .eq("id", excluindoId)
      if (error) throw error
      toast({ variant: "success", title: "Movimentação excluída!" })
      setModalExcluirOpen(false)
      setExcluindoId(null)
      await atualizarMovimentacoes()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao excluir", description: err.message })
    }
  }

  // Handlers Categorias
  const handleCriarCategoriaFin = async () => {
    if (!catFinNome.trim() || !empresaId) return
    const { data, error } = await supabase
      .from("categorias_financeiras")
      .insert({ empresa_id: empresaId, nome: catFinNome.trim(), tipo: catFinTipo })
      .select()
      .single()
    if (error) {
      toast({ variant: "error", title: "Erro ao criar", description: error.message })
    } else {
      setCategoriasFin([...categoriasFin, data])
      setCatFinNome("")
      toast({ variant: "success", title: "Categoria criada!" })
    }
  }

  const handleCriarCategoriaDre = async () => {
    if (!catDreNome.trim() || !empresaId) return
    const { data, error } = await supabase
      .from("categorias_dre")
      .insert({ empresa_id: empresaId, nome: catDreNome.trim(), grupo: catDreGrupo })
      .select()
      .single()
    if (error) {
      toast({ variant: "error", title: "Erro ao criar", description: error.message })
    } else {
      setCategoriasDre([...categoriasDre, data])
      setCatDreNome("")
      toast({ variant: "success", title: "Categoria DRE criada!" })
    }
  }

  const handleExcluirCategoriaFin = async (id: string) => {
    const { error } = await supabase.from("categorias_financeiras").delete().eq("id", id)
    if (error) {
      toast({ variant: "error", title: "Não foi possível excluir", description: "Esta categoria pode estar sendo usada." })
    } else {
      setCategoriasFin(categoriasFin.filter((c) => c.id !== id))
      toast({ variant: "success", title: "Categoria excluída!" })
    }
  }

  const handleExcluirCategoriaDre = async (id: string) => {
    const { error } = await supabase.from("categorias_dre").delete().eq("id", id)
    if (error) {
      toast({ variant: "error", title: "Não foi possível excluir", description: "Esta categoria pode estar sendo usada." })
    } else {
      setCategoriasDre(categoriasDre.filter((c) => c.id !== id))
      toast({ variant: "success", title: "Categoria DRE excluída!" })
    }
  }

  const columns: Column<any>[] = [
    {
      key: "descricao",
      label: "Descrição",
      render: (row) => <span className="font-medium text-text-primary">{row.descricao}</span>,
    },
    {
      key: "conta",
      label: "Conta",
      render: (row) => <span>{row.contas_financeiras?.nome || "—"}</span>,
    },
    {
      key: "categoria",
      label: "Categoria",
      render: (row) => (
        <span className="text-xs text-text-secondary">
          {row.categorias_financeiras?.nome || "Sem categoria"}
        </span>
      ),
    },
    {
      key: "valor",
      label: "Valor",
      render: (row) => (
        <span className={`font-semibold tabular-nums ${row.tipo === "entrada" ? "text-success" : "text-danger"}`}>
          {row.tipo === "entrada" ? "+" : "-"} R$ {Number(row.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={row.status === "pago" ? "success" : "warning"}>
          {row.status === "pago" ? "Pago" : "Pendente"}
        </Badge>
      ),
    },
    {
      key: "data",
      label: "Data",
      render: (row) => <span className="tabular-nums">{new Date(row.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>,
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
        title="Movimentações Financeiras"
        subtitle="Controle de receitas e despesas da empresa"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<Settings2 size={16} />} onClick={() => setModalCategoriasOpen(true)}>
              Categorias
            </Button>
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => handleAbrirDrawer()}>
              Nova Movimentação
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="bg-surface border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <Select label="Conta" value={filtroConta} onChange={setFiltroConta} options={[{ value: "", label: "Todas as contas" }, ...contas.map(c => ({ value: c.id, label: c.nome }))]} />
        <Select label="Categoria" value={filtroCategoria} onChange={setFiltroCategoria} options={[{ value: "", label: "Todas as categorias" }, ...categoriasFin.map(c => ({ value: c.id, label: c.nome }))]} />
        <Select label="Status" value={filtroStatus} onChange={setFiltroStatus} options={[{ value: "", label: "Todos os status" }, { value: "pago", label: "Pago" }, { value: "pendente", label: "Pendente" }]} />
        <Input label="De" type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} />
        <Input label="Até" type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} />
      </div>

      {/* Tabela de Movimentações */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <Table columns={columns} data={filtrarMovimentacoes} rowKey="id" loading={loading} emptyMessage="Nenhuma movimentação registrada" />
      </div>

      {/* Drawer Criar/Editar */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editando ? "Editar Movimentação" : "Nova Movimentação"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Select
            label="Tipo"
            value={watch("tipo")}
            onChange={(val) => setValue("tipo", val as any)}
            options={[{ value: "saida", label: "Despesa (Saída)" }, { value: "entrada", label: "Receita (Entrada)" }]}
            error={errors.tipo?.message}
          />
          
          <Input label="Descrição" {...register("descricao")} placeholder="Ex: Aluguel da sala" error={errors.descricao?.message} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor" type="number" step="0.01" {...register("valor", { valueAsNumber: true })} error={errors.valor?.message} />
            <Input label="Data" type="date" {...register("data")} error={errors.data?.message} />
          </div>

          <Select
            label="Conta Bancária"
            value={watch("conta_id")}
            onChange={(val) => setValue("conta_id", val)}
            options={contas.map((c) => ({ value: c.id, label: c.nome }))}
            error={errors.conta_id?.message}
          />

          <Select
            label="Categoria"
            value={watch("categoria_id") || ""}
            onChange={(val) => setValue("categoria_id", val || null)}
            options={[{ value: "", label: "Nenhuma" }, ...categoriasFin.filter(c => c.tipo === formTipo).map(c => ({ value: c.id, label: c.nome }))]}
            error={errors.categoria_id?.message}
          />

          <Select
            label="Categoria DRE"
            value={watch("categoria_dre_id") || ""}
            onChange={(val) => setValue("categoria_dre_id", val || null)}
            options={[{ value: "", label: "Nenhuma" }, ...categoriasDre.map(c => ({ value: c.id, label: `${c.nome} (${c.grupo})` }))]}
            error={errors.categoria_dre_id?.message}
          />

          <Select
            label="Status"
            value={watch("status")}
            onChange={(val) => setValue("status", val as any)}
            options={[{ value: "pago", label: "Pago" }, { value: "pendente", label: "Pendente" }]}
            error={errors.status?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isPending}>Salvar</Button>
          </div>
        </form>
      </Drawer>

      {/* Modal Gerenciar Categorias */}
      <Modal open={modalCategoriasOpen} onClose={() => setModalCategoriasOpen(false)} title="Gerenciar Categorias" maxWidthClass="max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          
          {/* Categorias Financeiras */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">Categorias Financeiras</h3>
            <div className="flex gap-2">
              <Input placeholder="Nova categoria..." value={catFinNome} onChange={e => setCatFinNome(e.target.value)} className="flex-1" />
              <select value={catFinTipo} onChange={e => setCatFinTipo(e.target.value as any)} className="h-9 px-2 rounded bg-surface-hover border border-border text-sm text-text-primary outline-none">
                <option value="saida">Saída</option>
                <option value="entrada">Entrada</option>
              </select>
              <Button variant="primary" size="sm" onClick={handleCriarCategoriaFin}>
                <Plus size={16} />
              </Button>
            </div>

            <div className="space-y-1.5">
              {categoriasFin.map((c) => (
                <div key={c.id} className="flex justify-between items-center bg-surface-hover px-3 py-1.5 rounded border border-border/40">
                  <span className="text-sm text-text-primary">{c.nome}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.tipo === "entrada" ? "success" : "neutral"} className="text-[10px] uppercase">
                      {c.tipo === "entrada" ? "ent" : "saí"}
                    </Badge>
                    <button onClick={() => handleExcluirCategoriaFin(c.id)} className="text-text-secondary hover:text-danger transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias DRE */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">Categorias DRE</h3>
            <div className="flex flex-col gap-2">
              <Input placeholder="Nova categoria DRE..." value={catDreNome} onChange={e => setCatDreNome(e.target.value)} />
              <div className="flex gap-2">
                <select value={catDreGrupo} onChange={e => setCatDreGrupo(e.target.value)} className="flex-1 h-9 px-2 rounded bg-surface-hover border border-border text-sm text-text-primary outline-none">
                  <option value="Receitas">Receitas</option>
                  <option value="Custos">Custos de Venda</option>
                  <option value="Despesas Operacionais">Despesas Operacionais</option>
                  <option value="Despesas Financeiras">Despesas Financeiras</option>
                  <option value="Impostos">Impostos</option>
                </select>
                <Button variant="primary" size="sm" onClick={handleCriarCategoriaDre}>
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              {categoriasDre.map((c) => (
                <div key={c.id} className="flex justify-between items-center bg-surface-hover px-3 py-1.5 rounded border border-border/40">
                  <div className="flex flex-col">
                    <span className="text-sm text-text-primary">{c.nome}</span>
                    <span className="text-[10px] text-text-secondary">{c.grupo}</span>
                  </div>
                  <button onClick={() => handleExcluirCategoriaDre(c.id)} className="text-text-secondary hover:text-danger transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Excluir */}
      <Modal
        open={modalExcluirOpen}
        onClose={() => setModalExcluirOpen(false)}
        title="Excluir Movimentação?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalExcluirOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir}>Excluir</Button>
          </div>
        }
      >
        <p className="text-text-secondary text-sm">Esta ação removerá permanentemente esta movimentação financeira. Ela deixará de constar nos saldos e relatórios.</p>
      </Modal>
    </div>
  )
}
