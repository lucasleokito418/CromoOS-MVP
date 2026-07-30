'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { DollarSign, Calendar, FileText, AlertTriangle } from 'lucide-react'
import { BriefingDiario } from '@/lib/ia/briefing'

interface CardBriefingProps {
  briefing: BriefingDiario
}

export function CardBriefing({ briefing }: CardBriefingProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const formatarDataSimples = (dataStr: string) => {
    const parts = dataStr.split('-')
    if (parts.length !== 3) return dataStr
    return `${parts[2]}/${parts[1]}`
  }

  return (
    <Card className="bg-surface/50 border-border/80 backdrop-blur-sm shadow-md" padding="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Briefing Diário (Resumo Rápido)
          </h2>
          <span className="text-[10px] text-text-secondary">Atualizado agora</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Faturamento Ontem */}
          <div className="flex items-center gap-3 p-3 bg-canvas/30 rounded border border-border/20">
            <div className="p-2 rounded bg-success/10 text-success">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-medium">Faturamento Ontem</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">
                {formatarMoeda(briefing.faturamentoOntem)}
              </p>
            </div>
          </div>

          {/* Agendamentos Hoje */}
          <div className="flex items-center gap-3 p-3 bg-canvas/30 rounded border border-border/20">
            <div className="p-2 rounded bg-info/10 text-info">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-medium">Agendamentos Hoje</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">
                {briefing.qtdAgendamentosHoje}
              </p>
            </div>
          </div>

          {/* Orçamentos Pendentes > 3 dias */}
          <div className="flex items-center gap-3 p-3 bg-canvas/30 rounded border border-border/20">
            <div className="p-2 rounded bg-warning/10 text-warning">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-medium">Orçamentos Pendentes (&gt;3d)</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">
                {briefing.orcamentosPendentesMaisDeTresDias}
              </p>
            </div>
          </div>

          {/* Pagamentos Atrasados */}
          <div className="flex flex-col justify-center p-3 bg-canvas/30 rounded border border-border/20 md:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className={briefing.clientesAtrasados.length > 0 ? "text-danger" : "text-text-secondary"} />
              <p className="text-[10px] text-text-secondary uppercase font-medium">Pagamentos Atrasados</p>
            </div>
            {briefing.clientesAtrasados.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum pagamento pendente em atraso.</p>
            ) : (
              <div className="text-[11px] text-text-primary max-h-[32px] overflow-y-auto scrollbar-thin">
                {briefing.clientesAtrasados.slice(0, 2).map((cli, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-1 font-medium">
                    <span className="truncate max-w-[90px]">{cli.clienteNome}</span>
                    <span className="text-danger font-bold tabular-nums">
                      {formatarMoeda(cli.valor)} ({formatarDataSimples(cli.dataPrevista)})
                    </span>
                  </div>
                ))}
                {briefing.clientesAtrasados.length > 2 && (
                  <p className="text-[9px] text-text-secondary text-right">
                    +{briefing.clientesAtrasados.length - 2} outros
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
