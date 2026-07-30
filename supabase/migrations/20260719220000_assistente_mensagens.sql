-- Migration: Bloco 8A — Assistente de IA
-- Tabela de histórico de mensagens por usuário

create table if not exists assistente_mensagens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  perfil_id uuid not null references perfis(id),
  papel text not null check (papel in ('usuario','assistente')),
  conteudo text not null,
  criado_em timestamptz not null default now()
);

alter table assistente_mensagens enable row level security;

-- SELECT: usuário só vê as próprias mensagens (mesmo dentro da empresa)
create policy "assistente_mensagens_select" on assistente_mensagens
  for select using (
    empresa_id = empresa_atual()
    and perfil_id = auth.uid()
  );

-- INSERT: usuário insere apenas com seu próprio perfil_id
create policy "assistente_mensagens_insert" on assistente_mensagens
  for insert with check (
    empresa_id = empresa_atual()
    and perfil_id = auth.uid()
  );

-- UPDATE: histórico imutável
create policy "assistente_mensagens_update" on assistente_mensagens
  for update using (false);

-- DELETE: não permitido
create policy "assistente_mensagens_delete" on assistente_mensagens
  for delete using (false);
