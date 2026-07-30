import Anthropic from '@anthropic-ai/sdk';
import { IAProvider, FerramentaIA } from './adapter';

export class AnthropicProvider implements IAProvider {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.startsWith('sk-ant-SUBSTITUA_PELA_CHAVE_REAL')) {
      // Para fins de compilação e fallback em ambiente local sem chave configurada
      console.warn('Aviso: ANTHROPIC_API_KEY não configurada ou com valor padrão.');
    }
    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key',
    });
  }

  async enviarMensagem(params: {
    mensagens: { papel: 'usuario' | 'assistente'; conteudo: string }[];
    ferramentas: FerramentaIA[];
    executarFerramenta: (nome: string, args: any) => Promise<any>;
  }): Promise<string> {
    const { mensagens, ferramentas, executarFerramenta } = params;

    // Tom direto, respostas curtas e objetivas, sempre em português, nunca inventa dado
    const systemPrompt = `Você é o Kaboré OS IA, assistente inteligente especializado para empresas de estética automotiva.
Seu tom de voz deve ser direto, profissional, curto e objetivo (sem rodeios ou introduções desnecessárias).
Responda sempre em português brasileiro.
NUNCA invente ou presuma qualquer dado. Se uma ferramenta de leitura não retornar as informações que você precisa ou se o dado não existir, diga isso claramente (ex: "Não encontrei essa informação nos registros").
Não mencione nomes técnicos de tabelas ou banco de dados. Fale em termos de negócios.`;

    // Mapeando mensagens para o formato da API da Anthropic
    // Como a API exige alternância (user -> assistant -> user), garantimos que esteja limpo
    let formattedMessages: any[] = mensagens.map((msg) => ({
      role: msg.papel === 'usuario' ? 'user' : 'assistant',
      content: msg.conteudo,
    }));

    // Mapeando as ferramentas para o formato do Anthropic
    const anthropicTools = ferramentas.map((f) => ({
      name: f.name,
      description: f.description,
      input_schema: f.input_schema,
    }));

    let loop = true;
    let maxIterations = 5;
    let iteration = 0;
    let lastTextResponse = '';

    while (loop && iteration < maxIterations) {
      iteration++;

      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 1500,
          system: systemPrompt,
          messages: formattedMessages,
          tools: anthropicTools,
        });

        // Adiciona a resposta do assistente (que pode conter blocos de texto e/ou uso de ferramentas)
        // Guardamos no histórico para manter a consistência da API
        const assistantContent: any[] = [];
        let textContent = '';
        let hasToolUse = false;
        const toolCallsToExecute: any[] = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            assistantContent.push({ type: 'text', text: block.text });
            textContent += block.text;
          } else if (block.type === 'tool_use') {
            hasToolUse = true;
            assistantContent.push(block);
            toolCallsToExecute.push(block);
          }
        }

        formattedMessages.push({
          role: 'assistant',
          content: assistantContent,
        });

        if (textContent) {
          lastTextResponse = textContent;
        }

        if (hasToolUse && response.stop_reason === 'tool_use') {
          // Precisamos executar as ferramentas e mandar os resultados de volta
          const toolResultsBlocks: any[] = [];

          for (const toolCall of toolCallsToExecute) {
            const { name, input, id: toolUseId } = toolCall;
            try {
              console.log(`[Kaboré OS IA] Executando ferramenta ${name} com args:`, input);
              const result = await executarFerramenta(name, input);
              toolResultsBlocks.push({
                type: 'tool_result',
                tool_use_id: toolUseId,
                content: JSON.stringify(result ?? {}),
              });
            } catch (err: any) {
              console.error(`Erro ao executar ferramenta ${name}:`, err);
              toolResultsBlocks.push({
                type: 'tool_result',
                tool_use_id: toolUseId,
                content: JSON.stringify({ error: err.message || 'Erro de execução da ferramenta' }),
                is_error: true,
              });
            }
          }

          // Adiciona a mensagem do usuário contendo os resultados das ferramentas
          formattedMessages.push({
            role: 'user',
            content: toolResultsBlocks,
          });
        } else {
          // Sem ferramentas para executar, saímos do loop
          loop = false;
        }
      } catch (error) {
        console.error('[Kaboré OS IA] Erro na API Anthropic:', error);
        throw error;
      }
    }

    return lastTextResponse || 'Desculpe, ocorreu um problema ao processar sua solicitação.';
  }
}
