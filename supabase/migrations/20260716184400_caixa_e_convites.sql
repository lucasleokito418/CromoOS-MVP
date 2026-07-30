-- 1. Create Tables
create table caixa_sessoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  perfil_id uuid not null references perfis(id),
  valor_abertura numeric(12,2) not null default 0,
  data_abertura timestamptz not null default now(),
  valor_fechamento_informado numeric(12,2),
  valor_fechamento_sistema numeric(12,2),
  diferenca numeric(12,2),
  data_fechamento timestamptz,
  status text not null default 'aberto' check (status in ('aberto','fechado')),
  criado_em timestamptz not null default now()
);

create table caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  caixa_sessao_id uuid not null references caixa_sessoes(id) on delete cascade,
  tipo text not null check (tipo in ('sangria','reforco')),
  valor numeric(12,2) not null,
  motivo text,
  criado_em timestamptz not null default now()
);

create table convites_funcionario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  email text not null,
  papel text not null default 'funcionario' check (papel in ('funcionario','dono')),
  token uuid not null default gen_random_uuid(),
  usado boolean not null default false,
  expira_em timestamptz not null default (now() + interval '7 days'),
  criado_em timestamptz not null default now()
);

create unique index caixa_sessoes_uma_aberta_por_empresa
  on caixa_sessoes(empresa_id)
  where status = 'aberto';

-- 2. Enable RLS
alter table caixa_sessoes enable row level security;
alter table caixa_movimentacoes enable row level security;
alter table convites_funcionario enable row level security;

-- 3. Row Level Security Policies
-- Caixa Sessoes
create policy "select_por_empresa" on caixa_sessoes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on caixa_sessoes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on caixa_sessoes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on caixa_sessoes for delete using (empresa_id = empresa_atual());

-- Caixa Movimentacoes
create policy "select_por_empresa" on caixa_movimentacoes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on caixa_movimentacoes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on caixa_movimentacoes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on caixa_movimentacoes for delete using (empresa_id = empresa_atual());

-- Convites Funcionario
create policy "select_por_empresa" on convites_funcionario for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on convites_funcionario for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on convites_funcionario for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on convites_funcionario for delete using (empresa_id = empresa_atual());
