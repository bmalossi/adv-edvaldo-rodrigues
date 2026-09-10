import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertOctagon,
  X,
  Users,
  Search,
  Upload,
  AlertCircle,
  Loader2,
  Check,
  CheckCircle2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { supabase, TipoPendencia, StatusPendencia, PendenciaCRM } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGuard } from '@/components/admin/PermissionGuard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ModalNovaTarefaAgendaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataInicial?: string; // YYYY-MM-DD
  tarefaEmEdicao?: PendenciaCRM | null;
  onSalvoComSucesso?: () => void;
}

const TAGS_DISPONIVEIS = [
  { id: 'importante', label: 'Importante' },
  { id: 'urgente', label: 'Urgente' },
  { id: 'futura', label: 'Futura' },
  { id: 'recorrente', label: 'Recorrente' },
  { id: 'privada', label: 'Privada' },
  { id: 'retroativa', label: 'Retroativa' },
];

export function ModalNovaTarefaAgenda({
  open,
  onOpenChange,
  dataInicial,
  tarefaEmEdicao,
  onSalvoComSucesso,
}: ModalNovaTarefaAgendaProps) {
  const { user } = useAuth();

  // Estados dos campos
  const [tipo, setTipo] = useState<TipoPendencia>('tarefa');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [casoId, setCasoId] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [status, setStatus] = useState<StatusPendencia>('pendente');

  // Datas e Horários
  const [dataCompromisso, setDataCompromisso] = useState('');
  const [hora, setHora] = useState('');
  const [prazoFatal, setPrazoFatal] = useState('');
  const [mostrarNaAgenda, setMostrarNaAgenda] = useState(true);
  const [informarTermino, setInformarTermino] = useState(false);
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [local, setLocal] = useState('');
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);

  // Auxiliares
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  const [casos, setCasos] = useState<{ id: string; titulo: string; cliente_id?: string | null }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome_razao_social: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  // Carregar dados de referência e preencher se for edição
  useEffect(() => {
    if (!open) return;

    const carregar = async () => {
      const [{ data: perfisData }, { data: casosData }, { data: clientesData }] = await Promise.all([
        supabase.from('perfis').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('casos').select('id, titulo, cliente_id').order('titulo'),
        supabase.from('clientes').select('id, nome_razao_social').order('nome_razao_social'),
      ]);

      if (perfisData) {
        setColaboradores(perfisData);
      }
      if (casosData) setCasos(casosData);
      if (clientesData) setClientes(clientesData);
    };

    carregar();

    if (tarefaEmEdicao) {
      // Modo Edição / Detalhes
      setTipo(tarefaEmEdicao.tipo);
      setTitulo(tarefaEmEdicao.titulo || '');
      setDescricao(tarefaEmEdicao.descricao || '');
      setResponsavelId(tarefaEmEdicao.responsavel_id || '');
      setCasoId(tarefaEmEdicao.caso_id || '');
      setClienteId(tarefaEmEdicao.cliente_id || '');
      setStatus(tarefaEmEdicao.status);
      setHora(tarefaEmEdicao.hora || '');
      setDiaInteiro(!!tarefaEmEdicao.dia_inteiro);
      setLocal(tarefaEmEdicao.local || '');
      setTagsSelecionadas(tarefaEmEdicao.tags || []);
      setMostrarNaAgenda(tarefaEmEdicao.mostrar_na_agenda !== false);

      if (tarefaEmEdicao.data_vencimento) {
        const dataFormatada = tarefaEmEdicao.data_vencimento.split('T')[0];
        if (tarefaEmEdicao.tipo === 'prazo_fatal') {
          setPrazoFatal(dataFormatada);
          setDataCompromisso(dataFormatada);
        } else {
          setDataCompromisso(dataFormatada);
          setPrazoFatal('');
        }
      } else {
        setDataCompromisso('');
        setPrazoFatal('');
      }
    } else {
      // Modo Criação Novo
      setTipo('tarefa');
      setTitulo('');
      setDescricao('');
      setResponsavelId(user?.id || '');
      setCasoId('');
      setClienteId('');
      setStatus('pendente');
      setHora('');
      setDiaInteiro(false);
      setLocal('');
      setTagsSelecionadas([]);
      setMostrarNaAgenda(true);
      setInformarTermino(false);
      setPrazoFatal('');

      if (dataInicial) {
        setDataCompromisso(dataInicial);
      } else {
        const hoje = new Date().toISOString().split('T')[0];
        setDataCompromisso(hoje);
      }
    }
  }, [open, dataInicial, tarefaEmEdicao, user]);

  const toggleTag = (tagId: string) => {
    setTagsSelecionadas((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const alternarStatusConclusao = async () => {
    if (!tarefaEmEdicao) return;
    const novoStatus: StatusPendencia = status === 'concluido' ? 'pendente' : 'concluido';
    setStatus(novoStatus);
  };

  const handleExcluir = async () => {
    if (!tarefaEmEdicao) return;
    if (!confirm('Tem certeza que deseja excluir esta tarefa/prazo?')) return;

    setExcluindo(true);
    try {
      const { error } = await supabase.from('pendencias_crm').delete().eq('id', tarefaEmEdicao.id);
      if (error) throw error;
      onOpenChange(false);
      if (onSalvoComSucesso) onSalvoComSucesso();
    } catch (err: any) {
      setErros([err.message || 'Erro ao excluir.']);
    } finally {
      setExcluindo(false);
    }
  };

  const handleSalvar = async () => {
    setErros([]);
    const errosValidacao: string[] = [];

    if (!titulo.trim()) {
      errosValidacao.push('O campo Tarefa / Título é obrigatório.');
    }

    if (!responsavelId) {
      errosValidacao.push('Selecione ao menos um responsável.');
    }

    const isPrazoFatal = tipo === 'prazo_fatal' || !!prazoFatal;

    if (isPrazoFatal && !prazoFatal && !dataCompromisso) {
      errosValidacao.push('Prazo fatal exige preenchimento da data correspondente.');
    }

    if (errosValidacao.length > 0) {
      setErros(errosValidacao);
      return;
    }

    setSalvando(true);

    try {
      let dataVencimentoIso: string | null = null;
      const dataRef = prazoFatal || dataCompromisso;
      if (dataRef) {
        const horaRef = hora ? `${hora}:00` : '09:00:00';
        dataVencimentoIso = new Date(`${dataRef}T${horaRef}`).toISOString();
      }

      const payload = {
        tipo: isPrazoFatal ? ('prazo_fatal' as TipoPendencia) : ('tarefa' as TipoPendencia),
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        responsavel_id: responsavelId,
        caso_id: casoId || null,
        cliente_id: clienteId || null,
        status: status,
        concluido_em: status === 'concluido' ? new Date().toISOString() : null,
        concluido_por: status === 'concluido' ? user?.id || null : null,
        data_vencimento: dataVencimentoIso,
        hora: hora || null,
        dia_inteiro: diaInteiro,
        local: local.trim() || null,
        tags: tagsSelecionadas,
        mostrar_na_agenda: mostrarNaAgenda,
        updated_at: new Date().toISOString(),
      };

      if (tarefaEmEdicao) {
        const { error } = await supabase
          .from('pendencias_crm')
          .update(payload)
          .eq('id', tarefaEmEdicao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pendencias_crm').insert([payload]);
        if (error) throw error;
      }

      onOpenChange(false);
      if (onSalvoComSucesso) onSalvoComSucesso();
    } catch (err: any) {
      setErros([err.message || 'Erro ao salvar tarefa.']);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-[#0f172a] border-slate-800 text-slate-100 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-slate-800 p-5 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium text-white flex items-center gap-2">
              <span>{tarefaEmEdicao ? 'Informações da Tarefa' : 'Criar nova tarefa'}</span>
              {status === 'concluido' && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                  Concluída
                </span>
              )}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            {tarefaEmEdicao
              ? 'Visualize, edite as informações ou alterne o status de conclusão desta tarefa.'
              : 'Preencha os dados da nova tarefa ou prazo no calendário.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {erros.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" /> Erros no preenchimento:
              </div>
              <ul className="list-disc list-inside">
                {erros.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Processo ou Caso */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Processo ou caso *</label>
            <div className="relative">
              <select
                value={casoId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCasoId(id);
                  const casoObj = casos.find((c) => c.id === id);
                  if (casoObj?.cliente_id) {
                    setClienteId(casoObj.cliente_id);
                  }
                }}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-md px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nome do cliente ou título do processo / caso</option>
                {casos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Adicionar Responsáveis */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Adicionar responsáveis *</label>
            <div className="flex gap-2">
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="flex-1 bg-[#1e293b] border border-slate-700 rounded-md px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Quem vai trabalhar nesta tarefa?</option>
                {colaboradores.map((colab) => (
                  <option key={colab.id} value={colab.id}>
                    {colab.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarefa (Título / Ação) */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Tarefa *</label>
            <Input
              placeholder="O que essa pessoa irá fazer?"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="bg-[#1e293b] border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 h-9"
            />
          </div>

          {/* Linha: Data | Hora | Prazo Fatal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Data</label>
              <div className="relative">
                <input
                  type="date"
                  value={dataCompromisso}
                  onChange={(e) => setDataCompromisso(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={diaInteiro}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium flex items-center justify-between">
                <span>Prazo fatal</span>
                <span className="text-[10px] text-red-400">Preclusivo</span>
              </label>
              <input
                type="date"
                value={prazoFatal}
                onChange={(e) => {
                  setPrazoFatal(e.target.value);
                  if (e.target.value) setTipo('prazo_fatal');
                }}
                className="w-full bg-[#1e293b] border border-red-900/60 rounded-md px-3 py-2 text-xs text-red-300 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Checkboxes de opções */}
          <div className="flex flex-wrap items-center gap-5 pt-1 text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mostrarNaAgenda}
                onChange={(e) => setMostrarNaAgenda(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Mostrar na agenda</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={informarTermino}
                onChange={(e) => setInformarTermino(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Informar término</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={diaInteiro}
                onChange={(e) => setDiaInteiro(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Dia inteiro</span>
            </label>
          </div>

          {/* Local */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Local</label>
            <Input
              placeholder="Local do evento (ex: Fórum Central, Sala Virtual, Escritório)"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="bg-[#1e293b] border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 h-9"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Descrição</label>
            <textarea
              rows={3}
              placeholder="Adicione um comentário ou instruções detalhadas..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 rounded-md p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Tags de Prioridade e Classificação */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-400 font-medium text-[11px] block">Classificação</label>
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              {TAGS_DISPONIVEIS.map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tagsSelecionadas.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé fixo com botões e ações de conclusão/exclusão */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-5 border-t border-slate-800 shrink-0 bg-[#0f172a]">
          <div>
            {tarefaEmEdicao && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={alternarStatusConclusao}
                  className={
                    status === 'concluido'
                      ? 'text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1.5'
                      : 'text-xs border-green-500/40 text-green-400 hover:bg-green-500/10 gap-1.5'
                  }
                >
                  {status === 'concluido' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" /> Reabrir Tarefa
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Concluída
                    </>
                  )}
                </Button>

                <PermissionGuard modulo="agenda" acao="excluir">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleExcluir}
                    disabled={excluindo}
                    className="text-xs text-red-400 hover:bg-red-500/10 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                </PermissionGuard>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={salvando || excluindo}
              className="text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <PermissionGuard modulo="agenda" acao={tarefaEmEdicao ? 'editar' : 'criar'}>
              <Button
                type="button"
                onClick={handleSalvar}
                disabled={salvando || excluindo}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 h-9 font-medium shadow-lg shadow-blue-600/20"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : tarefaEmEdicao ? (
                  'Salvar Alterações'
                ) : (
                  'Criar nova tarefa'
                )}
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
