export interface FerramentaIA {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface IAProvider {
  enviarMensagem(params: {
    mensagens: { papel: 'usuario' | 'assistente'; conteudo: string }[];
    ferramentas: FerramentaIA[];
    executarFerramenta: (nome: string, args: any) => Promise<any>;
  }): Promise<string>;
}
