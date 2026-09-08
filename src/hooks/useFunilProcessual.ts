import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Caso, TipoDemanda } from '@/domain/crm/caso';
import { EtapaFunil, FaseFunil } from '@/domain/crm/etapa-funil';
import { toast } from 'sonner';

export interface FiltrosFunil {
  responsavelId: string;
  tipoDemanda: TipoDemanda | '';
  busca: string;
  dataInicio: string;
  dataFim: string;
}

const FILTROS_VAZIOS: FiltrosFunil = {
  responsavelId: '',
  tipoDemanda: '',
  busca: '',
  dataInicio: '',
  dataFim: '',
};

export function useFunilProcessual() {
  const { user } = useAuth();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [etapas, setEtapas] = useState<EtapaFunil[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosFunil>(FILTROS_VAZIOS);

  const fetchEtapas = useCallback(async () => {
    const { data, error } = await supabase
      .from('etapas_funil')
      .select('*')
      .order('fase')
      .order('ordem');
    if (!error && data) {
      setEtapas(data as EtapaFunil[]);
    }
  }, []);

  const fetchCasos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('casos')
      .select(`
        *,
        cliente:clientes(nome_razao_social),
        responsavel:perfis(nome)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar casos:', error);
      toast.error('Erro ao carregar funil: ' + error.message);
    }

    if (!error && data) {
      const formatados = data.map((c: any) => ({
        ...c,
        cliente_nome: c.cliente?.nome_razao_social || 'Cliente não identificado',
        responsavel_nome: c.responsavel?.nome || 'Advogado do Escritório',
        etapa_nome: etapas.find((e) => e.id === c.etapa_id)?.nome ?? null,
      }));
      setCasos(formatados as Caso[]);
    }
    setLoading(false);
  }, [etapas]);

  useEffect(() => {
    fetchEtapas();
    fetchCasos();
  }, [fetchEtapas, fetchCasos]);

  const moverCasoParaEtapa = useCallback(
    async (casoId: string, novaEtapaId: string) => {
      const etapa = etapas.find((e) => e.id === novaEtapaId);
      if (!etapa) return;

      const { error } = await supabase
        .from('casos')
        .update({ etapa_id: novaEtapaId, updated_at: new Date().toISOString() })
        .eq('id', casoId);

      if (error) {
        toast.error('Erro ao mover processo: ' + error.message);
        return;
      }

      // Registra evento de movimentação
      await supabase.from('eventos_caso').insert({
        caso_id: casoId,
        tipo: 'movimentacao',
        descricao: `Processo movido para etapa "${etapa.nome}"`,
        criado_por: user?.id,
      });

      setCasos((prev) =>
        prev.map((c) =>
          c.id === casoId
            ? { ...c, etapa_id: novaEtapaId, etapa_nome: etapa.nome }
            : c
        )
      );
    },
    [etapas, user?.id]
  );

  const moverCasoParaFase = useCallback(
    async (casoId: string, novaFase: FaseFunil) => {
      const primeiraEtapaDaFase = etapas
        .filter((e) => e.fase === novaFase)
        .sort((a, b) => a.ordem - b.ordem)[0];

      const novaEtapaId = primeiraEtapaDaFase?.id ?? null;

      const { error } = await supabase
        .from('casos')
        .update({
          fase_funil: novaFase,
          etapa_id: novaEtapaId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', casoId);

      if (error) {
        toast.error('Erro ao avançar fase: ' + error.message);
        return;
      }

      await supabase.from('eventos_caso').insert({
        caso_id: casoId,
        tipo: 'movimentacao',
        descricao: `Processo avançado para fase "${novaFase}"`,
        criado_por: user?.id,
      });

      setCasos((prev) =>
        prev.map((c) =>
          c.id === casoId
            ? {
                ...c,
                fase_funil: novaFase,
                etapa_id: novaEtapaId,
                etapa_nome: primeiraEtapaDaFase?.nome ?? null,
              }
            : c
        )
      );

      toast.success('Processo avançado com sucesso!');
    },
    [etapas, user?.id]
  );

  const casosFiltrados = casos.filter((c) => {
    if (filtros.responsavelId && c.responsavel_id !== filtros.responsavelId) return false;
    if (filtros.tipoDemanda && c.tipo_demanda !== filtros.tipoDemanda) return false;
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      const bate =
        c.titulo.toLowerCase().includes(termo) ||
        (c.cliente_nome?.toLowerCase().includes(termo) ?? false) ||
        (c.numero_processo?.toLowerCase().includes(termo) ?? false);
      if (!bate) return false;
    }
    if (filtros.dataInicio && c.created_at && c.created_at < filtros.dataInicio) return false;
    if (filtros.dataFim && c.created_at && c.created_at > filtros.dataFim + 'T23:59:59') return false;
    return true;
  });

  const etapasPorFase = (fase: FaseFunil) =>
    etapas.filter((e) => e.fase === fase).sort((a, b) => a.ordem - b.ordem);

  const casosPorEtapa = (etapaId: string) =>
    casosFiltrados.filter((c) => c.etapa_id === etapaId);

  const casosSemEtapaNaFase = (fase: FaseFunil) =>
    casosFiltrados.filter((c) => c.fase_funil === fase && !c.etapa_id);

  return {
    casos: casosFiltrados,
    etapas,
    loading,
    filtros,
    setFiltros,
    limparFiltros: () => setFiltros(FILTROS_VAZIOS),
    moverCasoParaEtapa,
    moverCasoParaFase,
    etapasPorFase,
    casosPorEtapa,
    casosSemEtapaNaFase,
    recarregar: fetchCasos,
    recarregarEtapas: fetchEtapas,
  };
}
