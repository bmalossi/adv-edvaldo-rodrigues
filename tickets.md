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
