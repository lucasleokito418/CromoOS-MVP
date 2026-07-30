-- Criar enum para os tipos de gatilhos operacionais se não existir
DO $$ BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_gatilho_zap') THEN 
        CREATE TYPE tipo_gatilho_zap AS ENUM (
           'agendamento_confirmado',
           'orcamento_criado',
           'alerta_revisao_6meses',
           'alerta_maresia_litoral'
        );
    END IF;
END $$;

-- Criar a tabela de automações
CREATE TABLE IF NOT EXISTS public.automacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    gatilho tipo_gatilho_zap NOT NULL,
    template_mensagem TEXT NOT NULL,
    status BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança Multi-tenant baseadas em empresa_atual()
DROP POLICY IF EXISTS "Usuários podem ver automações da própria empresa" ON public.automacoes;
CREATE POLICY "Usuários podem ver automações da própria empresa" 
ON public.automacoes FOR SELECT USING (empresa_id = empresa_atual());

DROP POLICY IF EXISTS "Usuários podem inserir automações na própria empresa" ON public.automacoes;
CREATE POLICY "Usuários podem inserir automações na própria empresa" 
ON public.automacoes FOR INSERT WITH CHECK (empresa_id = empresa_atual());

DROP POLICY IF EXISTS "Usuários podem atualizar automações da própria empresa" ON public.automacoes;
CREATE POLICY "Usuários podem atualizar automações da própria empresa" 
ON public.automacoes FOR UPDATE USING (empresa_id = empresa_atual());

DROP POLICY IF EXISTS "Usuários podem deletar automações da própria empresa" ON public.automacoes;
CREATE POLICY "Usuários podem deletar automações da própria empresa" 
ON public.automacoes FOR DELETE USING (empresa_id = empresa_atual());
