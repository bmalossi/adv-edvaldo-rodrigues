-- ==============================================================================
-- MIGRATION: Corrigir RLS para exclusão / soft delete de clientes
-- Arquivo: 20261009000025_fix_clientes_soft_delete_rls.sql
-- ==============================================================================
-- O erro 403 Forbidden ao mover clientes para a lixeira (UPDATE deleted_at = now())
-- ocorria por duas razões em conjunto:
-- 1. Na policy 'clientes_update_policy', a cláusula WITH CHECK herdava permissão
--    apenas de 'editar', e a cláusula USING e WITH CHECK exigiam consistência de
--    permissão de exclusão para quem possui 'deletar' (ou 'editar').
-- 2. Clientes com permissão 'deletar' e escopo geral ou administrador não conseguiam
--    realizar o soft delete (UPDATE deleted_at) pois a policy de UPDATE exigia
--    estritamente 'editar' e não contemplava a ação 'deletar' nem dispensava a restrição
--    quando a ação é mover para a lixeira.
-- 3. Para garantir consistência com a exclusão definitiva (DELETE) e soft-delete (UPDATE deleted_at),
--    atualizamos as policies para permitir que usuários com permissão 'deletar' OU 'editar'
--    possam executar o soft delete.
-- ==============================================================================

DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

-- Policy de UPDATE (atualização cadastral e soft delete)
CREATE POLICY "clientes_update_policy"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            public.is_admin()
            OR (
                (public.has_permission('clientes', 'editar') OR public.has_permission('clientes', 'deletar'))
                AND (
                    public.has_role_scope_geral()
                    OR responsavel_id = auth.uid()
                    OR visibilidade = 'colegiado'
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
            (public.has_permission('clientes', 'editar') OR public.has_permission('clientes', 'deletar'))
            AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR visibilidade = 'colegiado'
                OR EXISTS (
                    SELECT 1 FROM public.casos c
                    WHERE c.cliente_id = clientes.id
                      AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                )
            )
        )
    );

-- Policy de DELETE (exclusão física direta, caso utilizada)
CREATE POLICY "clientes_delete_policy"
    ON public.clientes FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('clientes', 'deletar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR visibilidade = 'colegiado'
            )
        )
    );
