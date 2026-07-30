import { SupabaseClient } from '@supabase/supabase-js';

export interface BriefingDiario {
  faturamentoOntem: number;
  qtdAgendamentosHoje: number;
  orcamentosPendentesMaisDeTresDias: number;
  clientesAtrasados: { clienteNome: string; dataPrevista: string; valor: number }[];
}

export async function gerarBriefingDiario(supabase: SupabaseClient): Promise<BriefingDiario> {
  const agora = new Date();
  
  // Data de hoje (YYYY-MM-DD)
  const hojeStr = agora.toISOString().split('T')[0];

  // Data de ontem (YYYY-MM-DD)
  const ontem = new Date();
  ontem.setDate(agora.getDate() - 1);
  const ontemStr = ontem.toISOString().split('T')[0];

  // Data limite para orçamentos pendentes (> 3 dias atrás)
  const limiteOrcamentos = new Date();
  limiteOrcamentos.setDate(agora.getDate() - 3);
  const limiteOrcamentosStr = limiteOrcamentos.toISOString();

  // Queries paralelas para alta performance e zero custo de IA
  const [
    resFaturamentoOntem,
    resAgendamentosHoje,
    resOrcamentosPendentes,
    resPagamentosAtrasados
  ] = await Promise.all([
    // 1. Faturamento de ontem (movimentações de entrada pagas ontem)
    supabase
      .from('movimentacoes_financeiras')
      .select('valor')
      .eq('tipo', 'entrada')
      .eq('status', 'pago')
      .eq('data', ontemStr),

    // 2. Agendamentos de hoje (contagem)
    supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .gte('data_inicio', `${hojeStr}T00:00:00.000Z`)
      .lte('data_inicio', `${hojeStr}T23:59:59.999Z`),

    // 3. Orçamentos pendentes criados há mais de 3 dias (contagem)
    supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .lt('criado_em', limiteOrcamentosStr),

    // 4. Clientes com pagamentos pendentes atrasados (data_prevista < hoje)
    supabase
      .from('pagamentos')
      .select(`
        valor,
        data_prevista,
        vendas (
          clientes (
            nome
          )
        )
      `)
      .eq('status', 'pendente')
      .lt('data_prevista', hojeStr)
      .limit(5) // Limita a 5 para não poluir
  ]);

  // Processa faturamento de ontem
  const faturamentoOntem = resFaturamentoOntem.data?.reduce(
    (acc, m) => acc + (Number(m.valor) || 0),
    0
  ) || 0;

  // Processa contagem de agendamentos de hoje
  const qtdAgendamentosHoje = resAgendamentosHoje.count || 0;

  // Processa contagem de orçamentos pendentes antigos
  const orcamentosPendentesMaisDeTresDias = resOrcamentosPendentes.count || 0;

  // Processa clientes atrasados
  const clientesAtrasados = resPagamentosAtrasados.data?.map((p: any) => ({
    clienteNome: p.vendas?.clientes?.nome || 'Cliente Desconhecido',
    dataPrevista: p.data_prevista,
    valor: Number(p.valor) || 0
  })) || [];

  return {
    faturamentoOntem,
    qtdAgendamentosHoje,
    orcamentosPendentesMaisDeTresDias,
    clientesAtrasados
  };
}
