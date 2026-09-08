-- ================================================================
-- Migração: Schema Completo de Artigos (Conteúdo Jurídico)
-- Escritório Dr. Edvaldo Rodrigues Ferreira Advocacia
-- ================================================================

create extension if not exists "pgcrypto";

-- 1. TABELA: categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 2. TABELA: tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 3. TABELA: articles
create table if not exists public.articles (
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
  author_oab text default 'OAB/SP nº 465.818',
  author_avatar_url text,
  advogado_id uuid references public.advogados(id) on delete set null,
  seo_title text,
  seo_description text,
  reading_time_minutes int default 4,
  view_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. TABELA: article_tags
create table if not exists public.article_tags (
  article_id uuid references public.articles(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- Índices de performance
create index if not exists idx_articles_published_at on public.articles (published_at desc);
create index if not exists idx_articles_category on public.articles (category_id);
create index if not exists idx_articles_slug on public.articles (slug);

-- Função de trigger para updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articles_updated_at on public.articles;
create trigger trg_articles_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

-- 5. FUNÇÃO RPC: increment_article_views (Segura com atomicidade)
create or replace function public.increment_article_views(article_id uuid)
returns void as $$
begin
  update public.articles
  set view_count = view_count + 1
  where id = article_id and published_at is not null and published_at <= now();
end;
$$ language plpgsql security definer;

grant execute on function public.increment_article_views(uuid) to anon, authenticated;

-- 6. POLÍTICAS DE RLS (Row Level Security)
alter table public.articles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;

-- Articles: leitura pública de artigos publicados
drop policy if exists "public_read_published_articles" on public.articles;
create policy "public_read_published_articles"
on public.articles for select
to anon, authenticated
using (published_at is not null and published_at <= now());

-- Articles: acesso total para admin autenticado
drop policy if exists "admin_full_access_articles" on public.articles;
create policy "admin_full_access_articles"
on public.articles for all
to authenticated
using (true) with check (true);

-- Categories
drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
on public.categories for select to anon, authenticated using (true);

drop policy if exists "admin_write_categories" on public.categories;
create policy "admin_write_categories"
on public.categories for all to authenticated using (true) with check (true);

-- Tags
drop policy if exists "public_read_tags" on public.tags;
create policy "public_read_tags"
on public.tags for select to anon, authenticated using (true);

drop policy if exists "admin_write_tags" on public.tags;
create policy "admin_write_tags"
on public.tags for all to authenticated using (true) with check (true);

-- Article_Tags
drop policy if exists "public_read_article_tags" on public.article_tags;
create policy "public_read_article_tags"
on public.article_tags for select to anon, authenticated using (true);

drop policy if exists "admin_write_article_tags" on public.article_tags;
create policy "admin_write_article_tags"
on public.article_tags for all to authenticated using (true) with check (true);

-- 7. SEED: 7 Categorias alinhadas às Áreas de Atuação do Escritório
insert into public.categories (name, slug)
values
  ('Empresarial', 'empresarial'),
  ('Civil', 'civil'),
  ('Família', 'familia'),
  ('Trabalhista', 'trabalhista'),
  ('Criminal', 'criminal'),
  ('Previdenciário', 'previdenciario'),
  ('Militar', 'militar')
on conflict (slug) do nothing;

-- 8. SEED: Tags Iniciais
insert into public.tags (name, slug)
values
  ('Contratos', 'contratos'),
  ('Prevenção de Riscos', 'prevencao-de-riscos'),
  ('Cobrança', 'cobranca'),
  ('Direito Societário', 'direito-societario'),
  ('Compliance', 'compliance')
on conflict (slug) do nothing;

-- 9. SEED: 3 Artigos Iniciais da Referência (Publicados)
do $$
declare
  cat_empresarial uuid;
  cat_civil uuid;
  art1_id uuid := 'a1111111-1111-4111-a111-111111111111';
  art2_id uuid := 'a2222222-2222-4222-a222-222222222222';
  art3_id uuid := 'a3333333-3333-4333-a333-333333333333';
  tag_contratos uuid;
  tag_prevencao uuid;
  tag_cobranca uuid;
begin
  select id into cat_empresarial from public.categories where slug = 'empresarial' limit 1;
  select id into cat_civil from public.categories where slug = 'civil' limit 1;
  select id into tag_contratos from public.tags where slug = 'contratos' limit 1;
  select id into tag_prevencao from public.tags where slug = 'prevencao-de-riscos' limit 1;
  select id into tag_cobranca from public.tags where slug = 'cobranca' limit 1;

  -- Artigo 1: Contrato mal elaborado
  insert into public.articles (
    id, slug, title, excerpt,
    cover_image_url, cover_image_alt, category_id,
    author_name, author_oab, reading_time_minutes, view_count, published_at,
    seo_title, seo_description,
    content, content_html
  ) values (
    art1_id,
    'contrato-mal-elaborado-pode-gerar-prejuizos-para-sua-empresa',
    'Contrato mal elaborado pode gerar prejuízos para sua empresa',
    'Entenda os riscos jurídicos e financeiros de utilizar contratos genéricos e saiba como a assessoria preventiva blinda as operações do seu negócio.',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    'Advogado e empresário analisando cláusulas de contrato com caneta sobre mesa de reunião',
    cat_empresarial,
    'Dr. Edvaldo Rodrigues Ferreira',
    'OAB/SP nº 465.818',
    4,
    142,
    '2024-05-20 10:00:00+00',
    'Contrato mal elaborado pode gerar prejuízos para sua empresa | Edvaldo Rodrigues',
    'Saiba como contratos empresariais mal redigidos causam litígios e perdas financeiras, e como proteger sua empresa com análise jurídica preventiva.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No cotidiano corporativo, a pressa em fechar negócios muitas vezes leva gestores a recorrerem a modelos genéricos de contratos encontrados na internet ou a minutas defasadas. Essa prática, aparentemente inofensiva e econômica à primeira vista, é uma das principais causadoras de litígios judiciais e passivos financeiros irreversíveis para empresas de todos os portes."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"O perigo das cláusulas ambíguas e omissões críticas"}]},{"type":"paragraph","content":[{"type":"text","text":"Um contrato comercial não serve apenas para documentar um acordo de vontades; sua função primária é estabelecer com precisão as obrigações, prazos, critérios de rescisão, multas proporcionais e a matriz de riscos de cada contratante. Quando uma cláusula de rescisão é redigida de forma confusa, a parte prejudicada se vê sem mecanismos claros de cobrança ou execução."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Assessoria preventiva: investimento com retorno comprovado"}]},{"type":"paragraph","content":[{"type":"text","text":"A análise e elaboração contratual personalizada identifica brechas antes que elas se transformem em processos judiciais. Blindar sua empresa por meio de instrumentos jurídicos customizados garante previsibilidade de caixa, relações sólidas com parceiros comerciais e tranquilidade para expandir suas operações."}]}]}'::jsonb,
    '<p>No cotidiano corporativo, a pressa em fechar negócios muitas vezes leva gestores a recorrerem a modelos genéricos de contratos encontrados na internet ou a minutas defasadas. Essa prática, aparentemente inofensiva e econômica à primeira vista, é uma das principais causadoras de litígios judiciais e passivos financeiros irreversíveis para empresas de todos os portes.</p><h2>O perigo das cláusulas ambíguas e omissões críticas</h2><p>Um contrato comercial não serve apenas para documentar um acordo de vontades; sua função primária é estabelecer com precisão as obrigações, prazos, critérios de rescisão, multas proporcionais e a matriz de riscos de cada contratante. Quando uma cláusula de rescisão é redigida de forma confusa, a parte prejudicada se vê sem mecanismos claros de cobrança ou execução.</p><h2>Assessoria preventiva: investimento com retorno comprovado</h2><p>A análise e elaboração contratual personalizada identifica brechas antes que elas se transformem em processos judiciais. Blindar sua empresa por meio de instrumentos jurídicos customizados garante previsibilidade de caixa, relações sólidas com parceiros comerciais e tranquilidade para expandir suas operações.</p>'
  ) on conflict (slug) do nothing;

  -- Artigo 2: 5 documentos que toda empresa deve ter em dia
  insert into public.articles (
    id, slug, title, excerpt,
    cover_image_url, cover_image_alt, category_id,
    author_name, author_oab, reading_time_minutes, view_count, published_at,
    seo_title, seo_description,
    content, content_html
  ) values (
    art2_id,
    '5-documentos-que-toda-empresa-deve-ter-em-dia',
    '5 documentos que toda empresa deve ter em dia',
    'Conheça a documentação indispensável para resguardar a regularidade fiscal, societária e trabalhista da sua empresa perante fiscalizações e parceiros.',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80',
    'Aperto de mãos formal entre empresários após assinatura de acordo corporativo',
    cat_empresarial,
    'Dr. Edvaldo Rodrigues Ferreira',
    'OAB/SP nº 465.818',
    5,
    98,
    '2024-05-15 10:00:00+00',
    '5 documentos que toda empresa deve ter em dia | Advocacia Empresarial',
    'Descubra os 5 documentos jurídicos essenciais para manter a conformidade legal e proteger o patrimônio da sua empresa.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A conformidade legal de um negócio vai muito além do simples registro na Junta Comercial e emissão de notas fiscais. Manter instrumentos jurídicos atualizados previne multas de órgãos fiscalizadores e assegura a governança da sociedade perante investidores, sócios e fornecedores."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"1. Contrato Social atualizado e Acordo de Sócios"}]},{"type":"paragraph","content":[{"type":"text","text":"O Contrato Social deve refletir com exatidão o objeto social atual da atividade e a proporção de quotas. Complementarmente, o Acordo de Sócios define regras de saída, valuation em caso de dissolução parcial e quóruns de deliberação estratégica."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"2. Contratos de Trabalho com cláusulas de sigilo e não-concorrência"}]},{"type":"paragraph","content":[{"type":"text","text":"Relações de trabalho desprovidas de contratos formais bem alinhados à legislação trabalhista e à proteção de segredos comerciais deixam a empresa vulnerável a passivos e vazamento de informações essenciais."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"3. Política de Privacidade e Termos de Uso (LGPD)"}]},{"type":"paragraph","content":[{"type":"text","text":"Qualquer empresa que processe dados de clientes ou colaboradores precisa de documentos transparentes adequados à Lei Geral de Proteção de Dados, minimizando riscos de autuações da ANPD."}]}]}'::jsonb,
    '<p>A conformidade legal de um negócio vai muito além do simples registro na Junta Comercial e emissão de notas fiscais. Manter instrumentos jurídicos atualizados previne multas de órgãos fiscalizadores e assegura a governança da sociedade perante investidores, sócios e fornecedores.</p><h2>1. Contrato Social atualizado e Acordo de Sócios</h2><p>O Contrato Social deve refletir com exatidão o objeto social atual da atividade e a proporção de quotas. Complementarmente, o Acordo de Sócios define regras de saída, valuation em caso de dissolução parcial e quóruns de deliberação estratégica.</p><h2>2. Contratos de Trabalho com cláusulas de sigilo e não-concorrência</h2><p>Relações de trabalho desprovidas de contratos formais bem alinhados à legislação trabalhista e à proteção de segredos comerciais deixam a empresa vulnerável a passivos e vazamento de informações essenciais.</p><h2>3. Política de Privacidade e Termos de Uso (LGPD)</h2><p>Qualquer empresa que processe dados de clientes ou colaboradores precisa de documentos transparentes adequados à Lei Geral de Proteção de Dados, minimizando riscos de autuações da ANPD.</p>'
  ) on conflict (slug) do nothing;

  -- Artigo 3: Cobrança judicial
  insert into public.articles (
    id, slug, title, excerpt,
    cover_image_url, cover_image_alt, category_id,
    author_name, author_oab, reading_time_minutes, view_count, published_at,
    seo_title, seo_description,
    content, content_html
  ) values (
    art3_id,
    'cobranca-judicial-quando-e-o-melhor-caminho-para-recuperar-valores',
    'Cobrança judicial: quando é o melhor caminho para recuperar valores',
    'Descubra as etapas para recuperação de crédito inadimplente, desde a notificação extrajudicial até a execução forçada de títulos de crédito.',
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    'Martelo de juiz de madeira maciça sobre mesa de tribunal ao lado de documentos jurídicos',
    cat_civil,
    'Dr. Edvaldo Rodrigues Ferreira',
    'OAB/SP nº 465.818',
    6,
    215,
    '2024-05-10 10:00:00+00',
    'Cobrança judicial: quando é o melhor caminho para recuperar valores | Dr. Edvaldo Rodrigues',
    'Guia sobre cobrança judicial e extrajudicial para empresas e pessoas físicas. Saiba como reaver créditos vencidos com eficiência jurídica.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A inadimplência é um dos principais fatores que corroem o fluxo de caixa das empresas. Contudo, saber o momento exato de transicionar da cobrança amigável para a esfera judicial faz toda a diferença entre reaver o capital ou incorrer em prescrição da dívida."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"A importância da Notificação Extrajudicial prévia"}]},{"type":"paragraph","content":[{"type":"text","text":"Antes de ingressar em juízo, uma notificação formal enviada com aviso de recebimento constitui o devedor em mora, interrompe prazos prescricionais em casos específicos e demonstra a boa-fé do credor perante o juízo."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Ação de Execução vs. Ação Monitória ou Cobrança"}]},{"type":"paragraph","content":[{"type":"text","text":"Se o débito estiver fundamentado em título executivo extrajudicial (cheques, duplicatas aceitas, contratos assinados por duas testemunhas), o rito da Ação de Execução permite penhora célere de contas e bens do devedor, acelerando significativamente a recuperação patrimonial."}]}]}'::jsonb,
    '<p>A inadimplência é um dos principais fatores que corroem o fluxo de caixa das empresas. Contudo, saber o momento exato de transicionar da cobrança amigável para a esfera judicial faz toda a diferença entre reaver o capital ou incorrer em prescrição da dívida.</p><h2>A importância da Notificação Extrajudicial prévia</h2><p>Antes de ingressar em juízo, uma notificação formal enviada com aviso de recebimento constitui o devedor em mora, interrompe prazos prescricionais em casos específicos e demonstra a boa-fé do credor perante o juízo.</p><h2>Ação de Execução vs. Ação Monitória ou Cobrança</h2><p>Se o débito estiver fundamentado em título executivo extrajudicial (cheques, duplicatas aceitas, contratos assinados por duas testemunhas), o rito da Ação de Execução permite penhora célere de contas e bens do devedor, acelerando significativamente a recuperação patrimonial.</p>'
  ) on conflict (slug) do nothing;

  -- Relacionamentos article_tags
  if tag_contratos is not null then
    insert into public.article_tags (article_id, tag_id) values (art1_id, tag_contratos) on conflict do nothing;
  end if;
  if tag_prevencao is not null then
    insert into public.article_tags (article_id, tag_id) values (art1_id, tag_prevencao), (art2_id, tag_prevencao) on conflict do nothing;
  end if;
  if tag_cobranca is not null then
    insert into public.article_tags (article_id, tag_id) values (art3_id, tag_cobranca) on conflict do nothing;
  end if;

end $$;
