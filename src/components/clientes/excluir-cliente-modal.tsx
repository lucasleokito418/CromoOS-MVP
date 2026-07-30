"use client"

import React, { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { type Cliente } from "@/types/clientes"

interface ExcluirClienteModalProps {
  open: boolean
  onClose: () => void
  cliente: Cliente | null
  onExcluido: () => void
}

export function ExcluirClienteModal({
  open,
  onClose,
  cliente,
  onExcluido,
}: ExcluirClienteModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleExcluir = () => {
    if (!cliente) return

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("clientes")
          .delete()
          .eq("id", cliente.id)

        if (error) throw error

        toast({
          variant: "success",
          title: "Cliente excluído",
          description: `O cadastro de ${cliente.nome} foi removido com sucesso.`,
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
      title="Excluir Cliente?"
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
          Tem certeza de que deseja excluir o cliente{" "}
          <strong className="text-text-primary">{cliente?.nome}</strong>?
        </p>
        <p className="text-xs text-text-secondary">
          Esta ação também removerá permanentemente todos os veículos e estofados associados a este cliente. Essa ação não pode ser desfeita.
        </p>
      </div>
    </Modal>
  )
}
