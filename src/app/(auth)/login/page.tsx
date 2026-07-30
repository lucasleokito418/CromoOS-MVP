'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe sua senha'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    })

    if (error) {
      setServerError('E-mail ou senha incorretos.')
      return
    }

    // Middleware decide se vai para /onboarding ou /painel
    router.refresh()
    router.push('/painel')
  }

  return (
    <Card padding="p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-5">
        Entrar na sua conta
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Senha"
          type="password"
          placeholder="Sua senha"
          autoComplete="current-password"
          error={errors.senha?.message}
          {...register('senha')}
        />

        {serverError && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          className="w-full mt-1"
        >
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-5">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-accent hover:underline">
          Cadastre-se grátis
        </Link>
      </p>
    </Card>
  )
}
