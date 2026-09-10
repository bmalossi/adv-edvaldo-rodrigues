# Tickets: Conteúdo Jurídico (Sistema de Artigos)

Sistema editorial completo de artigos jurídicos para o escritório Dr. Edvaldo Rodrigues Ferreira.
Especificação de referência: [docs/spec-conteudo-juridico.md](docs/spec-conteudo-juridico.md).

Work the **frontier**: qualquer ticket cujos bloqueadores estejam todos concluídos.

## 1. Fundação Editorial e Vitrine Pública na Home

**What to build:**
Criar a fundação do banco de dados no Supabase com suporte a categorias, artigos e tags com políticas de segurança RLS (leitura pública apenas para artigos publicados com `published_at <= now()`), semear as 7 áreas de atuação consolidadas do escritório e os 3 artigos da referência como publicados. Na aplicação frontend, implementar a seção visual "Artigos recentes" na página inicial (`Home.tsx`) exibindo os 3 cards formatados conforme o mockup, com imagem, data formatada em pt-BR, título truncado e link para leitura, ocultando a seção automaticamente caso não haja artigos publicados.

**Blocked by:** None — can start immediately.

- [x] Criar migration `supabase/migrations/20260320_create_articles_schema.sql` com tabelas `categories`, `tags`, `articles`, `article_tags`, trigger `set_updated_at`, índices e políticas de RLS.
- [x] Incluir no seed da migration as 7 categorias (`Empresarial`, `Civil`, `Família`, `Trabalhista`, `Criminal`, `Previdenciário`, `Militar`) e os 3 artigos da imagem de referência publicados com conteúdo completo.
- [x] Implementar tipos TypeScript e camada de serviço de consulta Supabase para artigos.
- [x] Criar componente `src/components/site/ArticlesSection.tsx` fiel à referência visual (eyebrow dourado, H2 serifado, botão outline "Ver todos os artigos →", grid de 3 cards).
- [x] Integrar `ArticlesSection` na `Home.tsx` imediatamente acima da faixa de CTA institucional.
- [x] Validar que o build (`npm run build`) compila sem erros.

## 2. Listagem Pública e Filtro por Áreas de Atuação

**What to build:**
Implementar a página pública de listagem `/conteudo-juridico` com cabeçalho institucional, chips dinâmicos de filtro para todas as categorias cadastradas, grid paginado (9 artigos por página) com botões "Anterior/Próxima" e tratamento de estado vazio. Atualizar todos os links do menu `Navbar` e do rodapé `Footer` para apontar para a rota canônica `/conteudo-juridico`.

**Blocked by:** 1. Fundação Editorial e Vitrine Pública na Home

- [x] Implementar a página `src/pages/ConteudoJuridico.tsx` com consulta paginada e filtro reativo por slug de categoria.
- [x] Adicionar os chips de filtro por categoria com estilo navy/gold e contagem ou destaque ativo.
- [x] Registrar a rota `/conteudo-juridico` em `src/App.tsx`.
- [x] Atualizar o link "Conteúdo Jurídico" no `Navbar.tsx` e `Footer.tsx` (substituindo `/calculadora`).
- [x] Adicionar a rota `/conteudo-juridico` no `public/sitemap.xml`.
- [x] Validar que o build (`npm run build`) compila sem erros.

## 3. Leitura Completa do Artigo, SEO Semântico e Contagem de Views

**What to build:**
Implementar a página individual `/conteudo-juridico/:slug` completa com cabeçalho editorial de prestígio (categoria, título serifado, autor e OAB, data e tempo de leitura), imagem de capa em largura total, corpo do texto sanitizado via `DOMPurify` e estilizado com tipografia personalizada, seção de artigos relacionados da mesma área (até 3 itens), faixa de CTA final institucional ("Precisando de orientação jurídica para sua empresa?"), metadados Open Graph + Schema.org (`Article`), e rotina RPC segura no PostgreSQL (`increment_article_views`) para incremento atômico de visualizações com proteção via `sessionStorage`.

**Blocked by:** 2. Listagem Pública e Filtro por Áreas de Atuação

