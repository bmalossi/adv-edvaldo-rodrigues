-- ================================================================
-- Migração: Tabela de Banco de Mídias/Imagens (Cloudflare R2)
-- Escritório Dr. Edvaldo Rodrigues Ferreira Advocacia
-- ================================================================

create table if not exists public.article_images (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  file_name text,
  content_type text,
  file_size int,
  width int,
  height int,
  created_at timestamptz not null default now()
);

-- Índice para ordenação por data de envio
create index if not exists idx_article_images_created_at on public.article_images (created_at desc);

-- RLS
alter table public.article_images enable row level security;

-- Leitura pública de imagens para renderização dos artigos
drop policy if exists "public_read_article_images" on public.article_images;
create policy "public_read_article_images"
on public.article_images for select
to anon, authenticated
using (true);

-- Acesso total para admin autenticado (inserir, deletar)
drop policy if exists "admin_all_article_images" on public.article_images;
create policy "admin_all_article_images"
on public.article_images for all
to authenticated
using (true)
with check (true);
