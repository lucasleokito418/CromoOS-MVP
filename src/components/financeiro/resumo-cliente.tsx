"use client"

import React, { useMemo } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts"

interface ResumoClienteProps {
  contas: any[]
  movimentacoes: any[]
  mesDias: number
  mesNome: string
  hojeStr: string
}

export function ResumoCliente({ contas, movimentacoes, mesDias, mesNome, hojeStr }: ResumoClienteProps) {
  // 1. Calcular Saldo de Cada Conta e Saldo Total
  const contasComSaldo = useMemo(() => {
    return contas.map((conta) => {
      const movimentacoesDaConta = movimentacoes.filter((m) => m.conta_id === conta.id && m.status === "pago")
      const entradas = movimentacoesDaConta
        .filter((m) => m.tipo === "entrada")
        .reduce((sum, m) => sum + Number(m.valor), 0)
      const saidas = movimentacoesDaConta
        .filter((m) => m.tipo === "saida")
        .reduce((sum, m) => sum + Number(m.valor), 0)
      
      const saldoAtual = Number(conta.saldo_inicial) + entradas - saidas
      return {
        ...conta,
        saldoAtual
      }
    })
  }, [contas, movimentacoes])

  const saldoTotal = useMemo(() => {
    return contasComSaldo.reduce((sum, c) => sum + c.saldoAtual, 0)
  }, [contasComSaldo])

  // 2. Entradas e Saídas de Hoje
  const entradasHoje = useMemo(() => {
    return movimentacoes
      .filter((m) => m.data === hojeStr && m.tipo === "entrada" && m.status === "pago")
      .reduce((sum, m) => sum + Number(m.valor), 0)
  }, [movimentacoes, hojeStr])

  const saidasHoje = useMemo(() => {
    return movimentacoes
      .filter((m) => m.data === hojeStr && m.tipo === "saida" && m.status === "pago")
      .reduce((sum, m) => sum + Number(m.valor), 0)
  }, [movimentacoes, hojeStr])

  // 3. Contas A Pagar e A Receber (Pendentes)
  const aPagar = useMemo(() => {
    return movimentacoes
      .filter((m) => m.tipo === "saida" && m.status === "pendente")
      .reduce((sum, m) => sum + Number(m.valor), 0)
  }, [movimentacoes])

  const aReceber = useMemo(() => {
    return movimentacoes
      .filter((m) => m.tipo === "entrada" && m.status === "pendente")
      .reduce((sum, m) => sum + Number(m.valor), 0)
  }, [movimentacoes])

  // 4. Montar dados para o Gráfico de Fluxo de Caixa Diário do mês corrente
  const dadosGrafico = useMemo(() => {
    const dataRef = new Date(hojeStr + "T12:00:00")
    const ano = dataRef.getFullYear()
    const mes = dataRef.getMonth()

    const lista = []
    for (let dia = 1; dia <= mesDias; dia++) {
      const diaStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
      const movsDoDia = movimentacoes.filter((m) => m.data === diaStr && m.status === "pago")
      
      const entradas = movsDoDia
        .filter((m) => m.tipo === "entrada")
        .reduce((sum, m) => sum + Number(m.valor), 0)
      const saidas = movsDoDia
        .filter((m) => m.tipo === "saida")
        .reduce((sum, m) => sum + Number(m.valor), 0)

      lista.push({
        name: String(dia),
        Entradas: Number(entradas.toFixed(2)),
        Saídas: Number(saidas.toFixed(2)),
      })
    }
    return lista
  }, [movimentacoes, mesDias, hojeStr])

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Resumo Financeiro"
        subtitle={`Visão geral do caixa e das contas no mês de ${mesNome}`}
      />

      {/* Faixa horizontal única de métricas com divisores finos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 bg-surface border border-border rounded shadow-sm overflow-hidden divide-y sm:divide-y-0 sm:divide-x md:divide-x divide-border">
        {/* Saldo Total */}
        <div className="p-5 flex flex-col justify-center min-w-0">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Saldo em Contas</span>
          <span className="text-xl font-semibold text-text-primary mt-1 font-oswald tracking-wide tabular-nums">
            {formatarMoeda(saldoTotal)}
          </span>
        </div>

        {/* Entradas Hoje */}
        <div className="p-5 flex flex-col justify-center min-w-0">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Entradas Hoje</span>
          <span className="text-xl font-semibold text-success mt-1 font-oswald tracking-wide tabular-nums">
            + {formatarMoeda(entradasHoje)}
          </span>
        </div>

        {/* Saídas Hoje */}
        <div className="p-5 flex flex-col justify-center min-w-0">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Saídas Hoje</span>
          <span className="text-xl font-semibold text-danger mt-1 font-oswald tracking-wide tabular-nums">
            - {formatarMoeda(saidasHoje)}
          </span>
        </div>

        {/* A Receber */}
        <div className="p-5 flex flex-col justify-center min-w-0">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">A Receber</span>
          <span className="text-xl font-semibold text-text-primary mt-1 font-oswald tracking-wide opacity-80 tabular-nums">
            {formatarMoeda(aReceber)}
          </span>
        </div>

        {/* A Pagar */}
        <div className="p-5 flex flex-col justify-center min-w-0 col-span-2 md:col-span-1">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">A Pagar</span>
          <span className="text-xl font-semibold text-text-primary mt-1 font-oswald tracking-wide opacity-80 tabular-nums">
            {formatarMoeda(aPagar)}
          </span>
        </div>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Fluxo de Caixa Diário</h2>
            <span className="text-xs text-text-secondary font-medium">{mesNome}</span>
          </div>
        }
      >
        <div className="h-[360px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
              <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#141414", borderColor: "#262626", borderRadius: "6px" }}
                labelClassName="text-text-secondary text-xs"
                itemStyle={{ fontSize: "12px", fontWeight: 600 }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="Entradas" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" name="Entradas (R$)" />
              <Area type="monotone" dataKey="Saídas" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSaidas)" name="Saídas (R$)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
