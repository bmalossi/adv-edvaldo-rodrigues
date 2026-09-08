import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Referência para etapas para evitar loops em callbacks
  const etapasRef = useRef<EtapaFunil[]>([]);
  etapasRef.current = etapas;

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [resEtapas, resCasos] = await Promise.all([
        supabase.from('etapas_funil').select('*').order('fase').order('ordem'),
        supabase
          .from('casos')
          .select(`
            *,
            cliente:clientes(nome_razao_social),
            responsavel:perfis(nome)
          `)
          .order('created_at', { ascending: false })
      ]);

      const listaEtapas = (resEtapas.data as EtapaFunil[]) || [];
      if (!resEtapas.error && resEtapas.data) {
        setEtapas(listaEtapas);
        etapasRef.current = listaEtapas;
      }

      if (resCasos.error) {
        console.error('Erro ao carregar casos:', resCasos.error);
        toast.error('Erro ao carregar funil: ' + resCasos.error.message);
      } else if (resCasos.data) {
        const formatados = resCasos.data.map((c: any) => ({
          ...c,
          cliente_nome: c.cliente?.nome_razao_social || 'Cliente não identificado',
          responsavel_nome: c.responsavel?.nome || 'Advogado do Escritório',
          etapa_nome: listaEtapas.find((e) => e.id === c.etapa_id)?.nome ?? null,
        }));
        setCasos(formatados as Caso[]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do funil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const moverCasoParaEtapa = useCallback(
    async (casoId: string, novaEtapaId: string) => {
      const etapa = etapasRef.current.find((e) => e.id === novaEtapaId);
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
    [user?.id]
  );

  const moverCasoParaFase = useCallback(
    async (casoId: string, novaFase: FaseFunil) => {
      const primeiraEtapaDaFase = etapasRef.current
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
    [user?.id]
  );

  const casosFiltradosRaw = casos.filter((c) => {
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

  // Deduplica por ID para evitar contagem duplicada de registros repetidos
  const seenIds = new Set<string>();
  const casosFiltrados = casosFiltradosRaw.filter((c) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  const etapasPorFase = (fase: FaseFunil) =>
    etapas.filter((e) => e.fase === fase).sort((a, b) => a.ordem - b.ordem);

  const casosPorEtapa = (etapaId: string) =>
    casosFiltrados.filter((c) => c.etapa_id === etapaId);

  const casosSemEtapaNaFase = (fase: FaseFunil) => {
    const etapasDaFaseIds = new Set(
      etapas.filter((e) => e.fase === fase).map((e) => e.id)
    );
    return casosFiltrados.filter(
      (c) => c.fase_funil === fase && (!c.etapa_id || !etapasDaFaseIds.has(c.etapa_id))
    );
  };

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
    recarregar: carregarDados,
    recarregarEtapas: carregarDados,
  };
}
