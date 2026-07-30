"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { processarCadastroConvite } from "@/app/actions/convite"

interface CadastroConviteFormProps {
  token: string
  email: string
}

export function CadastroConviteForm({ token, email }: CadastroConviteFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [nome, setNome] = useState("")
  const [senha, setSenha] = useState("")
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const res = await processarCadastroConvite(token, nome, senha)

      if (res.success) {
        setSucesso(true)
        toast({ variant: "success", title: "Cadastro realizado com sucesso!" })
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        toast({ variant: "error", title: "Erro no cadastro", description: res.error })
      }
    })
  }

  if (sucesso) {
    return (
      <div className="bg-success/5 border border-success/20 rounded p-4 text-center text-sm text-success space-y-2">
        <p className="font-semibold">Cadastro finalizado!</p>
        <p className="text-xs text-text-secondary">Redirecionando para a tela de login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="E-mail"
        type="email"
        value={email}
        disabled
        className="opacity-70 bg-surface-hover select-none"
      />

      <Input
        label="Seu Nome Completo"
        type="text"
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex: Carlos Silva"
      />

      <Input
        label="Crie uma Senha"
        type="password"
        required
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Mínimo 6 caracteres"
      />

      <Button variant="primary" type="submit" className="w-full" loading={isPending}>
        Concluir Cadastro
      </Button>
    </form>
  )
}
