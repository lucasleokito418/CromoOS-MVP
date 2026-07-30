"use client"

import React, { useEffect, useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Calendar, DollarSign, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Drawer } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"
import { useRouter } from "next/navigation"

interface AgendaDrawerProps {
  open: boolean
  onClose: () => void
  agendamentoInicial: any | null
  onSalvo: () => void
}

const agendamentoSchema = z.object({
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  ativo_tipo: z.enum(["veiculo", "estofado"]),
  ativo_id: z.string().min(1, "Ativo é obrigatório"),
  funcionario_id: z.string().min(1, "Funcionário é obrigatório"),
  titulo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  data_inicio: z.string().min(1, "Data/Hora de início é obrigatória"),
  data_fim: z.string().min(1, "Data/Hora de fim é obrigatória"),
  status: z.enum(["pendente", "confirmado", "cancelado"]),
  desconto_tipo: z.enum(["percentual", "valor"]),
  desconto_valor: z.number(),
  servicos: z.array(
    z.object({
      servico_id: z.string().min(1, "Serviço é obrigatório"),
      preco_aplicado: z.number().min(0, "Preço deve ser maior ou igual a zero"),
    })
  ).min(1, "Selecione ao menos um serviço"),
})

export type AgendamentoFormValues = {
  cliente_id: string
  ativo_tipo: "veiculo" | "estofado"
  ativo_id: string
  funcionario_id: string
  titulo?: string | null
  descricao?: string | null
  data_inicio: string
  data_fim: string
  status: "pendente" | "confirmado" | "cancelado"
  desconto_tipo: "percentual" | "valor"
  desconto_valor: number
  servicos: {
    servico_id: string
    preco_aplicado: number
  }[]
}

