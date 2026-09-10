-- ==============================================================================
-- MIGRATION: RBAC Dinâmico - Contract, Migração de Dados, RLS e Remoção do Enum
-- Arquivo: 20260909000017_rbac_contract_migrate.sql
-- ==============================================================================
-- Esta migration completa a transição para o novo modelo de RBAC dinâmico:
-- 1. Normalização e consolidação das roles padrão de fábrica.
-- 2. Migração atômica de dados: preenchimento de role_id em perfis a partir de papel/email.
-- 3. Imposição de NOT NULL na coluna role_id de perfis.
-- 4. Proteção contra escalonamento de privilégios em perfis.
-- 5. Reescrita completa de todas as políticas RLS do CRM usando has_permission().
-- 6. Exclusão da coluna antiga 'papel' da tabela perfis.
-- 7. Exclusão do tipo enum legado 'public.papel_usuario'.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Normalização e Identificação das Roles Padrão
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_old_estagiario_id UUID;
    v_new_estagiario_id UUID;
BEGIN
    SELECT id INTO v_old_estagiario_id FROM public.roles WHERE nome = 'Estagiário / Assistente';
    SELECT id INTO v_new_estagiario_id FROM public.roles WHERE nome = 'Estagiário/Assistente';

    IF v_old_estagiario_id IS NOT NULL AND v_new_estagiario_id IS NOT NULL THEN
        -- Reatribuir quaisquer perfis que apontavam para o nome com espaços
        UPDATE public.perfis SET role_id = v_new_estagiario_id WHERE role_id = v_old_estagiario_id;
        -- Remover o role duplicado antigo (CASCADE limpa permissions vinculadas)
        DELETE FROM public.roles WHERE id = v_old_estagiario_id;
    ELSIF v_old_estagiario_id IS NOT NULL AND v_new_estagiario_id IS NULL THEN
        UPDATE public.roles SET nome = 'Estagiário/Assistente' WHERE id = v_old_estagiario_id;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Migração de Dados: Mapeamento de Usuários Existentes para role_id
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_admin_role_id UUID;
    v_socio_role_id UUID;
    v_associado_role_id UUID;
    v_estagiario_role_id UUID;
    v_has_papel_col BOOLEAN;
BEGIN
    SELECT id INTO v_admin_role_id FROM public.roles WHERE nome = 'Administrador' LIMIT 1;
    SELECT id INTO v_socio_role_id FROM public.roles WHERE nome = 'Sócio' LIMIT 1;
    SELECT id INTO v_associado_role_id FROM public.roles WHERE nome = 'Advogado Associado' LIMIT 1;
    SELECT id INTO v_estagiario_role_id FROM public.roles WHERE nome = 'Estagiário/Assistente' LIMIT 1;

    IF v_admin_role_id IS NULL OR v_associado_role_id IS NULL OR v_estagiario_role_id IS NULL THEN
        RAISE EXCEPTION 'Roles essenciais não encontradas. Certifique-se de executar a migration 20260909000016_rbac_schema_expand.sql antes.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'perfis' AND column_name = 'papel'
    ) INTO v_has_papel_col;

    -- 2.1. Usuário admin existente -> Administrador
    IF v_has_papel_col THEN
        EXECUTE '
            UPDATE public.perfis
            SET role_id = $1
            WHERE role_id IS NULL AND (
                papel::text = ''admin''
                OR email IN (''edvaldorodrigues.advocacia@gmail.com'', ''contato@automab.dev'')
            )'
        USING v_admin_role_id;
    ELSE
        UPDATE public.perfis
        SET role_id = v_admin_role_id
        WHERE role_id IS NULL AND email IN ('edvaldorodrigues.advocacia@gmail.com', 'contato@automab.dev');
    END IF;

    -- Garantir que haja pelo menos 1 Administrador ativo no sistema
    IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE role_id = v_admin_role_id) THEN
        UPDATE public.perfis
        SET role_id = v_admin_role_id
        WHERE id = (
            SELECT id FROM public.perfis 
            ORDER BY 
                CASE WHEN email ILIKE '%edvaldo%' OR email ILIKE '%admin%' THEN 0 ELSE 1 END,
                created_at ASC 
            LIMIT 1
        );
    END IF;

    -- 2.2. Mapeamento dos papéis antigos
    IF v_has_papel_col THEN
        -- advogado -> Advogado Associado
        EXECUTE 'UPDATE public.perfis SET role_id = $1 WHERE role_id IS NULL AND papel::text = ''advogado'''
        USING v_associado_role_id;

        -- estagiario -> Estagiário/Assistente
        EXECUTE 'UPDATE public.perfis SET role_id = $1 WHERE role_id IS NULL AND papel::text = ''estagiario'''
        USING v_estagiario_role_id;

        -- secretaria -> Estagiário/Assistente
        EXECUTE 'UPDATE public.perfis SET role_id = $1 WHERE role_id IS NULL AND papel::text = ''secretaria'''
        USING v_estagiario_role_id;
    END IF;

    -- 2.3. Fallback defensivo para quaisquer perfis ainda sem role_id
    UPDATE public.perfis
    SET role_id = v_associado_role_id
    WHERE role_id IS NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Imposição de NOT NULL no role_id de perfis
