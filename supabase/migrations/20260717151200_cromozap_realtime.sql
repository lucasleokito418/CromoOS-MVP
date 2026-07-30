-- Migration: Habilitar Realtime para as tabelas de gatilho do CromoZap

alter table agendamentos replica identity full;
alter table orcamentos replica identity full;
alter table vagas_espaco replica identity full;
alter table vendas replica identity full;
alter table solicitacoes_autoagendamento replica identity full;

-- Adiciona as tabelas à publicação de Realtime do Supabase
alter publication supabase_realtime add table agendamentos;
alter publication supabase_realtime add table orcamentos;
alter publication supabase_realtime add table vagas_espaco;
alter publication supabase_realtime add table vendas;
alter publication supabase_realtime add table solicitacoes_autoagendamento;
