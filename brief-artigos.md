# Prompt para o agente de IA (CLI) — Sistema Completo de Artigos (Conteúdo Jurídico)

> Copie e cole o conteúdo abaixo no seu agente de IA. É uma feature grande — recomendo pedir para ele implementar por fases (1 → 5), validando build (`npm run build`) entre cada fase antes de seguir para a próxima. Trabalhe em uma branch separada (ex.: `feature/artigos`) e só faça merge após revisão visual.

---

## CONTEXTO

Stack confirmada do projeto: React 18 + Vite + TypeScript + Tailwind + shadcn/ui (Radix) + React Router DOM v6 + Supabase (já configurado, conta existente). Preciso implementar um **sistema completo de artigos/blog jurídico** ("Conteúdo Jurídico"), com:

1. Modelagem e criação do banco de dados no **Supabase**.
2. Armazenamento de imagens no **Cloudflare R2** (com placeholders de credenciais).
3. Frontend público: seção "Artigos recentes" na Home, página de listagem e página de artigo individual.
4. Painel administrativo protegido por login, com editor de conteúdo no estilo WordPress (upload de imagem, agendamento de publicação, SEO).

---

## DECISÕES DE ARQUITETURA (adotar salvo indicação em contrário)

- **Editor de texto rico**: TipTap (`@tiptap/react` + `@tiptap/starter-kit` + extensões de imagem/link). Guardar o conteúdo em dois formatos na mesma linha: `content` (JSON do TipTap, fonte da verdade para reedição) e `content_html` (HTML gerado no momento de salvar, usado para renderizar a página pública sem carregar o bundle do editor para o visitante).
- **Agendamento**: um único campo `published_at` (timestamptz, nullable). `null` = rascunho. Data futura = agendado. Data passada/presente = publicado. A visibilidade pública é resolvida na própria query/RLS — sem necessidade de cron job ou função agendada.
- **Upload de imagens**: Cloudflare R2 (compatível com S3), acessado via **Supabase Edge Function** que gera uma **URL assinada (presigned URL)** de PUT. O frontend faz upload direto para o R2 usando essa URL. As credenciais do R2 ficam apenas como *secrets* da Edge Function, nunca no bundle do frontend.
- **Autenticação do admin**: Supabase Auth (e-mail/senha). Sem cadastro público — o usuário admin deve ser criado manualmente no painel do Supabase (Authentication → Users). Desative "Allow new users to sign up" nas configurações de Auth do projeto.
- **Autoria**: campo `author_name`, com padrão `"Dr. Edvaldo Rodrigues Ferreira"`, editável (permite múltiplos autores no futuro sem redesenho).

---

## FASE 1 — Banco de dados (Supabase)

Criar uma migration em `supabase/migrations/` com o seguinte schema:

```sql
create extension if not exists "pgcrypto";

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content jsonb not null,
  content_html text,
  cover_image_url text,
  cover_image_alt text,
  category_id uuid references public.categories(id) on delete set null,
  author_name text not null default 'Dr. Edvaldo Rodrigues Ferreira',
  author_avatar_url text,
  seo_title text,
  seo_description text,
  reading_time_minutes int,
  view_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_tags (
  article_id uuid references public.articles(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

create index idx_articles_published_at on public.articles (published_at desc);
create index idx_articles_category on public.articles (category_id);
create index idx_articles_slug on public.articles (slug);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_articles_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

-- Seed das categorias, alinhadas às Áreas de Atuação já existentes no site
insert into public.categories (name, slug) values
  ('Empresarial', 'empresarial'),
  ('Civil', 'civil'),
  ('Família', 'familia'),
  ('Trabalhista', 'trabalhista'),
  ('Criminal', 'criminal');
```

### RLS (Row Level Security)

```sql
alter table public.articles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;

-- Leitura pública: só artigos já publicados
create policy "public_read_published_articles"
on public.articles for select
to anon, authenticated
using (published_at is not null and published_at <= now());

-- Admin autenticado: acesso total (select/insert/update/delete)
create policy "admin_full_access_articles"
on public.articles for all
to authenticated
using (true) with check (true);

create policy "public_read_categories"
on public.categories for select to anon, authenticated using (true);
create policy "admin_write_categories"
on public.categories for insert, update, delete to authenticated using (true) with check (true);

create policy "public_read_tags"
on public.tags for select to anon, authenticated using (true);
create policy "admin_write_tags"
on public.tags for insert, update, delete to authenticated using (true) with check (true);

create policy "public_read_article_tags"
on public.article_tags for select to anon, authenticated using (true);
create policy "admin_write_article_tags"
on public.article_tags for insert, update, delete to authenticated using (true) with check (true);
```

