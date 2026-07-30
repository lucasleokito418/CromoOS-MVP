-- 1. Helper function for multi-tenancy
create or replace function empresa_atual()
returns uuid
language sql
security definer
stable
as $$
  select empresa_id from perfis where id = auth.uid()
$$;

-- 2. Core multi-tenant tables
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  criado_em timestamptz not null default now()
);

create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete set null,
  nome text not null,
  papel text not null default 'dono' check (papel in ('dono', 'funcionario')),
  cargo text,
  comissao_percentual_padrao numeric(5,2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 3. Clientes e ativos
create table clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nome text not null,
  whatsapp text,
  whatsapp_opt_in boolean not null default true,
  telefone_extra text,
  cpf_cnpj text,
  email text,
  origem text check (origem in ('sistema','meta_ads','google_ads','autoagendamento','indicacao','evento','site','outro')),
  data_nascimento date,
  observacoes text,
  endereco jsonb,
  score integer default 0,
  criado_em timestamptz not null default now()
);

create table veiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text not null check (tipo in ('carro','moto')),
  marca text not null,
  modelo text not null,
  cor text,
  placa text,
  criado_em timestamptz not null default now()
);

create table estofados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  cliente_id uuid not null references clientes(id) on delete cascade,
  descricao text not null,
  cor text,
  criado_em timestamptz not null default now()
);

-- 4. Catálogo
create table servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nome text not null,
  preco numeric(10,2) not null default 0,
  comissao_percentual numeric(5,2) default 0,
  duracao_autoagendamento_minutos integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 5. Agenda
create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  cliente_id uuid not null references clientes(id),
  veiculo_id uuid references veiculos(id),
  estofado_id uuid references estofados(id),
  funcionario_id uuid references perfis(id),
  titulo text,
  descricao text,
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','confirmado','cancelado')),
  desconto_tipo text check (desconto_tipo in ('percentual','valor')),
  desconto_valor numeric(10,2) default 0,
  criado_em timestamptz not null default now()
);

create table agendamento_servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  preco_aplicado numeric(10,2) not null
);

create table solicitacoes_autoagendamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nome_solicitante text not null,
  telefone text not null,
  data_desejada timestamptz,
  status text not null default 'pendente' check (status in ('pendente','aceita','recusada')),
  criado_em timestamptz not null default now()
);

-- 6. Orçamentos
create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  cliente_id uuid not null references clientes(id),
  data date not null default current_date,
  validade date,
  desconto_tipo text check (desconto_tipo in ('percentual','valor')),
  desconto_valor numeric(10,2) default 0,
  observacoes text,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado','expirado')),
  criado_em timestamptz not null default now()
);

create table orcamento_servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  preco_aplicado numeric(10,2) not null
);

create table orcamento_fotos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  url text not null,
  criado_em timestamptz not null default now()
);

-- 7. Contas Financeiras e Vendas
create table contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nome text not null,
  tipo text not null check (tipo in ('conta_corrente','maquininha')),
  principal boolean not null default false,
  saldo_inicial numeric(12,2) not null default 0,
  metodos_recebimento text[] not null default '{}',
  taxa_debito numeric(5,2) default 0,
  taxa_pix numeric(5,2) default 0,
  taxas_credito jsonb default '{}',
  modo_credito text check (modo_credito in ('taxa_unica','escalonada')),
  criado_em timestamptz not null default now()
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  numero_sequencial integer not null,
  cliente_id uuid not null references clientes(id),
  funcionario_id uuid references perfis(id),
  agendamento_id uuid references agendamentos(id),
  orcamento_id uuid references orcamentos(id),
  desconto_tipo text check (desconto_tipo in ('percentual','valor')),
  desconto_valor numeric(10,2) default 0,
  status text not null default 'aberta' check (status in ('aberta','concluida','cancelada')),
  criado_em timestamptz not null default now()
);

create table venda_servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  venda_id uuid not null references vendas(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  preco_aplicado numeric(10,2) not null
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  venda_id uuid not null references vendas(id) on delete cascade,
  conta_id uuid references contas_financeiras(id),
  metodo text not null check (metodo in ('credito','debito','pix','dinheiro','boleto','transferencia')),
  parcelas integer default 1,
  valor numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  data_prevista date,
  data_pagamento date,
  criado_em timestamptz not null default now()
);