- [x] Criar a função RPC PostgreSQL `increment_article_views(article_id uuid)` com `SECURITY DEFINER` liberada para `anon` e `authenticated`.
- [x] Implementar helper de schema `buildArticleSchema` em `src/lib/seo.ts` com Open Graph e JSON-LD.
- [x] Implementar a página `src/pages/ArtigoDetalhe.tsx` com sanitização `DOMPurify` e componentes visuais institucionais.
- [x] Integrar chamada da RPC de contagem de views disparada de forma assíncrona ao carregar a página sem bloquear a renderização.
- [x] Exibir banner superior de aviso para administradores logados caso estejam visualizando um rascunho ou artigo agendado, e 404 para visitantes anônimos.
- [x] Registrar a rota `/conteudo-juridico/:slug` em `src/App.tsx`.
- [x] Validar que o build (`npm run build`) compila sem erros.

## 4. Navegação Administrativa JusTrack e Tabela de Gestão de Artigos

**What to build:**
Reorganizar a navegação do `AdminLayout` para apresentar uma separação clara entre a rotina jurídica do JusTrack (Processos, Notificações, Configurações) e a rotina editorial do Conteúdo Jurídico (Artigos, Novo Artigo), preservando o login unificado `/login`. Implementar a tela administrativa `/admin/artigos` com tabela de gerenciamento contendo busca por título, filtros por status (Rascunho, Agendado, Publicado) e categoria, métricas de visualizações, e ações de Duplicar e Excluir com modal de confirmação.

**Blocked by:** 1. Fundação Editorial e Vitrine Pública na Home

- [x] Atualizar `AdminLayout.tsx` com divisória de seção no menu lateral: seção "JusTrack" e seção "Conteúdo Jurídico".
- [x] Criar a página `src/pages/admin/ArtigosLista.tsx` com tabela de listagem de artigos, badges de status temporal e métricas de views.
- [x] Implementar funcionalidade de busca textual em tempo real e filtros de status e categoria.
- [x] Implementar ação de duplicar artigo (cria rascunho com título e slug derivados) e exclusão com diálogo de confirmação.
- [x] Registrar a rota protegida `/admin/artigos` em `src/App.tsx`.
- [x] Validar que o build (`npm run build`) compila sem erros.

## 5. Editor de Conteúdo (TipTap), Upload de Imagens e Fluxo de Publicação/Preview

**What to build:**
Criar o editor completo de artigos em duas colunas (`/admin/artigos/novo` e `/admin/artigos/:id/editar`). Implementar a Supabase Edge Function `generate-upload-url` para Cloudflare R2 com geração de URLs pré-assinadas PUT e utilitário no cliente com suporte complementar a inserção por URL externa. Configurar o editor TipTap com barra de ferramentas rica (negrito, itálico, títulos H2/H3, listas, citações, links e imagens). Implementar controles de publicação na barra lateral: auto-geração e trava de segurança de slug com botão de edição manual, uploader de capa com drag & drop e texto alternativo obrigatório, bloco de SEO com contadores, cálculo automático de tempo de leitura, opções de Salvar Rascunho, Publicar Agora, Agendar com data/hora e Visualizar (com auto-save prévio).

**Blocked by:** 3. Leitura Completa do Artigo, SEO Semântico e Contagem de Views, 4. Navegação Administrativa JusTrack e Tabela de Gestão de Artigos

- [x] Implementar Edge Function `supabase/functions/generate-upload-url/index.ts` usando `aws4fetch`.
- [x] Implementar utilitário `src/lib/storage/uploadImage.ts` com validação de formato e tamanho (máx 5MB) e suporte a URL externa.
- [x] Implementar componente do editor TipTap com extensões (starter kit, link, image, placeholder).
- [x] Implementar a página `src/pages/admin/ArtigoEditor.tsx` com layout em 2 colunas, controles de publicação, agendamento de data/hora e bloco de SEO.
- [x] Implementar fluxo de auto-geração e trava de slug e salvamento automático ao clicar no botão "Visualizar".
- [x] Registrar as rotas `/admin/artigos/novo` e `/admin/artigos/:id/editar` em `src/App.tsx`.
- [x] Validar que o build (`npm run build`) compila sem erros.

---

# Tickets: RBAC Dinâmico — Controle de Acesso por Perfis