-- ------------------------------------------------------------------------------
ALTER TABLE public.perfis ALTER COLUMN role_id SET NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. Trigger de Proteção Contra Escalonamento de Privilégios em perfis
-- ------------------------------------------------------------------------------
-- Impede que usuários comuns alterem o próprio role_id ou status ativo via UPDATE direto
CREATE OR REPLACE FUNCTION public.check_perfil_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se o role_id está sendo modificado por uma sessão autenticada
    IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
        IF auth.uid() IS NOT NULL AND NOT public.has_permission('usuarios', 'editar') THEN
            RAISE EXCEPTION 'Operação negada: Apenas administradores ou usuários com permissão em usuários podem alterar o perfil de acesso.';
        END IF;
    END IF;

    -- Se o status ativo está sendo modificado por uma sessão autenticada
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
        IF auth.uid() IS NOT NULL AND NOT public.has_permission('usuarios', 'editar') THEN
            RAISE EXCEPTION 'Operação negada: Apenas administradores ou usuários com permissão em usuários podem alterar o status da conta.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_perfil_update_permissions ON public.perfis;
CREATE TRIGGER trg_check_perfil_update_permissions
BEFORE UPDATE ON public.perfis
FOR EACH ROW
EXECUTE FUNCTION public.check_perfil_update_permissions();

-- ------------------------------------------------------------------------------
-- 5. Reescrita Completa das Políticas RLS Usando has_permission()
-- ------------------------------------------------------------------------------

-- 5.1. TABELA: public.clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes visíveis para equipe autenticada" ON public.clientes;
DROP POLICY IF EXISTS "Equipe autenticada pode inserir clientes" ON public.clientes;
DROP POLICY IF EXISTS "Equipe autenticada pode atualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Equipe autenticada pode excluir clientes" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

CREATE POLICY "clientes_select_policy"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND
        public.has_permission('clientes', 'visualizar') AND (
            visibilidade = 'colegiado'
            OR responsavel_id = auth.uid()
            OR public.has_permission('clientes', 'editar')
        )
    );

CREATE POLICY "clientes_insert_policy"
    ON public.clientes FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('clientes', 'criar')
    );

-- Nota: WITH CHECK explícito sem "deleted_at IS NULL" para permitir soft delete (UPDATE deleted_at = now())
CREATE POLICY "clientes_update_policy"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL AND
        public.has_permission('clientes', 'editar') AND (
            visibilidade = 'colegiado'
            OR responsavel_id = auth.uid()
            OR public.has_permission('clientes', 'deletar')
        )
    )
    WITH CHECK (
        public.has_permission('clientes', 'editar') AND (
            visibilidade = 'colegiado'
            OR responsavel_id = auth.uid()
            OR public.has_permission('clientes', 'deletar')
        )
    );

CREATE POLICY "clientes_delete_policy"
    ON public.clientes FOR DELETE
    TO authenticated
    USING (
        public.has_permission('clientes', 'deletar')
    );

-- 5.2. TABELA: public.interacoes_cliente
ALTER TABLE public.interacoes_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interações visíveis para usuários autenticados" ON public.interacoes_cliente;
DROP POLICY IF EXISTS "Equipe autenticada pode inserir interações" ON public.interacoes_cliente;
DROP POLICY IF EXISTS "interacoes_cliente_select" ON public.interacoes_cliente;
DROP POLICY IF EXISTS "interacoes_cliente_insert" ON public.interacoes_cliente;
DROP POLICY IF EXISTS "interacoes_cliente_update" ON public.interacoes_cliente;
DROP POLICY IF EXISTS "interacoes_cliente_delete" ON public.interacoes_cliente;

