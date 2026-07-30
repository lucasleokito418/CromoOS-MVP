# Kaboré OS — convenções do projeto

- Stack: Next.js 14 App Router + TypeScript estrito + Tailwind + Supabase
- Todo dado de negócio tem `empresa_id` e RLS via `empresa_atual()` — ver migration 0001.
- Nomenclatura: português, snake_case.
- Numeração de venda é sequencial POR EMPRESA, não é uma sequence global do Postgres.
- Regra de negócio: pagamento confirmado num agendamento cria uma venda vinculada automaticamente (implementar no Bloco 5).
- CromoZap (Bloco 7) é um serviço Node separado — NÃO roda dentro do Next.js/Vercel, precisa de host com processo persistente (Railway/Fly.io). As tabelas de automação já existem desde o Bloco 1 como contrato de dados.
- Design system, cores e tipografia entram no Bloco 2 — não estilizar nada além do essencial até lá.
- Sem lib de UI de terceiros (sem shadcn, sem Material) — componentes próprios a partir do Bloco 2.

## Regra de execução (permanente)
- Nunca rodar comando de terminal autonomamente (npm install, scripts, CLI). Sempre parar, informar o comando exato necessário, e aguardar confirmação do usuário antes de prosseguir.

## Identidade visual
- Isotipo: coruja em traço lima (`#E5FF00`), arquivo público em `public/icon-owl.svg` — nunca recriar/redesenhar esse arquivo via código, é asset fixo.
- Logo expandido (sidebar aberta): `public/logo-owl.svg` (fallback para `logo-owl.png`) — exibe a versão horizontal com wordmark.
- Wordmark: `Kaboré` (`text-text-primary`) + `OS` (`text-accent`), colados sem espaço visual, fonte Oswald 600.
- Nome do produto em texto corrido: `Kaboré OS` (com espaço).
- Componente de logo centralizado: `src/components/layout/logo.tsx` → `<KaboreLogo variant="wordmark" />` ou `<KaboreLogo variant="image" />`.
- Sem caixa/fundo colorido ao redor do isotipo — a coruja fica direto sobre o fundo, sem `bg-accent` próprio.

## Design system (Bloco 2 — paleta atualizada após revisão visual)
- Tema dark único, tokens em tailwind.config.ts.
- **accent = LIMA `#E5FF00`** (NÃO é terracota, NÃO é âmbar/dourado — se algum arquivo antigo ou documentação mencionar terracota #E0714B, está desatualizado, ignorar).
- Lima tem só 3 usos permitidos, nenhum outro: (1) marca/wordmark do produto, (2) botão de ação primária (bg-accent), (3) link secundário de navegação de fluxo (ex: "Entrar", "Esqueci senha", "Cadastre-se").
- Todo resto usa cor neutra: aba ativa, toggle ligado, item ativo de sidebar, anel de foco de input/botão — todos usam `text-primary`/branco, NUNCA lima.
- Texto sobre fundo lima é sempre `accent-on` (`#14140F`, quase preto) — nunca branco, contraste insuficiente.
- Sem lib de UI de terceiros. Componentes próprios em src/components/ui/.
- Oswald só em H1 de módulo e nome do produto. Inter em tudo mais. tabular-nums em todo valor numérico/monetário.
- Drawer (painel lateral direito) é o padrão pra ver/editar registro — Modal centralizado é só pra confirmação curta.
- Ícones sempre via lucide-react.

## Autenticação (Bloco 3)
- Trigger `on_auth_user_created` cria perfil automaticamente com papel 'dono' e empresa_id null.
- Onboarding preenche empresa_id — usuário só entra em (app)/* depois disso.
- Middleware em src/middleware.ts controla os 3 estados: deslogado / sem empresa / completo.
- Convite de funcionário (papel 'funcionario' com mesmo empresa_id) é Bloco 6, não implementar agora.
- Formulários usam react-hook-form + zod + @hookform/resolvers — não implementar validação manual.
- Client Supabase: src/lib/supabase/client.ts | Server: src/lib/supabase/server.ts

## Módulos Core (Bloco 5)
- Cliente + veículos + estofados salvam juntos numa ação (Parte 1).
- Regra de negócio ativa: pagamento confirmado em agendamento cria venda automaticamente vinculada.
- Conta financeira "Conta Principal" é criada automaticamente no primeiro pagamento, até o Bloco 6 construir gestão de contas de verdade — isso é ponte temporária, não solução final.
- Numeração de venda: max(numero_sequencial)+1 por empresa, nunca sequence global.
- Caminho de storage mudou pra {empresa_id}/... (precisa vir antes do tipo de anexo) — política de Storage exige esse prefixo.

## Disciplina de migrations
- Toda alteração de RLS/schema aplicada via SQL Editor do Supabase precisa ser espelhada como migration em supabase/migrations/ no mesmo dia — nunca deixar o banco real divergir do repositório.

## CromoZap (Bloco 7A)
- Serviço em `services/cromozap/`, processo Node separado, NÃO faz parte do build do Next.js.
- Comunicação Next.js → serviço: sempre via Server Action/Route Handler com header `x-internal-key`, nunca client-side.
- Gatilhos de automação vêm de Supabase Realtime (`postgres_changes`), não de chamada direta do Next.js.
- Fila processa no máximo 1 msg/segundo por empresa.
- Respeitar `whatsapp_opt_in = false` do cliente (não enfileirar).
- Sessões Baileys persistidas em `services/cromozap/sessions/{empresa_id}/` — volume persistente no Railway/Fly.io.
- `services/cromozap/.env` e `services/cromozap/sessions/` estão no `.gitignore` — nunca commitar segredos ou sessões.
- Variáveis de ambiente do serviço: `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CROMOZAP_INTERNAL_KEY`.
- Variáveis no Next.js (sem prefixo NEXT_PUBLIC_): `CROMOZAP_SERVICE_URL`, `CROMOZAP_INTERNAL_KEY`.

## Assistente de IA (Bloco 8A)
- Provedor de IA abstraído em src/lib/ia/adapter.ts — implementação atual usa Anthropic, mas trocar de provedor não deve exigir mudar código de fora dessa pasta.
- Fase 1 = só leitura. Nenhuma ferramenta de IA escreve no banco ainda — isso é Bloco 8B/fase 2, exige confirmação explícita do usuário quando implementado.
- Briefing diário nunca chama o modelo de IA — é query direta + template, mantém custo zero por abertura de tela.
- /assistente é o destino padrão pós-login agora, não mais /painel.