import * as z from "zod";

export const tipoGatilhoZapSchema = z.enum([
  "agendamento_confirmado",
  "orcamento_criado",
  "alerta_revisao_6meses",
  "alerta_maresia_litoral",
]);

export const automacaoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  gatilho: tipoGatilhoZapSchema,
  template_mensagem: z.string().min(10, "O template de mensagem deve ter no mínimo 10 caracteres"),
  status: z.boolean(),
});

export type AutomacaoFormValues = z.infer<typeof automacaoSchema>;
