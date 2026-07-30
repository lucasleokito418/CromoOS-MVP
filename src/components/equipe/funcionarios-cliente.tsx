"use client"

import React, { useState, useTransition, useMemo } from "react"
import { Plus, Copy, Check, UserCheck, ShieldAlert, Award, ToggleLeft, ToggleRight, DollarSign } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, type Column } from "@/components/ui/table"
import { Drawer } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface FuncionariosClienteProps {
  initialFuncionarios: any[]
  initialComissoes: any[]
}

export function FuncionariosCliente({
  initialFuncionarios,
  initialComissoes,
}: FuncionariosClienteProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { empresaId } = useEmpresa()
  const [isPending, startTransition] = useTransition()

  // State
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios)
  const [comissoes, setComissoes] = useState(initialComissoes)
  const [activeTab, setActiveTab] = useState("equipe")

  // Drawer Convite state
  const [drawerConviteOpen, setDrawerConviteOpen] = useState(false)
  const [emailConvite, setEmailConvite] = useState("")
  const [papelConvite, setPapelConvite] = useState<"funcionario" | "dono">("funcionario")
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  // Refresh functions
  const atualizarFuncionarios = async () => {
    const { data } = await supabase
      .from("perfis")
      .select("*")
      .order("nome")
    if (data) setFuncionarios(data)
  }

  const atualizarComissoes = async () => {
    const { data } = await supabase
      .from("comissoes")
      .select(`
        *,
        perfis (id, nome),
        vendas (id, numero_sequencial)
      `)
      .order("criado_em", { ascending: false })
    if (data) setComissoes(data)
  }

  // Toggle ativo/inativo funcionário
  const handleToggleAtivo = async (perfil: any) => {
    const novoStatus = !perfil.ativo
    try {
      const { error } = await supabase
        .from("perfis")
        .update({ ativo: novoStatus })
        .eq("id", perfil.id)

      if (error) throw error

      toast({ variant: "success", title: `Funcionário ${novoStatus ? "ativado" : "desativado"}!` })
      await atualizarFuncionarios()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao atualizar status", description: err.message })
    }
  }

  // Toggle pago/pendente comissão
  const handleToggleComissaoStatus = async (comissao: any) => {
    const novoStatus = comissao.status === "pago" ? "pendente" : "pago"
    try {
      const { error } = await supabase
        .from("comissoes")
        .update({ status: novoStatus })
        .eq("id", comissao.id)

      if (error) throw error

      toast({ variant: "success", title: `Comissão marcada como ${novoStatus === "pago" ? "paga" : "pendente"}!` })
      await atualizarComissoes()
    } catch (err: any) {
      toast({ variant: "error", title: "Erro ao atualizar comissão", description: err.message })
    }
  }

  // Gerar Convite
  const handleEnviarConvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailConvite.trim() || !empresaId) return

    startTransition(async () => {
      try {
        const { data, error } = await supabase
          .from("convites_funcionario")
          .insert({
            empresa_id: empresaId,
            email: emailConvite.trim().toLowerCase(),
            papel: papelConvite,
          })
          .select("token")
          .single()

        if (error) throw error

        const link = `${window.location.origin}/convite/${data.token}`
        setLinkGerado(link)
        toast({ variant: "success", title: "Convite gerado!" })
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao convidar", description: err.message })
      }
    })
  }

  const handleCopiarLink = () => {
    if (!linkGerado) return
    navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    toast({ variant: "success", title: "Link copiado!" })
  }

  const handleFecharDrawerConvite = () => {
    setDrawerConviteOpen(false)
    setEmailConvite("")
    setPapelConvite("funcionario")
    setLinkGerado(null)
    setCopiado(false)
  }

  const columnsEquipe: Column<any>[] = [
    {
      key: "nome",
      label: "Nome",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-primary">{row.nome || "Novo Integrante"}</span>
          {row.cargo && <span className="text-[10px] text-text-secondary">{row.cargo}</span>}
        </div>
      ),
    },
    {
      key: "papel",
      label: "Função / Permissão",
      render: (row) => (
        <Badge variant={row.papel === "dono" ? "warning" : "neutral"}>
          {row.papel === "dono" ? "Administrador (Dono)" : "Profissional (Funcionário)"}
        </Badge>
      ),
    },
    {
      key: "comissao",
      label: "Comissão Padrão",
      render: (row) => <span className="tabular-nums">{row.comissao_percentual_padrao || 0}%</span>,
    },
    {
      key: "ativo",
      label: "Status",
      render: (row) => (
        <button
          onClick={() => handleToggleAtivo(row)}
          className="flex items-center text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          {row.ativo ? (
            <span className="flex items-center gap-1.5 text-success font-medium text-xs">
              <ToggleRight size={22} className="text-success" />
              Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-text-secondary font-medium text-xs">
              <ToggleLeft size={22} className="text-text-secondary" />
              Inativo
            </span>
          )}
        </button>
      ),
    },
  ]

  const columnsComissoes: Column<any>[] = [
    {
      key: "funcionario",
      label: "Profissional",
      render: (row) => <span className="font-medium text-text-primary">{row.perfis?.nome || "—"}</span>,
    },
    {
      key: "venda",
      label: "Venda",
      render: (row) => (
        <span className="text-xs text-text-secondary font-medium tabular-nums">
          #{String(row.vendas?.numero_sequencial || 0).padStart(4, "0")}
        </span>
      ),
    },
    {
      key: "valor",
      label: "Valor Comissão",
      render: (row) => (
        <span className="font-semibold text-text-primary tabular-nums">
          R$ {Number(row.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "data",
      label: "Data",
      render: (row) => <span className="tabular-nums">{new Date(row.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>,
    },
    {
      key: "status",
      label: "Status Pagamento",
      align: "right",
      render: (row) => (
        <button
          onClick={() => handleToggleComissaoStatus(row)}
          className="flex items-center justify-end w-full focus:outline-none"
        >
          <Badge variant={row.status === "pago" ? "success" : "warning"} className="cursor-pointer select-none">
            {row.status === "pago" ? "Pago" : "Pendente"}
          </Badge>
        </button>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Equipe & Comissões"
        subtitle="Gerencie profissionais, permissões de acesso e pagamentos de comissões"
        actions={
          activeTab === "equipe" && (
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setDrawerConviteOpen(true)}>
              Convidar Funcionário
            </Button>
          )
        }
      />

      <Tabs
        tabs={[
          { key: "equipe", label: "Equipe" },
          { key: "comissoes", label: "Comissões" },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "equipe" && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <Table columns={columnsEquipe} data={funcionarios} rowKey="id" emptyMessage="Nenhum integrante cadastrado" />
        </div>
      )}

      {activeTab === "comissoes" && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <Table columns={columnsComissoes} data={comissoes} rowKey="id" emptyMessage="Nenhuma comissão registrada" />
        </div>
      )}

      {/* Drawer Convidar Funcionário */}
      <Drawer open={drawerConviteOpen} onClose={handleFecharDrawerConvite} title="Convidar Novo Integrante">
        {!linkGerado ? (
          <form onSubmit={handleEnviarConvite} className="space-y-5">
            <p className="text-xs text-text-secondary">
              Informe o e-mail do colaborador e a função dele no sistema. Será gerado um link de convite único.
            </p>

            <Input
              label="E-mail do Colaborador"
              type="email"
              required
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
              placeholder="colaborador@email.com"
            />

            <Select
              label="Função (Permissão)"
              value={papelConvite}
              onChange={(val) => setPapelConvite(val as any)}
              options={[
                { value: "funcionario", label: "Profissional (Acesso às agendas/vendas próprias)" },
                { value: "dono", label: "Administrador / Dono (Acesso total ao financeiro/empresa)" },
              ]}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="ghost" type="button" onClick={handleFecharDrawerConvite}>Cancelar</Button>
              <Button variant="primary" type="submit" loading={isPending}>Gerar Convite</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="bg-surface-hover rounded border border-border/40 p-5 text-center space-y-3">
              <Award className="mx-auto text-accent" size={32} />
              <h3 className="text-sm font-semibold text-text-primary">Link de Convite Gerado!</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Envie o endereço abaixo para o profissional. Ele usará esse link único para criar a senha e o perfil vinculado à sua empresa.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={linkGerado}
                className="flex-1 h-9 px-3 rounded bg-surface border border-border text-xs text-text-primary outline-none"
              />
              <Button variant="primary" size="sm" onClick={handleCopiarLink}>
                {copiado ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button variant="ghost" onClick={handleFecharDrawerConvite}>Fechar</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
