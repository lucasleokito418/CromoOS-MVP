"use client"

import React, { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { UserPlus } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

// ── Schema ────────────────────────────────────────────────────────────────────

const quickClientSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  whatsapp: z.string().optional().nullable(),
})

type QuickClientValues = {
  nome: string
  whatsapp?: string | null
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClienteCriado {
  id: string
  nome: string
  whatsapp: string | null
}

interface QuickClientModalProps {
  open: boolean
  onClose: () => void
  /** Callback chamado após o cliente ser persistido no banco */
  onClienteCriado: (cliente: ClienteCriado) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Modal leve de cadastro rápido de cliente.
 * Solicita apenas Nome (obrigatório) e WhatsApp (opcional).
 * O cliente criado persiste na tabela `clientes` com RLS (empresa_id)
 * e é retornado via `onClienteCriado` para auto-seleção no formulário pai.
 */
export function QuickClientModal({ open, onClose, onClienteCriado }: QuickClientModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const { empresaId } = useEmpresa()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickClientValues>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: { nome: "", whatsapp: "" },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = (values: QuickClientValues) => {
    if (!empresaId) return

    startTransition(async () => {
      try {
        const { data: novoCliente, error } = await supabase
          .from("clientes")
          .insert({
            empresa_id: empresaId,
            nome: values.nome.trim(),
            whatsapp: values.whatsapp?.trim() || null,
            origem: "sistema",
            whatsapp_opt_in: true,
          })
          .select("id, nome, whatsapp")
          .single()

        if (error || !novoCliente) throw error

        toast({
          variant: "success",
          title: "Cliente cadastrado",
          description: `${novoCliente.nome} foi adicionado com sucesso.`,
        })

        reset()
        onClienteCriado({
          id: novoCliente.id,
          nome: novoCliente.nome,
          whatsapp: novoCliente.whatsapp,
        })
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Erro ao cadastrar cliente",
          description: err?.message || "Erro desconhecido",
        })
      }
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cadastro Rápido de Cliente"
      maxWidthClass="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            loading={isPending}
            onClick={handleSubmit(onSubmit)}
            iconLeft={<UserPlus size={15} />}
          >
            Salvar Cliente
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Preencha os dados essenciais. Os demais campos podem ser completados no módulo{" "}
          <strong className="text-text-primary">Clientes</strong>.
        </p>

        <div className="space-y-3">
          <Input
            label="Nome *"
            placeholder="Ex: João da Silva"
            error={errors.nome?.message}
            {...register("nome")}
          />
          <Input
            label="WhatsApp"
            placeholder="Ex: 11999998888"
            {...register("whatsapp")}
          />
        </div>
      </div>
    </Modal>
  )
}
