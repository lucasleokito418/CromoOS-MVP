'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { KaboreLogo } from '@/components/layout/logo'

const schema = z.object({
  nome_empresa: z.string().min(2, 'Nome da empresa é obrigatório'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

/** Remove tudo que não for dígito */
function somenteDigitos(v: string) {
  return v.replace(/\D/g, '')
}

/** Formata CNPJ: 00.000.000/0000-00 */
function formatarCnpj(v: string) {
  const d = somenteDigitos(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Formata telefone: (00) 00000-0000 */
function formatarTelefone(v: string) {
  const d = somenteDigitos(v).slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3')
  }
  return d.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [cnpjValue, setCnpjValue] = useState('')
  const [telefoneValue, setTelefoneValue] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setServerError('Sessão expirada. Faça login novamente.')
      return
    }

    // 1. Cria empresa
    const { data: empresa, error: errEmpresa } = await supabase
      .from('empresas')
      .insert({
        nome: data.nome_empresa,
        cnpj: data.cnpj ? somenteDigitos(data.cnpj) : null,
        telefone: data.telefone ? somenteDigitos(data.telefone) : null,
      })
      .select('id')
      .single()

    if (errEmpresa || !empresa) {
      setServerError('Erro ao criar empresa. Tente novamente.')
      return
    }

    // 2. Vincula empresa ao perfil
    const { error: errPerfil } = await supabase
      .from('perfis')
      .update({ empresa_id: empresa.id })
      .eq('id', user.id)

    if (errPerfil) {
      setServerError('Erro ao vincular empresa ao perfil.')
      return
    }

    // 3. Vai para o painel
    router.push('/painel')
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <KaboreLogo variant="wordmark" collapsed={false} />
        </div>

        <Card padding="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary leading-tight">
                Configure sua empresa
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Você pode editar estas informações depois
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Nome da empresa"
              placeholder="Ex: Studio Auto Premium"
              error={errors.nome_empresa?.message}
              {...register('nome_empresa')}
            />

            <Input
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              hint="Opcional"
              value={cnpjValue}
              onChange={(e) => {
                const formatted = formatarCnpj(e.target.value)
                setCnpjValue(formatted)
                setValue('cnpj', formatted)
              }}
            />

            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              hint="Opcional"
              value={telefoneValue}
              onChange={(e) => {
                const formatted = formatarTelefone(e.target.value)
                setTelefoneValue(formatted)
                setValue('telefone', formatted)
              }}
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
              Criar empresa e continuar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
