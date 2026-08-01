import React from 'react'
import { redirect } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  DollarSign,
  Zap,
  Wrench,
  Layers,
  UserCheck,
  TrendingUp,
  ArrowLeftRight,
  Coins,
  CreditCard,
  Building2,
  BarChart3,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { SidebarSection } from '@/components/layout/sidebar'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  // Busca o perfil do usuário logado
  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, empresa_id')
    .eq('id', session.user.id)
    .single()

  const navSections: SidebarSection[] = [
    {
      items: [
        {
          key: 'assistente',
          label: 'Assistente',
          icon: <Sparkles size={18} />,
          href: '/assistente',
        },
        {
          key: 'painel',
          label: 'Painel',
          icon: <LayoutDashboard size={18} />,
          href: '/painel',
        },
      ],
    },
    {
      title: 'Vendas',
      items: [
        {
          key: 'agenda',
          label: 'Agenda',
          icon: <Calendar size={18} />,
          href: '/agenda',
          badge: { label: '3', variant: 'neutral' }
        },
        {
          key: 'clientes',
          label: 'Clientes',
          icon: <Users size={18} />,
          href: '/clientes',
        },
        {
          key: 'orcamentos',
          label: 'Orçamentos',
          icon: <FileText size={18} />,
          href: '/orcamentos',
        },
        {
          key: 'vendas',
          label: 'Vendas',
          icon: <DollarSign size={18} />,
          href: '/vendas',
        },
        {
          key: 'cromozap',
          label: 'CromoZap',
          icon: <Zap size={18} />,
          href: '/cromozap',
          badge: { label: 'Novo', variant: 'accent' }
        },
      ],
    },
    {
      title: 'Operação',
      items: [
        {
          key: 'servicos',
          label: 'Serviços',
          icon: <Wrench size={18} />,
          href: '/servicos',
        },
        {
          key: 'espaco',
          label: 'Espaço',
          icon: <Layers size={18} />,
          href: '/espaco',
        },
        {
          key: 'funcionarios',
          label: 'Funcionários',
          icon: <UserCheck size={18} />,
          href: '/funcionarios',
        },
      ],
    },
    {
      title: 'Financeiro',
      items: [
        {
          key: 'resumo',
          label: 'Resumo',
          icon: <TrendingUp size={18} />,
          href: '/resumo',
        },
        {
          key: 'movimentacoes',
          label: 'Movimentações',
          icon: <ArrowLeftRight size={18} />,
          href: '/movimentacoes',
        },
        {
          key: 'caixa',
          label: 'Caixa',
          icon: <Coins size={18} />,
          href: '/caixa',
        },
        {
          key: 'contas',
          label: 'Contas',
          icon: <CreditCard size={18} />,
          href: '/contas',
        },
      ],
    },
    {
      title: 'Empresa',
      items: [
        {
          key: 'perfil',
          label: 'Perfil',
          icon: <Building2 size={18} />,
          href: '/perfil',
        },
        {
          key: 'relatorios',
          label: 'Relatórios',
          icon: <BarChart3 size={18} />,
          href: '/relatorios',
        },
        {
          key: 'auditoria',
          label: 'Auditoria',
          icon: <ShieldCheck size={18} />,
          href: '/auditoria',
        },
      ],
    },
  ]

  const userDisplayName = perfil?.nome || session.user.email?.split('@')[0] || 'Usuário'

  return (
    <AppShell
      userDisplayName={userDisplayName}
      userEmail={session.user.email || ''}
      empresaId={perfil?.empresa_id || null}
      navSections={navSections}
    >
      {children}
    </AppShell>
  )
}
