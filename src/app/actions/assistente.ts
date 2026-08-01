"use server"

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { AnthropicProvider } from '@/lib/ia/anthropic-provider';
import {
  buscar_resumo_financeiro,
  buscar_agendamentos,
  buscar_cliente,
  buscar_vendas,
  buscar_orcamentos_pendentes,
  buscar_top_clientes,
  FERRAMENTAS_IA_DEFINICOES
} from '@/lib/ia/ferramentas';
import { gerarBriefingDiario } from '@/lib/ia/briefing';

export async function obterHistoricoMensagens() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('assistente_mensagens')
    .select('id, papel, conteudo, criado_em')
    .eq('perfil_id', user.id)
    .order('criado_em', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[Action] Erro ao buscar histórico:', error);
    return [];
  }

  return data || [];
}

export async function obterBriefing() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  return await gerarBriefingDiario(supabase);
}

export async function enviarMensagemAssistente(texto: string) {
  if (!texto || !texto.trim()) {
    return { error: 'Mensagem vazia' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Não autenticado' };
  }

  // Busca perfil para obter o empresa_id
  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (perfilError || !perfil?.empresa_id) {
    return { error: 'Perfil ou empresa não encontrados' };
  }

  const empresaId = perfil.empresa_id;
  const perfilId = user.id;

  // 1. Salva a mensagem do usuário
  const { error: userInsertError } = await supabase
    .from('assistente_mensagens')
    .insert({
      empresa_id: empresaId,
      perfil_id: perfilId,
      papel: 'usuario',
      conteudo: texto,
    });

  if (userInsertError) {
    console.error('[Action] Erro ao salvar mensagem do usuário:', userInsertError);
    return { error: 'Erro ao salvar mensagem' };
  }

  // 2. Busca histórico recente (últimas 20) incluindo a que acabamos de salvar
  const { data: historico, error: histError } = await supabase
    .from('assistente_mensagens')
    .select('papel, conteudo')
    .eq('perfil_id', perfilId)
    .order('criado_em', { ascending: false })
    .limit(20);

  if (histError) {
    console.error('[Action] Erro ao buscar histórico:', histError);
    return { error: 'Erro ao processar histórico' };
  }

  // Reverte para ordem cronológica
  const mensagensIA = (historico || [])
    .reverse()
    .map((msg) => ({
      papel: msg.papel as 'usuario' | 'assistente',
      conteudo: msg.conteudo,
    }));

  try {
    // 3. Inicializa o provedor Anthropic
    const provider = new AnthropicProvider();

    // Função de execução de ferramentas vinculada ao Supabase client com RLS
    const executarFerramenta = async (nome: string, args: any) => {
      switch (nome) {
        case 'buscar_resumo_financeiro':
          return await buscar_resumo_financeiro(supabase, args);
        case 'buscar_agendamentos':
          return await buscar_agendamentos(supabase, args);
        case 'buscar_cliente':
          return await buscar_cliente(supabase, args);
        case 'buscar_vendas':
          return await buscar_vendas(supabase, args);
        case 'buscar_orcamentos_pendentes':
          return await buscar_orcamentos_pendentes(supabase);
        case 'buscar_top_clientes':
          return await buscar_top_clientes(supabase, args);
        default:
          throw new Error(`Ferramenta desconhecida: ${nome}`);
      }
    };

    // 4. Envia para o provedor
    const resposta = await provider.enviarMensagem({
      mensagens: mensagensIA,
      ferramentas: FERRAMENTAS_IA_DEFINICOES,
      executarFerramenta,
    });

    // 5. Salva a resposta do assistente
    const { error: assistantInsertError } = await supabase
      .from('assistente_mensagens')
      .insert({
        empresa_id: empresaId,
        perfil_id: perfilId,
        papel: 'assistente',
        conteudo: resposta,
      });

    if (assistantInsertError) {
      console.error('[Action] Erro ao salvar mensagem do assistente:', assistantInsertError);
    }

    revalidatePath('/assistente');
    return { success: true, resposta };
  } catch (err: any) {
    console.error('[Action IA Error]', err);
    
    // Salva mensagem de erro amigável do assistente no banco para manter histórico consistente
    const erroMsg = 'Desculpe, tive um problema de conexão para processar os dados agora.';
    await supabase.from('assistente_mensagens').insert({
      empresa_id: empresaId,
      perfil_id: perfilId,
      papel: 'assistente',
      conteudo: erroMsg,
    });

    revalidatePath('/assistente');
    return { error: err.message || 'Erro no processamento da IA', resposta: erroMsg };
  }
}

export async function transcreverAudio(formData: FormData) {
  const audioFile = formData.get('file') as File;
  if (!audioFile) {
    return { error: 'Nenhum arquivo de áudio recebido.' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-SUBSTITUA_PELA_CHAVE_REAL')) {
    return { error: 'Chave OPENAI_API_KEY ausente ou não configurada no servidor.' };
  }

  try {
    const openAiFormData = new FormData();
    openAiFormData.append('file', audioFile);
    openAiFormData.append('model', 'whisper-1');
    openAiFormData.append('language', 'pt');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: openAiFormData
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[OpenAI Whisper API Error]', errText);
      return { error: `Erro na transcrição: ${res.statusText}` };
    }

    const data = await res.json();
    return { text: data.text };
  } catch (err: any) {
    console.error('[Action Whisper Error]', err);
    return { error: err.message || 'Erro inesperado na transcrição.' };
  }
}
