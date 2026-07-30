"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Play, Power, Edit2, Code, FileText, Send, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, type Column } from "@/components/ui/table"
import { Toggle } from "@/components/ui/checkbox"
import { Drawer } from "@/components/ui/drawer"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { Card } from "@/components/ui/card"
import {
  conectarCromoZap,
  desconectarCromoZap,
  obterQrCodeCromoZap,
  obterStatusCromoZap,
  toggleAutomacao,
  atualizarTemplateAutomacao
} from "@/app/actions/cromozap"

interface CromozapClienteProps {
  empresaId: string
  conexaoInicial: any | null
  automacoesIniciais: any[]
  filaInicial: any[]
}

const VARIAVEIS_DISPONIVEIS = [
  { tag: "nomeCliente", desc: "Nome completo do cliente" },
  { tag: "nomeEmpresa", desc: "Nome de fantasia da empresa" },
  { tag: "data", desc: "Data/Hora do agendamento formatada" },
  { tag: "servicos", desc: "Lista de serviços contratados" },
  { tag: "veiculo", desc: "Marca/Modelo do veículo ou descrição do estofado" },
  { tag: "placa", desc: "Placa do veículo (se aplicável)" },
]

export function CromozapCliente({
  empresaId,
  conexaoInicial,
  automacoesIniciais,
  filaInicial
}: CromozapClienteProps) {
  const { toast } = useToast()
  
  // Estados da Conexão
  const [status, setStatus] = useState<string>(conexaoInicial?.status || "desconectado")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isPendingConectar, setIsPendingConectar] = useState(false)
  const [isPendingDesconectar, setIsPendingDesconectar] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  // Estados dos Dados
  const [activeTab, setActiveTab] = useState(tabParam || "dashboard")
  const [automacoes, setAutomacoes] = useState(automacoesIniciais)
  const [fila, setFila] = useState(filaInicial)

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Drawer de Edição de Automações
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [automacaoEditando, setAutomacaoEditando] = useState<any | null>(null)
  const [templateEditando, setTemplateEditando] = useState("")
  const [isPendingSalvar, setIsPendingSalvar] = useState(false)

  // 1. Polling de QR Code e Status da Conexão
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    // Apenas faz polling se estiver pareando ou se for forçado a verificar conexão no início
    if (status === "pareando" || status === "desconectado") {
      const verificarConexao = async () => {
        const novoStatus = await obterStatusCromoZap(empresaId)
        setStatus(novoStatus)

        if (novoStatus === "pareando") {
          const qr = await obterQrCodeCromoZap(empresaId)
          setQrCode(qr)
        } else {
          setQrCode(null)
        }
      }

      // Executa de imediato
      verificarConexao()

      // Define intervalo a cada 5 segundos
      interval = setInterval(verificarConexao, 5000)
    } else {
      setQrCode(null)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, empresaId])

  // Ações de Conectar / Desconectar
  const handleConectar = async () => {
    setIsPendingConectar(true)
    try {
      await conectarCromoZap(empresaId)
      setStatus("pareando")
      toast({ variant: "success", title: "Conexão iniciada", description: "Aguardando geração do QR Code..." })
    } catch (err: any) {
      toast({ variant: "error", title: "Falha ao iniciar conexão", description: err.message })
    } finally {
      setIsPendingConectar(false)
    }
  }

  const handleDesconectar = async () => {
    setIsPendingDesconectar(true)
    try {
      await desconectarCromoZap(empresaId)
      setStatus("desconectado")
      setQrCode(null)
      toast({ variant: "success", title: "Conexão encerrada", description: "A sessão foi excluída com sucesso." })
    } catch (err: any) {
      toast({ variant: "error", title: "Falha ao desconectar", description: err.message })
    } finally {
      setIsPendingDesconectar(false)
    }
  }

  // Toggle de Automação
  const handleToggle = async (id: string, ativoAtual: boolean) => {
    const novoAtivo = !ativoAtual
    
    // Atualização otimista no front
    setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativo: novoAtivo } : a))

    try {
      const res = await toggleAutomacao(id, novoAtivo)
      if (res.error) throw new Error(res.error)
      toast({
        variant: "success",
        title: novoAtivo ? "Automação ativada" : "Automação desativada",
        description: "Status alterado com sucesso."
      })
    } catch (err: any) {
      // Reverte se falhar
      setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativo: ativoAtual } : a))
      toast({ variant: "error", title: "Erro ao alterar status", description: err.message })
    }
  }

  // Edição de Template
  const abrirEdicao = (aut: any) => {
    setAutomacaoEditando(aut)
    setTemplateEditando(aut.template_mensagem || "")
    setDrawerOpen(true)
  }

  const inserirVariavel = (tag: string) => {
    const textarea = document.getElementById("template-textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textoInserido = `{${tag}}`
    const novoTexto = templateEditando.substring(0, start) + textoInserido + templateEditando.substring(end)
    setTemplateEditando(novoTexto)

    // Recoloca o cursor logo após a variável inserida
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + textoInserido.length, start + textoInserido.length)
    }, 0)
  }

  const handleSalvarTemplate = async () => {
    if (!automacaoEditando) return
    setIsPendingSalvar(true)
    try {
      const res = await atualizarTemplateAutomacao(automacaoEditando.id, templateEditando)
      if (res.error) throw new Error(res.error)

      setAutomacoes(prev => prev.map(a => a.id === automacaoEditando.id ? { ...a, template_mensagem: templateEditando } : a))
      toast({ variant: "success", title: "Template salvo", description: "O template da mensagem foi atualizado com sucesso." })
      setDrawerOpen(false)
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao salvar", description: err.message })
    } finally {
      setIsPendingSalvar(false)
    }
  }

  // Filtragem de filas de envio
  const filaPendentes = useMemo(() => fila.filter(f => f.status === "pendente"), [fila])
  const filaHistorico = useMemo(() => fila.filter(f => f.status === "enviado" || f.status === "falhou"), [fila])

  // Colunas da Tabela de Automações
  const colunasAutomacoes: Column<any>[] = [
    {
      key: "gatilho",
      label: "Gatilho",
      render: (row) => (
        <span className="font-semibold text-text-primary capitalize">
          {row.gatilho?.replace(/_/g, " ")}
        </span>
      )
    },
    {
      key: "template_mensagem",
      label: "Mensagem do Template",
      render: (row) => (
        <span className="text-text-secondary text-xs truncate max-w-[400px] block" title={row.template_mensagem}>
          {row.template_mensagem || "—"}
        </span>
      )
    },
    {
      key: "ativo",
      label: "Status",
      align: "center",
      render: (row) => (
        <Toggle
          checked={row.ativo}
          onChange={() => handleToggle(row.id, row.ativo)}
        />
      )
    },
    {
      key: "acoes",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="sm" iconLeft={<Edit2 size={13} />} onClick={() => abrirEdicao(row)}>
          Editar
        </Button>
      )
    }
  ]

  // Colunas da Tabela da Fila de Envio
  const colunasFila: Column<any>[] = [
    {
      key: "cliente",
      label: "Cliente",
      render: (row) => <span className="font-medium text-text-primary">{row.clientes?.nome || "Autoagendamento"}</span>
    },
    {
      key: "mensagem_renderizada",
      label: "Mensagem Enviada",
      render: (row) => (
        <span className="text-xs text-text-secondary line-clamp-2 max-w-[450px]" title={row.mensagem_renderizada}>
          {row.mensagem_renderizada}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (row) => {
        const variants: Record<string, "success" | "warning" | "danger" | "neutral"> = {
          enviado: "success",
          pendente: "warning",
          falhou: "danger",
        }
        return (
          <Badge variant={variants[row.status] || "neutral"} className="capitalize">
            {row.status}
          </Badge>
        )
      }
    },
    {
      key: "agendado_para",
      label: "Agendado Para",
      align: "right",
      render: (row) => (
        <span className="text-xs text-text-secondary tabular-nums">
          {new Date(row.agendado_para).toLocaleString("pt-BR")}
        </span>
      )
    }
  ]

  // Colunas do Histórico
  const colunasHistorico: Column<any>[] = [
    {
      key: "cliente",
      label: "Cliente",
      render: (row) => <span className="font-medium text-text-primary">{row.clientes?.nome || "Autoagendamento"}</span>
    },
    {
      key: "mensagem_renderizada",
      label: "Mensagem",
      render: (row) => (
        <span className="text-xs text-text-secondary line-clamp-2 max-w-[450px]" title={row.mensagem_renderizada}>
          {row.mensagem_renderizada}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (row) => (
        <Badge variant={row.status === "enviado" ? "success" : "danger"} className="capitalize">
          {row.status}
        </Badge>
      )
    },
    {
      key: "enviado_em",
      label: "Processado Em",
      align: "right",
      render: (row) => (
        <span className="text-xs text-text-secondary tabular-nums">
          {row.enviado_em ? new Date(row.enviado_em).toLocaleString("pt-BR") : "—"}
        </span>
      )
    }
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
        activeKey={activeTab}
        onChange={(key) => {
          if (key === "automacoes") {
            router.push("/cromozap/automacoes")
          } else {
            router.push(`/cromozap?tab=${key}`)
          }
        }}
      />

      {/* 1. ABA DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Status da Conexão */}
          <Card
            className="lg:col-span-2 flex flex-col justify-between"
            padding="p-6"
            header={
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-text-primary">Status da Conectividade</h3>
                <Badge
                  variant={
                    status === "conectado" ? "success" : status === "pareando" ? "warning" : "neutral"
                  }
                  className="capitalize font-medium"
                >
                  {status}
                </Badge>
              </div>
            }
          >
            <div className="space-y-6 my-4 flex-1 flex flex-col justify-center">
              {status === "desconectado" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-text-secondary">
                    <Power size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-text-primary">Serviço desconectado</p>
                    <p className="text-xs text-text-secondary max-w-md mx-auto">
                      Inicie a conexão para obter o QR Code e parear o WhatsApp da sua empresa com o Kaboré OS.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="mx-auto bg-accent text-accent-on font-medium hover:opacity-90"
                    iconLeft={<Play size={15} />}
                    onClick={handleConectar}
                    loading={isPendingConectar}
                  >
                    Iniciar Conexão
                  </Button>
                </div>
              )}

              {status === "pareando" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 items-center">
                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded border border-border max-w-[240px] mx-auto">
                    {qrCode ? (
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 bg-neutral-900 animate-pulse rounded flex items-center justify-center text-text-secondary text-xs">
                        Gerando QR Code...
                      </div>
                    )}
                    <span className="text-[10px] text-neutral-500 mt-2 font-medium">Atualiza a cada 5s</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-warning" />
                        Pareamento Pendente
                      </h4>
                      <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 leading-relaxed">
                        <li>Abra o WhatsApp no seu celular.</li>
                        <li>Toque em <strong>Aparelhos conectados</strong>.</li>
                        <li>Toque em <strong>Conectar um aparelho</strong>.</li>
                        <li>Aponte a câmera para ler o QR Code ao lado.</li>
                      </ol>
                    </div>
                    <Button
                      variant="ghost"
                      className="border border-border text-danger hover:bg-danger/10"
                      onClick={handleDesconectar}
                      loading={isPendingDesconectar}
                    >
                      Cancelar Pareamento
                    </Button>
                  </div>
                </div>
              )}

              {status === "conectado" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-success/10 border border-success/30 rounded-full flex items-center justify-center mx-auto text-success">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-text-primary">WhatsApp Pareado</p>
                    <p className="text-xs text-text-secondary max-w-md mx-auto">
                      Seu sistema está pronto para enviar mensagens e automações de vendas e agendamentos instantaneamente.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="mx-auto border border-border text-danger hover:bg-danger/10"
                    iconLeft={<Power size={15} />}
                    onClick={handleDesconectar}
                    loading={isPendingDesconectar}
                  >
                    Desconectar WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Dicas e Instruções do Painel */}
          <div className="space-y-6">
            <Card padding="p-5" className="bg-neutral-900/40 border-neutral-800">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle size={14} className="text-text-secondary" />
                Como funciona?
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed mt-2.5">
                O CromoZap roda como um microsserviço independente. Quando eventos como criação de agendamento ou aprovação de orçamentos ocorrem no Next.js, um gatilho de Realtime do banco adiciona a mensagem correspondente na Fila de Envio, que é enviada no background.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* 2. ABA AUTOMACÕES */}
      {activeTab === "automacoes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-text-primary">Automações Ativas por Empresa</h3>
          </div>
          <div className="bg-surface border border-border rounded overflow-hidden">
            <Table
              columns={colunasAutomacoes}
              data={automacoes}
              rowKey="id"
              emptyMessage="Nenhuma automação cadastrada para esta empresa"
            />
          </div>
        </div>
      )}

      {/* 3. ABA FILA DE ENVIO */}
      {activeTab === "fila" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-text-primary">Mensagens Pendentes de Envio</h3>
          </div>
          <div className="bg-surface border border-border rounded overflow-hidden">
            <Table
              columns={colunasFila}
              data={filaPendentes}
              rowKey="id"
              emptyMessage="Nenhuma mensagem aguardando envio na fila no momento"
            />
          </div>
        </div>
      )}

      {/* 4. ABA HISTÓRICO */}
      {activeTab === "historico" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-text-primary">Histórico de Mensagens Processadas</h3>
          </div>
          <div className="bg-surface border border-border rounded overflow-hidden">
            <Table
              columns={colunasHistorico}
              data={filaHistorico}
              rowKey="id"
              emptyMessage="Nenhuma mensagem processada no histórico"
              paginated
              pageSize={10}
            />
          </div>
        </div>
      )}

      {/* Drawer para Editar Template */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Editar Automação: ${automacaoEditando?.gatilho?.replace(/_/g, " ").toUpperCase()}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="bg-accent text-accent-on font-medium hover:opacity-90"
              onClick={handleSalvarTemplate}
              loading={isPendingSalvar}
            >
              Salvar Template
            </Button>
          </>
        }
        maxWidth={580}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
          {/* Editor Textarea */}
          <div className="md:col-span-2 space-y-4">
            <label className="text-xs font-semibold text-text-secondary block">Mensagem do Template</label>
            <textarea
              id="template-textarea"
              value={templateEditando}
              onChange={(e) => setTemplateEditando(e.target.value)}
              className="w-full h-72 p-3 rounded bg-canvas border border-border text-sm text-text-primary placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors resize-none font-sans"
              placeholder="Digite a mensagem padrão..."
            />
            <p className="text-[10px] text-text-secondary">
              Utilize as chaves ao lado para formatar variáveis dinâmicas de venda e cliente.
            </p>
          </div>

          {/* Variáveis Clicáveis */}
          <div className="bg-surface-hover border border-border rounded p-4 space-y-4 self-stretch">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Code size={13} className="text-accent" />
              Variáveis
            </span>
            <div className="flex flex-col gap-2.5">
              {VARIAVEIS_DISPONIVEIS.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => inserirVariavel(v.tag)}
                  className="text-left p-2 rounded bg-surface border border-border hover:border-accent/40 text-xs transition-colors duration-150"
                >
                  <span className="font-mono font-bold text-accent block">{`{${v.tag}}`}</span>
                  <span className="text-[10px] text-text-secondary block mt-0.5">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
