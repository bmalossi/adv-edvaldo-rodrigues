import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  UserCheck,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { supabase, PendenciaCRM, TipoPendencia, StatusPendencia } from '@/lib/supabase';
import { calcularTempoRestante } from '@/domain/crm/agenda';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PendenciaComRelacoes extends PendenciaCRM {
  responsavel_nome?: string;
  caso_titulo?: string;
  cliente_nome?: string;
}

export default function Agenda() {
  const { user } = useAuth();
  const [pendencias, setPendencias] = useState<PendenciaComRelacoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('');
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);

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

      if (filtroTipo) query = query.eq('tipo', filtroTipo);
      if (filtroStatus) query = query.eq('status', filtroStatus);
      if (filtroResponsavel) query = query.eq('responsavel_id', filtroResponsavel);

      const { data, error } = await query;
      if (!error && data) {
        const formatados: PendenciaComRelacoes[] = data.map((item: any) => ({
          id: item.id,
          tipo: item.tipo,
          titulo: item.titulo,
          descricao: item.descricao,
          responsavel_id: item.responsavel_id,
          responsavel_nome: item.responsavel?.nome || 'Não atribuído',
          caso_id: item.caso_id,
          caso_titulo: item.caso?.titulo,
          cliente_id: item.cliente_id,
          cliente_nome: item.cliente?.nome_razao_social,
          status: item.status,
          data_vencimento: item.data_vencimento,
          concluido_em: item.concluido_em,
          concluido_por: item.concluido_por,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setPendencias(formatados);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroTipo, filtroStatus, filtroResponsavel]);

  const handleConcluir = async (id: string) => {
    if (!user) return;
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from('pendencias_crm')
      .update({
        status: 'concluido',
        concluido_em: agora,
        concluido_por: user.id,
      })
      .eq('id', id);

    if (!error) {
      setPendencias((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: 'concluido' as StatusPendencia, concluido_em: agora, concluido_por: user.id }
            : p
        )
      );
    }
  };

  const handleReabrir = async (id: string) => {
    const { error } = await supabase
      .from('pendencias_crm')
      .update({
        status: 'pendente',
        concluido_em: null,
        concluido_por: null,
      })
      .eq('id', id);

    if (!error) {
      setPendencias((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: 'pendente' as StatusPendencia, concluido_em: null, concluido_por: null }
            : p
        )
      );
    }
  };

  const pendenciasFiltradas = pendencias.filter((p) => {
    const termo = busca.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(termo) ||
      (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
      (p.responsavel_nome && p.responsavel_nome.toLowerCase().includes(termo)) ||
      (p.caso_titulo && p.caso_titulo.toLowerCase().includes(termo)) ||
      (p.cliente_nome && p.cliente_nome.toLowerCase().includes(termo))
    );
  });

  const prazosFatais = pendenciasFiltradas.filter((p) => p.tipo === 'prazo_fatal');
  const tarefas = pendenciasFiltradas.filter((p) => p.tipo === 'tarefa');

  const renderBadgeVencimento = (p: PendenciaCRM) => {
    if (!p.data_vencimento) return null;
    const horas = calcularTempoRestante(p);
    const dataFormatada = new Date(p.data_vencimento).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (p.status === 'concluido') {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Venceu em: {dataFormatada}
        </span>
      );
    }

    if (horas === null) return null;

    if (horas < 0) {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> VENCIDO ({Math.abs(Math.round(horas))}h atrás)
        </span>
      );
    }

    if (horas <= 24) {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
          <AlertOctagon className="w-3.5 h-3.5" /> URGENTE: {Math.round(horas)}h restantes ({dataFormatada})
        </span>
      );
    }

    if (horas <= 48) {
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Alerta: {Math.round(horas)}h restantes ({dataFormatada})
        </span>
      );
    }

    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> Vencimento: {dataFormatada}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Agenda & Prazos Fatais
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de compromissos judiciais, preclusões e tarefas operacionais da equipe
          </p>
        </div>
        <Link to="/admin/crm/agenda/novo">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Pendência / Prazo
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, caso..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos os tipos</option>
            <option value="prazo_fatal">🚨 Apenas Prazos Fatais</option>
            <option value="tarefa">📋 Apenas Tarefas</option>
          </select>
        </div>

        <div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_execucao">Em Execução</option>
            <option value="concluido">Concluídos</option>
          </select>
        </div>

        <div>
          <select
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos os colaboradores</option>
            {colaboradores.map((colab) => (
              <option key={colab.id} value={colab.id}>
                {colab.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Carregando agenda e prazos...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção 1: Prazos Fatais (Prioridade Máxima) */}
          {(!filtroTipo || filtroTipo === 'prazo_fatal') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-red-500/20 pb-2">
                <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse" />
                <h2 className="text-lg font-bold text-red-500 uppercase tracking-wide">
                  Prazos Fatais (Efeito Preclusivo) ({prazosFatais.length})
                </h2>
              </div>

              {prazosFatais.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-3">
                  Nenhum prazo fatal encontrado nos filtros atuais.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prazosFatais.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'p-4 rounded-xl border bg-card/60 transition-all flex flex-col justify-between gap-3',
                        p.status === 'concluido'
                          ? 'border-border opacity-70'
                          : 'border-red-500/40 bg-red-500/5 shadow-sm'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-foreground text-base">
                            {p.titulo}
                          </div>
                          {renderBadgeVencimento(p)}
                        </div>

                        {p.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {p.descricao}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs pt-1">
                          {p.caso_titulo && (
                            <span className="flex items-center gap-1 text-primary/90 bg-primary/10 px-2 py-0.5 rounded">
                              <Briefcase className="w-3 h-3" />
                              {p.caso_titulo}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                            <UserCheck className="w-3 h-3" />
                            {p.responsavel_nome}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                        <span className="capitalize text-muted-foreground">
                          Status: <strong className="text-foreground">{p.status}</strong>
                        </span>

                        {p.status !== 'concluido' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-green-500/40 text-green-500 hover:bg-green-500/10"
                            onClick={() => handleConcluir(p.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluir Prazo
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleReabrir(p.id)}
                          >
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seção 2: Tarefas Operacionais */}
          {(!filtroTipo || filtroTipo === 'tarefa') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Tarefas Operacionais da Equipe ({tarefas.length})
                </h2>
              </div>

              {tarefas.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-3">
                  Nenhuma tarefa operacional encontrada nos filtros atuais.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tarefas.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        'p-4 rounded-xl border bg-card transition-all flex flex-col justify-between gap-3',
                        t.status === 'concluido' ? 'border-border/50 opacity-60' : 'border-border'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-foreground text-sm">
                            {t.titulo}
                          </div>
                          {renderBadgeVencimento(t)}
                        </div>

                        {t.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {t.descricao}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs pt-1">
                          {t.caso_titulo && (
                            <span className="flex items-center gap-1 text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
                              <Briefcase className="w-3 h-3" />
                              {t.caso_titulo}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                            <UserCheck className="w-3 h-3" />
                            {t.responsavel_nome}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                        <span className="capitalize text-muted-foreground">
                          Status: <strong className="text-foreground">{t.status}</strong>
                        </span>

                        {t.status !== 'concluido' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-green-500/40 text-green-500 hover:bg-green-500/10"
                            onClick={() => handleConcluir(t.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluir
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleReabrir(t.id)}
                          >
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
