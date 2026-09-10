-- ==============================================================================
-- MIGRATION: Escopo de Acesso Configurável por Perfil de Acesso (Role)
-- Arquivo: 20260909000020_roles_escopo_acesso.sql
-- ==============================================================================
-- Permite ao administrador configurar se um Perfil de Acesso tem:
-- 1. 'geral': Visualização e ações sobre registros de toda a equipe (toda a banca)
-- 2. 'individual': Visualização e ações restritas aos próprios registros ou compartilhados
-- ==============================================================================

-- 1. Adicionar coluna escopo na tabela roles
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'individual' 
CHECK (escopo IN ('individual', 'geral'));

-- 2. Configurar valores padrão para as roles de fábrica
UPDATE public.roles SET escopo = 'geral' WHERE nome IN ('Administrador', 'Sócio', 'Estagiário/Assistente');
UPDATE public.roles SET escopo = 'individual' WHERE nome = 'Advogado Associado';

-- 3. Função de segurança para verificar se o perfil do usuário possui escopo geral
CREATE OR REPLACE FUNCTION public.has_role_scope_geral()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
      AND (r.nome = 'Administrador' OR r.escopo = 'geral')
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role_scope_geral() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_scope_geral() TO anon;

-- ------------------------------------------------------------------------------
-- 4. TABELA: public.casos (Funil Processual)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "casos_select_policy" ON public.casos;
DROP POLICY IF EXISTS "casos_insert_policy" ON public.casos;
DROP POLICY IF EXISTS "casos_update_policy" ON public.casos;
DROP POLICY IF EXISTS "casos_delete_policy" ON public.casos;

CREATE POLICY "casos_select_policy"
    ON public.casos FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('casos', 'visualizar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR auth.uid() = ANY(compartilhado_com)
                OR EXISTS (
                    SELECT 1 FROM public.caso_colaboradores cc
                    WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "casos_insert_policy"
    ON public.casos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR public.has_permission('casos', 'criar')
    );

CREATE POLICY "casos_update_policy"
    ON public.casos FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('casos', 'editar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR auth.uid() = ANY(compartilhado_com)
                OR EXISTS (
                    SELECT 1 FROM public.caso_colaboradores cc
                    WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid() AND cc.permissao = 'editor'
                )
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.has_permission('casos', 'editar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR auth.uid() = ANY(compartilhado_com)
                OR EXISTS (
                    SELECT 1 FROM public.caso_colaboradores cc
                    WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid() AND cc.permissao = 'editor'
                )
            )
        )
    );

CREATE POLICY "casos_delete_policy"
    ON public.casos FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('casos', 'deletar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 5. TABELA: public.clientes
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

CREATE POLICY "clientes_select_policy"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            public.is_admin()
            OR (
                public.has_permission('clientes', 'visualizar') AND (
                    public.has_role_scope_geral()
                    OR responsavel_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.casos c
                        WHERE c.cliente_id = clientes.id
                          AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                    )
                )
            )
        )
    );

CREATE POLICY "clientes_insert_policy"
    ON public.clientes FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR public.has_permission('clientes', 'criar')
    );

CREATE POLICY "clientes_update_policy"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            public.is_admin()
            OR (
                public.has_permission('clientes', 'editar') AND (
                    public.has_role_scope_geral()
                    OR responsavel_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.casos c
                        WHERE c.cliente_id = clientes.id
                          AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                    )
                )
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.has_permission('clientes', 'editar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.cliente_id = clientes.id
                      AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                )
            )
        )
    );

CREATE POLICY "clientes_delete_policy"
    ON public.clientes FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('clientes', 'deletar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 6. TABELA: public.pendencias_crm (Agenda & Prazos)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "pendencias_crm_select" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_insert" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_update" ON public.pendencias_crm;
DROP POLICY IF EXISTS "pendencias_crm_delete" ON public.pendencias_crm;

CREATE POLICY "pendencias_crm_select"
    ON public.pendencias_crm FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('agenda', 'visualizar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR (
                    caso_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.casos c
                        WHERE c.id = pendencias_crm.caso_id
                          AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                    )
                )
            )
        )
    );