CREATE POLICY "interacoes_cliente_select"
    ON public.interacoes_cliente FOR SELECT
    TO authenticated
    USING (
        public.has_permission('clientes', 'visualizar') AND
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = interacoes_cliente.cliente_id
              AND c.deleted_at IS NULL
              AND (
                  c.visibilidade = 'colegiado'
                  OR c.responsavel_id = auth.uid()
                  OR public.has_permission('clientes', 'editar')
              )
        )
    );

CREATE POLICY "interacoes_cliente_insert"
    ON public.interacoes_cliente FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('clientes', 'visualizar') AND
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = interacoes_cliente.cliente_id
              AND c.deleted_at IS NULL
        )
    );

CREATE POLICY "interacoes_cliente_update"
    ON public.interacoes_cliente FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('clientes', 'editar') OR autor_id = auth.uid()
    );

CREATE POLICY "interacoes_cliente_delete"
    ON public.interacoes_cliente FOR DELETE
    TO authenticated
    USING (
        public.has_permission('clientes', 'deletar') OR (
            public.has_permission('clientes', 'editar') AND autor_id = auth.uid()
        )
    );

-- 5.3. TABELA: public.casos
ALTER TABLE public.casos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Casos visíveis segundo visibilidade colegiada ou privada" ON public.casos;
DROP POLICY IF EXISTS "Equipe autenticada pode inserir casos" ON public.casos;
DROP POLICY IF EXISTS "Equipe autenticada pode atualizar casos autorizados" ON public.casos;
DROP POLICY IF EXISTS "Equipe autenticada pode excluir casos autorizados" ON public.casos;
DROP POLICY IF EXISTS "casos_select_policy" ON public.casos;
DROP POLICY IF EXISTS "casos_insert_policy" ON public.casos;
DROP POLICY IF EXISTS "casos_update_policy" ON public.casos;
DROP POLICY IF EXISTS "casos_delete_policy" ON public.casos;

CREATE POLICY "casos_select_policy"
    ON public.casos FOR SELECT
    TO authenticated
    USING (
        public.has_permission('casos', 'visualizar') AND (
            visibilidade = 'colegiado'
            OR responsavel_id = auth.uid()
            OR auth.uid() = ANY(compartilhado_com)
            OR EXISTS (
                SELECT 1 FROM public.caso_colaboradores cc
                WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid()
            )
            OR public.has_permission('casos', 'editar')
        )
    );

CREATE POLICY "casos_insert_policy"
    ON public.casos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('casos', 'criar')
    );

CREATE POLICY "casos_update_policy"
    ON public.casos FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('casos', 'editar') AND (
            visibilidade = 'colegiado'
            OR responsavel_id = auth.uid()
            OR auth.uid() = ANY(compartilhado_com)
            OR EXISTS (
                SELECT 1 FROM public.caso_colaboradores cc
                WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid() AND cc.permissao = 'editor'
            )
            OR public.has_permission('casos', 'deletar')
        )
    )
    WITH CHECK (
        public.has_permission('casos', 'editar')
    );

CREATE POLICY "casos_delete_policy"
    ON public.casos FOR DELETE
    TO authenticated
    USING (
        public.has_permission('casos', 'deletar')
    );

-- 5.4. TABELA: public.caso_colaboradores
ALTER TABLE public.caso_colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caso_colaboradores_select" ON public.caso_colaboradores;
DROP POLICY IF EXISTS "caso_colaboradores_manage" ON public.caso_colaboradores;
DROP POLICY IF EXISTS "caso_colaboradores_insert" ON public.caso_colaboradores;
DROP POLICY IF EXISTS "caso_colaboradores_update" ON public.caso_colaboradores;
DROP POLICY IF EXISTS "caso_colaboradores_delete" ON public.caso_colaboradores;

CREATE POLICY "caso_colaboradores_select"
    ON public.caso_colaboradores FOR SELECT
    TO authenticated
    USING (
        public.has_permission('casos', 'visualizar')
    );

CREATE POLICY "caso_colaboradores_insert"
    ON public.caso_colaboradores FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('casos', 'editar')
    );

CREATE POLICY "caso_colaboradores_update"
    ON public.caso_colaboradores FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('casos', 'editar')
    );