-- 8. Categorias Financeiras e Movimentações
create table categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nome text not null,
  tipo text not null check (tipo in ('entrada','saida'))
);

create table categorias_dre (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  nome text not null,
  grupo text not null
);

create table movimentacoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  conta_id uuid not null references contas_financeiras(id),
  categoria_id uuid references categorias_financeiras(id),
  categoria_dre_id uuid references categorias_dre(id),
  venda_id uuid references vendas(id),
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric(12,2) not null,
  data date not null default current_date,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  descricao text,
  criado_em timestamptz not null default now()
);

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  funcionario_id uuid not null references perfis(id),
  venda_id uuid not null references vendas(id),
  valor numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  data date,
  criado_em timestamptz not null default now()
);

-- 9. Vagas e Espaço
create table vagas_espaco (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  identificador text not null,
  status text not null default 'livre' check (status in ('livre','ocupada')),
  veiculo_id uuid references veiculos(id),
  estofado_id uuid references estofados(id),
  entrada_em timestamptz,
  saida_prevista_em timestamptz,
  criado_em timestamptz not null default now()
);

-- 10. WhatsApp (CromoZap)
create table conexoes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  status text not null default 'desconectado' check (status in ('desconectado','pareando','conectado')),
  atualizado_em timestamptz not null default now()
);

create table automacoes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  gatilho text not null check (gatilho in (
    'agendamento_criado','orcamento_criado','vaga_ocupada',
    'venda_concluida','vaga_liberada','autoagendamento_solicitado'
  )),
  template_mensagem text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table fila_envio_whatsapp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  automacao_id uuid references automacoes_whatsapp(id),
  cliente_id uuid references clientes(id),
  mensagem_renderizada text not null,
  status text not null default 'pendente' check (status in ('pendente','enviado','falhou')),
  agendado_para timestamptz not null default now(),
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- 11. Notificações e Auditoria
create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  perfil_id uuid references perfis(id),
  titulo text not null,
  corpo text,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create table auditoria_logs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  perfil_id uuid references perfis(id),
  acao text not null check (acao in ('criou','editou','excluiu')),
  area text not null,
  registro_nome text,
  dados_antes jsonb,
  dados_depois jsonb,
  ip text,
  user_agent text,
  criado_em timestamptz not null default now()
);

-- 12. Enable RLS on all tables
alter table empresas enable row level security;
alter table perfis enable row level security;
alter table clientes enable row level security;
alter table veiculos enable row level security;
alter table estofados enable row level security;
alter table servicos enable row level security;
alter table agendamentos enable row level security;
alter table agendamento_servicos enable row level security;
alter table solicitacoes_autoagendamento enable row level security;
alter table orcamentos enable row level security;
alter table orcamento_servicos enable row level security;
alter table orcamento_fotos enable row level security;
alter table contas_financeiras enable row level security;
alter table vendas enable row level security;
alter table venda_servicos enable row level security;
alter table pagamentos enable row level security;
alter table categorias_financeiras enable row level security;
alter table categorias_dre enable row level security;
alter table movimentacoes_financeiras enable row level security;
alter table comissoes enable row level security;
alter table vagas_espaco enable row level security;
alter table conexoes_whatsapp enable row level security;
alter table automacoes_whatsapp enable row level security;
alter table fila_envio_whatsapp enable row level security;
alter table notificacoes enable row level security;
alter table auditoria_logs enable row level security;

-- 13. RLS Policies for Empresas and Perfis
create policy "select_empresa" on empresas
  for select using (id = empresa_atual());

create policy "update_empresa" on empresas
  for update using (id = empresa_atual());

create policy "select_perfil" on perfis
  for select using (id = auth.uid() or empresa_id = empresa_atual());

create policy "insert_perfil" on perfis
  for insert with check (id = auth.uid());

create policy "update_perfil" on perfis
  for update using (id = auth.uid() or (empresa_id = empresa_atual() and exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel = 'dono'
  )));

create policy "delete_perfil" on perfis
  for delete using (empresa_id = empresa_atual() and exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel = 'dono'
  ));

-- 14. Standard multi-tenant RLS policies for all business tables
-- Clientes
create policy "select_por_empresa" on clientes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on clientes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on clientes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on clientes for delete using (empresa_id = empresa_atual());

-- Veiculos
create policy "select_por_empresa" on veiculos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on veiculos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on veiculos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on veiculos for delete using (empresa_id = empresa_atual());

