import { SupabaseClient } from '@supabase/supabase-js';
import { FerramentaIA } from './adapter';

export const FERRAMENTAS_IA_DEFINICOES: FerramentaIA[] = [
  {
    name: 'buscar_resumo_financeiro',
    description: 'Busca o resumo financeiro (soma de entradas, saídas e saldo) de movimentações financeiras pagas em um período (hoje, semana ou mes).',
    input_schema: {
      type: 'object',
      properties: {
        periodo: {
          type: 'string',
          enum: ['hoje', 'semana', 'mes'],
          description: 'O período do resumo financeiro.'
        }
      },
      required: ['periodo']
    }
  },
  {
    name: 'buscar_agendamentos',
    description: 'Busca a lista de agendamentos para uma data específica (padrão é hoje). Retorna status, horário, cliente, veículo e serviços vinculados.',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'A data no formato YYYY-MM-DD. Opcional (padrão é hoje).'
        }
      }
    }
  },
  {
    name: 'buscar_cliente',
    description: 'Busca dados de um cliente pelo nome, incluindo informações de contato, seus veículos cadastrados, estofados cadastrados, e o histórico de seus últimos agendamentos e vendas.',
    input_schema: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome completo ou parte do nome do cliente para busca.'
        }
      },
      required: ['nome']
    }
  },
  {
    name: 'buscar_vendas',
    description: 'Retorna a soma total e a lista detalhada das vendas concluídas em um determinado período (hoje, semana ou mes).',
    input_schema: {
      type: 'object',
      properties: {
        periodo: {
          type: 'string',
          enum: ['hoje', 'semana', 'mes'],
          description: 'O período de vendas.'
        }
      },
      required: ['periodo']
    }
  },
  {
    name: 'buscar_orcamentos_pendentes',
    description: 'Retorna a lista de orçamentos com status pendente (aguardando aprovação ou expiração).',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'buscar_top_clientes',
    description: 'Busca a lista dos principais clientes da empresa com base no score de fidelidade/gasto.',
    input_schema: {
      type: 'object',
      properties: {
        limite: {
          type: 'integer',
          description: 'Número máximo de clientes a retornar (padrão 10).'
        }
      }
    }
  }
];

export async function buscar_resumo_financeiro(
  supabase: SupabaseClient,
  params: { periodo: 'hoje' | 'semana' | 'mes' }
) {
  const { periodo } = params;
  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];

  let deStr = hojeStr;
  if (periodo === 'semana') {
    const de = new Date();
    de.setDate(agora.getDate() - 7);
    deStr = de.toISOString().split('T')[0];
  } else if (periodo === 'mes') {
    const de = new Date();
    de.setDate(agora.getDate() - 30);
    deStr = de.toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('movimentacoes_financeiras')
    .select('tipo, valor')
    .eq('status', 'pago')
    .gte('data', deStr)
    .lte('data', hojeStr);

  if (error) throw error;

  let entradas = 0;
  let saidas = 0;

  data?.forEach((mov) => {
    const val = Number(mov.valor) || 0;
    if (mov.tipo === 'entrada') entradas += val;
    else if (mov.tipo === 'saida') saidas += val;
  });

  return {
    periodo,
    de: deStr,
    ate: hojeStr,
    entradas,
    saidas,
    saldo: entradas - saidas
  };
}

export async function buscar_agendamentos(
  supabase: SupabaseClient,
  params: { data?: string }
) {
  const targetDateStr = params.data || new Date().toISOString().split('T')[0];

  // Filtra agendamentos que iniciam no dia especificado
  const startOfDay = `${targetDateStr}T00:00:00.000Z`;
  const endOfDay = `${targetDateStr}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      id, titulo, descricao, data_inicio, data_fim, status,
      cliente_id, veiculo_id, estofado_id, funcionario_id,
      clientes (id, nome, whatsapp),
      veiculos (id, marca, modelo, placa),
      estofados (id, descricao),
      agendamento_servicos (
        id, preco_aplicado,
        servicos (id, nome)
      )
    `)
    .gte('data_inicio', startOfDay)
    .lte('data_inicio', endOfDay)
    .order('data_inicio', { ascending: true });

  if (error) throw error;

  return data?.map((ag: any) => {
    const servicos = ag.agendamento_servicos?.map((s: any) => ({
      nome: s.servicos?.nome || 'Serviço',
      preco: Number(s.preco_aplicado) || 0
    })) || [];

    return {
      id: ag.id,
      titulo: ag.titulo,
      descricao: ag.descricao,
      horario_inicio: ag.data_inicio,
      horario_fim: ag.data_fim,
      status: ag.status,
      cliente: ag.clientes?.nome || 'Não especificado',
      whatsapp: ag.clientes?.whatsapp || null,
      veiculo: ag.veiculos ? `${ag.veiculos.marca} ${ag.veiculos.modelo} (${ag.veiculos.placa || 'Sem placa'})` : null,
      estofado: ag.estofados?.descricao || null,
      servicos
    };
  }) || [];
}

