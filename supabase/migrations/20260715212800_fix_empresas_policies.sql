-- Migration: sincronizar policies de empresas já aplicadas manualmente no banco
-- Espelha o estado real do banco no repositório — sem criar divergência.

drop policy if exists "select_empresa" on empresas;
drop policy if exists "update_empresa" on empresas;
drop policy if exists "usuarios sem empresa podem criar uma" on empresas;
drop policy if exists "usuario ve empresa recem criada por ele mesmo" on empresas;

create policy "usuarios sem empresa podem criar uma"
  on empresas for insert
  to authenticated
  with check (true);

create policy "usuario ve empresa recem criada por ele mesmo"
  on empresas for select
  to authenticated
  using (
    id = empresa_atual()
    or not exists (
      select 1 from perfis where id = auth.uid() and empresa_id is not null
    )
  );

create policy "update_empresa"
  on empresas for update
  using (id = empresa_atual());
