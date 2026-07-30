"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function processarCadastroConvite(
  token: string,
  nome: string,
  senha: string
) {
  if (!nome.trim() || !senha || senha.length < 6) {
    return { success: false, error: "Nome é obrigatório e senha deve ter no mínimo 6 caracteres." }
  }

  const adminClient = createAdminClient()

  // 1. Valida o convite novamente no servidor
  const { data: convite, error: errConvite } = await adminClient
    .from("convites_funcionario")
    .select("*")
    .eq("token", token)
    .eq("usado", false)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle()

  if (errConvite || !convite) {
    return { success: false, error: "Este convite não é mais válido." }
  }

  try {
    // 2. Criar o usuário no Supabase Auth usando o client padrão (Server)
    const supabase = createClient()
    const { data: authData, error: errAuth } = await supabase.auth.signUp({
      email: convite.email,
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
        }
      }
    })

    if (errAuth) throw errAuth
    if (!authData.user) throw new Error("Falha ao criar o usuário.")

    // 3. Atualizar o perfil do funcionário e marcar o convite como usado usando o admin client (bypassa RLS)
    const { error: errPerfil } = await adminClient
      .from("perfis")
      .update({
        nome: nome.trim(),
        empresa_id: convite.empresa_id,
        papel: convite.papel,
        ativo: true
      })
      .eq("id", authData.user.id)

    if (errPerfil) throw errPerfil

    const { error: errConviteUpdate } = await adminClient
      .from("convites_funcionario")
      .update({ usado: true })
      .eq("id", convite.id)

    if (errConviteUpdate) throw errConviteUpdate

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Erro desconhecido ao processar o cadastro." }
  }
}
