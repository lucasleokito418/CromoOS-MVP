-- Migration: Espaço (vagas de estacionamento/boxe)

create table vagas_espaco (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  identificador text not null, -- ex: "A1", "Box 2"
  status text not null default 'livre' check (status in ('livre', 'ocupada')),
  veiculo_id uuid references veiculos(id) on delete set null,
  estofado_id uuid references estofados(id) on delete set null,
  entrada_em timestamptz,
  saida_prevista_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, identificador)
);

-- RLS
alter table vagas_espaco enable row level security;

create policy "Empresa vê suas vagas"
  on vagas_espaco for select
  using (empresa_id = empresa_atual());

create policy "Empresa cria vagas"
  on vagas_espaco for insert
  with check (empresa_id = empresa_atual());

create policy "Empresa atualiza vagas"
  on vagas_espaco for update
  using (empresa_id = empresa_atual());

create policy "Empresa deleta vagas"
  on vagas_espaco for delete
  using (empresa_id = empresa_atual());
