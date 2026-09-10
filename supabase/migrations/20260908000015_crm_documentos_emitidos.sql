-- Tabela para persistência de documentos emitidos (Contrato, Procuração, Hipossuficiência, IRPF, Residência, Recibo)
create table if not exists public.documentos_emitidos (
  id            uuid primary key default gen_random_uuid(),
  advogado_id   uuid not null references public.advogados(id) on delete cascade,
  cliente_id    uuid references public.clientes(id) on delete set null,
  cliente_nome  text not null,
  tipo          text not null,         -- contrato | procuracao | hipossuficiencia | irpf | residencia | recibo | lote
  numero        text not null,         -- Ex: ERF-0001/2026
  titulo        text not null,         -- Ex: Contrato de honorários - Fulano
  html_content  text not null,         -- HTML completo renderizado do documento
  opcoes_json   jsonb default '{}'::jsonb, -- Parâmetros usados na geração
  emitido_em    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Habilita RLS
alter table public.documentos_emitidos enable row level security;

-- Política de RLS para advogados autenticados acessarem apenas seus documentos
create policy "advogado_gerencia_proprios_documentos_emitidos"
  on public.documentos_emitidos
  for all
  using (advogado_id in (
    select id from public.advogados where user_id = auth.uid()
  ))
  with check (advogado_id in (
    select id from public.advogados where user_id = auth.uid()
  ));

-- Índices de consulta rápida
create index if not exists idx_doc_emitidos_advogado_data on public.documentos_emitidos (advogado_id, emitido_em desc);
create index if not exists idx_doc_emitidos_cliente on public.documentos_emitidos (cliente_id);
create index if not exists idx_doc_emitidos_tipo on public.documentos_emitidos (tipo);