Sistema completo de gerenciamento de usuários e permissões para o CRM JusTrack, substituindo o enum fixo `papel_usuario` por papéis dinâmicos configuráveis pelo Administrador.
Especificação de referência: `docs/spec-rbac-dinamico.md` (gerado em 09/09/2026).

Work the **frontier**: qualquer ticket cujos bloqueadores estejam todos concluídos. T1 e T2 podem iniciar imediatamente e em paralelo.

## T1 — Expand: tipos RBAC dinâmicos ao lado dos tipos antigos

**What to build:** Introduzir os novos tipos TypeScript do RBAC dinâmico no codebase sem remover nada do que existe. Ao final deste ticket, o projeto compila sem erros e os novos tipos estão disponíveis para os tickets seguintes consumirem, enquanto o código antigo ainda funciona normalmente.

**Blocked by:** None — can start immediately.

- [x] Criar o tipo `ModuloSistema` como union type dos 8 módulos: `clientes`, `casos`, `agenda`, `documentos`, `financeiro`, `relatorios`, `usuarios`, `perfis_acesso`.
- [x] Criar o tipo `AcaoPermissao` como `'visualizar' | 'criar' | 'editar' | 'deletar'`.
- [x] Criar o tipo `Role` espelhando a tabela `roles` (id, nome, descricao, is_default, created_by, created_at).
- [x] Criar o tipo `Permission` como `{ modulo: ModuloSistema; acao: AcaoPermissao }`.
- [x] Criar o tipo `AuditLog` espelhando a tabela `audit_log`.
- [x] Atualizar `PerfilUsuario` para incluir `role_id`, `role?: Role`, `must_change_password` — mantendo o campo `papel` opcional por enquanto (não quebrar código existente).
- [x] Exportar os novos tipos por `src/lib/supabase.ts`.
- [x] Confirmar que `bun run build` passa sem erros de TypeScript.

## T2 — Migration SQL: schema RBAC dinâmico + seed dos 4 perfis padrão (expand)

**What to build:** Criar toda a infraestrutura de banco de dados do RBAC dinâmico sem remover nem alterar nada existente. Ao final deste ticket, as novas tabelas existem e os 4 perfis padrão estão populados no banco — mas a coluna `papel` antiga e as policies RLS antigas ainda estão intactas. Zero risco de regressão.

**Blocked by:** None — can start immediately.

- [x] Criar migration `supabase/migrations/20260909000016_rbac_schema_expand.sql`.
- [x] Criar tabela `roles` (id UUID PK, nome TEXT, descricao TEXT, is_default BOOLEAN, created_by UUID FK perfis, created_at TIMESTAMPTZ).
- [x] Criar tabela `permissions` (id UUID PK, role_id UUID FK roles, modulo TEXT, acao TEXT, UNIQUE(role_id, modulo, acao)).
- [x] Criar tabela `audit_log` (id UUID PK, user_id UUID, action TEXT, entity_type TEXT, entity_id UUID, old_value JSONB, new_value JSONB, created_at TIMESTAMPTZ).
- [x] Adicionar coluna `role_id UUID REFERENCES roles(id)` e `must_change_password BOOLEAN DEFAULT false` na tabela `perfis` (nullable por enquanto).
- [x] Criar função SQL `has_permission(modulo TEXT, acao TEXT) RETURNS BOOLEAN` com `SECURITY DEFINER`, resolvendo o papel do `auth.uid()` via `role_id`.
- [x] Criar trigger `check_last_admin()` que impede UPDATE de `role_id` ou DELETE em `perfis` quando o usuário-alvo é o único com o papel Administrador.
- [x] Criar trigger `audit_rbac_changes` — `AFTER INSERT OR UPDATE OR DELETE` nas tabelas `roles`, `permissions` e `perfis`, gravando em `audit_log`.
- [x] Inserir os 4 perfis de fábrica em `roles` com `is_default = true`: Administrador, Sócio, Advogado Associado, Estagiário/Assistente.
- [x] Inserir as permissões correspondentes em `permissions` para cada perfil padrão conforme os níveis definidos na spec.
- [x] Habilitar RLS nas novas tabelas com policies básicas de leitura para usuários autenticados.
- [ ] Verificar no Supabase Studio que as tabelas, funções e triggers foram criados corretamente.

## T3 — Migration SQL: migrar dados + reescrever RLS + remover coluna antiga (contract)

