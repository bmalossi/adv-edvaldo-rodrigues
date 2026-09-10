-- ==============================================================================
-- MIGRATION: Individualização Estrita de Casos, Clientes e Agenda por Perfil
-- Arquivo: 20260909000019_individualizar_acesso_perfis.sql
-- ==============================================================================
-- Regras de Negócio:
-- 1. Somente o Administrador tem acesso geral irrestrito a todas as informações.
-- 2. Cada usuário/advogado acessa estritamente seus próprios casos, clientes e agenda.
-- 3. Acesso a casos de outros usuários somente quando explicitamente compartilhado
--    via 'compartilhado_com' (array de UUIDs) ou 'caso_colaboradores'.
-- 4. Clientes acessíveis somente pelo responsável direto ou vinculados a casos
--    compartilhados com o usuário.
-- 5. Agenda/Prazos acessíveis somente pelo responsável direto ou tarefas de casos
--    compartilhados com o usuário.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Função Auxiliar: public.is_admin()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.nome = 'Administrador'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ------------------------------------------------------------------------------
-- 2. TABELA: public.casos (Funil Processual)
-- ------------------------------------------------------------------------------
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
        public.is_admin()
        OR (
            public.has_permission('casos', 'visualizar') AND (
                responsavel_id = auth.uid()
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
                responsavel_id = auth.uid()
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
                responsavel_id = auth.uid()
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
            public.has_permission('casos', 'deletar') AND responsavel_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 3. TABELA: public.clientes
-- ------------------------------------------------------------------------------
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
        deleted_at IS NULL AND (
            public.is_admin()
            OR (
                public.has_permission('clientes', 'visualizar') AND (
                    responsavel_id = auth.uid()
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
                    responsavel_id = auth.uid()
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
                responsavel_id = auth.uid()
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
            public.has_permission('clientes', 'deletar') AND responsavel_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 4. TABELA: public.pendencias_crm (Agenda & Prazos)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pendencias_crm ENABLE ROW LEVEL SECURITY;

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
                responsavel_id = auth.uid()
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
                responsavel_id = auth.uid()
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
            public.has_permission('agenda', 'deletar') AND responsavel_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 5. TABELA: public.eventos_caso (Linha do tempo dos casos)
-- ------------------------------------------------------------------------------
ALTER TABLE public.eventos_caso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_caso_select" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_insert" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_update" ON public.eventos_caso;
DROP POLICY IF EXISTS "eventos_caso_delete" ON public.eventos_caso;

CREATE POLICY "eventos_caso_select"
    ON public.eventos_caso FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('casos', 'visualizar') AND
            EXISTS (
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
    );

CREATE POLICY "eventos_caso_insert"
    ON public.eventos_caso FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            (public.has_permission('casos', 'criar') OR public.has_permission('casos', 'editar')) AND
            EXISTS (
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
    );

CREATE POLICY "eventos_caso_update"
    ON public.eventos_caso FOR UPDATE
    TO authenticated
    USING (
        public.is_admin() OR criado_por = auth.uid()
    );

CREATE POLICY "eventos_caso_delete"
    ON public.eventos_caso FOR DELETE
    TO authenticated
    USING (
        public.is_admin() OR criado_por = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- 6. TABELA: public.documentos_casos
-- ------------------------------------------------------------------------------
ALTER TABLE public.documentos_casos ENABLE ROW LEVEL SECURITY;

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
            public.has_permission('documentos', 'visualizar') AND
            EXISTS (
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
    );

CREATE POLICY "documentos_casos_insert"
    ON public.documentos_casos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.has_permission('documentos', 'criar') AND
            EXISTS (
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
    );

CREATE POLICY "documentos_casos_update"
    ON public.documentos_casos FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('documentos', 'editar') AND
            EXISTS (
                SELECT 1 FROM public.casos c
                WHERE c.id = documentos_casos.caso_id
                  AND (
                      c.responsavel_id = auth.uid()
                      OR auth.uid() = ANY(c.compartilhado_com)
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
            public.has_permission('documentos', 'deletar') AND
            EXISTS (
                SELECT 1 FROM public.casos c
                WHERE c.id = documentos_casos.caso_id
                  AND c.responsavel_id = auth.uid()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 7. TABELA: public.contratos_financeiros
-- ------------------------------------------------------------------------------
ALTER TABLE public.contratos_financeiros ENABLE ROW LEVEL SECURITY;

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
            public.has_permission('financeiro', 'visualizar') AND
            EXISTS (
                SELECT 1 FROM public.casos ca
                WHERE ca.id = contratos_financeiros.caso_id
                  AND (ca.responsavel_id = auth.uid() OR auth.uid() = ANY(ca.compartilhado_com))
            )
        )
    );

CREATE POLICY "contratos_financeiros_insert"
    ON public.contratos_financeiros FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'criar') AND
            EXISTS (
                SELECT 1 FROM public.casos ca
                WHERE ca.id = contratos_financeiros.caso_id
                  AND (ca.responsavel_id = auth.uid() OR auth.uid() = ANY(ca.compartilhado_com))
            )
        )
    );

CREATE POLICY "contratos_financeiros_update"
    ON public.contratos_financeiros FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'editar') AND
            EXISTS (
                SELECT 1 FROM public.casos ca
                WHERE ca.id = contratos_financeiros.caso_id
                  AND (ca.responsavel_id = auth.uid() OR auth.uid() = ANY(ca.compartilhado_com))
            )
        )
    );

CREATE POLICY "contratos_financeiros_delete"
    ON public.contratos_financeiros FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('financeiro', 'deletar') AND
            EXISTS (
                SELECT 1 FROM public.casos ca
                WHERE ca.id = contratos_financeiros.caso_id
                  AND ca.responsavel_id = auth.uid()
            )
        )
    );