> **Nota importante para o agente**: como policies permissivas se combinam com OR, um admin autenticado enxerga TODOS os artigos (inclusive rascunhos/agendados) via `admin_full_access_articles`, enquanto o público só vê os publicados via `public_read_published_articles`. Isso permite que o botão "Visualizar" do editor abra a página pública normalmente numa nova aba (mesma sessão do navegador) e mostre o rascunho/agendado corretamente para quem está logado — sem precisar de rota de preview separada.

---

## FASE 2 — Armazenamento de imagens (Cloudflare R2)

### Variáveis de ambiente (placeholders a criar)

No `.env.example` do projeto (frontend, apenas o necessário para o cliente):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Como *secrets* da Edge Function (nunca no frontend), documentar no README como configurar via `supabase secrets set`:
```
R2_ACCOUNT_ID=SEU_ACCOUNT_ID_AQUI
R2_ACCESS_KEY_ID=SUA_ACCESS_KEY_AQUI
R2_SECRET_ACCESS_KEY=SUA_SECRET_KEY_AQUI
R2_BUCKET_NAME=edvaldorodrigues-artigos
R2_PUBLIC_URL=https://cdn.edvaldorodrigues.com.br
```
Deixe esses valores como placeholders — eu vou preencher as credenciais reais depois de criar o bucket no Cloudflare.

### Edge Function `generate-upload-url`

Criar `supabase/functions/generate-upload-url/index.ts`, usando `aws4fetch` (leve e compatível com Deno, evita problemas do SDK oficial da AWS no runtime de Edge Functions):

```typescript
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // 1. Validar que quem chama é um usuário autenticado (admin) via JWT do Supabase
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Gerar URL assinada de PUT para o R2
  const { fileName, contentType } = await req.json();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const key = `articles/${crypto.randomUUID()}-${safeName}`;

  const client = new AwsClient({
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  });

  const endpoint = `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${Deno.env.get("R2_BUCKET_NAME")}/${key}`;
  const signed = await client.sign(endpoint, {
    method: "PUT",
    headers: { "content-type": contentType },
    aws: { signQuery: true },
  });

  return new Response(JSON.stringify({
    uploadUrl: signed.url,
    publicUrl: `${Deno.env.get("R2_PUBLIC_URL")}/${key}`,
  }), { headers: { "content-type": "application/json" } });
});
```

### Fluxo de upload no frontend (`src/lib/storage/uploadImage.ts`)

1. Cliente chama a Edge Function passando `fileName` e `contentType`.
2. Recebe `{ uploadUrl, publicUrl }`.
3. Faz `fetch(uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file })`.
4. Salva `publicUrl` no campo correspondente (`cover_image_url` ou inserido no corpo via extensão de imagem do TipTap).
5. Validar no cliente antes do upload: tipos aceitos `image/jpeg`, `image/png`, `image/webp`; tamanho máximo 5MB; exibir erro amigável caso contrário.

---

## FASE 3 — Frontend público

### 3.1 Seção "Artigos recentes" na Home (`src/components/site/ArticlesSection.tsx`)

Replicar fielmente o layout já usado no restante do site (mesma linguagem visual navy/gold), conforme a imagem de referência:
- Eyebrow dourado: `CONTEÚDO JURÍDICO`
- H2: `Artigos recentes`
- Botão outline no canto superior direito: `Ver todos os artigos →`, linkando para `/conteudo-juridico`
- Grid de 3 cards com os **3 artigos publicados mais recentes** (`order by published_at desc limit 3`), cada card com: imagem de capa, data formatada em pt-BR (`20 de maio de 2024`, usar `date-fns` com locale `ptBR`), título (2 linhas com truncamento), link `Ler artigo →` para `/conteudo-juridico/:slug`
- Se não houver nenhum artigo publicado ainda, ocultar a seção inteira (não mostrar grid vazio)

### 3.2 Página de listagem `/conteudo-juridico` (`src/pages/ConteudoJuridico.tsx`)

- Mesmo cabeçalho de seção (eyebrow + H2 + subtítulo)
- Filtro por categoria (chips: Todos, Empresarial, Civil, Família, Trabalhista, Criminal)
- Grid paginado (9 artigos por página, botões "Anterior/Próxima")
- Reaproveitar o componente de card da seção 3.1

### 3.3 Página de artigo `/conteudo-juridico/:slug` (`src/pages/ArtigoDetalhe.tsx`)

