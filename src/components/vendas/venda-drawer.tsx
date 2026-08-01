"use client"

import React, { useEffect, useState, useTransition } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, FileText, UserPlus } from "lucide-react"
import { pdf } from "@react-pdf/renderer"

import { createClient } from "@/lib/supabase/client"
import { Drawer } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { PdfComprovante } from "@/components/vendas/pdf-comprovante"
import { useEmpresa } from "@/lib/contexts/empresa-context"
import { QuickClientModal, type ClienteCriado } from "@/components/clientes/quick-client-modal"

// ── Helpers ────────────────────────────────────────────────────────────────────

const METODOS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
]

const vendaSchema = z.object({
  cliente_id: z.string().min(1, "Cliente obrigatório"),
  funcionario_id: z.string().optional().nullable(),
  desconto_tipo: z.enum(["percentual", "valor"]),
  desconto_valor: z.number(),
  status: z.enum(["aberta", "concluida", "cancelada"]),
  servicos: z.array(z.object({
    servico_id: z.string().min(1),
    preco_aplicado: z.number().min(0),
  })).min(1, "Adicione ao menos um serviço"),
  pagamentos: z.array(z.object({
    metodo: z.string().min(1),
    parcelas: z.number(),
    valor: z.number().min(0.01),
    conta_id: z.string().min(1, "Conta obrigatória"),
  })),
})

export type VendaFormValues = {
  cliente_id: string
  funcionario_id?: string | null
  desconto_tipo: "percentual" | "valor"
  desconto_valor: number
  status: "aberta" | "concluida" | "cancelada"
  servicos: {
    servico_id: string
    preco_aplicado: number
  }[]
  pagamentos: {
    metodo: string
    parcelas: number
    valor: number
    conta_id: string
  }[]
}

interface VendaDrawerProps {
  open: boolean
  onClose: () => void
  vendaInicial: any | null
  agendamentoId?: string | null
  onSalvo: () => void
}