-- Estofados
create policy "select_por_empresa" on estofados for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on estofados for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on estofados for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on estofados for delete using (empresa_id = empresa_atual());

-- Servicos
create policy "select_por_empresa" on servicos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on servicos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on servicos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on servicos for delete using (empresa_id = empresa_atual());

-- Agendamentos
create policy "select_por_empresa" on agendamentos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on agendamentos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on agendamentos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on agendamentos for delete using (empresa_id = empresa_atual());

-- Agendamento Serviços
create policy "select_por_empresa" on agendamento_servicos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on agendamento_servicos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on agendamento_servicos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on agendamento_servicos for delete using (empresa_id = empresa_atual());

-- Solicitações Autoagendamento
create policy "select_por_empresa" on solicitacoes_autoagendamento for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on solicitacoes_autoagendamento for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on solicitacoes_autoagendamento for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on solicitacoes_autoagendamento for delete using (empresa_id = empresa_atual());

-- Orcamentos
create policy "select_por_empresa" on orcamentos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on orcamentos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on orcamentos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on orcamentos for delete using (empresa_id = empresa_atual());

-- Orcamento Serviços
create policy "select_por_empresa" on orcamento_servicos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on orcamento_servicos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on orcamento_servicos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on orcamento_servicos for delete using (empresa_id = empresa_atual());

-- Orcamento Fotos
create policy "select_por_empresa" on orcamento_fotos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on orcamento_fotos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on orcamento_fotos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on orcamento_fotos for delete using (empresa_id = empresa_atual());

-- Contas Financeiras
create policy "select_por_empresa" on contas_financeiras for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on contas_financeiras for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on contas_financeiras for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on contas_financeiras for delete using (empresa_id = empresa_atual());

-- Vendas
create policy "select_por_empresa" on vendas for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on vendas for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on vendas for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on vendas for delete using (empresa_id = empresa_atual());

-- Venda Serviços
create policy "select_por_empresa" on venda_servicos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on venda_servicos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on venda_servicos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on venda_servicos for delete using (empresa_id = empresa_atual());

-- Pagamentos
create policy "select_por_empresa" on pagamentos for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on pagamentos for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on pagamentos for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on pagamentos for delete using (empresa_id = empresa_atual());

-- Categorias Financeiras
create policy "select_por_empresa" on categorias_financeiras for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on categorias_financeiras for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on categorias_financeiras for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on categorias_financeiras for delete using (empresa_id = empresa_atual());

-- Categorias DRE
create policy "select_por_empresa" on categorias_dre for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on categorias_dre for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on categorias_dre for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on categorias_dre for delete using (empresa_id = empresa_atual());

-- Movimentações Financeiras
create policy "select_por_empresa" on movimentacoes_financeiras for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on movimentacoes_financeiras for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on movimentacoes_financeiras for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on movimentacoes_financeiras for delete using (empresa_id = empresa_atual());

-- Comissões
create policy "select_por_empresa" on comissoes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on comissoes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on comissoes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on comissoes for delete using (empresa_id = empresa_atual());

-- Vagas Espaço
create policy "select_por_empresa" on vagas_espaco for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on vagas_espaco for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on vagas_espaco for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on vagas_espaco for delete using (empresa_id = empresa_atual());

-- Conexões WhatsApp
create policy "select_por_empresa" on conexoes_whatsapp for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on conexoes_whatsapp for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on conexoes_whatsapp for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on conexoes_whatsapp for delete using (empresa_id = empresa_atual());

-- Automações WhatsApp
create policy "select_por_empresa" on automacoes_whatsapp for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on automacoes_whatsapp for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on automacoes_whatsapp for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on automacoes_whatsapp for delete using (empresa_id = empresa_atual());

-- Fila Envio WhatsApp
create policy "select_por_empresa" on fila_envio_whatsapp for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on fila_envio_whatsapp for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on fila_envio_whatsapp for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on fila_envio_whatsapp for delete using (empresa_id = empresa_atual());

-- Notificações
create policy "select_por_empresa" on notificacoes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on notificacoes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on notificacoes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on notificacoes for delete using (empresa_id = empresa_atual());

-- Auditoria Logs
create policy "select_por_empresa" on auditoria_logs for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on auditoria_logs for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on auditoria_logs for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on auditoria_logs for delete using (empresa_id = empresa_atual());

-- 15. Create 'anexos' Storage Bucket
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;
