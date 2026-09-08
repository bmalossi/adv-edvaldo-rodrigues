-- Adiciona política de DELETE para a tabela casos no RLS
DROP POLICY IF EXISTS "Equipe autenticada pode excluir casos autorizados" ON public.casos;

CREATE POLICY "Equipe autenticada pode excluir casos autorizados"
    ON public.casos FOR DELETE
    TO authenticated
    USING (
        visibilidade = 'colegiado'
        OR responsavel_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid() AND (papel::text = 'advogado' OR papel::text = 'admin')
        )
    );
