-- 1. Tipo Enum para Papéis de Usuário
DO \$\$ BEGIN
    CREATE TYPE public.papel_usuario AS ENUM ('advogado', 'estagiario', 'secretaria');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- 2. Tipo Enum para Ciclo de Vida do Cliente
DO \$\$ BEGIN
    CREATE TYPE public.status_ciclo_cliente AS ENUM ('lead', 'consulta', 'ativo', 'encerrado');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- 3. Tipo Enum para Tipo de Pessoa (PF / PJ)
DO \$\$ BEGIN
    CREATE TYPE public.tipo_pessoa AS ENUM ('PF', 'PJ');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- 4. Tipo Enum para Visibilidade
DO \$\$ BEGIN
    CREATE TYPE public.visibilidade_registro AS ENUM ('colegiado', 'privado');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- 5. Tabela de Perfis de Usuário (RBAC)
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    papel public.papel_usuario NOT NULL DEFAULT 'advogado',
    oab TEXT,
    telefone TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Perfis visíveis para usuários autenticados\"
    ON public.perfis FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY \"Usuários podem atualizar o próprio perfil\"
    ON public.perfis FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 6. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa public.tipo_pessoa NOT NULL DEFAULT 'PF',
    nome_razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cpf_cnpj TEXT,
    rg_ie TEXT,
    nacionalidade TEXT,
    estado_civil TEXT,
    profissao TEXT,
    email TEXT,
    telefone_whatsapp TEXT NOT NULL,
    endereco_logradouro TEXT,
    endereco_numero TEXT,
    endereco_complemento TEXT,
    endereco_bairro TEXT,
    endereco_cidade TEXT,
    endereco_uf TEXT,
    endereco_cep TEXT,
    status_ciclo public.status_ciclo_cliente NOT NULL DEFAULT 'lead',
    origem_contato TEXT,
    observacoes_iniciais TEXT,
    visibilidade public.visibilidade_registro NOT NULL DEFAULT 'colegiado',
    responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    google_drive_folder_id TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas performáticas
CREATE INDEX IF NOT EXISTS idx_clientes_status_ciclo ON public.clientes(status_ciclo);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome_razao_social);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_responsavel ON public.clientes(responsavel_id);

-- Habilitar RLS em clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Clientes visíveis para equipe autenticada\"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            visibilidade = 'colegiado' OR
            responsavel_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.perfis WHERE id = auth.uid() AND papel = 'advogado'
            )
        )
    );

CREATE POLICY \"Equipe autenticada pode inserir clientes\"
    ON public.clientes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY \"Equipe autenticada pode atualizar clientes\"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            visibilidade = 'colegiado' OR
            responsavel_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.perfis WHERE id = auth.uid() AND papel = 'advogado'
            )
        )
    );