**What to build:** Completar a migração atômica: preencher `role_id` para todos os usuários existentes com base no valor antigo de `papel`, reescrever todas as policies RLS para usar `has_permission()`, e remover a coluna `papel` e o enum antigo. Este é o ponto sem retorno — após este ticket o banco opera 100% no novo modelo.

**Blocked by:** T2 — Migration SQL: schema RBAC dinâmico + seed dos 4 perfis padrão (expand).

- [x] Criar migration `supabase/migrations/20260909000017_rbac_contract_migrate.sql`.
- [x] Preencher `role_id` para todos os registros de `perfis` mapeando: `advogado` → role "Advogado Associado", `estagiario` → "Estagiário/Assistente", `secretaria` → "Estagiário/Assistente". O usuário admin existente → "Administrador".
- [x] Tornar `role_id` NOT NULL após o preenchimento.
- [x] Reescrever as policies RLS de `clientes` usando `has_permission('clientes', 'visualizar')`, `has_permission('clientes', 'editar')` etc.
- [x] Reescrever as policies RLS de `casos`, `contratos_financeiros`, `pendencias_crm`, `documentos_casos`, `minutas_templates` e demais tabelas do CRM usando `has_permission()`.
- [x] Remover a coluna `papel` da tabela `perfis`.
- [x] Remover o tipo enum `public.papel_usuario`.
- [x] Verificar que todas as policies antigas foram removidas e as novas estão ativas.
- [ ] Testar `has_permission()` manualmente no Supabase SQL Editor com diferentes `auth.uid()` simulados.

## T4 — `RBACContext` + `usePermission` + `useAuth` migrado

**What to build:** Implementar o sistema de permissões no frontend. No login, o contexto global carrega o papel e as permissões do usuário. O hook `usePermission` fica disponível para qualquer componente. O `useAuth` detecta `must_change_password` e redireciona automaticamente. Os tipos antigos são removidos dos arquivos migrados.

**Blocked by:** T1 — Expand tipos; T3 — Migration SQL contract.

- [x] Criar `src/contexts/RBACContext.tsx` com Provider que carrega `perfil + role + permissions[]` em uma única query com join ao Supabase no login.
- [x] Expor do contexto: `permissions: Permission[]`, `role: Role | null`, `isAdmin: boolean`, `isLoading: boolean`.
- [x] Criar `src/hooks/usePermission.ts` consumindo `RBACContext` — retorna `boolean`, zero chamadas ao banco.
- [x] Envolver `<App />` com `<RBACContext.Provider>` em `main.tsx`.
- [x] Atualizar `useAuth.ts`: remover referências ao campo `papel` (enum), detectar `must_change_password = true` e redirecionar para `/admin/trocar-senha`.
- [x] Remover `PapelUsuario` (tipo antigo) de `src/domain/crm/cliente.ts` e atualizar `PerfilUsuario` para versão final (sem campo `papel`).
- [x] Atualizar `src/lib/supabase.ts` para não mais exportar `PapelUsuario`.
- [x] Confirmar que `bun run build` passa sem erros.
- [x] Testar no browser: login como Admin → `usePermission('financeiro', 'visualizar')` retorna `true` no console.

## T5 — Tela de Troca de Senha Obrigatória

**What to build:** Usuários criados pelo Admin com senha temporária são redirecionados para uma tela dedicada de troca de senha no primeiro login. Após trocar com sucesso, o flag `must_change_password` é desativado e o usuário vai direto para o dashboard.

**Blocked by:** T4 — `RBACContext` + `usePermission` + `useAuth` migrado.

- [x] Criar página `src/pages/admin/TrocarSenha.tsx` com formulário de nova senha + confirmação e validação de força mínima.
- [x] Ao salvar: chamar `supabase.auth.updateUser({ password })`, setar `must_change_password = false` na tabela `perfis`, redirecionar para `/admin/crm/funil`.
- [x] Registrar rota `/admin/trocar-senha` em `App.tsx` dentro de `ProtectedRoute` (sem `AdminLayout` — tela limpa).
- [x] Verificar que usuário sem `must_change_password` não consegue acessar `/admin/trocar-senha` diretamente (redireciona para dashboard).
- [x] Confirmar que `bun run build` passa sem erros.