export function AgendaDrawer({ open, onClose, agendamentoInicial, onSalvo }: AgendaDrawerProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFaturando, setIsFaturando] = useState(false)
  const [showFaturar, setShowFaturar] = useState(false)

  // Options states
  const [clientes, setClientes] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([])
  const [ativosCliente, setAtivosCliente] = useState<any[]>([])
  
  // Faturamento fields
  const [metodoPagamento, setMetodoPagamento] = useState("pix")
  const { empresaId } = useEmpresa()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AgendamentoFormValues>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      cliente_id: "",
      ativo_tipo: "veiculo",
      ativo_id: "",
      funcionario_id: "",
      titulo: "",
      descricao: "",
      data_inicio: "",
      data_fim: "",
      status: "pendente",
      desconto_tipo: "valor",
      desconto_valor: 0,
      servicos: [],
    },
  })

  const { fields: servicoFields, append: appendServico, remove: removeServico } = useFieldArray({
    control,
    name: "servicos",
  })

  const selectedClienteId = watch("cliente_id")
  const selectedAtivoTipo = watch("ativo_tipo")
  const servicosSelecionados = watch("servicos") || []
  const descontoTipo = watch("desconto_tipo")
  const descontoValor = watch("desconto_valor") || 0

  // Fetch base options
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load clients
      const { data: listClientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome")
      setClientes(listClientes || [])

      // Load staff
      const { data: listFuncionarios } = await supabase
        .from("perfis")
        .select("id, nome")
        .in("papel", ["funcionario", "dono"])
        .eq("ativo", true)
        .order("nome")
      setFuncionarios(listFuncionarios || [])

      // Load services
      const { data: listServicos } = await supabase
        .from("servicos")
        .select("id, nome, preco")
        .eq("ativo", true)
        .order("nome")
      setServicosDisponiveis(listServicos || [])
    }

    if (open) {
      loadData()
      setShowFaturar(false)
    }
  }, [open, supabase])

  // Fetch client specific assets (vehicles and upholstery)
  useEffect(() => {
    async function loadAtivos() {
      if (!selectedClienteId) {
        setAtivosCliente([])
        return
      }

      const { data: veiculos } = await supabase
        .from("veiculos")
        .select("id, brand:marca, model:modelo, color:cor, placa")
        .eq("cliente_id", selectedClienteId)

      const { data: estofados } = await supabase
        .from("estofados")
        .select("id, descricao, cor")
        .eq("cliente_id", selectedClienteId)

      const listVeiculos = (veiculos || []).map(v => ({
        value: v.id,
        label: `Veículo: ${v.brand} ${v.model} (${v.color || "Sem cor"}) - ${v.placa || "Sem placa"}`,
        tipo: "veiculo",
      }))

      const listEstofados = (estofados || []).map(e => ({
        value: e.id,
        label: `Estofado: ${e.descricao} (${e.cor || "Sem cor"})`,
        tipo: "estofado",
      }))

      setAtivosCliente([...listVeiculos, ...listEstofados])
    }

    loadAtivos()
  }, [selectedClienteId, supabase])

  // Auto-populate edit data
  useEffect(() => {
    if (open && agendamentoInicial) {
      const startLocal = new Date(agendamentoInicial.data_inicio)
      const endLocal = new Date(agendamentoInicial.data_fim)

      // Format to datetime-local input string YYYY-MM-DDTHH:MM
      const offset = startLocal.getTimezoneOffset()
      const formatDT = (d: Date) => {
        const adjusted = new Date(d.getTime() - offset * 60 * 1000)
        return adjusted.toISOString().slice(0, 16)
      }

      const ativoTipo = agendamentoInicial.veiculo_id ? "veiculo" : "estofado"
      const ativoId = agendamentoInicial.veiculo_id || agendamentoInicial.estofado_id || ""

      reset({
        cliente_id: agendamentoInicial.cliente_id,
        ativo_tipo: ativoTipo as any,
        ativo_id: ativoId,
        funcionario_id: agendamentoInicial.funcionario_id || "",
        titulo: agendamentoInicial.titulo || "",
        descricao: agendamentoInicial.descricao || "",
        data_inicio: formatDT(startLocal),
        data_fim: formatDT(endLocal),
        status: agendamentoInicial.status,
        desconto_tipo: agendamentoInicial.desconto_tipo || "valor",
        desconto_valor: Number(agendamentoInicial.desconto_valor || 0),
        servicos: (agendamentoInicial.agendamento_servicos || []).map((s: any) => ({
          servico_id: s.servico_id,
          preco_aplicado: Number(s.preco_aplicado),
        })),
      })
    } else if (open && !agendamentoInicial) {
      reset({
        cliente_id: "",
        ativo_tipo: "veiculo",
        ativo_id: "",
        funcionario_id: "",
        titulo: "",
        descricao: "",
        data_inicio: "",
        data_fim: "",
        status: "pendente",
        desconto_tipo: "valor",
        desconto_valor: 0,
        servicos: [],
      })
    }
  }, [open, agendamentoInicial, reset])

  // Calculation of totals
  const totalBruto = servicosSelecionados.reduce((acc, item) => acc + (item.preco_aplicado || 0), 0)
  const totalLiquido = Math.max(
    0,
    descontoTipo === "percentual"
      ? totalBruto * (1 - descontoValor / 100)
      : totalBruto - descontoValor
  )

  const handleAddServico = () => {
    if (servicosDisponiveis.length > 0) {
      appendServico({ servico_id: servicosDisponiveis[0].id, preco_aplicado: Number(servicosDisponiveis[0].preco) })
    }
  }

  const onSubmit = async (values: AgendamentoFormValues) => {
    if (!empresaId) return

    startTransition(async () => {
      try {
        const payload = {
          empresa_id: empresaId,
          cliente_id: values.cliente_id,
          veiculo_id: values.ativo_tipo === "veiculo" ? values.ativo_id : null,
          estofado_id: values.ativo_tipo === "estofado" ? values.ativo_id : null,
          funcionario_id: values.funcionario_id || null,
          titulo: values.titulo || null,
          descricao: values.descricao || null,
          data_inicio: new Date(values.data_inicio).toISOString(),
          data_fim: new Date(values.data_fim).toISOString(),
          status: values.status,
          desconto_tipo: values.desconto_tipo,
          desconto_valor: values.desconto_valor,
        }

        if (agendamentoInicial?.id) {
          // Update Agendamento
          const { error: errUpdate } = await supabase
            .from("agendamentos")
            .update(payload)
            .eq("id", agendamentoInicial.id)
          if (errUpdate) throw errUpdate

          // Sync Services
          const { error: errDelServicos } = await supabase
            .from("agendamento_servicos")
            .delete()
            .eq("agendamento_id", agendamentoInicial.id)
          if (errDelServicos) throw errDelServicos

          const payloadServicos = values.servicos.map(s => ({
            empresa_id: empresaId,
            agendamento_id: agendamentoInicial.id,
            servico_id: s.servico_id,
            preco_aplicado: s.preco_aplicado,
          }))

          const { error: errInsServicos } = await supabase
            .from("agendamento_servicos")
            .insert(payloadServicos)
          if (errInsServicos) throw errInsServicos

          toast({
            variant: "success",
            title: "Agendamento atualizado",
            description: "O agendamento foi salvo com sucesso.",
          })
        } else {
          // Insert Agendamento
          const { data: newAgendamento, error: errInsert } = await supabase
            .from("agendamentos")
            .insert(payload)
            .select("id")
            .single()

          if (errInsert || !newAgendamento) throw errInsert

          const payloadServicos = values.servicos.map(s => ({
            empresa_id: empresaId,
            agendamento_id: newAgendamento.id,
            servico_id: s.servico_id,
            preco_aplicado: s.preco_aplicado,
          }))

          const { error: errInsServicos } = await supabase
            .from("agendamento_servicos")
            .insert(payloadServicos)
          if (errInsServicos) throw errInsServicos

          toast({
            variant: "success",
            title: "Agendamento criado",
            description: "Agendamento cadastrado com sucesso.",
          })
        }

        onSalvo()
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Erro ao salvar",
          description: err.message || "Erro desconhecido.",
        })
      }
    })
  }

  // Handle Quick Billing (Faturar/Registrar Pagamento)
  const handleFaturar = async () => {
    if (!agendamentoInicial?.id || !empresaId) return

    setIsFaturando(true)
    try {
      // 1. Confirm the financial account or create principal account
      const { data: contas } = await supabase
        .from("contas_financeiras")
        .select("id")
        .eq("empresa_id", empresaId)
        .limit(1)

      let contaId = contas?.[0]?.id

      if (!contaId) {
        const { data: novaConta, error: errConta } = await supabase
          .from("contas_financeiras")
          .insert({
            empresa_id: empresaId,
            nome: "Conta Principal",
            tipo: "conta_corrente",
            principal: true,
            saldo_inicial: 0,
          })
          .select("id")
          .single()

        if (errConta || !novaConta) throw errConta
        contaId = novaConta.id
      }

      // 2. Determine sequential sale number
      const { data: vendasCount } = await supabase
        .from("vendas")
        .select("numero_sequencial")
        .eq("empresa_id", empresaId)
        .order("numero_sequencial", { ascending: false })
        .limit(1)

      const proxNum = vendasCount && vendasCount.length > 0
        ? vendasCount[0].numero_sequencial + 1
        : 1

      // 3. Create the venda record
      const { data: novaVenda, error: errVenda } = await supabase
        .from("vendas")
        .insert({
          empresa_id: empresaId,
          numero_sequencial: proxNum,
          cliente_id: agendamentoInicial.cliente_id,
          funcionario_id: agendamentoInicial.funcionario_id || null,
          agendamento_id: agendamentoInicial.id,
          desconto_tipo: descontoTipo,
          desconto_valor: descontoValor,
          status: "concluida",
        })
        .select("id")
        .single()

      if (errVenda || !novaVenda) throw errVenda

      // 4. Create venda services
      const payloadVendaServicos = servicosSelecionados.map(s => ({
        empresa_id: empresaId,
        venda_id: novaVenda.id,
        servico_id: s.servico_id,
        preco_aplicado: s.preco_aplicado,
      }))

      const { error: errVendaServ } = await supabase
        .from("venda_servicos")
        .insert(payloadVendaServicos)
      if (errVendaServ) throw errVendaServ

      // 5. Record the pagamento
      const { error: errPagamento } = await supabase
        .from("pagamentos")
        .insert({
          empresa_id: empresaId,
          venda_id: novaVenda.id,
          conta_id: contaId,
          metodo: metodoPagamento,
          valor: totalLiquido,
          status: "pago",
          data_prevista: new Date().toISOString().slice(0, 10),
          data_pagamento: new Date().toISOString().slice(0, 10),
        })

      if (errPagamento) throw errPagamento

      // 6. Update agendamento status to 'confirmado'
      const { error: errAgendamentoStatus } = await supabase
        .from("agendamentos")
        .update({ status: "confirmado" })
        .eq("id", agendamentoInicial.id)

      if (errAgendamentoStatus) throw errAgendamentoStatus

      // 7. Add financial transaction record
      await supabase.from("movimentacoes_financeiras").insert({
        empresa_id: empresaId,
        conta_id: contaId,
        venda_id: novaVenda.id,
        tipo: "entrada",
        valor: totalLiquido,
        status: "pago",
        data: new Date().toISOString().slice(0, 10),
        descricao: `Venda Ref. Agendamento #${agendamentoInicial.id.slice(0, 8)}`,
      })

      toast({
        variant: "success",
        title: "Pagamento Registrado",
        description: "Venda gerada e fluxo financeiro integrado com sucesso.",
      })

      setShowFaturar(false)
      onSalvo()
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Erro no faturamento",
        description: err.message || "Erro desconhecido.",
      })
    } finally {
      setIsFaturando(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={agendamentoInicial ? "Editar Agendamento" : "Novo Agendamento"}
      subtitle="Defina datas, serviços e profissional responsável"
      maxWidth={520}
      footer={
        <div className="flex gap-2 w-full justify-between items-center">
          <div>
            {agendamentoInicial && agendamentoInicial.status !== "confirmado" && !showFaturar && (
              <Button
                variant="ghost"
                type="button"
                className="text-success hover:bg-success/15"
                iconLeft={<DollarSign size={15} />}
                onClick={() => {
                  onClose()
                  router.push(`/vendas?agendamento_id=${agendamentoInicial.id}`)
                }}
              >
                Faturar / Registrar Pagamento
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isPending || isFaturando}>
              Cancelar
            </Button>
            {!showFaturar && (
              <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isPending}>
                Salvar
              </Button>
            )}
          </div>
        </div>
      }
    >
      {showFaturar ? (
        <div className="space-y-6 py-4">
          <div className="p-4 bg-surface border border-success/20 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-success flex items-center gap-1.5">
              <DollarSign size={16} /> Confirmar Pagamento do Agendamento
            </h3>
            <p className="text-xs text-text-secondary">
              Isso fechará a ordem de serviço, gerando uma Venda faturada e a movimentação financeira correspondente.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-border py-2 text-sm">
              <span className="text-text-secondary">Total Bruto:</span>
              <span className="font-semibold tabular-nums">
                {totalBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            {descontoValor > 0 && (
              <div className="flex justify-between border-b border-border py-2 text-sm text-danger">
                <span>Desconto ({descontoTipo === "percentual" ? `${descontoValor}%` : "R$"}):</span>
                <span className="font-semibold tabular-nums">
                  -{ (descontoTipo === "percentual" ? totalBruto * (descontoValor / 100) : descontoValor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
                </span>
              </div>
            )}
            <div className="flex justify-between border-b border-border py-2 text-base font-bold">
              <span className="text-text-primary">Valor Líquido a Receber:</span>
              <span className="text-success tabular-nums">
                {totalLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>

            <Select
              label="Forma de Recebimento"
              value={metodoPagamento}
              onChange={(val) => setMetodoPagamento(val)}
              options={[
                { value: "pix", label: "PIX" },
                { value: "dinheiro", label: "Dinheiro" },
                { value: "credito", label: "Cartão de Crédito" },
                { value: "debito", label: "Cartão de Débito" },
                { value: "boleto", label: "Boleto" },
                { value: "transferencia", label: "Transferência" },
              ]}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowFaturar(false)} disabled={isFaturando}>
              Voltar
            </Button>
            <Button variant="primary" className="bg-success hover:bg-emerald-600 text-white" onClick={handleFaturar} loading={isFaturando}>
              {isFaturando ? "Processando..." : "Confirmar e Registrar Venda"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-4">
            {/* Clientes */}
            <Select
              label="Cliente *"
              value={selectedClienteId}
              onChange={(val) => {
                setValue("cliente_id", val)
                setValue("ativo_id", "")
              }}
              options={clientes.map(c => ({ value: c.id, label: c.nome }))}
              searchable
              placeholder="Selecione um cliente..."
            />

            {/* Ativo selection (Vehicle / Estofado) */}
            {selectedClienteId && (
              <div className="grid grid-cols-3 gap-3 items-end bg-surface/30 p-3 border border-border rounded">
                <div className="col-span-1">
                  <Select
                    label="Tipo de Ativo"
                    value={selectedAtivoTipo}
                    onChange={(val) => {
                      setValue("ativo_tipo", val as "veiculo" | "estofado")
                      setValue("ativo_id", "")
                    }}
                    options={[
                      { value: "veiculo", label: "Veículo" },
                      { value: "estofado", label: "Estofado" },
                    ]}
                  />
                </div>
                <div className="col-span-2">
                  <Select
                    label="Ativo do Cliente *"
                    value={watch("ativo_id")}
                    onChange={(val) => setValue("ativo_id", val)}
                    options={ativosCliente.filter(a => a.tipo === selectedAtivoTipo)}
                    placeholder="Selecione o ativo..."
                  />
                </div>
              </div>
            )}

            {/* Responsável */}
            <Select
              label="Profissional Responsável *"
              value={watch("funcionario_id")}
              onChange={(val) => setValue("funcionario_id", val)}
              options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
              placeholder="Selecione o funcionário..."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Início *"
                type="datetime-local"
                error={errors.data_inicio?.message}
                {...register("data_inicio")}
              />
              <Input
                label="Fim *"
                type="datetime-local"
                error={errors.data_fim?.message}
                {...register("data_fim")}
              />
            </div>

            <Input
              label="Título"
              placeholder="Ex: Lavagem simples"
              {...register("titulo")}
            />

            <Textarea
              label="Descrição"
              placeholder="Notas ou detalhes do agendamento..."
              {...register("descricao")}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                value={watch("status")}
                onChange={(val) => setValue("status", val as any)}
                options={[
                  { value: "pendente", label: "Pendente" },
                  { value: "confirmado", label: "Confirmado" },
                  { value: "cancelado", label: "Cancelado" },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Tipo Desc."
                  value={descontoTipo}
                  onChange={(val) => setValue("desconto_tipo", val as any)}
                  options={[
                    { value: "valor", label: "Valor ($)" },
                    { value: "percentual", label: "Pct (%)" },
                  ]}
                />
                <Input
                  label="Valor Desc."
                  type="number"
                  step="any"
                  {...register("desconto_valor", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Serviços do Agendamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Serviços Requisitados
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={handleAddServico}
              >
                Adicionar Serviço
              </Button>
            </div>

            {servicoFields.map((field, index) => {
              const currentServId = watch(`servicos.${index}.servico_id`)
              return (
                <div key={field.id} className="flex gap-3 items-end p-3 bg-surface border border-border rounded relative">
                  <button
                    type="button"
                    onClick={() => removeServico(index)}
                    className="absolute -top-2 -right-2 text-text-secondary hover:text-danger bg-surface hover:bg-surface-hover border border-border p-1 rounded-full transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>

                  <div className="flex-1">
                    <Select
                      label="Serviço"
                      value={currentServId}
                      onChange={(val) => {
                        setValue(`servicos.${index}.servico_id`, val)
                        const sObj = servicosDisponiveis.find(s => s.id === val)
                        if (sObj) {
                          setValue(`servicos.${index}.preco_aplicado`, Number(sObj.preco))
                        }
                      }}
                      options={servicosDisponiveis.map(s => ({ value: s.id, label: s.nome }))}
                    />
                  </div>

                  <div className="w-32">
                    <Input
                      label="Preço Cobrado"
                      type="number"
                      step="0.01"
                      error={errors.servicos?.[index]?.preco_aplicado?.message}
                      {...register(`servicos.${index}.preco_aplicado` as const, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )
            })}

            {servicoFields.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-2 bg-surface/30 rounded border border-dashed border-border/55">
                Nenhum serviço selecionado ainda.
              </p>
            )}

            {errors.servicos?.message && (
              <p className="text-xs text-danger">{errors.servicos.message}</p>
            )}

            {/* Total summary */}
            {servicoFields.length > 0 && (
              <div className="p-3 bg-surface rounded border border-border flex items-center justify-between text-sm">
                <span className="text-text-secondary font-medium">Total Estimado:</span>
                <span className="text-text-primary font-semibold tabular-nums">
                  {totalLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            )}
          </div>
        </form>
      )}
    </Drawer>
  )
}