Design profissional B2B, consistente com a identidade navy/gold:
- Cabeçalho: badge da categoria, título (serifado, grande), linha com autor + OAB, data de publicação, tempo de leitura estimado
- Imagem de capa em destaque, largura total
- Corpo do artigo renderizado a partir de `content_html` (sanitizar com `DOMPurify` antes de `dangerouslySetInnerHTML`, mesmo sendo conteúdo só do admin — defesa em profundidade)
- Usar plugin `@tailwindcss/typography` (`prose`) customizado para casar com o tema: títulos serifados, links dourados, blockquote com borda dourada
- Ao final: reaproveitar a faixa de CTA dourada já existente ("Precisando de orientação jurídica...")
- Seção "Artigos relacionados" (mesma categoria, excluindo o atual, até 3 itens)
- SEO: `seo_title`/`seo_description` (fallback para `title`/`excerpt`), Open Graph, e um bloco JSON-LD `Article` (schema.org), consistente com o `LegalService` já presente no `index.html`
- Incrementar `view_count` de forma assíncrona ao carregar a página (não bloquear a renderização)

---

## FASE 4 — Painel administrativo

### 4.1 Autenticação e rota protegida

- `src/pages/admin/Login.tsx`: formulário e-mail/senha via `supabase.auth.signInWithPassword`
- `src/components/admin/ProtectedRoute.tsx`: redireciona para `/admin/login` se não houver sessão ativa
- Rotas: `/admin/login`, `/admin` (dashboard), `/admin/artigos/novo`, `/admin/artigos/:id/editar` — todas exceto login protegidas

### 4.2 Dashboard / lista de artigos (`src/pages/admin/Dashboard.tsx`)

Tabela com: Título, Status (badge: **Rascunho** cinza / **Agendado** azul / **Publicado** verde — calculado a partir de `published_at`), Categoria, Data, Visualizações, Ações (Editar, Duplicar, Excluir com confirmação). Filtro por status e categoria, busca por título, botão "Novo artigo" em destaque.

### 4.3 Editor de artigo (`src/pages/admin/ArtigoEditor.tsx`)

Layout em duas colunas, inspirado no editor clássico do WordPress:

**Coluna principal:**
- Campo Título (grande) → gera `slug` automaticamente (editável manualmente depois, com validação de unicidade)
- Campo Resumo/Excerpt (textarea curto, usado nos cards e como fallback de meta description)
- Editor TipTap com toolbar: negrito, itálico, títulos H2/H3, lista com marcadores/numerada, citação, link, inserir imagem (upload direto pela toolbar, via fluxo da Fase 2), desfazer/refazer

**Coluna lateral (caixa de publicação, estilo WordPress):**
- Status: Rascunho / Publicar agora / Agendar (se "Agendar", exibir date/time picker — grava em `published_at`)
- Categoria (select, das 5 já cadastradas)
- Tags (multi-select com opção de criar nova tag)
- Imagem de capa: uploader com drag-and-drop, preview, campo de texto alternativo (`cover_image_alt`) obrigatório antes de publicar
- Bloco de SEO (colapsável): título SEO com contador de caracteres (~60), descrição SEO com contador (~155)
- Botões: **Salvar rascunho**, **Publicar agora** / **Agendar publicação** (label muda conforme a data escolhida), **Visualizar** (abre `/conteudo-juridico/:slug` em nova aba — funciona graças à RLS combinada explicada na Fase 1)

Calcular `reading_time_minutes` automaticamente (contagem de palavras do `content_html` ÷ 200, arredondado para cima) no momento de salvar.

---

## FASE 5 — Ajustes de navegação

- Atualizar o link "Conteúdo Jurídico" no `Navbar` e no `Footer` para apontar para `/conteudo-juridico` (hoje pode estar sem destino ou apontando para outro lugar).
- Garantir que o link "Ver todos os artigos" da Home também aponte corretamente.

---

## DEPENDÊNCIAS A INSTALAR

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/html date-fns dompurify @tailwindcss/typography
```

(Não reinstalar `@supabase/supabase-js` se já estiver no projeto.)

---

## CHECKLIST DE ENTREGA

- [ ] Migration aplicada no Supabase com sucesso (`supabase db push` ou equivalente), tabelas e RLS ativas
- [ ] Edge Function `generate-upload-url` deployada, com placeholders de secrets documentados no README (não commitar credenciais reais)
- [ ] Seção "Artigos recentes" na Home visualmente idêntica à referência, some automaticamente se não houver artigos publicados
- [ ] Página de listagem e página de artigo funcionando, responsivas, com SEO básico
- [ ] Login admin funcional, rotas protegidas redirecionando corretamente quando deslogado
- [ ] Editor cria, edita, salva rascunho, agenda e publica artigos corretamente
- [ ] Upload de imagem de capa e de imagens inline funcionando, com validação de tipo/tamanho
- [ ] Build (`npm run build`) sem erros
- [ ] Nenhuma credencial real do R2 commitada no repositório — apenas placeholders
- [ ] Links de navegação (Navbar/Footer) atualizados