CREATE POLICY "caso_colaboradores_delete"
    ON public.caso_colaboradores FOR DELETE
    TO authenticated
    USING (
        public.has_permission('casos', 'editar')
    );

-- 5.5. TABELA: public.etapas_funil
ALTER TABLE public.etapas_funil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etapas_funil_select" ON public.etapas_funil;
DROP POLICY IF EXISTS "etapas_funil_insert_admin" ON public.etapas_funil;
DROP POLICY IF EXISTS "etapas_funil_update_admin" ON public.etapas_funil;
DROP POLICY IF EXISTS "etapas_funil_delete_admin" ON public.etapas_funil;
DROP POLICY IF EXISTS "etapas_funil_insert_policy" ON public.etapas_funil;
DROP POLICY IF EXISTS "etapas_funil_update_policy" ON public.etapas_funil;
DROP POLICY IF EXISTS "etapas_funil_delete_policy" ON public.etapas_funil;

CREATE POLICY "etapas_funil_select"
    ON public.etapas_funil FOR SELECT
    TO authenticated
    USING (
        public.has_permission('casos', 'visualizar')
    );

CREATE POLICY "etapas_funil_insert_policy"
    ON public.etapas_funil FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('casos', 'criar')
    );

CREATE POLICY "etapas_funil_update_policy"
    ON public.etapas_funil FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('casos', 'editar')
    );

CREATE POLICY "etapas_funil_delete_policy"
    ON public.etapas_funil FOR DELETE
    TO authenticated
    USING (
        eh_padrao = false AND public.has_permission('casos', 'deletar')
    );

-- 5.6. TABELA: public.eventos_caso (Linha do tempo dos casos)
ALTER TABLE public.eventos_caso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_caso_select" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_insert" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_update" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_delete" ON public.eventos_caso;

CREATE POLICY "eventos_caso_select"
    ON public.eventos_caso FOR SELECT
    TO authenticated
    USING (
        public.has_permission('casos', 'visualizar') AND
        EXISTS (
            SELECT 1 FROM public.casos c
            WHERE c.id = eventos_caso.caso_id
              AND (
                  c.visibilidade = 'colegiado'
                  OR c.responsavel_id = auth.uid()
                  OR auth.uid() = ANY(c.compartilhado_com)
                  OR EXISTS (
                      SELECT 1 FROM public.caso_colaboradores cc
                      WHERE cc.caso_id = c.id AND cc.perfil_id = auth.uid()
                  )
                  OR public.has_permission('casos', 'editar')
              )
        )
    );

CREATE POLICY "eventos_caso_insert"
    ON public.eventos_caso FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.has_permission('casos', 'criar') OR public.has_permission('casos', 'editar')) AND
        EXISTS (
            SELECT 1 FROM public.casos c
            WHERE c.id = eventos_caso.caso_id
              AND (
                  c.visibilidade = 'colegiado'
                  OR c.responsavel_id = auth.uid()
                  OR auth.uid() = ANY(c.compartilhado_com)
                  OR EXISTS (
                      SELECT 1 FROM public.caso_colaboradores cc
                      WHERE cc.caso_id = c.id AND cc.perfil_id = auth.uid()
                  )
                  OR public.has_permission('casos', 'editar')
              )
        )
    );

CREATE POLICY "eventos_caso_update"
    ON public.eventos_caso FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('casos', 'editar') OR criado_por = auth.uid()
    );

CREATE POLICY "eventos_caso_delete"
    ON public.eventos_caso FOR DELETE
    TO authenticated
    USING (
        public.has_permission('casos', 'deletar') OR (
            public.has_permission('casos', 'editar') AND criado_por = auth.uid()
        )
    );

-- 5.7. TABELA: public.contratos_financeiros
ALTER TABLE public.contratos_financeiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Honorários acessíveis exclusivamente a advogados" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "Apenas advogados podem registrar contratos financeiros" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "Apenas advogados podem alterar contratos financeiros" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "Apenas advogados podem excluir contratos financeiros" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_select" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_insert" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_update" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_delete" ON public.contratos_financeiros;

CREATE POLICY "contratos_financeiros_select"
    ON public.contratos_financeiros FOR SELECT
    TO authenticated
    USING (
        public.has_permission('financeiro', 'visualizar')
    );

