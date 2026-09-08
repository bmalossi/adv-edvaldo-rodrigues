import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Trash2,
  X,
  Clock,
  Folder,
  FileText,
  Save,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Caso, ResultadoCaso, RESULTADO_LABELS } from '@/domain/crm/caso';
import { FASES_FUNIL_CONFIG, FaseFunil, EtapaFunil } from '@/domain/crm/etapa-funil';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Perfil {
  id: string;
  nome: string;
}

interface DrawerCasoProps {
  caso: Caso | null;
  onFechar: () => void;
  onAvancarFase?: (caso: Caso) => void;
  onAtualizado?: () => void;
}

export function DrawerCaso({ caso, onFechar, onAtualizado }: DrawerCasoProps) {
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [etapas, setEtapas] = useState<EtapaFunil[]>([]);

  // Estados locais do formulário
  const [titulo, setTitulo] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [numeroProtocolo, setNumeroProtocolo] = useState('');
  const [processoOriginario, setProcessoOriginario] = useState('');
  const [identificacaoPasta, setIdentificacaoPasta] = useState('');
  const [dataRequerimento, setDataRequerimento] = useState('');
  const [valorCausa, setValorCausa] = useState<string>('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [dataTransitoJulgado, setDataTransitoJulgado] = useState('');
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoCaso | ''>('');
  const [responsavelId, setResponsavelId] = useState('');
  const [faseFunil, setFaseFunil] = useState<FaseFunil>('negociacao');
  const [etapaId, setEtapaId] = useState('');

  // Carregar perfis e etapas globais
  useEffect(() => {
    supabase.from('perfis').select('id, nome').then(({ data }) => {
      if (data) setPerfis(data as Perfil[]);
    });

    supabase.from('etapas_funil').select('*').order('ordem').then(({ data }) => {
      if (data) setEtapas(data as EtapaFunil[]);
    });
  }, []);

  // Preencher dados ao abrir caso
  useEffect(() => {
    if (!caso) return;
    setTitulo(caso.titulo || '');
    setNumeroProcesso(caso.numero_processo || '');
    setNumeroProtocolo(caso.numero_protocolo || '');
    setProcessoOriginario(caso.processo_originario || '');
    setIdentificacaoPasta(caso.identificacao_pasta || '');
    setDataRequerimento(caso.data_requerimento ? caso.data_requerimento.substring(0, 10) : '');
    setValorCausa(caso.valor_causa != null ? String(caso.valor_causa) : '');
    setDataFechamento(caso.data_fechamento ? caso.data_fechamento.substring(0, 10) : '');
    setDataTransitoJulgado(caso.data_transito_julgado ? caso.data_transito_julgado.substring(0, 10) : '');
    setResultadoFinal(caso.resultado_final || '');
    setResponsavelId(caso.responsavel_id || '');
    setFaseFunil(caso.fase_funil || 'negociacao');
    setEtapaId(caso.etapa_id || '');
  }, [caso]);

  if (!caso) return null;

  const etapasDaFaseSelecionada = etapas
    .filter((e) => e.fase === faseFunil)
    .sort((a, b) => a.ordem - b.ordem);

  const faseConfig = FASES_FUNIL_CONFIG.find((f) => f.id === faseFunil);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caso) return;

    if (!titulo.trim()) {
      toast.error('O tipo de ação / título é obrigatório.');
      return;
    }

    setSalvando(true);
    try {
      const etapaEscolhida = etapas.find((e) => e.id === etapaId);

      const dadosAtualizados: Partial<Caso> = {
        titulo: titulo.trim(),
        numero_processo: numeroProcesso.trim() || null,
        numero_protocolo: numeroProtocolo.trim() || null,
        processo_originario: processoOriginario.trim() || null,
        identificacao_pasta: identificacaoPasta.trim() || null,
        data_requerimento: dataRequerimento ? new Date(dataRequerimento + 'T12:00:00Z').toISOString() : null,
        valor_causa: valorCausa ? parseFloat(valorCausa) : null,
        data_fechamento: dataFechamento ? new Date(dataFechamento + 'T12:00:00Z').toISOString() : null,
        data_transito_julgado: dataTransitoJulgado ? new Date(dataTransitoJulgado + 'T12:00:00Z').toISOString() : null,
        resultado_final: resultadoFinal || null,
        responsavel_id: responsavelId || caso.responsavel_id,
        fase_funil: faseFunil,
        etapa_id: etapaId || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('casos')
        .update(dadosAtualizados)
        .eq('id', caso.id);

      if (error) throw error;

      // Registrar histórico de movimentação se mudou de fase ou etapa
      if (faseFunil !== caso.fase_funil || etapaId !== caso.etapa_id) {
        await supabase.from('eventos_caso').insert({
          caso_id: caso.id,
          tipo: 'movimentacao',
          descricao: `Processo atualizado para a fase "${faseConfig?.label}" ${
            etapaEscolhida ? `na etapa "${etapaEscolhida.nome}"` : ''
          }`,
        });
      }

      toast.success('Dados do processo atualizados com sucesso!');
      if (onAtualizado) onAtualizado();
      onFechar();
    } catch (err: any) {
      toast.error('Erro ao atualizar processo: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!caso) return;
    const confirmou = window.confirm(
      `Deseja realmente excluir o processo "${caso.titulo}"? Esta ação removerá o processo do funil.`
    );
    if (!confirmou) return;

    setExcluindo(true);
    try {
      const { data, error } = await supabase
        .from('casos')
        .delete()
        .eq('id', caso.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('O banco de dados não permitiu a exclusão. Aplique a migration de política DELETE no Supabase.');
        return;
      }

      toast.success('Processo removido do funil com sucesso.');
      if (onAtualizado) onAtualizado();
      onFechar();
    } catch (err: any) {
      toast.error('Erro ao excluir processo: ' + err.message);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <>
      {/* Overlay com backdrop escuro */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onFechar}
      />

      {/* Painel lateral deslizante ADVBOX */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0d1527] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Barra superior de ícones */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#090e1a]">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-secondary font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-4 h-4" />
              ADVBOX Flow
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-300 hover:text-white gap-1"
              title="Abrir página completa do caso"
            >
              <Link to={`/admin/crm/casos/${caso.id}`}>
                <ExternalLink className="w-3.5 h-3.5" />
                Dossiê Completo
              </Link>
            </Button>

            <button
              onClick={onFechar}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Título de Fase em Destaque */}
        <div className="px-6 pt-4 pb-2 border-b border-white/5 flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-white tracking-widest uppercase">
            {faseConfig?.label || 'PROCESSO'}
          </span>
          {caso.cliente_nome && (
            <span className="text-xs text-slate-400 truncate max-w-[240px]">
              Cliente: <strong className="text-slate-200">{caso.cliente_nome}</strong>
            </span>
          )}
        </div>

        {/* Formulário com scroll vertical (estilo ADVBOX) */}
        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
          {/* Tipo de ação* */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Tipo de ação *
            </label>
            <Input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: NULIDADE DE LICITAÇÃO / AÇÃO TRABALHISTA"
              className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
            />
          </div>

          {/* Número do processo (CNJ) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Número do processo (CNJ)
            </label>
            <Input
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="9999999-99.9999.9.99.9999"
              className="h-9 text-xs font-mono bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
            />
          </div>

          {/* Número do protocolo/requerimento */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Número do protocolo/requerimento
            </label>
            <Input
              value={numeroProtocolo}
              onChange={(e) => setNumeroProtocolo(e.target.value)}
              placeholder="123456789-0"
              className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
            />
          </div>

          {/* Processo originário */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Processo originário
            </label>
            <Input
              value={processoOriginario}
              onChange={(e) => setProcessoOriginario(e.target.value)}
              placeholder="9999999-99.9999.9.99.9999"
              className="h-9 text-xs font-mono bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
            />
          </div>

          {/* Pasta/Caso */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Pasta / Identificação do Caso
            </label>
            <Input
              value={identificacaoPasta}
              onChange={(e) => setIdentificacaoPasta(e.target.value)}
              placeholder="Identificação da pasta interna"
              className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
            />
          </div>

          {/* Data do requerimento e Valor da causa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Data do requerimento
              </label>
              <input
                type="date"
                value={dataRequerimento}
                onChange={(e) => setDataRequerimento(e.target.value)}
                className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-slate-200 rounded-lg focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Valor da causa (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={valorCausa}
                onChange={(e) => setValorCausa(e.target.value)}
                placeholder="R$ 0,00"
                className="h-9 text-xs bg-[#15203b] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
              />
            </div>
          </div>

          {/* Datas adicionais: Fechamento, Trânsito em Julgado */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Data do fechamento
              </label>
              <input
                type="date"
                value={dataFechamento}
                onChange={(e) => setDataFechamento(e.target.value)}
                className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-slate-200 rounded-lg focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Trânsito em julgado
              </label>
              <input
                type="date"
                value={dataTransitoJulgado}
                onChange={(e) => setDataTransitoJulgado(e.target.value)}
                className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-slate-200 rounded-lg focus:border-secondary outline-none"
              />
            </div>
          </div>

          {/* Resultado do processo */}
          <div className="pt-2 border-t border-white/5">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Resultado do processo
            </label>
            <select
              value={resultadoFinal}
              onChange={(e) => setResultadoFinal(e.target.value as ResultadoCaso)}
              className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg focus:border-secondary outline-none"
            >
              <option value="">Selecione o resultado do processo</option>
              {Object.entries(RESULTADO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Seção Fase do Processo (ADVBOX) */}
          <div className="pt-4 border-t border-white/10 space-y-3 bg-white/[0.02] p-3 rounded-xl border">
            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
              Fase & Etapa do Processo
            </h4>

            {/* Responsável */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Responsável
              </label>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg focus:border-secondary outline-none"
              >
                <option value="">Selecione o responsável</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Fase */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Fase do Funil
              </label>
              <select
                value={faseFunil}
                onChange={(e) => {
                  const novaFase = e.target.value as FaseFunil;
                  setFaseFunil(novaFase);
                  // Seleciona a primeira etapa da nova fase automaticamente
                  const primeira = etapas
                    .filter((et) => et.fase === novaFase)
                    .sort((a, b) => a.ordem - b.ordem)[0];
                  setEtapaId(primeira?.id || '');
                }}
                className="w-full h-9 px-2 text-xs font-semibold bg-[#15203b] border border-white/10 text-secondary rounded-lg focus:border-secondary outline-none uppercase"
              >
                {FASES_FUNIL_CONFIG.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Etapa */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Etapa da Fase
              </label>
              <select
                value={etapaId}
                onChange={(e) => setEtapaId(e.target.value)}
                className="w-full h-9 px-2 text-xs bg-[#15203b] border border-white/10 text-white rounded-lg focus:border-secondary outline-none"
              >
                <option value="">Sem etapa definida</option>
                {etapasDaFaseSelecionada.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão de Envio e Exclusão no Rodapé */}
          <div className="pt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={excluindo}
              onClick={handleExcluir}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg h-9 w-9 shrink-0"
              title="Excluir processo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button
              type="submit"
              disabled={salvando}
              className="flex-1 h-9 bg-secondary hover:opacity-90 text-primary font-bold text-xs rounded-lg shadow-md transition-all gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {salvando ? 'Atualizando...' : 'Atualizar dados do processo'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
