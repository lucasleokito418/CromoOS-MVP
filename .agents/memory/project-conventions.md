---
type: project
created: 2026-05-25
updated: 2026-07-14
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.
- Copy on the website, docs, FAQ, README, and marketing should describe AG Kit as a toolkit for Gemini CLI / Antigravity-style agent setups.

## Módulos Core (Bloco 5)
- Cliente + veículos + estofados salvam juntos numa ação (ClienteDrawer em src/components/clientes/).
- Regra de negócio ativa: pagamento confirmado em agendamento (`AgendaDrawer` → botão "Faturar") cria venda automaticamente vinculada via `agendamento_id`.
- Conta financeira "Conta Principal" (`tipo=conta_corrente`, `principal=true`) é criada automaticamente no primeiro pagamento caso `contas_financeiras` esteja vazio — isso é ponte temporária até o Bloco 6 construir gestão de contas.
- Numeração de venda: `max(numero_sequencial)+1` por empresa, nunca sequence global do Postgres.
- Caminho de storage mudou para `{empresa_id}/...` (necessário antes do tipo do anexo) — política RLS do Storage exige esse prefixo. Ex: `{empresa_id}/orcamentos/{orcamento_id}/{file}`.
- PDF de comprovante de venda usa `@react-pdf/renderer` gerado no client em 3 formatos: A4, Notinha (80mm) e Notinha Mini (58mm). Componente em `src/components/vendas/pdf-comprovante.tsx`.