CREATE POLICY "contratos_financeiros_insert"
    ON public.contratos_financeiros FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('financeiro', 'criar')
    );

CREATE POLICY "contratos_financeiros_update"
    ON public.contratos_financeiros FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('financeiro', 'editar')
    );

CREATE POLICY "contratos_financeiros_delete"
    ON public.contratos_financeiros FOR DELETE
    TO authenticated
    USING (
        public.has_permission('financeiro', 'deletar')
    );

-- 5.8. TABELA: public.pendencias_crm
ALTER TABLE public.pendencias_crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de pendencias crm" ON public.pendencias_crm;
DROP POLICY IF EXISTS "Insercao de pendencias crm" ON public.pendencias_crm;
DROP POLICY IF EXISTS "Atualizacao de pendencias crm" ON public.pendencias_crm;
DROP POLICY IF EXISTS "Exclusao de pendencias crm" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_select" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_insert" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_update" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_delete" ON public.pendencias_crm;

CREATE POLICY "pendencias_crm_select"
    ON public.pendencias_crm FOR SELECT
    TO authenticated
    USING (
        public.has_permission('agenda', 'visualizar') AND (
            responsavel_id = auth.uid()
            OR public.has_permission('agenda', 'editar')
            OR (
                caso_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = pendencias_crm.caso_id
                      AND (
                          c.visibilidade = 'colegiado'
                          OR c.responsavel_id = auth.uid()
                          OR auth.uid() = ANY(c.compartilhado_com)
                          OR EXISTS (
                              SELECT 1 FROM public.caso_colaboradores cc
                              WHERE cc.caso_id = c.id AND cc.perfil_id = auth.uid()
                          )
                      )
                )
            )
        )
    );

CREATE POLICY "pendencias_crm_insert"
    ON public.pendencias_crm FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('agenda', 'criar')
    );

CREATE POLICY "pendencias_crm_update"
    ON public.pendencias_crm FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('agenda', 'editar')
        OR (
            public.has_permission('agenda', 'visualizar')
            AND (responsavel_id = auth.uid() OR concluido_por = auth.uid())
        )
    );

CREATE POLICY "pendencias_crm_delete"
    ON public.pendencias_crm FOR DELETE
    TO authenticated
    USING (
        public.has_permission('agenda', 'deletar')
        OR (
            public.has_permission('agenda', 'editar')
            AND responsavel_id = auth.uid()
        )
    );

-- 5.9. TABELA: public.documentos_casos
ALTER TABLE public.documentos_casos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de documentos do caso" ON public.documentos_casos;
DROP POLICY IF EXISTS "Insercao de documentos do caso" ON public.documentos_casos;
DROP POLICY IF EXISTS "Exclusao de documentos do caso" ON public.documentos_casos;
DROP POLICY IF EXISTS "Atualizacao de documentos do caso" ON public.documentos_casos;
DROP POLICY IF EXISTS "advogados_full_access_documentos_casos" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_select" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_insert" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_update" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_delete" ON public.documentos_casos;

CREATE POLICY "documentos_casos_select"
    ON public.documentos_casos FOR SELECT
    TO authenticated
    USING (
        public.has_permission('documentos', 'visualizar') AND (
            public.has_permission('documentos', 'deletar')
            OR EXISTS (
                SELECT 1 FROM public.casos c
                WHERE c.id = documentos_casos.caso_id
                  AND (
                      c.visibilidade = 'colegiado'
                      OR c.responsavel_id = auth.uid()
                      OR auth.uid() = ANY(c.compartilhado_com)
                      OR EXISTS (
                          SELECT 1 FROM public.caso_colaboradores cc
                          WHERE cc.caso_id = c.id AND cc.perfil_id = auth.uid()
                      )
                  )
            )
        )
    );

CREATE POLICY "documentos_casos_insert"
    ON public.documentos_casos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('documentos', 'criar')
    );

CREATE POLICY "documentos_casos_update"
    ON public.documentos_casos FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('documentos', 'editar')
    );

CREATE POLICY "documentos_casos_delete"
    ON public.documentos_casos FOR DELETE
    TO authenticated
    USING (
        public.has_permission('documentos', 'deletar')
        OR (
            public.has_permission('documentos', 'editar')
            AND criado_por = auth.uid()
        )
    );

