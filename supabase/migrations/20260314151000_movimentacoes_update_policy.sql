-- ================================================================
-- ADD UPDATE POLICY FOR movimentacoes
-- ================================================================

CREATE POLICY "movimentacoes_update_own"
  ON public.movimentacoes FOR UPDATE
  USING (
    processo_id IN (
      SELECT p.id FROM public.processos p
      JOIN public.advogados a ON a.id = p.advogado_id
      WHERE a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    processo_id IN (
      SELECT p.id FROM public.processos p
      JOIN public.advogados a ON a.id = p.advogado_id
      WHERE a.user_id = auth.uid()
    )
  );
