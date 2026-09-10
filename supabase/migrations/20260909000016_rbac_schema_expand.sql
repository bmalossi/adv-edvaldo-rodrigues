-- ==============================================================================
-- MIGRATION: RBAC Dinâmico - Schema Expand e Seed dos Perfis Padrão
-- Arquivo: 20260909000016_rbac_schema_expand.sql
-- ==============================================================================

-- 1. Tabela de Perfis de Acesso / Funções (roles)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles visíveis para usuários autenticados"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

-- 2. Tabela de Permissões Granulares por Perfil (permissions)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    modulo TEXT NOT NULL,
    acao TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_modulo_acao UNIQUE (role_id, modulo, acao)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_permissions_role_id ON public.permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_modulo_acao ON public.permissions(modulo, acao);

-- Habilitar RLS em permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions visíveis para usuários autenticados"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

-- 3. Tabela de Log de Auditoria do RBAC (audit_log)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- Habilitar RLS em audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Alteração na tabela perfis (Adição de role_id e must_change_password)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'perfis' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE public.perfis ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'perfis' AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE public.perfis ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_perfis_role_id ON public.perfis(role_id);

-- 5. Função SECURITY DEFINER: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(p_modulo TEXT, p_acao TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_has BOOLEAN;
BEGIN
    -- Verifica se o usuário autenticado atual possui a permissão através do seu role_id
    SELECT EXISTS (
        SELECT 1
        FROM public.perfis p
        JOIN public.permissions perm ON perm.role_id = p.role_id
        WHERE p.id = auth.uid()
          AND p.ativo = true
          AND perm.modulo = p_modulo
          AND perm.acao = p_acao
    ) INTO v_has;

    RETURN coalesce(v_has, false);
END;
$$;

-- 6. Trigger Soft-Rule: Impedir rebaixamento/exclusão do último Administrador
CREATE OR REPLACE FUNCTION public.check_last_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role_id UUID;
    v_total_admins INT;
BEGIN
    -- Obter o ID do perfil Administrador
    SELECT id INTO v_admin_role_id FROM public.roles WHERE nome = 'Administrador' LIMIT 1;
    
    IF v_admin_role_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Caso de exclusão
    IF TG_OP = 'DELETE' THEN
        IF OLD.role_id = v_admin_role_id THEN
            SELECT count(*) INTO v_total_admins FROM public.perfis WHERE role_id = v_admin_role_id AND ativo = true;
            IF v_total_admins <= 1 THEN
                RAISE EXCEPTION 'Operação cancelada: O sistema não pode ficar sem nenhum Administrador ativo.';
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- Caso de atualização (rebaixamento de papel ou desativação)
    IF TG_OP = 'UPDATE' THEN
        IF OLD.role_id = v_admin_role_id AND (NEW.role_id IS DISTINCT FROM OLD.role_id OR (NEW.ativo = false AND OLD.ativo = true)) THEN
            SELECT count(*) INTO v_total_admins FROM public.perfis WHERE role_id = v_admin_role_id AND ativo = true;
            IF v_total_admins <= 1 THEN
                RAISE EXCEPTION 'Operação cancelada: Não é permitido rebaixar ou desativar o único Administrador ativo do sistema.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_last_admin ON public.perfis;
CREATE TRIGGER trg_check_last_admin
BEFORE UPDATE OR DELETE ON public.perfis
FOR EACH ROW
EXECUTE FUNCTION public.check_last_admin();

-- 7. Trigger de Auditoria Automática para Roles, Permissions e Perfis
CREATE OR REPLACE FUNCTION public.fn_audit_rbac_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_entity_id UUID;
    v_old JSONB := null;
    v_new JSONB := null;
BEGIN
    v_user_id := auth.uid();

    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
        v_old := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := NEW.id;
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        v_entity_id := NEW.id;
        v_new := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (v_user_id, TG_OP, TG_TABLE_NAME, v_entity_id, v_old, v_new);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_roles ON public.roles;
CREATE TRIGGER trg_audit_roles
AFTER INSERT OR UPDATE OR DELETE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_rbac_changes();

DROP TRIGGER IF EXISTS trg_audit_permissions ON public.permissions;
CREATE TRIGGER trg_audit_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.permissions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_rbac_changes();

DROP TRIGGER IF EXISTS trg_audit_perfis ON public.perfis;
CREATE TRIGGER trg_audit_perfis
AFTER INSERT OR UPDATE OR DELETE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_rbac_changes();

-- Políticas RLS para audit_log (visível para quem tem permissão de perfis_acesso.visualizar)
CREATE POLICY "Audit log visível apenas para usuários com permissão"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (public.has_permission('perfis_acesso', 'visualizar'));

-- 8. Seed dos 4 Perfis Padrão de Fábrica e suas Permissões
DO $$
DECLARE
    v_admin_id UUID;
    v_socio_id UUID;
    v_associado_id UUID;
    v_estagiario_id UUID;
    v_modulos TEXT[] := ARRAY['clientes', 'casos', 'agenda', 'documentos', 'financeiro', 'relatorios', 'usuarios', 'perfis_acesso'];
    v_acoes TEXT[] := ARRAY['visualizar', 'criar', 'editar', 'deletar'];
    m TEXT;
    a TEXT;
BEGIN
    -- 8.1. Perfil Administrador
    INSERT INTO public.roles (nome, descricao, is_default)
    VALUES ('Administrador', 'Acesso irrestrito a todos os módulos, configurações e governança do sistema.', true)
    ON CONFLICT (nome) DO UPDATE SET is_default = true, descricao = EXCLUDED.descricao
    RETURNING id INTO v_admin_id;

    -- Permissões Totais para Administrador
    FOREACH m IN ARRAY v_modulos LOOP
        FOREACH a IN ARRAY v_acoes LOOP
            INSERT INTO public.permissions (role_id, modulo, acao)
            VALUES (v_admin_id, m, a)
            ON CONFLICT (role_id, modulo, acao) DO NOTHING;
        END LOOP;
    END LOOP;

    -- 8.2. Perfil Sócio (Advogado Sênior)
    INSERT INTO public.roles (nome, descricao, is_default)
    VALUES ('Sócio', 'Gestão processual ampla, aprovação de prazos, distribuição de casos e financeiro.', true)
    ON CONFLICT (nome) DO UPDATE SET is_default = true, descricao = EXCLUDED.descricao
    RETURNING id INTO v_socio_id;

    -- Permissões de Sócio: Clientes, Casos, Agenda, Documentos, Financeiro, Relatórios
    FOREACH m IN ARRAY ARRAY['clientes', 'casos', 'agenda', 'documentos', 'financeiro', 'relatorios'] LOOP
        FOREACH a IN ARRAY v_acoes LOOP
            INSERT INTO public.permissions (role_id, modulo, acao)
            VALUES (v_socio_id, m, a)
            ON CONFLICT (role_id, modulo, acao) DO NOTHING;
        END LOOP;
    END LOOP;
    -- Apenas visualização de usuários para equipe
    INSERT INTO public.permissions (role_id, modulo, acao) VALUES (v_socio_id, 'usuarios', 'visualizar') ON CONFLICT DO NOTHING;

    -- 8.3. Perfil Advogado Associado (Pleno / Júnior)
    INSERT INTO public.roles (nome, descricao, is_default)
    VALUES ('Advogado Associado', 'Operação técnica de clientes e processos vinculados. Sem acesso a financeiro global ou configurações.', true)
    ON CONFLICT (nome) DO UPDATE SET is_default = true, descricao = EXCLUDED.descricao
    RETURNING id INTO v_associado_id;

    -- Permissões de Advogado Associado: Clientes, Casos, Agenda, Documentos (CRUD)
    FOREACH m IN ARRAY ARRAY['clientes', 'casos', 'agenda', 'documentos'] LOOP
        FOREACH a IN ARRAY v_acoes LOOP
            INSERT INTO public.permissions (role_id, modulo, acao)
            VALUES (v_associado_id, m, a)
            ON CONFLICT (role_id, modulo, acao) DO NOTHING;
        END LOOP;
    END LOOP;

    -- 8.4. Perfil Estagiário / Assistente
    INSERT INTO public.roles (nome, descricao, is_default)
    VALUES ('Estagiário / Assistente', 'Visualização de prazos/casos, anexação de minutas e relatórios básicos. Sem permissão de exclusão.', true)
    ON CONFLICT (nome) DO UPDATE SET is_default = true, descricao = EXCLUDED.descricao
    RETURNING id INTO v_estagiario_id;

    -- Permissões de Estagiário: visualizar em clientes, casos, agenda, documentos, relatórios
    FOREACH m IN ARRAY ARRAY['clientes', 'casos', 'agenda', 'documentos', 'relatorios'] LOOP
        INSERT INTO public.permissions (role_id, modulo, acao)
        VALUES (v_estagiario_id, m, 'visualizar')
        ON CONFLICT (role_id, modulo, acao) DO NOTHING;
    END LOOP;
    -- Estagiário pode criar/anexar documentos e apontar interações
    INSERT INTO public.permissions (role_id, modulo, acao) VALUES (v_estagiario_id, 'documentos', 'criar') ON CONFLICT DO NOTHING;
    INSERT INTO public.permissions (role_id, modulo, acao) VALUES (v_estagiario_id, 'documentos', 'editar') ON CONFLICT DO NOTHING;
    INSERT INTO public.permissions (role_id, modulo, acao) VALUES (v_estagiario_id, 'agenda', 'criar') ON CONFLICT DO NOTHING;
END $$;