CREATE POLICY "pendencias_crm_insert"
    ON public.pendencias_crm FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR public.has_permission('agenda', 'criar')
    );

CREATE POLICY "pendencias_crm_update"
    ON public.pendencias_crm FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('agenda', 'editar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR concluido_por = auth.uid()
                OR (
                    caso_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.casos c
                        WHERE c.id = pendencias_crm.caso_id
                          AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                    )
                )
            )
        )
    );

CREATE POLICY "pendencias_crm_delete"
    ON public.pendencias_crm FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('agenda', 'deletar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 7. TABELA: public.eventos_caso (Linha do tempo)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "eventos_caso_select" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_insert" ON public.eventos_caso;

CREATE POLICY "eventos_caso_select"
    ON public.eventos_caso FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('casos', 'visualizar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = eventos_caso.caso_id
                      AND (
                          c.responsavel_id = auth.uid()
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

CREATE POLICY "eventos_caso_insert"
    ON public.eventos_caso FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            (public.has_permission('casos', 'criar') OR public.has_permission('casos', 'editar')) AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = eventos_caso.caso_id
                      AND (
                          c.responsavel_id = auth.uid()
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

-- ------------------------------------------------------------------------------
-- 8. TABELA: public.documentos_casos
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "documentos_casos_select" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_insert" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_update" ON public.documentos_casos;
DROP POLICY IF EXISTS "documentos_casos_delete" ON public.documentos_casos;

CREATE POLICY "documentos_casos_select"
    ON public.documentos_casos FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('documentos', 'visualizar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = documentos_casos.caso_id
                      AND (
                          c.responsavel_id = auth.uid()
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

CREATE POLICY "documentos_casos_insert"
    ON public.documentos_casos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.has_permission('documentos', 'criar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = documentos_casos.caso_id
                      AND (
                          c.responsavel_id = auth.uid()
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

CREATE POLICY "documentos_casos_update"
    ON public.documentos_casos FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('documentos', 'editar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = documentos_casos.caso_id
                      AND (
                          c.responsavel_id = auth.uid()
                          OR auth.uid() = ANY(c.compartilhado_com)
                      )
                )
            )
        )
    );

CREATE POLICY "documentos_casos_delete"
    ON public.documentos_casos FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('documentos', 'deletar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.id = documentos_casos.caso_id
                      AND c.responsavel_id = auth.uid()
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 9. TABELA: public.contratos_financeiros
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "contratos_financeiros_select" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_insert" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_update" ON public.contratos_financeiros;
DROP POLICY IF EXISTS "contratos_financeiros_delete" ON public.contratos_financeiros;

CREATE POLICY "contratos_financeiros_select"
    ON public.contratos_financeiros FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'visualizar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos ca
                    WHERE ca.id = contratos_financeiros.caso_id
                      AND (ca.responsavel_id = auth.uid() OR auth.uid() = ANY(ca.compartilhado_com))
                )
            )
        )
    );

CREATE POLICY "contratos_financeiros_insert"
    ON public.contratos_financeiros FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'criar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos ca
                    WHERE ca.id = contratos_financeiros.caso_id
                      AND (ca.responsavel_id = auth.uid() OR auth.uid() = ANY(ca.compartilhado_com))
                )
            )
        )
    );

CREATE POLICY "contratos_financeiros_update"
    ON public.contratos_financeiros FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'editar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos ca
                    WHERE ca.id = contratos_financeiros.caso_id
                      AND (ca.responsavel_id = auth.uid() OR auth.uid() = ANY(ca.compartilhado_com))
                )
            )
        )
    );

CREATE POLICY "contratos_financeiros_delete"
    ON public.contratos_financeiros FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'deletar') AND (
                public.has_role_scope_geral()
                OR EXISTS (
                    SELECT 1 FROM public.casos ca
                    WHERE ca.id = contratos_financeiros.caso_id
                      AND ca.responsavel_id = auth.uid()
                )
            )
        )
    );
