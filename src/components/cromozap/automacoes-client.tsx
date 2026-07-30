"use client"

import React, { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Pencil, Trash2, Code, FileText, Send, CheckCircle2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, type Column } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Drawer } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { automacaoSchema, type AutomacaoFormValues } from "@/lib/schemas/automacao"

export interface Automacao extends Record<string, unknown> {
  id: string
  empresa_id: string
  nome: string
  gatilho: "agendamento_confirmado" | "orcamento_criado" | "alerta_revisao_6meses" | "alerta_maresia_litoral"
  template_mensagem: string
  status: boolean
  created_at: string
  updated_at: string
}

interface AutomacoesClientProps {
  empresaId: string
  automacoesIniciais: Automacao[]
}

const OPTIONS_GATILHO = [
  { value: "agendamento_confirmado", label: "Agendamento Confirmado" },
  { value: "orcamento_criado", label: "Orçamento Criado" },
  { value: "alerta_revisao_6meses", label: "Alerta Revisão (6 meses)" },
  { value: "alerta_maresia_litoral", label: "Alerta Maresia/Litoral" },
]

const TEMPLATES_ZAP: Record<string, string> = {
  alerta_maresia_litoral:
    "Olá, {nome_cliente}! Faz 6 meses que você aplicou a proteção de chassis e pintura contra a maresia no seu {veiculo} aqui na {nome_empresa}. O efeito protetivo está no limite! Vamos agendar sua inspeção de garantia e reaplicação preventiva para essa semana? Evite a oxidação precoce da lataria. Responda com o dia ideal!",
  alerta_revisao_6meses:
    "O sol não perdoa, {nome_cliente}! ☀️ Já se passaram 6 meses desde a última hidratação profunda dos bancos de couro do seu {veiculo}. Para evitar o ressecamento e rachaduras que desvalorizam o carro, o ideal é refazer o processo agora. Temos vaga para este sábado às 09h na {nome_empresa}. Confirmamos?",
  agendamento_confirmado:
    "Tudo pronto, {nome_cliente}! Seu agendamento para o serviço de {servico} está confirmado na {nome_empresa}. 🗓️ Data: {data_agendamento} às {horario_agendamento}. Solicitamos trazer o veículo sem pertences pessoais de valor. Esperamos você!",
  orcamento_criado:
    "Olá, {nome_cliente}! Seu orçamento para o serviço no seu {veiculo} foi gerado na {nome_empresa}. Por favor, responda a esta mensagem para que possamos confirmar e agendar o seu atendimento!",
}

const VARIAVEIS_DISPONIVEIS = [
  { tag: "nome_cliente", desc: "Nome completo do cliente" },
  { tag: "nome_empresa", desc: "Nome de fantasia da empresa" },
  { tag: "veiculo", desc: "Marca/Modelo do veículo do cliente" },
  { tag: "servico", desc: "Serviço a ser realizado" },
  { tag: "data_agendamento", desc: "Data do agendamento" },
  { tag: "horario_agendamento", desc: "Horário do agendamento" },
]

