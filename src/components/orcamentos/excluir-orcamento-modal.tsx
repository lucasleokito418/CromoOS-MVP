"use client"

import React, { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

interface ExcluirOrcamentoModalProps {
  open: boolean
  onClose: () => void
  orcamento: any | null
  onExcluido: () => void
}

export function ExcluirOrcamentoModal({
  open,
  onClose,
  orcamento,
  onExcluido,
}: ExcluirOrcamentoModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleExcluir = () => {
    if (!orcamento) return

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("orcamentos")
          .delete()
          .eq("id", orcamento.id)

        if (error) throw error

        toast({
          variant: "success",
          title: "Orçamento excluído",
          description: "O orçamento foi removido com sucesso.",
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
      title="Excluir Orçamento?"
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
          Tem certeza de que deseja excluir o orçamento de{" "}
          <strong className="text-text-primary">
            {orcamento?.clientes?.nome || "Cliente"}
          </strong>{" "}
          gerado em{" "}
          <strong className="text-text-primary">
            {orcamento?.data
              ? new Date(orcamento.data).toLocaleDateString("pt-BR")
              : ""}
          </strong>
          ?
        </p>
        <p className="text-xs text-text-secondary">
          Esta ação removerá o orçamento permanentemente, incluindo todas as fotos anexadas. Essa ação não pode ser desfeita.
        </p>
      </div>
    </Modal>
  )
}
