"use client"

import React, { useState, useTransition, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Pencil, Trash2, ArrowLeftRight, Landmark } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Drawer } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Toggle } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface ContasClienteProps {
  initialContas: any[]
  movimentacoes: any[]
}

const contaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.enum(["conta_corrente", "maquininha"]),
  principal: z.boolean(),
  saldo_inicial: z.number(),
  taxa_debito: z.number(),
  taxa_pix: z.number(),
  modo_credito: z.enum(["taxa_unica", "escalonada"]),
})

type ContaFormValues = {
  nome: string
  tipo: "conta_corrente" | "maquininha"
  principal: boolean
  saldo_inicial: number
  taxa_debito: number
  taxa_pix: number
  modo_credito: "taxa_unica" | "escalonada"
}

const METODOS_DISPONIVEIS = [
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "credito", label: "Cartão de Crédito" },
  { id: "debito", label: "Cartão de Débito" },
  { id: "boleto", label: "Boleto" },
  { id: "transferencia", label: "Transferência" },
]

export function ContasCliente({ initialContas, movimentacoes }: ContasClienteProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { empresaId } = useEmpresa()
  const [isPending, startTransition] = useTransition()

  const [contas, setContas] = useState(initialContas)

  // Drawer Create/Edit state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)
  
  // Custom states for nested arrays/json inside drawer
  const [metodosRecebimento, setMetodosRecebimento] = useState<string[]>([])
  const [taxasCredito, setTaxasCredito] = useState<Record<string, number>>({})

  // Modal Transferencia state
  const [modalTransfOpen, setModalTransfOpen] = useState(false)
  const [transfOrigem, setTransfOrigem] = useState("")
  const [transfDestino, setTransfDestino] = useState("")
  const [transfValor, setTransfValor] = useState(0)

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
  } = useForm<ContaFormValues>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      nome: "",
      tipo: "conta_corrente",
      principal: false,
      saldo_inicial: 0,
      taxa_debito: 0,
      taxa_pix: 0,
      modo_credito: "taxa_unica",
    },
  })

  const formTipo = watch("tipo")
  const formModoCredito = watch("modo_credito")

  // Calcular Saldo de cada conta
  const contasComSaldo = useMemo(() => {
    return contas.map((conta) => {
      const list = movimentacoes.filter((m) => m.conta_id === conta.id && m.status === "pago")
      const entradas = list.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0)
      const saidas = list.filter((m) => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0)
      return {
        ...conta,
        saldoAtual: Number(conta.saldo_inicial) + entradas - saidas,
      }
    })
  }, [contas, movimentacoes])

  const atualizarContas = async () => {
    const { data } = await supabase.from("contas_financeiras").select("*").order("principal", { ascending: false })
    if (data) setContas(data)
  }

  // Handlers CRUD Contas
  const handleAbrirDrawer = (item: any = null) => {
    if (item) {
      setEditando(item)
      setMetodosRecebimento(item.metodos_recebimento || [])
      setTaxasCredito(item.taxas_credito || {})
      reset({
        nome: item.nome,
        tipo: item.tipo,
        principal: item.principal,
        saldo_inicial: Number(item.saldo_inicial),
        taxa_debito: Number(item.taxa_debito || 0),
        taxa_pix: Number(item.taxa_pix || 0),
        modo_credito: item.modo_credito || "taxa_unica",
      })
    } else {
      setEditando(null)
      setMetodosRecebimento(["pix", "dinheiro"])
      setTaxasCredito(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), 0])))
      reset({
        nome: "",
        tipo: "conta_corrente",
        principal: false,
        saldo_inicial: 0,
        taxa_debito: 0,
        taxa_pix: 0,
        modo_credito: "taxa_unica",
      })
    }
    setDrawerOpen(true)
  }

  const onSubmit = async (values: ContaFormValues) => {
    if (!empresaId) return
    startTransition(async () => {
      try {
        const payload = {
          empresa_id: empresaId,
          nome: values.nome,
          tipo: values.tipo,
          principal: values.principal,
          saldo_inicial: values.saldo_inicial,
          metodos_recebimento: metodosRecebimento,
          taxa_debito: values.taxa_debito,
          taxa_pix: values.taxa_pix,
          taxas_credito: taxasCredito,
          modo_credito: values.modo_credito,
        }

        // Se marcou como principal, desmarca a anterior antes de salvar
        if (values.principal) {
          await supabase
            .from("contas_financeiras")
            .update({ principal: false })
            .eq("empresa_id", empresaId)
            .eq("principal", true)
        }

        if (editando) {
          const { error } = await supabase
            .from("contas_financeiras")
            .update(payload)
            .eq("id", editando.id)
          if (error) throw error
          toast({ variant: "success", title: "Conta atualizada!" })
        } else {
          const { error } = await supabase
            .from("contas_financeiras")
            .insert(payload)
          if (error) throw error
          toast({ variant: "success", title: "Conta financeira criada!" })
        }

        setDrawerOpen(false)
        await atualizarContas()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao salvar", description: err.message })
      }
    })
  }

  const handleExcluir = async () => {
    if (!excluindoId) return
    try {
      const { error } = await supabase.from("contas_financeiras").delete().eq("id", excluindoId)
      if (error) throw error
      toast({ variant: "success", title: "Conta excluída!" })
      setModalExcluirOpen(false)
      setExcluindoId(null)
      await atualizarContas()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao excluir", description: "Verifique se a conta possui movimentações vinculadas." })
    }
  }

  // Handler Transferência
  const handleTransferir = async () => {
    if (!transfOrigem || !transfDestino || transfValor <= 0 || !empresaId) {
      toast({ variant: "error", title: "Preencha todos os campos corretamente" })
      return
    }
    if (transfOrigem === transfDestino) {
      toast({ variant: "error", title: "As contas de origem e destino devem ser diferentes" })
      return
    }

    startTransition(async () => {
      try {
        const contaOri = contas.find(c => c.id === transfOrigem)
        const contaDes = contas.find(c => c.id === transfDestino)

        const hoje = new Date().toISOString().slice(0, 10)

        // 1. Inserir Saída da Conta de Origem
        const { error: err1 } = await supabase.from("movimentacoes_financeiras").insert({
          empresa_id: empresaId,
          conta_id: transfOrigem,
          tipo: "saida",
          valor: transfValor,
          data: hoje,
          status: "pago",
          descricao: `Transferência para ${contaDes?.nome}`,
        })
        if (err1) throw err1

        // 2. Inserir Entrada na Conta de Destino
        const { error: err2 } = await supabase.from("movimentacoes_financeiras").insert({
          empresa_id: empresaId,
          conta_id: transfDestino,
          tipo: "entrada",
          valor: transfValor,
          data: hoje,
          status: "pago",
          descricao: `Transferência de ${contaOri?.nome}`,
        })
        if (err2) throw err2

        toast({ variant: "success", title: "Transferência realizada com sucesso!" })
        setModalTransfOpen(false)
        setTransfValor(0)
        
        // Recarregar a página para atualizar os saldos
        window.location.reload()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro na transferência", description: err.message })
      }
    })
  }

  const toggleMetodo = (metodo: string) => {
    setMetodosRecebimento((prev) =>
      prev.includes(metodo) ? prev.filter((m) => m !== metodo) : [...prev, metodo]
    )
  }

  const handleTaxaCreditoChange = (parcela: string, valor: string) => {
    setTaxasCredito((prev) => ({
      ...prev,
      [parcela]: Number(valor),
    }))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Contas Financeiras"
        subtitle="Gerencie contas bancárias e maquininhas da empresa"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<ArrowLeftRight size={16} />} onClick={() => setModalTransfOpen(true)}>
              Transferir Recursos
            </Button>
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => handleAbrirDrawer()}>
              Nova Conta
            </Button>
          </div>
        }
      />

      {/* Grid de Cards de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contasComSaldo.map((c) => (
          <Card key={c.id} padding="p-5" className="relative group hover:border-white/20 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-surface-hover flex items-center justify-center border border-border">
                  <Landmark size={20} className="text-text-secondary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    {c.nome}
                    {c.principal && <Badge variant="success">Principal</Badge>}
                  </h3>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">
                    {c.tipo === "conta_corrente" ? "Conta Corrente" : "Maquininha"}
                  </span>
                </div>
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button onClick={() => handleAbrirDrawer(c)} className="p-1 hover:bg-surface-hover rounded text-text-secondary hover:text-text-primary">
                  <Pencil size={13} />
                </button>
                {!c.principal && (
                  <button onClick={() => { setExcluindoId(c.id); setModalExcluirOpen(true) }} className="p-1 hover:bg-surface-hover rounded text-text-secondary hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-border/40 pt-4 flex justify-between items-end">
              <span className="text-xs text-text-secondary">Saldo Atual</span>
              <span className="text-lg font-bold font-oswald text-text-primary tracking-wide tabular-nums">
                R$ {c.saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Drawer Criar/Editar */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editando ? "Editar Conta" : "Nova Conta"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nome da Conta" {...register("nome")} placeholder="Ex: Conta Itaú Principal" error={errors.nome?.message} />

          <Select
            label="Tipo"
            value={watch("tipo")}
            onChange={(val) => setValue("tipo", val as any)}
            options={[{ value: "conta_corrente", label: "Conta Corrente" }, { value: "maquininha", label: "Maquininha de Cartão" }]}
            error={errors.tipo?.message}
          />

          <Input label="Saldo Inicial" type="number" step="0.01" {...register("saldo_inicial", { valueAsNumber: true })} disabled={!!editando} error={errors.saldo_inicial?.message} />

          <div className="py-2">
            <Toggle
              label="Definir como conta principal da empresa"
              checked={watch("principal")}
              onChange={(checked) => setValue("principal", checked)}
            />
          </div>

          {/* Métodos de Recebimento */}
          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Métodos de Recebimento Aceitos</label>
            <div className="grid grid-cols-2 gap-2.5">
              {METODOS_DISPONIVEIS.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <input type="checkbox" id={`chk-${m.id}`} checked={metodosRecebimento.includes(m.id)} onChange={() => toggleMetodo(m.id)} className="rounded border-border text-accent bg-surface-hover focus:ring-accent" />
                  <label htmlFor={`chk-${m.id}`} className="text-sm text-text-primary cursor-pointer select-none">{m.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Taxas de Débito/Pix se aceitar */}
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            {metodosRecebimento.includes("debito") && (
              <Input label="Taxa Débito (%)" type="number" step="0.01" {...register("taxa_debito", { valueAsNumber: true })} error={errors.taxa_debito?.message} />
            )}
            {metodosRecebimento.includes("pix") && (
              <Input label="Taxa Pix (%)" type="number" step="0.01" {...register("taxa_pix", { valueAsNumber: true })} error={errors.taxa_pix?.message} />
            )}
          </div>

          {/* Taxas de Crédito por parcela */}
          {metodosRecebimento.includes("credito") && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Taxas de Cartão de Crédito</label>
                <Select
                  label=""
                  value={watch("modo_credito")}
                  onChange={(val) => setValue("modo_credito", val as any)}
                  options={[{ value: "taxa_unica", label: "Taxa Única" }, { value: "escalonada", label: "Por Parcela (Escalonada)" }]}
                />
              </div>

              {formModoCredito === "taxa_unica" ? (
                <div className="w-1/2">
                  <Input
                    label="Taxa de Crédito Geral (%)"
                    type="number"
                    step="0.01"
                    value={taxasCredito["1"] || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setTaxasCredito(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), val])))
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const parc = String(idx + 1)
                    return (
                      <Input
                        key={parc}
                        label={`${parc}x (%)`}
                        type="number"
                        step="0.01"
                        value={taxasCredito[parc] || 0}
                        onChange={(e) => handleTaxaCreditoChange(parc, e.target.value)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isPending}>Salvar</Button>
          </div>
        </form>
      </Drawer>

      {/* Modal Transferência */}
      <Modal open={modalTransfOpen} onClose={() => setModalTransfOpen(false)} title="Transferência de Recursos">
        <div className="space-y-4">
          <Select
            label="Conta de Origem"
            value={transfOrigem}
            onChange={setTransfOrigem}
            options={[{ value: "", label: "Selecione a origem..." }, ...contas.map(c => ({ value: c.id, label: c.nome }))]}
          />
          <Select
            label="Conta de Destino"
            value={transfDestino}
            onChange={setTransfDestino}
            options={[{ value: "", label: "Selecione o destino..." }, ...contas.map(c => ({ value: c.id, label: c.nome }))]}
          />
          <Input
            label="Valor a Transferir (R$)"
            type="number"
            step="0.01"
            value={transfValor}
            onChange={e => setTransfValor(Number(e.target.value))}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setModalTransfOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleTransferir} loading={isPending}>Transferir</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Excluir */}
      <Modal
        open={modalExcluirOpen}
        onClose={() => setModalExcluirOpen(false)}
        title="Excluir Conta?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalExcluirOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir}>Excluir</Button>
          </div>
        }
      >
        <p className="text-text-secondary text-sm">Tem certeza que deseja excluir esta conta financeira? Ela só poderá ser removida se não houver movimentações ou pagamentos associados.</p>
      </Modal>
    </div>
  )
}