## T6 — `ProtectedRoute` com `requires` + componente `PermissionGuard`

**What to build:** Os dois primitivos de enforcement no frontend ficam prontos para uso: `ProtectedRoute` com prop `requires` bloqueia rotas inteiras; `PermissionGuard` esconde elementos dentro das páginas. Ambos consomem `usePermission` — nenhuma lógica duplicada.

**Blocked by:** T4 — `RBACContext` + `usePermission` + `useAuth` migrado.

- [x] Atualizar `ProtectedRoute.tsx` para aceitar prop opcional `requires?: { modulo: ModuloSistema; acao: AcaoPermissao }`. Se informado e usuário não tem permissão, redireciona para `/admin/crm/funil` com toast "Acesso não autorizado".
- [x] Criar `src/components/admin/PermissionGuard.tsx`: wrapper que renderiza `null` se o usuário não tem `modulo + acao`; renderiza `children` caso contrário.
- [x] Confirmar que `bun run build` passa sem erros.
- [x] Testar: com usuário Estagiário, um `<PermissionGuard modulo="financeiro" acao="visualizar">` esconde o conteúdo sem erros no console.

## T7 — Configurações: aba "Perfis de Acesso" (listar + criar + editar)

**What to build:** O Administrador consegue gerenciar todos os perfis de acesso diretamente em `Configurações`. Pode criar perfis customizados usando a matriz de checkboxes, carregar um template padrão como base, editar permissões de perfis existentes e excluir perfis não utilizados. Perfis padrão de fábrica são identificados com badge e protegidos contra exclusão.

**Blocked by:** T4 — `RBACContext` + `usePermission` + `useAuth` migrado.

- [x] Adicionar aba "Perfis de Acesso" à página `Configuracoes.tsx` — visível apenas para usuários com `perfis_acesso.visualizar`.
- [x] Criar `src/components/admin/rbac/TabPerfisAcesso.tsx`: lista roles em cards com nome, descrição, contagem de usuários e ações (editar, excluir). Badge "Padrão" para `is_default = true`. Botão "Novo Perfil".
- [x] Criar `src/components/admin/rbac/ModalPerfil.tsx`: campos nome e descrição; seletor de template "Carregar como base"; matriz de checkboxes 8 módulos × 4 ações; botões Salvar/Cancelar.
- [x] Implementar lógica de salvar: INSERT em `roles` + INSERT/DELETE em `permissions` de forma atômica.
- [x] Impedir exclusão de perfil com usuários associados — exibir mensagem explicativa.
- [x] Impedir exclusão de perfis com `is_default = true`.
- [x] Confirmar que `bun run build` passa sem erros.

## T8 — Configurações: aba "Usuários" (listar + criar + editar + ativar/desativar)

**What to build:** O Administrador consegue criar novas contas de colaboradores com senha temporária, visualizar e filtrar todos os usuários, editar dados e papel atribuído, e ativar/desativar contas. A soft rule do último Admin é aplicada ao tentar rebaixar o único usuário com papel de Administrador.

**Blocked by:** T4 — `RBACContext` + `usePermission` + `useAuth` migrado; T7 — aba Perfis de Acesso (necessário para o seletor de papel no modal de usuário).

- [x] Adicionar aba "Usuários" à página `Configuracoes.tsx` — visível apenas para usuários com `usuarios.visualizar`.
- [x] Criar `src/components/admin/rbac/TabUsuarios.tsx`: tabela paginada com colunas nome, email, papel, status, último acesso. Filtros por papel e status.
- [x] Criar `src/components/admin/rbac/ModalUsuario.tsx`: campos nome, email, OAB (opcional), telefone, seletor de papel (dropdown dos roles disponíveis), senha temporária + confirmação (apenas na criação), checkbox "Forçar troca de senha no próximo acesso" (marcado por padrão).
- [x] Fluxo de criação: `supabase.auth.admin.createUser()` via Supabase Edge Function com service role + INSERT em `perfis` com `role_id` e `must_change_password = true`.
- [x] Fluxo de edição: UPDATE em `perfis`. Ao trocar papel, verificar soft rule de último Admin antes de salvar.
- [x] Ações de ativar/desativar: UPDATE `ativo` em `perfis`; desativado não consegue mais autenticar (verificado via RLS ou política de login).
- [x] Confirmar que `bun run build` passa sem erros.
- [x] Testar criação de usuário + login com senha temporária + redirect para TrocarSenha.

