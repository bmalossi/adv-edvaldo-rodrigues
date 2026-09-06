import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertOctagon,
  AlertTriangle,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  supabase,
  PendenciaCRM,
  StatusPendencia,
  obterDiasDoMes,
  obterDiasDaSemana,
  formatarDataChave,
  agruparPendenciasPorData,
  classificarStatusEvento,
  DiaCalendario,
} from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ModalNovaTarefaAgenda } from '@/components/admin/ModalNovaTarefaAgenda';
import { cn } from '@/lib/utils';

type ModoVisao = 'mes' | 'dia' | 'semana' | 'lista';
type TipoDataFiltro = 'compromisso' | 'prazo_fatal';

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface PendenciaComRelacoes extends PendenciaCRM {
  responsavel_nome?: string;
  caso_titulo?: string;
  cliente_nome?: string;
}

export default function Agenda() {
  const { user } = useAuth();

  // Estados de navegação temporal
  const [dataReferencia, setDataReferencia] = useState<Date>(new Date());
  const [modoVisao, setModoVisao] = useState<ModoVisao>('mes');
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(new Date());

  // Dados e filtros
  const [pendencias, setPendencias] = useState<PendenciaComRelacoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  const [responsavelAtivoId, setResponsavelAtivoId] = useState<string>('');
  const [tipoDataFiltro, setTipoDataFiltro] = useState<TipoDataFiltro>('compromisso');
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendentes' | 'concluidas' | 'atrasadas'>('todos');

  // Modal de Criação / Edição Rápida (estilo Advbox)
  const [modalNovaTarefaAberto, setModalNovaTarefaAberto] = useState(false);
  const [dataPreSelecionada, setDataPreSelecionada] = useState<string>('');
  const [tarefaSelecionadaParaEdicao, setTarefaSelecionadaParaEdicao] = useState<PendenciaCRM | null>(null);

  const abrirNovaTarefa = (dataChave?: string) => {
    setTarefaSelecionadaParaEdicao(null);
    setDataPreSelecionada(dataChave || '');
    setModalNovaTarefaAberto(true);
  };

  const abrirDetalheTarefa = (tarefa: PendenciaCRM) => {
    setTarefaSelecionadaParaEdicao(tarefa);
    setDataPreSelecionada('');
    setModalNovaTarefaAberto(true);
  };

  const anoAtual = dataReferencia.getFullYear();
  const mesAtual = dataReferencia.getMonth();

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: perfisData } = await supabase
        .from('perfis')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (perfisData) {
        setColaboradores(perfisData);
        if (!responsavelAtivoId && user) {
          setResponsavelAtivoId(user.id);
        }
      }

      let query = supabase
        .from('pendencias_crm')
        .select(`
          *,
          responsavel:perfis!responsavel_id (nome),
          caso:casos (titulo),
          cliente:clientes (nome_razao_social)
        `)
        .order('data_vencimento', { ascending: true, nullsFirst: false });

      if (responsavelAtivoId) {
        query = query.eq('responsavel_id', responsavelAtivoId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const formatados: PendenciaComRelacoes[] = data.map((item: any) => ({
          ...item,
          responsavel_nome: item.responsavel?.nome || 'Não atribuído',
          caso_titulo: item.caso?.titulo,
          cliente_nome: item.cliente?.nome_razao_social,
        }));
        setPendencias(formatados);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [responsavelAtivoId]);

  // Navegação do período (< e >)
  const retrocederPeriodo = () => {
    if (modoVisao === 'mes') {
      setDataReferencia(new Date(anoAtual, mesAtual - 1, 1));
    } else if (modoVisao === 'semana') {
      const nova = new Date(dataReferencia);
      nova.setDate(nova.getDate() - 7);
      setDataReferencia(nova);
    } else if (modoVisao === 'dia') {
      const nova = new Date(diaSelecionado);
      nova.setDate(nova.getDate() - 1);
      setDiaSelecionado(nova);
      setDataReferencia(nova);
    }
  };

  const avancarPeriodo = () => {
    if (modoVisao === 'mes') {
      setDataReferencia(new Date(anoAtual, mesAtual + 1, 1));
    } else if (modoVisao === 'semana') {
      const nova = new Date(dataReferencia);
      nova.setDate(nova.getDate() + 7);
      setDataReferencia(nova);
    } else if (modoVisao === 'dia') {
      const nova = new Date(diaSelecionado);
      nova.setDate(nova.getDate() + 1);
      setDiaSelecionado(nova);
      setDataReferencia(nova);
    }
  };

  const irParaHoje = () => {
    const hoje = new Date();
    setDataReferencia(hoje);
    setDiaSelecionado(hoje);
  };

  // Filtragem de pendências aplicadas
  const pendenciasFiltradas = pendencias.filter((p) => {
    // Busca textual
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const match =
        p.titulo.toLowerCase().includes(termo) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
        (p.caso_titulo && p.caso_titulo.toLowerCase().includes(termo)) ||
        (p.cliente_nome && p.cliente_nome.toLowerCase().includes(termo));
      if (!match) return false;
    }

    // Tipo de Data (Compromisso vs Prazo Fatal)
    if (tipoDataFiltro === 'prazo_fatal' && p.tipo !== 'prazo_fatal') {
      return false;
    }

    // Mostrar concluídos
    if (!mostrarConcluidos && p.status === 'concluido') {
      return false;
    }

    // Status visual
    const statusVisual = classificarStatusEvento(p);
    if (statusFiltro === 'pendentes' && statusVisual !== 'pendente') return false;
    if (statusFiltro === 'concluidas' && statusVisual !== 'concluido') return false;
    if (statusFiltro === 'atrasadas' && statusVisual !== 'atrasado') return false;

    return true;
  });

  const mapaPendenciasPorData = agruparPendenciasPorData(pendenciasFiltradas);

  // Abrir modal clicando em um dia específico
  const handleClicarDia = (dataChave: string) => {
    setDataPreSelecionada(dataChave);
    setModalNovaTarefaAberto(true);
  };

  const alternarConclusao = async (id: string, statusAtual: StatusPendencia) => {
    const novoStatus: StatusPendencia = statusAtual === 'concluido' ? 'pendente' : 'concluido';
    const agora = novoStatus === 'concluido' ? new Date().toISOString() : null;
    const por = novoStatus === 'concluido' ? user?.id || null : null;

    const { error } = await supabase
      .from('pendencias_crm')
      .update({
        status: novoStatus,
        concluido_em: agora,
        concluido_por: por,
      })
      .eq('id', id);

    if (!error) {
      setPendencias((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: novoStatus, concluido_em: agora, concluido_por: por } : p))
      );
    }
  };

  const colaboradorSelecionado = colaboradores.find((c) => c.id === responsavelAtivoId);

  // Grade do Mês
  const diasDoMes = obterDiasDoMes(anoAtual, mesAtual);

  // Grade da Semana
  const diasDaSemana = obterDiasDaSemana(dataReferencia);

  return (
    <div className="space-y-4">
      {/* ─── Topbar estilo Advbox ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0d1527] border border-slate-800 rounded-xl p-3.5 text-slate-200">
        {/* Barra de pesquisa superior */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Digite / para pesquisar na agenda..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#172239] border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Ações da direita: Botão Hoje, Botão + Adicionar e Alternador de Lista */}
        <div className="flex items-center gap-2.5 self-end lg:self-auto">
          <button
            onClick={irParaHoje}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Hoje
          </button>

          <Button
            onClick={() => {
              setDataPreSelecionada('');
              setModalNovaTarefaAberto(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 h-9 font-medium shadow-md shadow-blue-600/30 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* ─── Corpo Principal (Sidebar Filtros + Grade Calendário) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── Barra Lateral Esquerda de Filtros (3 colunas) ─────────────── */}
        <div className="lg:col-span-3 space-y-5 bg-[#0d1527] border border-slate-800 rounded-xl p-4 text-slate-200">
          {/* Alternador de Visão no topo da sidebar: Mês | Dia | Semana */}
          <div className="flex rounded-lg bg-[#172239] p-1 border border-slate-800">
            {(['mes', 'dia', 'semana'] as ModoVisao[]).map((v) => (
              <button
                key={v}
                onClick={() => setModoVisao(v)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all',
                  modoVisao === v
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {v === 'mes' ? 'Mês' : v === 'dia' ? 'Dia' : 'Semana'}
              </button>
            ))}
          </div>

          {/* Seção Agenda / Responsável */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Agenda
            </span>

            {/* Chip com o responsável selecionado */}
            {colaboradorSelecionado ? (
              <div className="flex items-center justify-between bg-[#172239] border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-200">
                <span className="truncate pr-2 uppercase">
                  {colaboradorSelecionado.nome}
                </span>
                <button
                  onClick={() => setResponsavelAtivoId('')}
                  title="Limpar filtro de responsável"
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <select
                value={responsavelAtivoId}
                onChange={(e) => setResponsavelAtivoId(e.target.value)}
                className="w-full bg-[#172239] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas as agendas da equipe</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Dropdown: Data do compromisso vs Prazo Fatal */}
          <div className="space-y-2">
            <div className="relative">
              <select
                value={tipoDataFiltro}
                onChange={(e) => setTipoDataFiltro(e.target.value as TipoDataFiltro)}
                className="w-full bg-[#172239] border border-slate-700 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-200 uppercase tracking-wide focus:outline-none focus:border-blue-500 appearance-none cursor-pointer pr-8"
              >
                <option value="compromisso">DATA DO COMPROMISSO</option>
                <option value="prazo_fatal">PRAZO FATAL</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Checkbox: Mostrar concluídos */}
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={mostrarConcluidos}
              onChange={(e) => setMostrarConcluidos(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-4 h-4"
            />
            <span>Mostrar concluídos</span>
          </label>

          {/* Seção Status com marcadores circulares */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Status
            </span>
            <div className="space-y-2 text-xs text-slate-300">
              <button
                onClick={() => setStatusFiltro(statusFiltro === 'pendentes' ? 'todos' : 'pendentes')}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left py-1 px-1.5 rounded transition-colors',
                  statusFiltro === 'pendentes' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                <span>Pendentes</span>
              </button>

              <button
                onClick={() => setStatusFiltro(statusFiltro === 'concluidas' ? 'todos' : 'concluidas')}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left py-1 px-1.5 rounded transition-colors',
                  statusFiltro === 'concluidas' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                <span>Concluídas</span>
              </button>

              <button
                onClick={() => setStatusFiltro(statusFiltro === 'atrasadas' ? 'todos' : 'atrasadas')}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left py-1 px-1.5 rounded transition-colors',
                  statusFiltro === 'atrasadas' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                <span>Atrasadas</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Área Central (Calendário / Grade 9 colunas) ───────────────── */}
        <div className="lg:col-span-9 bg-[#0d1527] border border-slate-800 rounded-xl p-4 space-y-4">
          {/* Header de Navegação de Mês/Semana: < > Setembro 2026 */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  onClick={retrocederPeriodo}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
                  title="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={avancarPeriodo}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
                  title="Próximo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {modoVisao === 'mes' && `${MESES_NOMES[mesAtual]} ${anoAtual}`}
                {modoVisao === 'semana' && `Semana de ${diasDaSemana[0].dia} a ${diasDaSemana[6].dia} de ${MESES_NOMES[diasDaSemana[6].mes]} ${anoAtual}`}
                {modoVisao === 'dia' && `${diaSelecionado.getDate()} de ${MESES_NOMES[diaSelecionado.getMonth()]} de ${diaSelecionado.getFullYear()}`}
              </h2>
            </div>

            {/* Alternador rápido para modo lista */}
            <div className="flex items-center gap-1 bg-[#172239] p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setModoVisao('mes')}
                className={cn(
                  'p-1.5 rounded text-xs transition-colors',
                  modoVisao !== 'lista' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                )}
                title="Grade de Calendário"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setModoVisao('lista')}
                className={cn(
                  'p-1.5 rounded text-xs transition-colors',
                  modoVisao === 'lista' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                )}
                title="Visualização em Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ─── VISÃO MÊS (Padrão Advbox) ───────────────────────────────── */}
          {modoVisao === 'mes' && (
            <div className="space-y-1 select-none">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 text-center pb-2 text-xs font-semibold text-slate-400 border-b border-slate-800">
                {DIAS_SEMANA_HEADERS.map((dia) => (
                  <div key={dia}>{dia}</div>
                ))}
              </div>

              {/* Grid dos Dias */}
              <div className="grid grid-cols-7 border-l border-t border-slate-800 bg-[#0b1120]">
                {diasDoMes.map((d) => {
                  const eventosDia = mapaPendenciasPorData[d.dataChave] || [];
                  return (
                    <div
                      key={d.dataChave}
                      onClick={() => handleClicarDia(d.dataChave)}
                      className={cn(
                        'min-h-[96px] sm:min-h-[115px] p-2 border-r border-b border-slate-800/80 transition-all cursor-pointer relative group flex flex-col justify-between',
                        d.pertenceAoMesAtual ? 'bg-[#0d1527] hover:bg-slate-800/40' : 'bg-[#080d19]/80 opacity-40 hover:opacity-70'
                      )}
                    >
                      {/* Número do Dia */}
                      <div className="flex items-center justify-between">
                        {d.eHoje ? (
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-blue-500/30">
                            {d.dia}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">
                            {d.dia}
                          </span>
                        )}

                        {eventosDia.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {eventosDia.length}
                          </span>
                        )}
                      </div>

                      {/* Lista resumida de tarefas do dia */}
                      <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                        {eventosDia.slice(0, 3).map((ev) => {
                          const statusVisual = classificarStatusEvento(ev);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirDetalheTarefa(ev);
                              }}
                              className={cn(
                                'text-[11px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1.5 transition-all group/item hover:brightness-110',
                                ev.tipo === 'prazo_fatal'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : statusVisual === 'concluido'
                                  ? 'bg-green-500/10 text-green-400 line-through opacity-60'
                                  : statusVisual === 'atrasado'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              )}
                              title={`${ev.titulo} (${ev.responsavel_nome}) - Clique para ver detalhes`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alternarConclusao(ev.id, ev.status);
                                }}
                                className="shrink-0 hover:scale-125 transition-transform"
                                title={ev.status === 'concluido' ? 'Reabrir tarefa' : 'Marcar como concluída'}
                              >
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full inline-block',
                                    ev.tipo === 'prazo_fatal'
                                      ? 'bg-red-400 animate-pulse'
                                      : statusVisual === 'concluido'
                                      ? 'bg-green-400'
                                      : 'bg-blue-400'
                                  )}
                                />
                              </button>
                              <span className="truncate">{ev.titulo}</span>
                            </div>
                          );
                        })}
                        {eventosDia.length > 3 && (
                          <div className="text-[9px] text-slate-400 pl-1">
                            +{eventosDia.length - 3} mais...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── VISÃO SEMANA ────────────────────────────────────────────── */}
          {modoVisao === 'semana' && (
            <div className="space-y-3">
              <div className="grid grid-cols-7 text-center pb-2 text-xs font-semibold text-slate-400 border-b border-slate-800">
                {diasDaSemana.map((d) => (
                  <div key={d.dataChave} className="space-y-1">
                    <div>{DIAS_SEMANA_HEADERS[d.diaSemana]}</div>
                    <div
                      className={cn(
                        'w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold',
                        d.eHoje ? 'bg-blue-600 text-white' : 'text-slate-300'
                      )}
                    >
                      {d.dia}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 min-h-[350px]">
                {diasDaSemana.map((d) => {
                  const eventos = mapaPendenciasPorData[d.dataChave] || [];
                  return (
                    <div
                      key={d.dataChave}
                      onClick={() => handleClicarDia(d.dataChave)}
                      className="bg-[#10192e] border border-slate-800 rounded-lg p-2.5 space-y-2 cursor-pointer hover:border-slate-700 transition-colors"
                    >
                      {eventos.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic block text-center pt-8">
                          Sem tarefas
                        </span>
                      ) : (
                        eventos.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirDetalheTarefa(ev);
                            }}
                            className={cn(
                              'p-2 rounded text-xs border space-y-1 transition-all cursor-pointer hover:brightness-110',
                              ev.tipo === 'prazo_fatal'
                                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                : ev.status === 'concluido'
                                ? 'bg-green-500/10 border-green-500/30 text-green-400 line-through opacity-70'
                                : 'bg-slate-800/80 border-slate-700 text-slate-200'
                            )}
                            title="Clique para ver detalhes"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-semibold line-clamp-2">{ev.titulo}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alternarConclusao(ev.id, ev.status);
                                }}
                                className="shrink-0 text-slate-400 hover:text-white"
                                title={ev.status === 'concluido' ? 'Reabrir tarefa' : 'Marcar como concluída'}
                              >
                                {ev.status === 'concluido' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <span className="w-3 h-3 rounded-full border border-slate-400 hover:border-blue-400 block" />
                                )}
                              </button>
                            </div>
                            {ev.hora && <div className="text-[10px] text-slate-400">{ev.hora}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── VISÃO DIA ──────────────────────────────────────────────── */}
          {modoVisao === 'dia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#172239] p-3 rounded-lg border border-slate-800">
                <div className="text-sm font-semibold text-white">
                  Tarefas e Prazos para {diaSelecionado.toLocaleDateString('pt-BR')}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleClicarDia(formatarDataChave(diaSelecionado.getFullYear(), diaSelecionado.getMonth(), diaSelecionado.getDate()))}
                  className="text-xs bg-blue-600 hover:bg-blue-500 h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar neste dia
                </Button>
              </div>

              {(() => {
                const chaveDia = formatarDataChave(
                  diaSelecionado.getFullYear(),
                  diaSelecionado.getMonth(),
                  diaSelecionado.getDate()
                );
                const eventosDia = mapaPendenciasPorData[chaveDia] || [];

                if (eventosDia.length === 0) {
                  return (
                    <div className="py-16 text-center border border-dashed border-slate-800 rounded-lg">
                      <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Nenhum compromisso agendado para este dia.</p>
                      <button
                        onClick={() => handleClicarDia(chaveDia)}
                        className="text-xs text-blue-400 hover:underline mt-1"
                      >
                        Clique aqui para adicionar uma tarefa ou prazo fatal
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {eventosDia.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => abrirDetalheTarefa(ev)}
                        className={cn(
                          'p-3.5 rounded-xl border flex items-start justify-between gap-4 transition-all cursor-pointer hover:border-slate-600',
                          ev.tipo === 'prazo_fatal'
                            ? 'bg-red-500/10 border-red-500/40 text-red-200'
                            : ev.status === 'concluido'
                            ? 'bg-slate-900/60 border-slate-800 opacity-60'
                            : 'bg-[#172239] border-slate-700 text-slate-200'
                        )}
                        title="Clique para ver ou editar detalhes"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                alternarConclusao(ev.id, ev.status);
                              }}
                              className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                ev.status === 'concluido'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-slate-500 hover:border-blue-400'
                              )}
                              title={ev.status === 'concluido' ? 'Reabrir tarefa' : 'Marcar como concluída'}
                            >
                              {ev.status === 'concluido' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                            <span className={cn('text-sm font-semibold truncate', ev.status === 'concluido' && 'line-through text-slate-400')}>
                              {ev.titulo}
                            </span>
                            {ev.tipo === 'prazo_fatal' && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                                Prazo Fatal
                              </span>
                            )}
                          </div>
                          {ev.descricao && <p className="text-xs text-slate-400 pl-6 line-clamp-2">{ev.descricao}</p>}
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 pl-6 pt-1">
                            {ev.hora && <span>⏰ {ev.hora}</span>}
                            {ev.caso_titulo && <span>📁 {ev.caso_titulo}</span>}
                            {ev.responsavel_nome && <span>👤 {ev.responsavel_nome}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── VISÃO LISTA TRADICIONAL ─────────────────────────────────── */}
          {modoVisao === 'lista' && (
            <div className="space-y-3">
              {pendenciasFiltradas.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Nenhuma pendência encontrada com os filtros selecionados.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendenciasFiltradas.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => abrirDetalheTarefa(p)}
                      className={cn(
                        'p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all cursor-pointer hover:border-slate-600',
                        p.tipo === 'prazo_fatal'
                          ? 'bg-red-500/10 border-red-500/30 text-slate-200'
                          : p.status === 'concluido'
                          ? 'bg-slate-900/60 border-slate-800 opacity-60'
                          : 'bg-[#172239] border-slate-700 text-slate-200'
                      )}
                      title="Clique para ver ou editar detalhes"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              alternarConclusao(p.id, p.status);
                            }}
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                              p.status === 'concluido'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-slate-500 hover:border-blue-400'
                            )}
                            title={p.status === 'concluido' ? 'Reabrir tarefa' : 'Marcar como concluída'}
                          >
                            {p.status === 'concluido' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                          <span className={cn('text-sm font-semibold truncate', p.status === 'concluido' && 'line-through text-slate-400')}>
                            {p.titulo}
                          </span>
                          {p.tipo === 'prazo_fatal' && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                              Prazo Fatal
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pl-6">
                          {p.data_vencimento && (
                            <span>
                              📅 {new Date(p.data_vencimento).toLocaleDateString('pt-BR')} {p.hora ? `às ${p.hora}` : ''}
                            </span>
                          )}
                          {p.caso_titulo && <span>📁 {p.caso_titulo}</span>}
                          {p.responsavel_nome && <span>👤 {p.responsavel_nome}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação / Edição Rápida no Estilo Advbox */}
      <ModalNovaTarefaAgenda
        open={modalNovaTarefaAberto}
        onOpenChange={(aberto) => {
          setModalNovaTarefaAberto(aberto);
          if (!aberto) setTarefaSelecionadaParaEdicao(null);
        }}
        dataInicial={dataPreSelecionada}
        tarefaEmEdicao={tarefaSelecionadaParaEdicao}
        onSalvoComSucesso={carregarDados}
      />
    </div>
  );
}
