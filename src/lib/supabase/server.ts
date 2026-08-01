import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // O método setAll pode ser chamado de Server Components
            // onde cookies não podem ser modificados. Ignoramos isso.
          }
        },
      },
    }
  )
}

/**
 * Retorna o usuário autenticado e seu perfil com memoização por requisição (React cache).
 * Garante que Supabase auth.getUser() e a query de perfil só rodem 1x por requisição HTTP,
 * acelerando a renderização do layout e de todas as páginas da área autenticada.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, perfil: null, empresaId: null }
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, nome, empresa_id, papel')
    .eq('id', user.id)
    .single()

  return {
    user,
    perfil,
    empresaId: perfil?.empresa_id || null,
  }
})

