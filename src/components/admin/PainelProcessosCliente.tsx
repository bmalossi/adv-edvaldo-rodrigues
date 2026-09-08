import { useEffect, useState, useCallback } from 'react';
import {
  Kanban,
  Plus,
  ArrowRight,
  Clock,
  DollarSign,
  Hash,
  ExternalLink,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Caso, TipoDemanda, AREAS_DIREITO_PADRAO } from '@/domain/crm/caso';
import { FASES_FUNIL_CONFIG, FaseFunil, EtapaFunil } from '@/domain/crm/etapa-funil';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DrawerCaso } from '@/components/crm/DrawerCaso';

interface PainelProcessosClienteProps {
  clienteId: string;
  clienteNome: string;
}

interface Perfil {
  id: string;
  nome: string;
}

export function PainelProcessosCliente({
  clienteId,
  clienteNome,
}: PainelProcessosClienteProps) {
  const { user } = useAuth();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [etapas, setEtapas] = useState<EtapaFunil[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para inclusão rápida no funil
  const [modalNovoProcessoAberto, setModalNovoProcessoAberto] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Drawer de edição
  const [casoParaEditar, setCasoParaEditar] = useState<Caso | null>(null);

  // Formulário de novo processo
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoNumeroProcesso, setNovoNumeroProcesso] = useState('');
  const [novoNumeroProtocolo, setNovoNumeroProtocolo] = useState('');
  const [novaArea, setNovaArea] = useState('Trabalhista');
  const [novoTipo, setNovoTipo] = useState<TipoDemanda>('judicial');
  const [novaFase, setNovaFase] = useState<FaseFunil>('negociacao');
  const [novaEtapaId, setNovaEtapaId] = useState('');
  const [novoValorCausa, setNovoValorCausa] = useState('');
  const [novaDataPrazo, setNovaDataPrazo] = useState('');
  const [novoResponsavelId, setNovoResponsavelId] = useState('');

  const fetchDados = useCallback(async () => {
    setLoading(true);

    // Carregar etapas globais e perfis primeiro
    const [{ data: dataEtapas }, { data: dataPerfis }, { data: dataCasos, error: errCasos }] = await Promise.all([
      supabase.from('etapas_funil').select('*').order('ordem'),
      supabase.from('perfis').select('id, nome'),
      supabase
        .from('casos')
        .select('*, responsavel:perfis(nome)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
    ]);

    const etapasCarregadas = (dataEtapas as EtapaFunil[]) || [];
    setEtapas(etapasCarregadas);

    if (dataPerfis) setPerfis(dataPerfis as Perfil[]);

    if (errCasos) {
      console.error('Erro ao carregar processos do cliente:', errCasos);
      toast.error('Erro ao buscar processos: ' + errCasos.message);
    }

    if (!errCasos && dataCasos) {
      const formatados = dataCasos.map((c: any) => ({
        ...c,
        cliente_nome: clienteNome,
        responsavel_nome: c.responsavel?.nome || 'Advogado do Escritório',
        etapa_nome: etapasCarregadas.find((e) => e.id === c.etapa_id)?.nome ?? null,
      }));
      setCasos(formatados as Caso[]);
    }

    setLoading(false);
  }, [clienteId, clienteNome]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // Ao mudar a fase no modal novo processo, selecionar primeira etapa da fase
  useEffect(() => {
    const etapasDaFase = etapas
      .filter((e) => e.fase === novaFase)
      .sort((a, b) => a.ordem - b.ordem);
    if (etapasDaFase.length > 0) {
      setNovaEtapaId(etapasDaFase[0].id);
    } else {
      setNovaEtapaId('');
    }
  }, [novaFase, etapas]);

  // Alteração direta de fase/etapa para um processo existente
  const handleMudarFaseEEtapa = async (
    casoId: string,
    fase: FaseFunil,
    etapaIdEscolhida: string
  ) => {
    const etapa = etapas.find((e) => e.id === etapaIdEscolhida);
    const faseConfig = FASES_FUNIL_CONFIG.find((f) => f.id === fase);

    const { error } = await supabase
      .from('casos')
      .update({
        fase_funil: fase,
        etapa_id: etapaIdEscolhida || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', casoId);

    if (error) {
      toast.error('Erro ao atualizar etapa: ' + error.message);
      return;
    }

    await supabase.from('eventos_caso').insert({
      caso_id: casoId,
      tipo: 'movimentacao',
      descricao: `Processo movido para fase "${faseConfig?.label}" ${
        etapa ? `na etapa "${etapa.nome}"` : ''
      }`,
      criado_por: user?.id,
    });

    toast.success('Etapa do processo atualizada com sucesso!');
    fetchDados();
  };

  const handleExcluirCaso = async (casoId: string, titulo: string) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir o processo "${titulo}"? Esta ação removerá o processo do funil.`
    );
    if (!confirmou) return;

    try {
      const { data, error } = await supabase
        .from('casos')
        .delete()
        .eq('id', casoId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('O banco de dados não permitiu a exclusão. Execute o SQL da política DELETE no Supabase.');
        return;
      }

      toast.success('Processo excluído com sucesso.');
      fetchDados();
    } catch (err: any) {
      toast.error('Erro ao excluir processo: ' + err.message);
    }
  };

  // Criar novo processo para este cliente
  const handleCriarProcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) {
      toast.error('Informe o título do processo / ação.');
      return;
    }

    setSalvandoNovo(true);
    try {
      const etapaEscolhida = etapas.find((e) => e.id === novaEtapaId);
      const respId = novoResponsavelId || user?.id;

      const { data, error } = await supabase
        .from('casos')
        .insert({
          cliente_id: clienteId,
          titulo: novoTitulo.trim(),
          area_direito: novaArea,
          tipo_demanda: novoTipo,
          status: 'em_andamento',
          visibilidade: 'colegiado',
          responsavel_id: respId,
          fase_funil: novaFase,
          etapa_id: novaEtapaId || null,
          numero_processo: novoNumeroProcesso.trim() || null,
          numero_protocolo: novoNumeroProtocolo.trim() || null,
          valor_causa: novoValorCausa ? parseFloat(novoValorCausa) : null,
          data_prazo: novaDataPrazo ? new Date(novaDataPrazo + 'T12:00:00Z').toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar evento inicial
      if (data?.id) {
        await supabase.from('eventos_caso').insert({
          caso_id: data.id,
          tipo: 'movimentacao',
          descricao: `Processo cadastrado no Funil na fase "${
            FASES_FUNIL_CONFIG.find((f) => f.id === novaFase)?.label
          }" ${etapaEscolhida ? `(Etapa: ${etapaEscolhida.nome})` : ''}`,
          criado_por: user?.id,
        });
      }

      toast.success('Processo incluído no Funil com sucesso!');
      setModalNovoProcessoAberto(false);
      // Resetar form
      setNovoTitulo('');
      setNovoNumeroProcesso('');
      setNovoNumeroProtocolo('');
      setNovoValorCausa('');
      setNovaDataPrazo('');
      fetchDados();
    } catch (err: any) {
      toast.error('Erro ao incluir processo: ' + err.message);
    } finally {
      setSalvandoNovo(false);
    }
  };

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Kanban className="w-5 h-5 text-secondary" />
            Funil Processual do Cliente
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Gerencie e inclua este cliente nas fases e etapas do fluxo da banca (ADVBOX).
          </p>
        </div>

        <Button
          onClick={() => setModalNovoProcessoAberto(true)}
          className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl text-xs gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Incluir no Funil / Novo Processo
        </Button>
      </div>

      {/* Lista de Processos do Cliente */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs italic animate-pulse">
          Carregando processos do cliente...
        </div>
      ) : casos.length === 0 ? (
        <div className="p-8 border border-dashed border-white/10 rounded-xl text-center space-y-3">
          <Briefcase className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-slate-400 text-xs">
            Este cliente ainda não possui processos registrados no Funil Processual.
          </div>
          <Button
            size="sm"
            onClick={() => setModalNovoProcessoAberto(true)}
            className="bg-secondary/20 hover:bg-secondary/30 text-secondary font-bold text-xs rounded-xl"
          >
            + Incluir Primeira Ação / Demanda
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {casos.map((caso) => {
            const faseConfig = FASES_FUNIL_CONFIG.find((f) => f.id === caso.fase_funil);
            const etapasDesteProcesso = etapas
              .filter((e) => e.fase === caso.fase_funil)
              .sort((a, b) => a.ordem - b.ordem);

            return (
              <div
                key={caso.id}
                className="bg-slate-900/50 border border-white/10 hover:border-secondary/40 rounded-xl p-4 space-y-3 transition-all"
              >
                {/* Título e Ações */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {caso.titulo}
                      </span>
                      {faseConfig && (
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                            faseConfig.corBadge,
                            faseConfig.corBorda
                          )}
                        >
                          {faseConfig.label}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono uppercase">
                        {caso.tipo_demanda}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {caso.numero_processo && (
                        <span className="font-mono flex items-center gap-1">
                          <Hash className="w-3 h-3 text-secondary" />
                          {caso.numero_processo}
                        </span>
                      )}
                      {caso.numero_protocolo && (
                        <span className="flex items-center gap-1">
                          Prot: {caso.numero_protocolo}
                        </span>
                      )}
                      <span>Área: <strong className="text-slate-300">{caso.area_direito}</strong></span>
                      {caso.valor_causa != null && (
                        <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                          <DollarSign className="w-3 h-3" />
                          {caso.valor_causa.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCasoParaEditar(caso)}
                      className="text-xs text-secondary hover:bg-secondary/10 gap-1 rounded-lg h-8"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Editar no Drawer
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExcluirCaso(caso.id, caso.titulo)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg h-8 w-8"
                      title="Excluir processo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Seletores Interativos de Fase e Etapa na Própria Ficha */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/[0.01] p-2.5 rounded-lg text-xs">
                  <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    Mover de Estágio:
                  </span>

                  {/* Seletor de Fase */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] text-slate-500 uppercase">Fase:</span>
                    <select
                      value={caso.fase_funil}
                      onChange={(e) => {
                        const novaFaseEscolhida = e.target.value as FaseFunil;
                        const primeira = etapas
                          .filter((et) => et.fase === novaFaseEscolhida)
                          .sort((a, b) => a.ordem - b.ordem)[0];
                        handleMudarFaseEEtapa(caso.id, novaFaseEscolhida, primeira?.id || '');
                      }}
                      className="h-8 px-2 text-xs bg-[#15203b] border border-white/10 text-secondary rounded-lg font-semibold outline-none uppercase"
                    >
                      {FASES_FUNIL_CONFIG.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Seletor de Etapa */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] text-slate-500 uppercase">Etapa:</span>
                    <select
                      value={caso.etapa_id || ''}
                      onChange={(e) =>
                        handleMudarFaseEEtapa(caso.id, caso.fase_funil, e.target.value)
                      }
                      className="h-8 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg outline-none max-w-[220px]"
                    >
                      <option value="">Sem etapa definida</option>
                      {etapasDesteProcesso.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {caso.etapa_nome && (
                    <span className="text-slate-400 text-[11px] ml-auto">
                      Etapa atual: <strong className="text-white">{caso.etapa_nome}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Incluir Cliente no Funil (Novo Processo) */}
      {modalNovoProcessoAberto && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalNovoProcessoAberto(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto text-slate-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Kanban className="w-5 h-5 text-secondary" />
                  <h3 className="font-bold text-white text-base">
                    Incluir no Funil Processual
                  </h3>
                </div>
                <button
                  onClick={() => setModalNovoProcessoAberto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Cliente: <strong className="text-white">{clienteNome}</strong>
              </p>

              <form onSubmit={handleCriarProcesso} className="space-y-4 text-xs">
                {/* Título */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Título / Tipo de ação *
                  </label>
                  <Input
                    required
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    placeholder="Ex: Ação de Cobrança, Elaboração de Parecer..."
                    className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 rounded-lg"
                  />
                </div>

                {/* Fase e Etapa do Funil (ADVBOX) */}
                <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/10">
                  <div>
                    <label className="block text-[11px] font-semibold text-secondary mb-1">
                      Fase do Funil *
                    </label>
                    <select
                      value={novaFase}
                      onChange={(e) => setNovaFase(e.target.value as FaseFunil)}
                      className="w-full h-9 px-2 text-xs font-semibold bg-[#15203b] border border-white/10 text-secondary rounded-lg outline-none uppercase"
                    >
                      {FASES_FUNIL_CONFIG.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-secondary mb-1">
                      Etapa Inicial *
                    </label>
                    <select
                      value={novaEtapaId}
                      onChange={(e) => setNovaEtapaId(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg outline-none"
                    >
                      {etapas
                        .filter((e) => e.fase === novaFase)
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.nome}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Área e Tipo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Área do Direito
                    </label>
                    <select
                      value={novaArea}
                      onChange={(e) => setNovaArea(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg outline-none"
                    >
                      {AREAS_DIREITO_PADRAO.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tipo de Demanda
                    </label>
                    <select
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value as TipoDemanda)}
                      className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg outline-none"
                    >
                      <option value="judicial">Judicial</option>
                      <option value="extrajudicial">Extrajudicial</option>
                      <option value="consultivo">Consultivo</option>
                    </select>
                  </div>
                </div>

                {/* Número do Processo e Protocolo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Número do processo (CNJ)
                    </label>
                    <Input
                      value={novoNumeroProcesso}
                      onChange={(e) => setNovoNumeroProcesso(e.target.value)}
                      placeholder="9999999-99.9999.9.99.9999"
                      className="h-9 text-xs font-mono bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Número do protocolo
                    </label>
                    <Input
                      value={novoNumeroProtocolo}
                      onChange={(e) => setNovoNumeroProtocolo(e.target.value)}
                      placeholder="Protocolo interno / cartório"
                      className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 rounded-lg"
                    />
                  </div>
                </div>

                {/* Valor da Causa e Prazo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Valor da causa (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novoValorCausa}
                      onChange={(e) => setNovoValorCausa(e.target.value)}
                      placeholder="R$ 0,00"
                      className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Prazo fatal / vencimento
                    </label>
                    <input
                      type="date"
                      value={novaDataPrazo}
                      onChange={(e) => setNovaDataPrazo(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* Responsável */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Advogado Responsável
                  </label>
                  <select
                    value={novoResponsavelId}
                    onChange={(e) => setNovoResponsavelId(e.target.value)}
                    className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg outline-none"
                  >
                    <option value="">Atribuir a mim</option>
                    {perfis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botões do Modal */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalNovoProcessoAberto(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={salvandoNovo}
                    className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl"
                  >
                    {salvandoNovo ? 'Salvando...' : 'Incluir Processo no Funil'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Drawer lateral de edição ADVBOX quando clica em Editar no Drawer */}
      {casoParaEditar && (
        <DrawerCaso
          caso={casoParaEditar}
          onFechar={() => setCasoParaEditar(null)}
          onAtualizado={fetchDados}
        />
      )}
    </div>
  );
}