## T9 — Configurações: aba "Auditoria"

**What to build:** O Administrador consegue consultar o log de auditoria de todas as ações de gerenciamento do RBAC diretamente em Configurações — quem criou, editou ou excluiu perfis e usuários, com data, descrição da ação e visualização do antes/depois de cada alteração.

**Blocked by:** T8 — aba Usuários (o log já estará sendo populado pelos tickets anteriores; este ticket apenas expõe a consulta).

- [x] Adicionar aba "Auditoria" à página `Configuracoes.tsx` — visível apenas para `perfis_acesso.visualizar`.
- [x] Criar `src/components/admin/rbac/TabAuditLog.tsx`: tabela paginada (20 itens/página) com colunas data/hora, usuário responsável, ação, entidade afetada.
- [x] Cada linha é expansível para exibir `old_value` e `new_value` formatados como JSON legível (diff visual simples).
- [x] Confirmar que `bun run build` passa sem erros.

## T10 — Aplicar `PermissionGuard` nas páginas existentes + rotas em `App.tsx`

**What to build:** Todas as páginas existentes do CRM respeitam as permissões do usuário logado. Botões de criar, editar e deletar ficam invisíveis para quem não tem a permissão correspondente. Rotas sensíveis (financeiro, backup, configurações) exigem permissão via `ProtectedRoute requires`.

**Blocked by:** T6 — `PermissionGuard`; T7 — aba Perfis; T8 — aba Usuários.

- [x] Envolver botões "Novo cliente", "Editar", "Excluir" em `Clientes.tsx` e `ClienteDetalhe.tsx` com `<PermissionGuard modulo="clientes" acao="...">`.
- [x] Envolver botões de criação/edição/exclusão em `Casos.tsx`, `CasoDetalhe.tsx`, `CasoForm.tsx`.
- [x] Envolver botões de criação/edição/exclusão em `Agenda.tsx`.
- [x] Envolver botões de criar/editar modelos em `ModelosMinutas.tsx` e `GerarDocumentos.tsx`.
- [x] Adicionar `requires={{ modulo: 'financeiro', acao: 'visualizar' }}` nas rotas de contratos/financeiro em `App.tsx`.
- [x] Adicionar `requires={{ modulo: 'perfis_acesso', acao: 'visualizar' }}` na rota `/admin/configuracoes` em `App.tsx`.
- [x] Adicionar `requires={{ modulo: 'relatorios', acao: 'visualizar' }}` na rota de backup.
- [x] Confirmar que `bun run build` passa sem erros.
- [x] Testar com usuário Estagiário: zero botões de deletar visíveis, acesso à URL de financeiro redireciona.

## T11 — Documentação: CONTEXT.md + ADR 0013

**What to build:** O glossário do projeto e os registros de decisão arquitetural refletem o novo modelo RBAC dinâmico. Qualquer desenvolvedor que abrir o projeto entende os termos e a razão das escolhas sem precisar ler o histórico de conversas.

**Blocked by:** T3 — Migration SQL contract (decisões de schema finalizadas e irreversíveis).

- [x] Atualizar `CONTEXT.md` adicionando seção "RBAC — Perfis e Permissões" com os termos: Perfil de Acesso (Role), Permissão, Módulo, Ação, Perfil Padrão de Fábrica, Log de Auditoria, Senha Temporária, Troca Forçada de Senha.
- [x] Criar `docs/adr/0013-rbac-dinamico-roles-permissions.md` documentando: contexto (enum fixo insuficiente), decisão (tabelas dinâmicas), alternativas descartadas (enum expandido, multi-papel), consequências. Referenciar e superseder ADR 0007.
- [x] Confirmar que o CONTEXT.md não contém detalhes de implementação — apenas glossário.

---

# Tickets: Prerender, Crawleabilidade e Speculation Rules API

Torna as páginas públicas e artigos jurídicos visíveis para Google, crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) e motores de busca; adiciona prerender/prefetch para usuários Chromium.
Especificação de referência: spec gerada em 09/09/2026 (conversa atual).

