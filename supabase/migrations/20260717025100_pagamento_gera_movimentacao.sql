-- Migration: Trigger que gera movimentação financeira ao confirmar pagamento
-- e atualiza o status da venda para 'concluida' quando totalmente pago.

create or replace function public.registrar_movimentacao_de_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  categoria_vendas_id uuid;
  numero_venda integer;
  total_servicos numeric(12,2);
  desconto_calc numeric(12,2);
  total_venda numeric(12,2);
  total_pago numeric(12,2);
  v_desconto_tipo text;
  v_desconto_valor numeric(12,2);
begin
  -- Só age quando o status muda para 'pago'
  if new.status != 'pago' then
    return new;
  end if;
  -- Evita duplicação se já estava pago (UPDATE sem mudança de status)
  if TG_OP = 'UPDATE' and old.status = 'pago' then
    return new;
  end if;

  -- Busca dados da venda
  select numero_sequencial, desconto_tipo, desconto_valor
    into numero_venda, v_desconto_tipo, v_desconto_valor
  from vendas where id = new.venda_id;

  -- Garante categoria 'Vendas' existe
  select id into categoria_vendas_id
  from categorias_financeiras
  where empresa_id = new.empresa_id and nome = 'Vendas' and tipo = 'entrada'
  limit 1;

  if categoria_vendas_id is null then
    insert into categorias_financeiras (empresa_id, nome, tipo)
    values (new.empresa_id, 'Vendas', 'entrada')
    returning id into categoria_vendas_id;
  end if;

  -- Insere movimentação financeira
  insert into movimentacoes_financeiras (
    empresa_id, conta_id, categoria_id, venda_id, tipo, valor, data, status, descricao
  ) values (
    new.empresa_id, new.conta_id, categoria_vendas_id, new.venda_id, 'entrada', new.valor,
    coalesce(new.data_pagamento, current_date), 'pago',
    'Venda #' || coalesce(numero_venda::text, '')
  );

  -- Calcula total da venda
  select coalesce(sum(preco_aplicado), 0) into total_servicos
  from venda_servicos where venda_id = new.venda_id;

  desconto_calc := case
    when v_desconto_tipo = 'percentual' then total_servicos * (coalesce(v_desconto_valor,0) / 100)
    when v_desconto_tipo = 'valor' then coalesce(v_desconto_valor, 0)
    else 0
  end;
  total_venda := total_servicos - desconto_calc;

  -- Total já pago (incluindo o pagamento atual)
  select coalesce(sum(valor), 0) into total_pago
  from pagamentos where venda_id = new.venda_id and status = 'pago';

  -- Marca venda como concluída se totalmente paga
  if total_pago >= total_venda then
    update vendas set status = 'concluida' where id = new.venda_id and status != 'concluida';
  end if;

  return new;
end;
$$;

create trigger trg_pagamento_gera_movimentacao
  after insert or update on pagamentos
  for each row execute function registrar_movimentacao_de_pagamento();