export function VendaDrawer({ open, onClose, vendaInicial, agendamentoId, onSalvo }: VendaDrawerProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const [clientes, setClientes] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([])
  const [empresa, setEmpresa] = useState<any | null>(null)
  const [contas, setContas] = useState<any[]>([])
  const [agendamentoPreload, setAgendamentoPreload] = useState<any | null>(null)
  const { empresaId } = useEmpresa()

  // ── Cadastro rápido de cliente ──────────────────────────────────────────────
  const [quickClientOpen, setQuickClientOpen] = useState(false)

  const {
    register, control, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<VendaFormValues>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      cliente_id: "",
      funcionario_id: "",
      desconto_tipo: "valor",
      desconto_valor: 0,
      status: "aberta",
      servicos: [],
      pagamentos: [],
    },
  })

  const { fields: servicoFields, append: appendServico, remove: removeServico } = useFieldArray({ control, name: "servicos" })
  const { fields: pagamentoFields, append: appendPagamento, remove: removePagamento } = useFieldArray({ control, name: "pagamentos" })

  const servicosSelecionados = watch("servicos") || []
  const pagamentosSelecionados = watch("pagamentos") || []
  const descontoTipo = watch("desconto_tipo")
  const descontoValor = watch("desconto_valor") || 0
  const statusAtual = watch("status")
  const clienteIdAtual = watch("cliente_id")

  const totalBruto = servicosSelecionados.reduce((a, s) => a + (s.preco_aplicado || 0), 0)
  const totalLiquido = Math.max(0, descontoTipo === "percentual" ? totalBruto * (1 - descontoValor / 100) : totalBruto - descontoValor)
  const totalPago = pagamentosSelecionados.reduce((a, p) => a + (p.valor || 0), 0)

  // ── Load base data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    async function load() {
      if (empresaId) {
        const { data: emp } = await supabase.from("empresas").select("id, nome, cnpj, telefone").eq("id", empresaId).single()
        setEmpresa(emp)

        let { data: listContas } = await supabase.from("contas_financeiras").select("id, nome").eq("empresa_id", empresaId)
        if (!listContas || listContas.length === 0) {
          const { data: novaConta, error: errConta } = await supabase
            .from("contas_financeiras")
            .insert({ empresa_id: empresaId, nome: "Conta Principal", tipo: "conta_corrente", principal: true, saldo_inicial: 0 })
            .select("id, nome")
            .single()
          if (!errConta && novaConta) {
            listContas = [novaConta]
          }
        }
        setContas(listContas || [])
      }

      if (agendamentoId) {
        const { data: agend } = await supabase
          .from("agendamentos")
          .select(`
            id, cliente_id, funcionario_id, status, desconto_tipo, desconto_valor,
            agendamento_servicos (servico_id, preco_aplicado)
          `)
          .eq("id", agendamentoId)
          .single()
        if (agend) {
          setAgendamentoPreload(agend)
        }
      } else {
        setAgendamentoPreload(null)
      }

      const [{ data: c }, { data: f }, { data: s }] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase.from("perfis").select("id, nome").in("papel", ["funcionario", "dono"]).eq("ativo", true).order("nome"),
        supabase.from("servicos").select("id, nome, preco").eq("ativo", true).order("nome"),
      ])
      setClientes(c || [])
      setFuncionarios(f || [])
      setServicosDisponiveis(s || [])
    }
    load()
  }, [open, supabase, empresaId, agendamentoId])

  // ── Populate form when editing or preloading from agenda ───────────────────
  useEffect(() => {
    if (!open) return
    if (vendaInicial) {
      reset({
        cliente_id: vendaInicial.cliente_id,
        funcionario_id: vendaInicial.funcionario_id || "",
        desconto_tipo: vendaInicial.desconto_tipo || "valor",
        desconto_valor: Number(vendaInicial.desconto_valor || 0),
        status: vendaInicial.status,
        servicos: (vendaInicial.venda_servicos || []).map((s: any) => ({
          servico_id: s.servico_id,
          preco_aplicado: Number(s.preco_aplicado),
        })),
        pagamentos: (vendaInicial.pagamentos || []).map((p: any) => ({
          metodo: p.metodo,
          parcelas: p.parcelas || 1,
          valor: Number(p.valor),
          conta_id: p.conta_id || "",
        })),
      })
    } else if (agendamentoPreload) {
      reset({
        cliente_id: agendamentoPreload.cliente_id,
        funcionario_id: agendamentoPreload.funcionario_id || "",
        desconto_tipo: agendamentoPreload.desconto_tipo || "valor",
        desconto_valor: Number(agendamentoPreload.desconto_valor || 0),
        status: "aberta",
        servicos: (agendamentoPreload.agendamento_servicos || []).map((s: any) => ({
          servico_id: s.servico_id,
          preco_aplicado: Number(s.preco_aplicado),
        })),
        pagamentos: [],
      })
    } else {
      reset({
        cliente_id: "",
        funcionario_id: "",
        desconto_tipo: "valor",
        desconto_valor: 0,
        status: "aberta",
        servicos: [],
        pagamentos: [],
      })
    }
  }, [open, vendaInicial, agendamentoPreload, reset])

  // ── Callback: novo cliente cadastrado rapidamente ──────────────────────────
  const handleClienteCriado = (cliente: ClienteCriado) => {
    // Adiciona à lista local para exibir imediatamente no Select
    setClientes(prev => [...prev, { id: cliente.id, nome: cliente.nome }].sort((a, b) => a.nome.localeCompare(b.nome)))
    // Auto-seleciona o cliente recém-criado
    setValue("cliente_id", cliente.id)
    setQuickClientOpen(false)
  }

  // ── Next sequential number ──────────────────────────────────────────────────
  async function getProxNumero(empId: string): Promise<number> {
    const { data } = await supabase
      .from("vendas")
      .select("numero_sequencial")
      .eq("empresa_id", empId)
      .order("numero_sequencial", { ascending: false })
      .limit(1)
    return (data && data.length > 0) ? data[0].numero_sequencial + 1 : 1
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values: VendaFormValues) => {
    if (!empresaId) return

    startTransition(async () => {
      try {

        const payload = {
          empresa_id: empresaId,
          cliente_id: values.cliente_id,
          funcionario_id: values.funcionario_id || null,
          desconto_tipo: values.desconto_tipo,
          desconto_valor: values.desconto_valor,
          status: values.status,
          agendamento_id: agendamentoPreload?.id || vendaInicial?.agendamento_id || null,
        }

        let vendaId = vendaInicial?.id

        if (vendaId) {
          const { error } = await supabase.from("vendas").update(payload).eq("id", vendaId)
          if (error) throw error

          await supabase.from("venda_servicos").delete().eq("venda_id", vendaId)
          await supabase.from("pagamentos").delete().eq("venda_id", vendaId)
        } else {
          const proxNum = await getProxNumero(empresaId)
          const { data: novaVenda, error } = await supabase
            .from("vendas")
            .insert({ ...payload, numero_sequencial: proxNum })
            .select("id")
            .single()
          if (error || !novaVenda) throw error
          vendaId = novaVenda.id

          if (agendamentoPreload?.id) {
            const { error: errAgend } = await supabase
              .from("agendamentos")
              .update({ status: "confirmado" })
              .eq("id", agendamentoPreload.id)
            if (errAgend) throw errAgend
          }
        }

        // Services
        if (values.servicos.length > 0) {
          const { error } = await supabase.from("venda_servicos").insert(
            values.servicos.map(s => ({
              empresa_id: empresaId,
              venda_id: vendaId,
              servico_id: s.servico_id,
              preco_aplicado: s.preco_aplicado,
            }))
          )
          if (error) throw error
        }

        // Payments
        if (values.pagamentos.length > 0) {
          const { error } = await supabase.from("pagamentos").insert(
            values.pagamentos.map(p => ({
              empresa_id: empresaId,
              venda_id: vendaId,
              conta_id: p.conta_id,
              metodo: p.metodo,
              parcelas: p.metodo === "credito" ? p.parcelas : 1,
              valor: p.valor,
              status: "pago",
              data_prevista: new Date().toISOString().slice(0, 10),
              data_pagamento: new Date().toISOString().slice(0, 10),
            }))
          )
          if (error) throw error
        }

        toast({ variant: "success", title: vendaInicial ? "Venda atualizada" : "Venda registrada com sucesso!" })
        onSalvo()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao salvar", description: err?.message || "Erro desconhecido" })
      }
    })
  }

  // ── Callback de erro de validação (chamado pelo handleSubmit quando Zod reprova) ─
  const onValidationError = () => {
    toast({
      variant: "warning",
      title: "Campos obrigatórios pendentes",
      description: "Preencha o cliente e adicione ao menos um serviço antes de salvar.",
    })
  }

  // ── PDF Generation ──────────────────────────────────────────────────────────
  const handleGerarPdf = async (formato: "A4" | "notinha" | "notinha_mini") => {
    if (!vendaInicial) return
    setIsGeneratingPdf(true)
    try {
      const vendaCompleta = {
        ...vendaInicial,
        venda_servicos: servicosSelecionados.map((s, i) => ({
          ...s,
          servicos: { nome: servicosDisponiveis.find(sd => sd.id === s.servico_id)?.nome || "Serviço" },
        })),
        pagamentos: pagamentosSelecionados,
        clientes: clientes.find(c => c.id === watch("cliente_id")),
        perfis: funcionarios.find(f => f.id === watch("funcionario_id")),
      }

      const blob = await pdf(
        <PdfComprovante venda={vendaCompleta} empresa={empresa} formato={formato} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao gerar PDF", description: err?.message })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <>
      {/* Modal de cadastro rápido de cliente */}
      <QuickClientModal
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        onClienteCriado={handleClienteCriado}
      />

      <Drawer
        open={open}
        onClose={onClose}
        title={vendaInicial ? `Venda #${vendaInicial.numero_sequencial}` : "Nova Venda"}
        subtitle="Registre serviços, pagamentos e gere comprovantes"
        maxWidth={540}
        footer={
          <div className="flex gap-2 w-full justify-between items-center">
            {vendaInicial && (
              <div className="flex gap-1">
                {(["A4", "notinha", "notinha_mini"] as const).map(fmt => (
                  <Button
                    key={fmt}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isGeneratingPdf}
                    onClick={() => handleGerarPdf(fmt)}
                    className="text-xs"
                    iconLeft={<FileText size={12} />}
                  >
                    {fmt === "A4" ? "A4" : fmt === "notinha" ? "Recibo" : "Mini"}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={handleSubmit(onSubmit, onValidationError)}
                loading={isPending}
                disabled={isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        }
      >
        <form className="space-y-5">
          {/* Cliente + Funcionário */}
          <div className="space-y-4">
            {/* Seletor de cliente com botão de cadastro rápido */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary leading-none">Cliente *</span>
                <button
                  type="button"
                  onClick={() => setQuickClientOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  <UserPlus size={12} />
                  Novo Cliente
                </button>
              </div>
              <Select
                value={clienteIdAtual}
                onChange={v => setValue("cliente_id", v)}
                options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                searchable
                placeholder="Selecione um cliente..."
                error={errors.cliente_id?.message}
              />
            </div>

            <Select
              label="Profissional"
              value={watch("funcionario_id") || ""}
              onChange={v => setValue("funcionario_id", v)}
              options={[{ value: "", label: "Sem atribuição" }, ...funcionarios.map(f => ({ value: f.id, label: f.nome }))]}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Status"
                value={statusAtual}
                onChange={v => setValue("status", v as any)}
                options={[
                  { value: "aberta", label: "Aberta" },
                  { value: "concluida", label: "Concluída" },
                  { value: "cancelada", label: "Cancelada" },
                ]}
              />
              <Select
                label="Desconto"
                value={descontoTipo}
                onChange={v => setValue("desconto_tipo", v as any)}
                options={[{ value: "valor", label: "R$" }, { value: "percentual", label: "%" }]}
              />
              <Input
                label="Valor"
                type="number"
                step="any"
                {...register("desconto_valor", { valueAsNumber: true })}
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Serviços */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Serviços</span>
              <Button
                type="button" variant="secondary" size="sm"
                iconLeft={<Plus size={13} />}
                onClick={() => servicosDisponiveis[0] && appendServico({ servico_id: servicosDisponiveis[0].id, preco_aplicado: Number(servicosDisponiveis[0].preco) })}
              >
                Adicionar
              </Button>
            </div>

            {servicoFields.map((f, i) => (
              <div key={f.id} className="flex gap-2 items-end p-3 bg-surface border border-border rounded relative">
                <button type="button" onClick={() => removeServico(i)} className="absolute -top-2 -right-2 p-1 bg-surface border border-border text-text-secondary hover:text-danger rounded-full transition-colors">
                  <Trash2 size={11} />
                </button>
                <div className="flex-1">
                  <Select
                    label="Serviço"
                    value={watch(`servicos.${i}.servico_id`)}
                    onChange={v => {
                      setValue(`servicos.${i}.servico_id`, v)
                      const s = servicosDisponiveis.find(sd => sd.id === v)
                      if (s) setValue(`servicos.${i}.preco_aplicado`, Number(s.preco))
                    }}
                    options={servicosDisponiveis.map(s => ({ value: s.id, label: s.nome }))}
                  />
                </div>
                <div className="w-28">
                  <Input label="Preço" type="number" step="0.01" {...register(`servicos.${i}.preco_aplicado` as const, { valueAsNumber: true })} />
                </div>
              </div>
            ))}

            {servicoFields.length === 0 && (
              <p className={`text-xs text-center py-3 border border-dashed rounded ${errors.servicos?.message ? "border-danger text-danger" : "border-border/50 text-text-secondary"}`}>
                {errors.servicos?.message || "Nenhum serviço adicionado."}
              </p>
            )}

            {servicoFields.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-surface border border-border rounded text-sm font-semibold">
                <span className="text-text-secondary">Total:</span>
                <span className="text-text-primary tabular-nums">
                  {totalLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Pagamentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pagamentos</span>
              <Button
                type="button" variant="secondary" size="sm"
                iconLeft={<Plus size={13} />}
                onClick={() => appendPagamento({ metodo: "pix", parcelas: 1, valor: Math.max(0, totalLiquido - totalPago), conta_id: contas[0]?.id || "" })}
              >
                + Pagamento
              </Button>
            </div>

            {pagamentoFields.map((f, i) => {
              const metodoAtual = watch(`pagamentos.${i}.metodo`)
              return (
                <div key={f.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-surface border border-border rounded relative">
                  <button type="button" onClick={() => removePagamento(i)} className="absolute -top-2 -right-2 p-1 bg-surface border border-border text-text-secondary hover:text-danger rounded-full transition-colors">
                    <Trash2 size={11} />
                  </button>
                  <div className={metodoAtual === "credito" ? "col-span-4" : "col-span-5"}>
                    <Select
                      label="Método"
                      value={metodoAtual}
                      onChange={v => setValue(`pagamentos.${i}.metodo`, v)}
                      options={METODOS_PAGAMENTO}
                    />
                  </div>
                  <div className={metodoAtual === "credito" ? "col-span-4" : "col-span-4"}>
                    <Select
                      label="Conta"
                      value={watch(`pagamentos.${i}.conta_id`)}
                      onChange={v => setValue(`pagamentos.${i}.conta_id`, v)}
                      options={contas.map(c => ({ value: c.id, label: c.nome }))}
                      error={errors.pagamentos?.[i]?.conta_id?.message}
                    />
                  </div>
                  {metodoAtual === "credito" && (
                    <div className="col-span-2">
                      <Input label="Parc." type="number" min={1} max={12} {...register(`pagamentos.${i}.parcelas` as const, { valueAsNumber: true })} />
                    </div>
                  )}
                  <div className={metodoAtual === "credito" ? "col-span-2" : "col-span-3"}>
                    <Input label="Valor" type="number" step="0.01" {...register(`pagamentos.${i}.valor` as const, { valueAsNumber: true })} />
                  </div>
                </div>
              )
            })}

            {pagamentoFields.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-3 border border-dashed border-border/50 rounded">Nenhum pagamento lançado.</p>
            )}

            {pagamentoFields.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-surface border border-border rounded text-xs">
                <span className="text-text-secondary">Pago / Restante:</span>
                <span className={`font-semibold tabular-nums ${totalLiquido - totalPago > 0 ? "text-warning" : "text-success"}`}>
                  {totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {Math.max(0, totalLiquido - totalPago).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            )}
          </div>
        </form>
      </Drawer>
    </>
  )
}