-- 5.10. TABELA: public.templates_minutas
ALTER TABLE public.templates_minutas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de templates minutas" ON public.templates_minutas;
DROP POLICY IF EXISTS "Gerenciamento de templates minutas" ON public.templates_minutas;
DROP POLICY IF EXISTS "templates_minutas_select" ON public.templates_minutas;
DROP POLICY IF EXISTS "templates_minutas_insert" ON public.templates_minutas;
DROP POLICY IF EXISTS "templates_minutas_update" ON public.templates_minutas;
DROP POLICY IF EXISTS "templates_minutas_delete" ON public.templates_minutas;

CREATE POLICY "templates_minutas_select"
    ON public.templates_minutas FOR SELECT
    TO authenticated
    USING (
        public.has_permission('documentos', 'visualizar')
    );

CREATE POLICY "templates_minutas_insert"
    ON public.templates_minutas FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('documentos', 'criar')
    );

CREATE POLICY "templates_minutas_update"
    ON public.templates_minutas FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('documentos', 'editar')
    );

CREATE POLICY "templates_minutas_delete"
    ON public.templates_minutas FOR DELETE
    TO authenticated
    USING (
        public.has_permission('documentos', 'deletar')
    );

-- 5.11. STORAGE BUCKET: templates-minutas
DROP POLICY IF EXISTS "Acesso de leitura ao bucket templates-minutas" ON storage.objects;
DROP POLICY IF EXISTS "Upload no bucket templates-minutas por advogados" ON storage.objects;
DROP POLICY IF EXISTS "Upload no bucket templates-minutas com permissao" ON storage.objects;
DROP POLICY IF EXISTS "templates_minutas_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "templates_minutas_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "templates_minutas_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "templates_minutas_storage_delete" ON storage.objects;

CREATE POLICY "templates_minutas_storage_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'templates-minutas'
        AND public.has_permission('documentos', 'visualizar')
    );

CREATE POLICY "templates_minutas_storage_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'templates-minutas'
        AND public.has_permission('documentos', 'criar')
    );

CREATE POLICY "templates_minutas_storage_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'templates-minutas'
        AND public.has_permission('documentos', 'editar')
    );

CREATE POLICY "templates_minutas_storage_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'templates-minutas'
        AND public.has_permission('documentos', 'deletar')
    );

-- 5.12. TABELA: public.documentos_clientes
ALTER TABLE public.documentos_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advogados e membros podem ver documentos dos clientes" ON public.documentos_clientes;
DROP POLICY IF EXISTS "Advogados e membros podem inserir documentos dos clientes" ON public.documentos_clientes;
DROP POLICY IF EXISTS "Advogados e membros podem atualizar documentos dos clientes" ON public.documentos_clientes;
DROP POLICY IF EXISTS "Advogados e membros podem excluir documentos dos clientes" ON public.documentos_clientes;
DROP POLICY IF EXISTS "documentos_clientes_select" ON public.documentos_clientes;
DROP POLICY IF EXISTS "documentos_clientes_insert" ON public.documentos_clientes;
DROP POLICY IF EXISTS "documentos_clientes_update" ON public.documentos_clientes;
DROP POLICY IF EXISTS "documentos_clientes_delete" ON public.documentos_clientes;

CREATE POLICY "documentos_clientes_select"
    ON public.documentos_clientes FOR SELECT
    TO authenticated
    USING (
        public.has_permission('documentos', 'visualizar')
    );

CREATE POLICY "documentos_clientes_insert"
    ON public.documentos_clientes FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('documentos', 'criar')
    );

CREATE POLICY "documentos_clientes_update"
    ON public.documentos_clientes FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('documentos', 'editar')
    );

CREATE POLICY "documentos_clientes_delete"
    ON public.documentos_clientes FOR DELETE
    TO authenticated
    USING (
        public.has_permission('documentos', 'deletar') OR (
            public.has_permission('documentos', 'editar') AND criado_por = auth.uid()
        )
    );

-- 5.13. STORAGE BUCKET: documentos-clientes
DROP POLICY IF EXISTS "Permitir visualizacao autenticada de documentos-clientes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload autenticado em documentos-clientes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update autenticado em documentos-clientes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delecao autenticada em documentos-clientes" ON storage.objects;
DROP POLICY IF EXISTS "documentos_clientes_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documentos_clientes_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documentos_clientes_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "documentos_clientes_storage_delete" ON storage.objects;

CREATE POLICY "documentos_clientes_storage_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documentos-clientes'
        AND public.has_permission('documentos', 'visualizar')
    );