Work the **frontier**: T1, T2, T3 e T4 podem iniciar imediatamente e em paralelo. T5 aguarda todos.

## T1 — Prerender estático das páginas públicas fixas no build

**What to build:** As 7 páginas públicas fixas do site (`/`, `/areas-de-atuacao`, `/sobre`, `/contato`, `/calculadora`, `/conteudo-juridico`, `/politica-de-privacidade`, `/termos-de-uso`) passam a entregar HTML completamente renderizado ao primeiro byte — com `<title>`, `<meta description>`, Open Graph e JSON-LD já inline — em vez do `<div id="root"></div>` vazio atual. Isso torna o conteúdo dessas páginas visível para qualquer crawler que não execute JavaScript.

**Blocked by:** None — can start immediately.

- [x] Instalar `vite-plugin-prerender` e `@prerenderer/renderer-puppeteer` como devDependencies.
- [x] Configurar o plugin no `vite.config.ts` com a lista das 7 rotas fixas e `renderAfterDocumentEvent: "render-event"`.
- [x] Disparar `document.dispatchEvent(new Event("render-event"))` em `main.tsx` após a montagem do React root.
- [x] Confirmar que `bun run build` gera um `dist/sobre/index.html` contendo `<title>` e pelo menos um bloco `<script type="application/ld+json">` populados (não vazios).
- [x] Confirmar que `dist/areas-de-atuacao/index.html` e demais rotas também têm conteúdo estático renderizado.
- [x] Confirmar que `bun run build` compila sem erros de TypeScript.

## T2 — Sitemap dinâmico via Vercel Edge Function

**What to build:** O `/sitemap.xml` deixa de ser um arquivo estático com apenas 8 rotas e passa a ser gerado em tempo real por uma Vercel Edge Function que consulta o Supabase. Ao publicar um novo artigo no CMS, ele aparece automaticamente no sitemap em até 1 hora — sem intervenção manual. Isso permite que Google, Bing e crawlers de IA descubram e indexem cada artigo pela URL canônica.

**Blocked by:** None — can start immediately.

- [x] Criar `/api/sitemap.ts` como Vercel Edge Function usando `SUPABASE_SERVICE_ROLE_KEY` (variável de ambiente server-side).
- [x] A função consulta artigos com `published_at IS NOT NULL AND published_at <= NOW()` e retorna XML com as 6 rotas fixas + N artigos, cada um com `<loc>`, `<lastmod>` (data de `updated_at`), `<changefreq>` e `<priority>`.
- [x] O XML é servido com `Content-Type: application/xml` e `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
- [x] Adicionar em `vercel.json` um rewrite de `/sitemap.xml` → `/api/sitemap` e remover o header de `Content-Type` do sitemap estático.
- [x] Adicionar `SUPABASE_SERVICE_ROLE_KEY` como variável de ambiente no dashboard da Vercel (nunca commitada no repositório).
- [x] Confirmar em produção que `curl https://edvaldorodrigues.com.br/sitemap.xml` retorna XML com pelo menos as 6 rotas fixas.
- [x] Confirmar que artigos com `published_at` no futuro **não** aparecem no sitemap.

## T3 — Schema JSON-LD enriquecido e SEOHead com articleMeta

**What to build:** Os artigos jurídicos passam a usar o tipo `LegalScholarlyArticle` no JSON-LD — mais preciso para conteúdo jurídico e reconhecido por LLMs como indicativo de autoridade. O componente `SEOHead` ganha suporte a `articleMeta`, emitindo `og:type=article` e os meta tags `article:published_time`, `article:author` e `article:section` que parsers de preview de link e redes sociais lêem. A página de detalhe do artigo passa todos os dados disponíveis para esses novos campos.

**Blocked by:** None — can start immediately.