export function AutomacoesClient({ empresaId, automacoesIniciais }: AutomacoesClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // Estados locais
  const [automacoes, setAutomacoes] = useState<Automacao[]>(automacoesIniciais)
  const [loading, setLoading] = useState(false)

  // Drawer Criar/Editar
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<Automacao | null>(null)

  // Modal Excluir
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AutomacaoFormValues>({
    resolver: zodResolver(automacaoSchema),
    defaultValues: {
      nome: "",
      gatilho: "agendamento_confirmado",
      template_mensagem: "",
      status: true,
    },
  })

  const formGatilho = watch("gatilho")
  const formTemplate = watch("template_mensagem")

  const atualizarAutomacoes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("automacoes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
    if (data) setAutomacoes(data)
    setLoading(false)
  }

  // Toggle status inline
  const handleToggleStatus = async (item: Automacao) => {
    const novoStatus = !item.status
    // Otimista
    setAutomacoes((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: novoStatus } : a))
    )

    try {
      const { error } = await supabase
        .from("automacoes")
        .update({ status: novoStatus })
        .eq("id", item.id)

      if (error) throw error

      toast({
        variant: "success",
        title: novoStatus ? "Automação ativada!" : "Automação desativada!",
      })
    } catch (err: unknown) {
      // Reverte
      setAutomacoes((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: item.status } : a))
      )
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast({ variant: "error", title: "Erro ao atualizar status", description: msg })
    }
  }

  // Handlers Drawer
  const handleAbrirDrawer = (item: Automacao | null = null) => {
    if (item) {
      setEditando(item)
      reset({
        nome: item.nome,
        gatilho: item.gatilho,
        template_mensagem: item.template_mensagem,
        status: item.status,
      })
    } else {
      setEditando(null)
      reset({
        nome: "",
        gatilho: "agendamento_confirmado",
        template_mensagem: "",
        status: true,
      })
    }
    setDrawerOpen(true)
  }

  const onSubmit = async (values: AutomacaoFormValues) => {
    startTransition(async () => {
      try {
        const payload = {
          empresa_id: empresaId,
          nome: values.nome,
          gatilho: values.gatilho,
          template_mensagem: values.template_mensagem,
          status: values.status,
        }

        if (editando) {
          const { error } = await supabase
            .from("automacoes")
            .update(payload)
            .eq("id", editando.id)

          if (error) throw error
          toast({ variant: "success", title: "Automação atualizada com sucesso!" })
        } else {
          const { error } = await supabase
            .from("automacoes")
            .insert(payload)

          if (error) throw error
          toast({ variant: "success", title: "Automação criada com sucesso!" })
        }

        setDrawerOpen(false)
        await atualizarAutomacoes()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido"
        toast({ variant: "error", title: "Erro ao salvar", description: msg })
      }
    })
  }

  // Handler Excluir
  const handleExcluir = async () => {
    if (!excluindoId) return
    try {
      const { error } = await supabase.from("automacoes").delete().eq("id", excluindoId)
      if (error) throw error
      toast({ variant: "success", title: "Automação excluída com sucesso!" })
      setModalExcluirOpen(false)
      setExcluindoId(null)
      await atualizarAutomacoes()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast({ variant: "error", title: "Erro ao excluir", description: msg })
    }
  }

  // Injetar template de alta conversão
  const handleCarregarTemplate = () => {
    const template = TEMPLATES_ZAP[formGatilho]
    if (template) {
      setValue("template_mensagem", template, { shouldValidate: true })
      toast({ variant: "success", title: "Modelo carregado com sucesso!" })
    }
  }

  // Inserir tag de variável no cursor
  const handleInserirVariavel = (tag: string) => {
    const textarea = document.getElementById("template-textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textoInserido = `{${tag}}`
    const novoTexto =
      formTemplate.substring(0, start) + textoInserido + formTemplate.substring(end)

    setValue("template_mensagem", novoTexto, { shouldValidate: true })

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + textoInserido.length, start + textoInserido.length)
    }, 0)
  }

  // Declaração de Colunas
  const columns: Column<Automacao>[] = [
    {
      key: "nome",
      label: "Nome da Automação",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-primary">{row.nome}</span>
        </div>
      ),
    },
    {
      key: "gatilho",
      label: "Gatilho",
      render: (row) => {
        const gatilhoFormatado = row.gatilho.replace(/_/g, " ").toUpperCase()
        return (
          <span className="text-xs font-medium text-text-secondary">
            {gatilhoFormatado}
          </span>
        )
      },
    },
    {
      key: "template_mensagem",
      label: "Mensagem do Template",
      render: (row) => (
        <span className="text-xs text-text-secondary truncate max-w-[400px] block" title={row.template_mensagem}>
          {row.template_mensagem || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (row) => (
        <button onClick={() => handleToggleStatus(row)} className="focus:outline-none flex justify-center w-full">
          <Badge variant={row.status ? "success" : "neutral"}>
            {row.status ? "Ativa" : "Inativa"}
          </Badge>
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="CromoZap"
        subtitle="Gerencie sua integração de WhatsApp e automações de mensagens em tempo real"
      />

      <Tabs
        tabs={[
          { key: "dashboard", label: "Dashboard", icon: <Code size={15} /> },
          { key: "automacoes", label: "Automações", icon: <FileText size={15} /> },
          { key: "fila", label: "Fila de Envio", icon: <Send size={15} /> },
          { key: "historico", label: "Histórico", icon: <CheckCircle2 size={15} /> },
        ]}
        activeKey="automacoes"
        onChange={(key) => {
          if (key === "dashboard") {
            router.push("/cromozap")
          } else {
            router.push(`/cromozap?tab=${key}`)
          }
        }}
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-text-primary">Automações Ativas por Empresa</h3>
          <Button
            variant="primary"
            iconLeft={<Plus size={16} />}
            onClick={() => handleAbrirDrawer()}
          >
            Nova Automação
          </Button>
        </div>

        <div className="bg-surface border border-border rounded overflow-hidden">
          <Table
            columns={columns}
            data={automacoes}
            rowKey="id"
            loading={loading}
            emptyMessage="Nenhuma automação cadastrada para esta empresa"
          />
        </div>
      </div>

      {/* Drawer Criar/Editar */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editando ? "Editar Automação" : "Nova Automação"}
        subtitle="Configure as regras e o template de mensagem da automação"
        maxWidth={620}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex flex-col h-full justify-between">
          <div className="space-y-5">
            <Input
              label="Nome da Automação"
              {...register("nome")}
              placeholder="Ex: Confirmação de Agendamento Preventivo"
              error={errors.nome?.message}
            />

            <Select
              label="Gatilho Operacional"
              value={formGatilho}
              onChange={(val) => setValue("gatilho", val as AutomacaoFormValues["gatilho"])}
              options={OPTIONS_GATILHO}
              error={errors.gatilho?.message}
            />

            {/* Template Generator Panel */}
            <div className="bg-surface-hover border border-border rounded p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Sparkles size={14} className="text-accent" />
                  Modelo de Alta Conversão
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCarregarTemplate}
                >
                  Carregar Modelo
                </Button>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Preenche automaticamente a mensagem com uma cópia testada e otimizada para o clima e contexto de serviços locais do Nordeste.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Textarea */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-text-primary block">Mensagem do Template</label>
                <textarea
                  id="template-textarea"
                  value={formTemplate}
                  onChange={(e) => setValue("template_mensagem", e.target.value, { shouldValidate: true })}
                  className={[
                    "w-full h-64 p-3 rounded bg-canvas border text-sm text-text-primary placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors resize-none font-sans",
                    errors.template_mensagem ? "border-danger" : "border-border",
                  ].join(" ")}
                  placeholder="Olá, {nome_cliente}! Seu serviço foi agendado..."
                />
                {errors.template_mensagem && (
                  <p className="text-xs text-danger">{errors.template_mensagem.message}</p>
                )}
              </div>

              {/* Variáveis */}
              <div className="border border-border rounded p-3 bg-surface-hover/50 space-y-3 self-stretch flex flex-col justify-start">
                <span className="text-xs font-semibold text-text-primary">Variáveis Úteis</span>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-56">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInserirVariavel(v.tag)}
                      className="text-left p-1.5 rounded bg-surface border border-border hover:border-accent/40 text-[10px] transition-colors"
                    >
                      <span className="font-mono font-bold text-accent block">{`{${v.tag}}`}</span>
                      <span className="text-text-secondary block mt-0.5">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Toggle
                label="Ativo"
                description="Status de ativação desta regra de automação."
                checked={watch("status")}
                onChange={(checked) => setValue("status", checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6 border-t border-border mt-6">
            <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Salvar Automação
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Modal Exclusão */}
      <Modal
        open={modalExcluirOpen}
        onClose={() => setModalExcluirOpen(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Deseja realmente excluir esta automação? Esta ação é irreversível e o disparo automático de mensagens para este gatilho será interrompido.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalExcluirOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
