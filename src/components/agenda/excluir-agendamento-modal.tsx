"use client"

import React, { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

interface ExcluirAgendamentoModalProps {
  open: boolean
  onClose: () => void
  agendamento: any | null
  onExcluido: () => void
}

export function ExcluirAgendamentoModal({
  open,
  onClose,
  agendamento,
  onExcluido,
}: ExcluirAgendamentoModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleExcluir = () => {
    if (!agendamento) return

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("agendamentos")
          .delete()
          .eq("id", agendamento.id)

        if (error) throw error

        toast({
          variant: "success",
          title: "Agendamento excluído",
          description: "O agendamento foi removido com sucesso.",
        })

        onExcluido()
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Erro ao excluir",
          description: err.message || "Erro desconhecido.",
        })
      }
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Excluir Agendamento?"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleExcluir}
            loading={isPending}
          >
            Excluir
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <p>
          Tem certeza de que deseja excluir o agendamento de{" "}
          <strong className="text-text-primary">
            {agendamento?.clientes?.nome || "Cliente"}
          </strong>{" "}
          marcado para{" "}
          <strong className="text-text-primary">
            {agendamento?.data_inicio
              ? new Date(agendamento.data_inicio).toLocaleString("pt-BR")
              : ""}
          </strong>
          ?
        </p>
        <p className="text-xs text-text-secondary">
          Esta ação removerá o agendamento permanentemente. Essa ação não pode ser desfeita.
        </p>
      </div>
    </Modal>
  )
}