- [x] Atualizar `buildArticleSchema` em `seo.ts` para usar `"@type": ["Article", "LegalScholarlyArticle"]`.
- [x] Adicionar ao schema dos artigos os campos `about: { "@type": "Thing", name: categoryName }` e `mentions: Tag[]` mapeados para `{ "@type": "Thing", name: tagName }`.
- [x] Adicionar `isPartOf: { "@id": SEO.websiteId }` para reforçar o grafo de conhecimento.
- [x] Adicionar prop opcional `articleMeta?: { publishedTime?, modifiedTime?, author?, section?, tags? }` ao componente `SEOHead`.
- [x] Quando `articleMeta` estiver presente, emitir `og:type=article` e os meta tags `article:published_time`, `article:modified_time`, `article:author`, `article:section`.
- [x] Atualizar `ArtigoDetalhe.tsx` para passar `articleMeta` ao `SEOHead` com os dados do artigo retornado pelo Supabase.
- [x] Adicionar bloco `<noscript>` em `ArtigoDetalhe.tsx` com H1 e excerpt do artigo como fallback para parsers sem JS.
- [x] Confirmar que o Rich Results Test (`search.google.com/test/rich-results`) valida o JSON-LD de um artigo publicado.
- [x] Confirmar que `bun run build` compila sem erros de TypeScript.

## T4 — Speculation Rules API: regras, headers Vercel e GA guard

**What to build:** Usuários Chromium (Chrome, Edge, Brave) passam a pré-carregar em background a próxima página provável antes do clique, tornando a navegação entre páginas públicas percebida como instantânea. O Google Analytics é protegido com um guard de `prerenderingchange` para não inflar pageviews com páginas nunca vistas. Em navegadores sem suporte (Firefox, Safari) o site funciona normalmente sem nenhuma degradação.

**Blocked by:** None — can start immediately.

- [x] Criar `/public/speculationrules.json` com regras de `prerender` (eagerness `moderate`, mesma origem, excluindo `/login`, `/admin/*`, `/politica-de-privacidade`, `/termos-de-uso`, `.do-not-prerender`, `[rel~=nofollow]`) e `prefetch` (eagerness `moderate`, cross-origin).
- [x] Adicionar em `vercel.json` o header `Speculation-Rules: "/speculationrules.json"` para todas as páginas públicas.
- [x] Adicionar em `vercel.json` os headers `Content-Type: application/speculationrules+json` e `Access-Control-Allow-Origin: *` para o arquivo `/speculationrules.json`.
- [x] Adicionar em `vercel.json` o header `No-Vary-Search: params=(...)` cobrindo `gclid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`.
- [x] Adicionar `<script type="speculationrules">` inline no `<head>` do `index.html` com as mesmas regras do JSON estático.
- [x] Envolver o `gtag('config', 'G-93G09485Y9')` no `index.html` com guard de `document.prerendering` + listener de `prerenderingchange`.
- [x] Confirmar no DevTools → Application → Speculation Rules que as regras estão carregadas após deploy.
- [x] Confirmar que o header `Speculation-Rules` está presente na resposta de `/` e `/sobre` (não presente em `/admin/`).

## T5 — Verificação E2E e documentação

**What to build:** Checklist completo de validação rodado em staging/produção confirmando que as quatro frentes anteriores funcionam de ponta a ponta: HTML estático nas páginas fixas, sitemap com artigos reais, schema correto nos artigos e prerender ativo no Chromium. Documentação atualizada no CONTEXT.md.

**Blocked by:** T1 — Prerender estático; T2 — Sitemap dinâmico; T3 — Schema JSON-LD; T4 — Speculation Rules.

- [x] Verificar via `curl -A "Googlebot"` que `/`, `/sobre` e `/areas-de-atuacao` retornam HTML com `<title>` populado.
- [x] Verificar que `curl https://edvaldorodrigues.com.br/sitemap.xml` lista pelo menos um slug de artigo publicado.
- [x] Testar um artigo publicado no Rich Results Test e confirmar que o tipo `Article` é reconhecido sem erros.
- [x] Testar preview de link de um artigo no Open Graph Debugger (Facebook) e confirmar título, imagem e description corretos.
- [x] Confirmar no DevTools → Application → Speculation Rules que as regras aparecem em produção.
- [x] Confirmar via `performance.getEntriesByType('navigation')[0].activationStart > 0` em uma página pré-renderizada.
- [x] Confirmar que o GA não registra pageview durante prerender — navegar de `/` para `/sobre` deve registrar exatamente 1 pageview em `/sobre` no GA Real-time.
- [x] Adicionar entradas no glossário de `CONTEXT.md`: Speculation Rules API, Prerender Estático (build-time), Sitemap Dinâmico, LegalScholarlyArticle.

