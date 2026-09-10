import React, { useState, useEffect } from 'react';
import {
  History,
  ChevronDown,
  ChevronRight,
  Shield,
  Loader2,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { supabase, AuditLog } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AuditLogComPerfil extends AuditLog {
  user_email?: string;
  user_nome?: string;
}

export function TabAuditLog() {
  const [logs, setLogs] = useState<AuditLogComPerfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [linhasExpandidas, setLinhasExpandidas] = useState<Set<string>>(new Set());

  const ITENS_POR_PAGINA = 20;

  const carregarLogs = async (pag: number = 0) => {
    try {
      setLoading(true);

      const inicio = pag * ITENS_POR_PAGINA;
      const fim = inicio + ITENS_POR_PAGINA - 1;

      // 1. Busca os registros da tabela audit_log ordenados decrescente
      const { data: logsData, error: logsError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(inicio, fim + 1); // busca 1 a mais para saber se tem próxima página

      if (logsError) throw logsError;

      const lista = logsData || [];
      const possuiMais = lista.length > ITENS_POR_PAGINA;
      const itensExibicao = lista.slice(0, ITENS_POR_PAGINA);

      setTemMais(possuiMais);

      // 2. Busca os nomes e emails dos usuários responsáveis pelas ações
      const userIds = Array.from(
        new Set(itensExibicao.map((l) => l.user_id).filter(Boolean))
      ) as string[];

      let mapaPerfis: Record<string, { nome: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: perfisData } = await supabase
          .from('perfis')
          .select('id, nome, email')
          .in('id', userIds);

        (perfisData || []).forEach((p) => {
          mapaPerfis[p.id] = { nome: p.nome, email: p.email };
        });
      }

      const logsFormatados: AuditLogComPerfil[] = itensExibicao.map((l) => ({
        ...l,
        user_nome: l.user_id ? mapaPerfis[l.user_id]?.nome || 'Usuário do Sistema' : 'Sistema / Migração',
        user_email: l.user_id ? mapaPerfis[l.user_id]?.email || '' : '',
      }));

      setLogs(logsFormatados);
      setPagina(pag);
    } catch (err: any) {
      console.error('Erro ao carregar logs de auditoria:', err);
      toast.error('Não foi possível carregar os registros de auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs(0);
  }, []);

  const toggleExpansao = (id: string) => {
    setLinhasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatarData = (iso: string) => {
    try {
      const data = new Date(iso);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatarAcao = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
        return { label: 'CRIAÇÃO', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'UPDATE':
        return { label: 'EDIÇÃO', cor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'DELETE':
        return { label: 'EXCLUSÃO', cor: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default:
        return { label: action, cor: 'bg-slate-500/10 text-slate-300 border-slate-500/20' };
    }
  };

  const formatarEntidade = (entity: string) => {
    switch (entity) {
      case 'roles':
        return 'Perfil de Acesso (Role)';
      case 'permissions':
        return 'Permissão de Módulo';
      case 'perfis':
        return 'Conta de Usuário';
      default:
        return entity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo com Título e Botão Recarregar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            Trilha de Auditoria RBAC
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Registro cronológico e imutável de todas as alterações em perfis, permissões e contas de usuários.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => carregarLogs(pagina)}
          disabled={loading}
          className="border-white/10 text-slate-300 hover:text-white rounded-xl gap-2 self-start sm:self-auto text-xs h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </Button>
      </div>

      {/* Tabela de Logs */}
      {loading && logs.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-secondary" />
          <span className="text-slate-400 text-sm">Carregando histórico de auditoria...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Nenhum evento registrado</h3>
          <p className="text-slate-400 text-sm mt-1">
            Qualquer alteração em perfis ou contas será gravada automaticamente nesta trilha.
          </p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="w-10 py-3.5 px-3"></th>
                  <th className="py-3.5 px-4">Data / Hora</th>
                  <th className="py-3.5 px-4">Ação</th>
                  <th className="py-3.5 px-4">Entidade Afetada</th>
                  <th className="py-3.5 px-4">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const acaoInfo = formatarAcao(log.action);
                  const isExpandido = linhasExpandidas.has(log.id);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpansao(log.id)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400">
                          {isExpandido ? (
                            <ChevronDown className="w-4 h-4 text-secondary" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {formatarData(log.created_at)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${acaoInfo.cor}`}
                          >
                            {acaoInfo.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-200 font-medium text-xs">
                          {formatarEntidade(log.entity_type)}
                          {log.entity_id && (
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {log.entity_id}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-200">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">{log.user_nome}</span>
                          </div>
                          {log.user_email && (
                            <span className="block text-[11px] text-slate-500 font-mono pl-5">
                              {log.user_email}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Painel Expansível de Diff Visual (Antes vs Depois) */}
                      {isExpandido && (
                        <tr className="bg-slate-950/70">
                          <td colSpan={5} className="p-4 border-t border-b border-white/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Valor Anterior */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                  Estado Anterior (Old Value)
                                </div>
                                <pre className="p-3 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
                                  {log.old_value
                                    ? JSON.stringify(log.old_value, null, 2)
                                    : 'Nenhum dado anterior (registro novo).'}
                                </pre>
                              </div>

                              {/* Novo Valor */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                  Novo Estado (New Value)
                                </div>
                                <pre className="p-3 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
                                  {log.new_value
                                    ? JSON.stringify(log.new_value, null, 2)
                                    : 'Registro excluído do banco.'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-slate-950/40 text-xs text-slate-400">
            <div>
              Página <span className="font-semibold text-white">{pagina + 1}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagina === 0 || loading}
                onClick={() => carregarLogs(pagina - 1)}
                className="h-8 border-white/10 text-slate-300 hover:text-white rounded-lg"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!temMais || loading}
                onClick={() => carregarLogs(pagina + 1)}
                className="h-8 border-white/10 text-slate-300 hover:text-white rounded-lg"
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