CREATE POLICY "documentos_clientes_storage_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documentos-clientes'
        AND public.has_permission('documentos', 'criar')
    );

CREATE POLICY "documentos_clientes_storage_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'documentos-clientes'
        AND public.has_permission('documentos', 'editar')
    );

CREATE POLICY "documentos_clientes_storage_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documentos-clientes'
        AND public.has_permission('documentos', 'deletar')
    );

-- 5.14. TABELA: public.perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis visíveis para usuários autenticados" ON public.perfis;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_delete_policy" ON public.perfis;

CREATE POLICY "perfis_select_policy"
    ON public.perfis FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "perfis_insert_policy"
    ON public.perfis FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        OR public.has_permission('usuarios', 'criar')
    );

CREATE POLICY "perfis_update_policy"
    ON public.perfis FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
        OR public.has_permission('usuarios', 'editar')
    );

CREATE POLICY "perfis_delete_policy"
    ON public.perfis FOR DELETE
    TO authenticated
    USING (
        public.has_permission('usuarios', 'deletar')
    );

-- 5.15. TABELAS: public.roles e public.permissions
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roles visíveis para usuários autenticados" ON public.roles;
DROP POLICY IF EXISTS "roles_manage_policy" ON public.roles;
DROP POLICY IF EXISTS "roles_insert_policy" ON public.roles;
DROP POLICY IF EXISTS "roles_update_policy" ON public.roles;
DROP POLICY IF EXISTS "roles_delete_policy" ON public.roles;

CREATE POLICY "Roles visíveis para usuários autenticados"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "roles_insert_policy"
    ON public.roles FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('perfis_acesso', 'criar')
    );

CREATE POLICY "roles_update_policy"
    ON public.roles FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('perfis_acesso', 'editar')
    );

CREATE POLICY "roles_delete_policy"
    ON public.roles FOR DELETE
    TO authenticated
    USING (
        is_default = false AND public.has_permission('perfis_acesso', 'deletar')
    );

DROP POLICY IF EXISTS "Permissions visíveis para usuários autenticados" ON public.permissions;
DROP POLICY IF EXISTS "permissions_manage_policy" ON public.permissions;
DROP POLICY IF EXISTS "permissions_insert_policy" ON public.permissions;
DROP POLICY IF EXISTS "permissions_update_policy" ON public.permissions;
DROP POLICY IF EXISTS "permissions_delete_policy" ON public.permissions;

CREATE POLICY "Permissions visíveis para usuários autenticados"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

-- Permite insert/delete para criar novos papéis OU editar matriz de permissões de papéis existentes
CREATE POLICY "permissions_insert_policy"
    ON public.permissions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_permission('perfis_acesso', 'criar')
        OR public.has_permission('perfis_acesso', 'editar')
    );

CREATE POLICY "permissions_update_policy"
    ON public.permissions FOR UPDATE
    TO authenticated
    USING (
        public.has_permission('perfis_acesso', 'editar')
    );

CREATE POLICY "permissions_delete_policy"
    ON public.permissions FOR DELETE
    TO authenticated
    USING (
        public.has_permission('perfis_acesso', 'deletar')
        OR public.has_permission('perfis_acesso', 'editar')
    );

-- ------------------------------------------------------------------------------
-- 6. Remoção Segura de Políticas Dependentes e da Coluna Antiga 'papel'
-- ------------------------------------------------------------------------------
-- Remove explicitamente políticas legadas conhecidas que possam referenciar 'perfis.papel'
DROP POLICY IF EXISTS "advogados_full_access_documentos_casos" ON public.documentos_casos;

-- Remoção com CASCADE da coluna 'papel' da tabela 'perfis'.
-- No PostgreSQL, o modificador CASCADE remove automaticamente quaisquer políticas RLS,
-- views ou restrições dependentes desta coluna de forma segura e atômica.
ALTER TABLE public.perfis DROP COLUMN IF EXISTS papel CASCADE;

-- ------------------------------------------------------------------------------
-- 7. Remoção do Tipo Enum Antigo 'public.papel_usuario'
-- ------------------------------------------------------------------------------
DROP TYPE IF EXISTS public.papel_usuario CASCADE;

-- ==============================================================================
-- FIM DA MIGRATION: 20260909000017_rbac_contract_migrate.sql
-- ==============================================================================
