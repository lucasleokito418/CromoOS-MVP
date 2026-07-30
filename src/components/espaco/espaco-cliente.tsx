"use client"

import React, { useState, useTransition } from "react"
import { Plus, CheckCircle2, XCircle, ParkingSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface EspacoClienteProps {
  initialVagas: any[]
  clientes: any[]
}

export function EspacoCliente({ initialVagas, clientes }: EspacoClienteProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { empresaId } = useEmpresa()
  const [isPending, startTransition] = useTransition()

  const [vagas, setVagas] = useState(initialVagas)
  const [modalOcuparOpen, setModalOcuparOpen] = useState(false)
  const [modalNovaVagaOpen, setModalNovaVagaOpen] = useState(false)
  const [vagaSelecionada, setVagaSelecionada] = useState<any | null>(null)

  // Form fields for Ocupar
  const [clienteId, setClienteId] = useState("")
  const [ativoTipo, setAtivoTipo] = useState<"veiculo" | "estofado">("veiculo")
  const [ativoId, setAtivoId] = useState("")
  const [entradaEm, setEntradaEm] = useState(new Date().toISOString().slice(0, 16))
  const [saidaPrevista, setSaidaPrevista] = useState("")

  // Nova Vaga form
  const [novaVagaId, setNovaVagaId] = useState("")

  const ativosCliente = React.useMemo(() => {
    const c = clientes.find(c => c.id === clienteId)
    if (!c) return []
    if (ativoTipo === "veiculo") return c.veiculos || []
    return c.estofados || []
  }, [clientes, clienteId, ativoTipo])

  const atualizarVagas = async () => {
    const { data } = await supabase
      .from("vagas_espaco")
      .select(`
        *,
        veiculos (
          id, marca, modelo, placa,
          clientes (id, nome)
        ),
        estofados (
          id, descricao,
          clientes (id, nome)
        )
      `)
      .order("identificador")
    if (data) setVagas(data)
  }

  const handleNovaVaga = async () => {
    if (!novaVagaId.trim() || !empresaId) {
      toast({ variant: "error", title: "Informe o identificador da vaga." })
      return
    }
    startTransition(async () => {
      try {
        const { error } = await supabase.from("vagas_espaco").insert({
          empresa_id: empresaId,
          identificador: novaVagaId.trim().toUpperCase(),
          status: "livre",
        })
        if (error) throw error
        toast({ variant: "success", title: `Vaga ${novaVagaId.trim().toUpperCase()} criada!` })
        setModalNovaVagaOpen(false)
        setNovaVagaId("")
        await atualizarVagas()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao criar vaga", description: err.message })
      }
    })
  }

  const handleOcupar = async () => {
    if (!vagaSelecionada || !clienteId || !ativoId || !empresaId) {
      toast({ variant: "error", title: "Preencha todos os campos obrigatórios." })
      return
    }
    startTransition(async () => {
      try {
        const payload: any = {
          status: "ocupada",
          entrada_em: entradaEm ? new Date(entradaEm).toISOString() : new Date().toISOString(),
          saida_prevista_em: saidaPrevista ? new Date(saidaPrevista).toISOString() : null,
          veiculo_id: null,
          estofado_id: null,
        }
        if (ativoTipo === "veiculo") payload.veiculo_id = ativoId
        else payload.estofado_id = ativoId

        const { error } = await supabase
          .from("vagas_espaco")
          .update(payload)
          .eq("id", vagaSelecionada.id)

        if (error) throw error

        toast({ variant: "success", title: `Vaga ${vagaSelecionada.identificador} ocupada!` })
        setModalOcuparOpen(false)
        setClienteId("")
        setAtivoId("")
        setSaidaPrevista("")
        await atualizarVagas()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao ocupar vaga", description: err.message })
      }
    })
  }

  const handleLiberar = async (vaga: any) => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("vagas_espaco")
          .update({ status: "livre", veiculo_id: null, estofado_id: null, entrada_em: null, saida_prevista_em: null })
          .eq("id", vaga.id)

        if (error) throw error
        toast({ variant: "success", title: `Vaga ${vaga.identificador} liberada!` })
        await atualizarVagas()
      } catch (err: any) {
        toast({ variant: "error", title: "Erro ao liberar vaga", description: err.message })
      }
    })
  }

  const abrirOcupar = (vaga: any) => {
    setVagaSelecionada(vaga)
    setClienteId("")
    setAtivoId("")
    setEntradaEm(new Date().toISOString().slice(0, 16))
    setSaidaPrevista("")
    setModalOcuparOpen(true)
  }

  const vagasLivres = vagas.filter(v => v.status === "livre").length
  const vagasOcupadas = vagas.filter(v => v.status === "ocupada").length

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Espaço"
        subtitle={vagas.length > 0 ? `${vagasOcupadas} ocupada${vagasOcupadas !== 1 ? "s" : ""} · ${vagasLivres} livre${vagasLivres !== 1 ? "s" : ""}` : "Gerencie as vagas do seu espaço"}
        actions={
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setModalNovaVagaOpen(true)}>
            Nova Vaga
          </Button>
        }
      />

      {/* Empty state */}
      {vagas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center">
            <ParkingSquare size={26} className="text-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Nenhuma vaga cadastrada</p>
            <p className="text-xs text-text-secondary mt-1">Crie as vagas do seu estacionamento ou boxe.</p>
          </div>
          <Button variant="primary" iconLeft={<Plus size={15} />} onClick={() => setModalNovaVagaOpen(true)}>
            Criar primeira vaga
          </Button>
        </div>
      ) : (
        /* Kanban board */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vagas.map((vaga) => {
            const ocupada = vaga.status === "ocupada"
            const ativo = vaga.veiculos
              ? `${vaga.veiculos.marca} ${vaga.veiculos.modelo}${vaga.veiculos.placa ? ` • ${vaga.veiculos.placa}` : ""}`
              : vaga.estofados?.descricao || ""
            const nomeCliente = vaga.veiculos?.clientes?.nome || vaga.estofados?.clientes?.nome || ""

            return (
              <div
                key={vaga.id}
                className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
                  ocupada ? "bg-surface border-border" : "bg-surface/50 border-border/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-oswald text-base font-bold uppercase tracking-wide text-text-primary">
                    {vaga.identificador}
                  </span>
                  <Badge variant={ocupada ? "neutral" : "success"} className="text-[10px]">
                    {ocupada ? "Ocupada" : "Livre"}
                  </Badge>
                </div>

                {ocupada ? (
                  <>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-text-primary">{ativo}</p>
                      {nomeCliente && (
                        <p className="text-[11px] text-text-secondary">{nomeCliente}</p>
                      )}
                      <p className="text-[10px] text-text-secondary tabular-nums">
                        Entrada: {new Date(vaga.entrada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {vaga.saida_prevista_em && ` • Saída: ${new Date(vaga.saida_prevista_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="border border-border text-danger hover:bg-danger/10 mt-auto" iconLeft={<XCircle size={14} />} onClick={() => handleLiberar(vaga)} loading={isPending}>
                      Liberar
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="border border-border hover:border-accent/50 mt-auto" iconLeft={<CheckCircle2 size={14} />} onClick={() => abrirOcupar(vaga)}>
                    Ocupar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Nova Vaga */}
      <Modal open={modalNovaVagaOpen} onClose={() => setModalNovaVagaOpen(false)} title="Nova Vaga">
        <div className="space-y-4">
          <Input
            label="Identificador (ex: A1, Box 2, Vaga 3)"
            placeholder="Ex: A1"
            value={novaVagaId}
            onChange={(e) => setNovaVagaId(e.target.value)}
          />
          <p className="text-xs text-text-secondary">O identificador deve ser único para o seu espaço.</p>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setModalNovaVagaOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleNovaVaga} loading={isPending}>Criar Vaga</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ocupar Vaga */}
      <Modal open={modalOcuparOpen} onClose={() => setModalOcuparOpen(false)} title={`Ocupar Vaga ${vagaSelecionada?.identificador}`}>
        <div className="space-y-4">
          <Select
            label="Cliente"
            value={clienteId}
            onChange={setClienteId}
            options={[{ value: "", label: "Selecione o cliente..." }, ...clientes.map(c => ({ value: c.id, label: c.nome }))]}
          />

          <Select
            label="Tipo de Ativo"
            value={ativoTipo}
            onChange={(v) => { setAtivoTipo(v as any); setAtivoId("") }}
            options={[{ value: "veiculo", label: "Veículo" }, { value: "estofado", label: "Estofado" }]}
          />

          <Select
            label={ativoTipo === "veiculo" ? "Veículo" : "Estofado"}
            value={ativoId}
            onChange={setAtivoId}
            options={[
              { value: "", label: "Selecione..." },
              ...ativosCliente.map((a: any) => ({
                value: a.id,
                label: ativoTipo === "veiculo" ? `${a.marca} ${a.modelo}${a.placa ? ` (${a.placa})` : ""}` : a.descricao,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Hora de Entrada" type="datetime-local" value={entradaEm} onChange={e => setEntradaEm(e.target.value)} />
            <Input label="Saída Prevista (opcional)" type="datetime-local" value={saidaPrevista} onChange={e => setSaidaPrevista(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setModalOcuparOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleOcupar} loading={isPending}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