export async function buscar_cliente(
  supabase: SupabaseClient,
  params: { nome: string }
) {
  const { nome } = params;

  // Busca clientes parecidos com o nome
  const { data: clientes, error: errCliente } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nome', `%${nome}%`)
    .limit(5);

  if (errCliente) throw errCliente;
  if (!clientes || clientes.length === 0) {
    return { mensagem: `Nenhum cliente encontrado com o nome contendo "${nome}".` };
  }

  const resultados = [];

  for (const cli of clientes) {
    // Busca veículos
    const { data: veiculos } = await supabase
      .from('veiculos')
      .select('*')
      .eq('cliente_id', cli.id);

    // Busca estofados
    const { data: estofados } = await supabase
      .from('estofados')
      .select('*')
      .eq('cliente_id', cli.id);

    // Busca últimos 5 agendamentos
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('id, titulo, status, data_inicio')
      .eq('cliente_id', cli.id)
      .order('data_inicio', { ascending: false })
      .limit(5);

    // Busca últimas 5 vendas
    const { data: vendas } = await supabase
      .from('vendas')
      .select(`
        id, numero_sequencial, status, criado_em, desconto_tipo, desconto_valor,
        venda_servicos (preco_aplicado)
      `)
      .eq('cliente_id', cli.id)
      .order('criado_em', { ascending: false })
      .limit(5);

    const vendasFormatadas = vendas?.map((v: any) => {
      const totalServicos = v.venda_servicos?.reduce((acc: number, item: any) => acc + (Number(item.preco_aplicado) || 0), 0) || 0;
      let totalComDesconto = totalServicos;
      if (v.desconto_tipo === 'percentual') {
        totalComDesconto = totalServicos - (totalServicos * (Number(v.desconto_valor) || 0) / 100);
      } else if (v.desconto_tipo === 'valor') {
        totalComDesconto = totalServicos - (Number(v.desconto_valor) || 0);
      }

      return {
        id: v.id,
        numero: v.numero_sequencial,
        status: v.status,
        criado_em: v.criado_em,
        valor: totalComDesconto
      };
    }) || [];

    resultados.push({
      cliente: {
        id: cli.id,
        nome: cli.nome,
        whatsapp: cli.whatsapp,
        email: cli.email,
        score: cli.score,
        observacoes: cli.observacoes
      },
      veiculos: veiculos?.map(v => `${v.marca} ${v.modelo} (${v.placa || 'Sem Placa'})`) || [],
      estofados: estofados?.map(e => e.descricao) || [],
      agendamentos: agendamentos || [],
      vendas: vendasFormatadas
    });
  }

  return resultados;
}

export async function buscar_vendas(
  supabase: SupabaseClient,
  params: { periodo: 'hoje' | 'semana' | 'mes' }
) {
  const { periodo } = params;
  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];

  // Calculo de data de início baseado em data local
  let deStr = hojeStr;
  if (periodo === 'semana') {
    const de = new Date();
    de.setDate(agora.getDate() - 7);
    deStr = de.toISOString().split('T')[0];
  } else if (periodo === 'mes') {
    const de = new Date();
    de.setDate(agora.getDate() - 30);
    deStr = de.toISOString().split('T')[0];
  }

  // Filtrar timestamptz criado_em
  const startOfDay = `${deStr}T00:00:00.000Z`;
  const endOfDay = `${hojeStr}T23:59:59.999Z`;

  const { data: vendas, error } = await supabase
    .from('vendas')
    .select(`
      id, numero_sequencial, status, criado_em, desconto_tipo, desconto_valor,
      clientes (nome),
      venda_servicos (
        preco_aplicado,
        servicos (nome)
      )
    `)
    .eq('status', 'concluida')
    .gte('criado_em', startOfDay)
    .lte('criado_em', endOfDay)
    .order('criado_em', { ascending: false });

  if (error) throw error;

  let somaTotal = 0;
  const listaVendas = vendas?.map((v: any) => {
    const totalServicos = v.venda_servicos?.reduce((acc: number, item: any) => acc + (Number(item.preco_aplicado) || 0), 0) || 0;
    let totalComDesconto = totalServicos;
    if (v.desconto_tipo === 'percentual') {
      totalComDesconto = totalServicos - (totalServicos * (Number(v.desconto_valor) || 0) / 100);
    } else if (v.desconto_tipo === 'valor') {
      totalComDesconto = totalServicos - (Number(v.desconto_valor) || 0);
    }

    somaTotal += totalComDesconto;

    return {
      id: v.id,
      numero: v.numero_sequencial,
      cliente: v.clientes?.nome || 'Desconhecido',
      criado_em: v.criado_em,
      servicos: v.venda_servicos?.map((s: any) => s.servicos?.nome || 'Serviço') || [],
      valor: totalComDesconto
    };
  }) || [];

  return {
    periodo,
    de: deStr,
    ate: hojeStr,
    soma_total: somaTotal,
    vendas: listaVendas
  };
}

export async function buscar_orcamentos_pendentes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('orcamentos')
    .select(`
      id, data, validade, status, desconto_tipo, desconto_valor, criado_em,
      clientes (nome),
      orcamento_servicos (
        preco_aplicado,
        servicos (nome)
      )
    `)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false });

  if (error) throw error;

  return data?.map((orc: any) => {
    const totalServicos = orc.orcamento_servicos?.reduce((acc: number, item: any) => acc + (Number(item.preco_aplicado) || 0), 0) || 0;
    let totalComDesconto = totalServicos;
    if (orc.desconto_tipo === 'percentual') {
      totalComDesconto = totalServicos - (totalServicos * (Number(orc.desconto_valor) || 0) / 100);
    } else if (orc.desconto_tipo === 'valor') {
      totalComDesconto = totalServicos - (Number(orc.desconto_valor) || 0);
    }

    return {
      id: orc.id,
      cliente: orc.clientes?.nome || 'Desconhecido',
      data: orc.data,
      validade: orc.validade,
      criado_em: orc.criado_em,
      servicos: orc.orcamento_servicos?.map((s: any) => s.servicos?.nome || 'Serviço') || [],
      valor: totalComDesconto
    };
  }) || [];
}

export async function buscar_top_clientes(
  supabase: SupabaseClient,
  params: { limite?: number }
) {
  const limit = params.limite || 10;

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, whatsapp, score, criado_em')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
}
