import React from "react"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { CadastroConviteForm } from "./cadastro-convite-form"
import { ShieldX } from "lucide-react"

interface ConvitePageProps {
  params: {
    token: string
  }
}

export const revalidate = 0

export default async function ConvitePage({ params }: ConvitePageProps) {
  const adminClient = createAdminClient()

  // Valida o token no servidor usando o client admin (bypassa RLS)
  const { data: convite } = await adminClient
    .from("convites_funcionario")
    .select("*, empresas(nome)")
    .eq("token", params.token)
    .eq("usado", false)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle()

  // Se o token for inválido, usado ou expirado, mostra mensagem genérica
  if (!convite) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-4">
          <ShieldX className="mx-auto text-danger" size={48} />
          <h2 className="text-xl font-bold font-oswald text-text-primary uppercase tracking-wide">Convite Inválido</h2>
          <p className="text-sm text-text-secondary">
            Este convite não é mais válido ou já expirou. Entre em contato com o administrador da sua empresa para solicitar um novo convite.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <img src="/icon-owl.svg" alt="Kaboré OS" className="h-7 w-auto shrink-0" />
            <h1 className="font-oswald text-2xl font-bold tracking-wide text-text-primary uppercase">
              Kaboré<span className="text-accent">OS</span>
            </h1>
          </div>
          <p className="text-xs text-text-secondary">
            Você foi convidado para fazer parte da empresa <strong className="text-text-primary">{convite.empresas?.nome}</strong>.
          </p>
        </div>

        <CadastroConviteForm token={params.token} email={convite.email} />
      </div>
    </div>
  )
}
