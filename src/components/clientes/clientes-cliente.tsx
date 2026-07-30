'use client'

import React, { useState, useMemo, useCallback, useTransition } from 'react'
import { Plus, Search, Pencil, Trash2, Car, Bike } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, type Column } from '@/components/ui/table'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ClienteDrawer } from '@/components/clientes/cliente-drawer'
import { ExcluirClienteModal } from '@/components/clientes/excluir-cliente-modal'
import type { Cliente } from '@/types/clientes'

const SORT_OPTIONS = [
  { value: 'nome_az', label: 'Nome (A–Z)' },
  { value: 'recente', label: 'Mais recente' },
  { value: 'aniversario', label: 'Aniversário mais próximo' },
  { value: 'veiculos', label: 'Mais veículos' },
  { value: 'score', label: 'Maior score' },
]

function formatarTelefone(tel?: string | null) {
  if (!tel) return '—'
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}

function diasAteAniversario(dataNasc?: string | null): number {
  if (!dataNasc) return 9999
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  const proximo = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
  if (proximo < hoje) proximo.setFullYear(proximo.getFullYear() + 1)
  return Math.ceil((proximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function sortClientes(clientes: Cliente[], sort: string): Cliente[] {
  return [...clientes].sort((a, b) => {
    switch (sort) {
      case 'nome_az':
        return a.nome.localeCompare(b.nome, 'pt-BR')
      case 'recente':
        return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      case 'aniversario':
        return diasAteAniversario(a.data_nascimento as string | null) - diasAteAniversario(b.data_nascimento as string | null)
      case 'veiculos':
        return (b.veiculos?.length ?? 0) - (a.veiculos?.length ?? 0)
      case 'score':
        return (b.score ?? 0) - (a.score ?? 0)
      default:
        return 0
    }
  })
}

const PAGE_SIZE = 10

interface ClientesClienteProps {
  clientesIniciais: Cliente[]
}

export function ClientesCliente({ clientesIniciais }: ClientesClienteProps) {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciais)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState('recente')
  const [pagina, setPagina] = useState(1)

  const [drawerAberto, setDrawerAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [clienteExcluindo, setClienteExcluindo] = useState<Cliente | null>(null)

  const carregarClientes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        id, nome, whatsapp, whatsapp_opt_in, telefone_extra, email,
        cpf_cnpj, origem, data_nascimento, endereco,
        observacoes, score, criado_em,
        veiculos (id, tipo, marca, modelo, cor, placa),
        estofados (id, descricao, cor)
      `)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('[Clientes] Erro ao carregar:', error.message)
    } else if (data) {
      setClientes(data as unknown as Cliente[])
    }
    setLoading(false)
  }, [supabase])

  const clientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const base = q
      ? clientes.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.whatsapp ?? '').toLowerCase().includes(q) ||
            (c.telefone_extra ?? '').toLowerCase().includes(q)
        )
      : clientes
    return sortClientes(base, ordenacao)
  }, [clientes, busca, ordenacao])

  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / PAGE_SIZE))
  const clientesPagina = clientesFiltrados.slice(
    (pagina - 1) * PAGE_SIZE,
    pagina * PAGE_SIZE
  )

  function abrirNovoCliente() {
    setClienteEditando(null)
    setDrawerAberto(true)
  }

  function abrirEditarCliente(cliente: Cliente) {
    setClienteEditando(cliente)
    setDrawerAberto(true)
  }

  function abrirExcluirCliente(cliente: Cliente) {
    setClienteExcluindo(cliente)
    setModalExcluirAberto(true)
  }

  function onClienteSalvo() {
    setDrawerAberto(false)
    startTransition(() => { carregarClientes() })
  }

  function onClienteExcluido() {
    setModalExcluirAberto(false)
    setClienteExcluindo(null)
    startTransition(() => { carregarClientes() })
  }

  const colunas: Column<Cliente>[] = [
    {
      key: 'nome',
      label: 'Nome',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.nome} size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text-primary truncate">{row.nome}</span>
            {row.email && (
              <span className="text-xs text-text-secondary truncate">{row.email}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      render: (row) => formatarTelefone(row.whatsapp),
    },
    {
      key: 'veiculos',
      label: 'Veículos',
      align: 'center',
      render: (row) => {
        const total = row.veiculos?.length ?? 0
        if (total === 0) return <span className="text-text-secondary text-xs">Nenhum</span>
        const carros = row.veiculos.filter((v) => v.tipo === 'carro').length
        const motos = row.veiculos.filter((v) => v.tipo === 'moto').length
        return (
          <div className="flex items-center justify-center gap-2">
            {carros > 0 && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Car size={13} /> {carros}
              </span>
            )}
            {motos > 0 && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Bike size={13} /> {motos}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'score',
      label: 'Score',
      align: 'center',
      render: (row) => {
        const score = row.score ?? 0
        const variant = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'neutral'
        return (
          <Badge variant={variant}>
            <span className="tabular-nums">{score}</span>
          </Badge>
        )
      },
    },
    {
      key: 'acoes',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => abrirEditarCliente(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            aria-label={`Editar ${row.nome}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => abrirExcluirCliente(row)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-danger transition-colors"
            aria-label={`Excluir ${row.nome}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} cadastrado${clientes.length !== 1 ? 's' : ''}`}
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus size={16} />}
            onClick={abrirNovoCliente}
          >
            Novo cliente
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por nome ou telefone..."
            className="w-full h-9 pl-9 pr-3 rounded bg-surface border border-border text-sm text-text-primary placeholder:text-text-secondary transition-colors duration-150 outline-none focus:ring-2 focus:ring-accent focus:border-transparent hover:border-white/20"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={SORT_OPTIONS}
            value={ordenacao}
            onChange={(v) => { setOrdenacao(v); setPagina(1) }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <Table
          columns={colunas}
          data={clientesPagina}
          rowKey="id"
          loading={loading}
          emptyMessage="Nenhum cliente encontrado"
        />

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-text-secondary tabular-nums">
              {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, clientesFiltrados.length)} de {clientesFiltrados.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="h-7 px-3 text-xs rounded border border-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs text-text-secondary tabular-nums px-2">
                {pagina} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="h-7 px-3 text-xs rounded border border-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de Criação/Edição */}
      <ClienteDrawer
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        clienteInicial={clienteEditando}
        onSalvo={onClienteSalvo}
      />

      {/* Modal de Exclusão */}
      <ExcluirClienteModal
        open={modalExcluirAberto}
        onClose={() => { setModalExcluirAberto(false); setClienteExcluindo(null) }}
        cliente={clienteExcluindo}
        onExcluido={onClienteExcluido}
      />
    </div>
  )
}
