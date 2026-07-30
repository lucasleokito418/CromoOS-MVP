-- ============================================================
-- MIGRATIONS PENDENTES — Aplicar no SQL Editor do Supabase
-- Dashboard: https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- MIGRATION 1: Caixa + Convites (20260716184400)
-- Execute isso PRIMEIRO. Se já existir, vai dar erro "already exists"
-- e pode ignorar — significa que já foi aplicado.
-- ──────────────────────────────────────────────────────────

create table if not exists caixa_sessoes (
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

create table if not exists caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  caixa_sessao_id uuid not null references caixa_sessoes(id) on delete cascade,
  tipo text not null check (tipo in ('sangria','reforco')),
  valor numeric(12,2) not null,
  motivo text,
  criado_em timestamptz not null default now()
);

create table if not exists convites_funcionario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  email text not null,
  papel text not null default 'funcionario' check (papel in ('funcionario','dono')),
  token uuid not null default gen_random_uuid(),
  usado boolean not null default false,
  expira_em timestamptz not null default (now() + interval '7 days'),
  criado_em timestamptz not null default now()
);

-- Índice único: apenas 1 caixa aberto por empresa
create unique index if not exists caixa_sessoes_uma_aberta_por_empresa
  on caixa_sessoes(empresa_id)
  where status = 'aberto';

-- RLS
alter table caixa_sessoes enable row level security;
alter table caixa_movimentacoes enable row level security;
alter table convites_funcionario enable row level security;

-- Políticas Caixa Sessoes (drop antes para evitar conflito)
drop policy if exists "select_por_empresa" on caixa_sessoes;
drop policy if exists "insert_por_empresa" on caixa_sessoes;
drop policy if exists "update_por_empresa" on caixa_sessoes;
drop policy if exists "delete_por_empresa" on caixa_sessoes;

create policy "select_por_empresa" on caixa_sessoes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on caixa_sessoes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on caixa_sessoes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on caixa_sessoes for delete using (empresa_id = empresa_atual());

-- Políticas Caixa Movimentacoes
drop policy if exists "select_por_empresa" on caixa_movimentacoes;
drop policy if exists "insert_por_empresa" on caixa_movimentacoes;
drop policy if exists "update_por_empresa" on caixa_movimentacoes;
drop policy if exists "delete_por_empresa" on caixa_movimentacoes;

create policy "select_por_empresa" on caixa_movimentacoes for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on caixa_movimentacoes for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on caixa_movimentacoes for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on caixa_movimentacoes for delete using (empresa_id = empresa_atual());

-- Políticas Convites
drop policy if exists "select_por_empresa" on convites_funcionario;
drop policy if exists "insert_por_empresa" on convites_funcionario;
drop policy if exists "update_por_empresa" on convites_funcionario;
drop policy if exists "delete_por_empresa" on convites_funcionario;

create policy "select_por_empresa" on convites_funcionario for select using (empresa_id = empresa_atual());
create policy "insert_por_empresa" on convites_funcionario for insert with check (empresa_id = empresa_atual());
create policy "update_por_empresa" on convites_funcionario for update using (empresa_id = empresa_atual());
create policy "delete_por_empresa" on convites_funcionario for delete using (empresa_id = empresa_atual());


-- ──────────────────────────────────────────────────────────
-- MIGRATION 2: Vagas Espaço (20260716220000)
-- A tabela vagas_espaco já existe no schema inicial.
-- Esta migration adiciona o unique constraint que faltava.
-- ──────────────────────────────────────────────────────────

-- Adiciona constraint unique se não existir
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'vagas_espaco_empresa_id_identificador_key'
  ) then
    alter table vagas_espaco add constraint vagas_espaco_empresa_id_identificador_key unique (empresa_id, identificador);
  end if;
end $$;

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO: Rode isso para confirmar que tudo existe
-- ──────────────────────────────────────────────────────────
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_name in ('caixa_sessoes', 'caixa_movimentacoes', 'convites_funcionario', 'vagas_espaco')
order by table_name;
