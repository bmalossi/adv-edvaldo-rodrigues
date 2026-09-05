import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  UserCheck,
  Phone,
  Clock,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { supabase, Cliente, StatusCicloCliente, TipoPessoa } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ColunaConfig {
  id: StatusCicloCliente;
  titulo: string;
  subtitulo: string;
  corBorda: string;
  corBadge: string;
  corHeader: string;
}

const COLUNAS_FUNIL: ColunaConfig[] = [
  {
    id: 'lead',
    titulo: '1. Leads / Prospecção',
    subtitulo: 'Primeiro contato comercial',
    corBorda: 'border-amber-500/30',
    corBadge: 'bg-amber-500/20 text-amber-300',
    corHeader: 'text-amber-400',
  },
  {
    id: 'consulta',
    titulo: '2. Em Consulta / Triagem',
    subtitulo: 'Reunião marcada ou realizada',
    corBorda: 'border-blue-500/30',
    corBadge: 'bg-blue-500/20 text-blue-300',
    corHeader: 'text-blue-400',
  },
  {
    id: 'ativo',
    titulo: '3. Clientes Ativos',
    subtitulo: 'Contrato firmado / Caso em andamento',
    corBorda: 'border-green-500/30',
    corBadge: 'bg-green-500/20 text-green-300',
    corHeader: 'text-green-400',
  },
  {
    id: 'encerrado',
    titulo: '4. Encerrados / Arquivados',
    subtitulo: 'Custódia legal protegida',
    corBorda: 'border-slate-500/30',
    corBadge: 'bg-slate-500/20 text-slate-300',
    corHeader: 'text-slate-400',
  },
];

export default function FunilClientes() {
  const { papel } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [movimentandoId, setMovimentandoId] = useState<string | null>(null);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClientes(data as Cliente[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleMudarEstagio = async (cliente: Cliente, novoEstagio: StatusCicloCliente) => {
    if (cliente.status_ciclo === novoEstagio) return;

    setMovimentandoId(cliente.id);
    const { error } = await supabase
      .from('clientes')
      .update({
        status_ciclo: novoEstagio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cliente.id);

    if (error) {
      toast.error('Erro ao mover cliente: ' + error.message);
    } else {
      setClientes((prev) =>
        prev.map((c) => (c.id === cliente.id ? { ...c, status_ciclo: novoEstagio } : c))
      );
      toast.success(`Cliente movido para "${novoEstagio.toUpperCase()}".`);
    }
    setMovimentandoId(null);
  };

  const clientesFiltrados = clientes.filter((c) => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      c.nome_razao_social.toLowerCase().includes(termo) ||
      (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(termo)) ||
      c.telefone_whatsapp.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
              Funil de Captação & Clientes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10 uppercase">
              {papel}
            </span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Visualização visual do ciclo de conversão de leads a clientes ativos do escritório.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="border-white/10 text-white rounded-xl">
            <Link to="/admin/crm/clientes">Visão Tabela</Link>
          </Button>
          <Button asChild className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg">
            <Link to="/admin/crm/clientes/novo" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Barra de Busca e Métricas Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card/50 border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Filtrar por nome, CPF/CNPJ ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 h-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-secondary rounded-xl"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span className="font-medium">Total no Funil:</span>
          <span className="px-2.5 py-1 rounded-lg bg-secondary/20 text-secondary font-bold text-sm">
            {clientesFiltrados.length}
          </span>
        </div>
      </div>

      {/* Colunas do Funil Kanban */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 italic animate-pulse">
          Carregando funil comercial...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {COLUNAS_FUNIL.map((coluna) => {
            const itensColuna = clientesFiltrados.filter(
              (c) => c.status_ciclo === coluna.id
            );

            return (
              <div
                key={coluna.id}
                className={cn(
                  'flex flex-col bg-card/40 border rounded-2xl overflow-hidden shadow-sm transition-all',
                  coluna.corBorda
                )}
              >
                {/* Header da Coluna */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <h3 className={cn('text-sm font-bold', coluna.corHeader)}>
                      {coluna.titulo}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{coluna.subtitulo}</p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold border',
                      coluna.corBadge
                    )}
                  >
                    {itensColuna.length}
                  </span>
                </div>

                {/* Lista de Cards da Coluna */}
                <div className="p-3 space-y-3 min-h-[420px] max-h-[680px] overflow-y-auto">
                  {itensColuna.length === 0 ? (
                    <div className="h-32 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-500 text-xs text-center p-3">
                      Nenhum cliente neste estágio
                    </div>
                  ) : (
                    itensColuna.map((cliente) => (
                      <div
                        key={cliente.id}
                        className="bg-card border border-white/10 hover:border-secondary/40 rounded-xl p-3.5 shadow-sm space-y-2.5 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/admin/crm/clientes/${cliente.id}`}
                            className="font-bold text-white text-sm group-hover:text-secondary transition-colors line-clamp-1"
                          >
                            {cliente.nome_razao_social}
                          </Link>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase font-mono">
                            {cliente.tipo_pessoa}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-secondary" />
                            <span>{cliente.telefone_whatsapp}</span>
                          </div>
                          {cliente.cpf_cnpj && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              {cliente.cpf_cnpj}
                            </div>
                          )}
                        </div>

                        {/* Ações Rápidas de Transição de Estágio */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1 text-[11px]">
                          <Link
                            to={`/admin/crm/clientes/${cliente.id}`}
                            className="text-slate-400 hover:text-white flex items-center gap-0.5"
                          >
                            Ficha <ChevronRight className="w-3 h-3" />
                          </Link>

                          <div className="flex items-center gap-1">
                            {coluna.id !== 'ativo' && (
                              <button
                                disabled={movimentandoId === cliente.id}
                                onClick={() =>
                                  handleMudarEstagio(
                                    cliente,
                                    coluna.id === 'lead' ? 'consulta' : 'ativo'
                                  )
                                }
                                title="Avançar estágio"
                                className="px-2 py-1 rounded bg-secondary/15 hover:bg-secondary/30 text-secondary text-[11px] font-bold transition-all flex items-center gap-1"
                              >
                                Avançar <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {coluna.id === 'ativo' && (
                              <button
                                disabled={movimentandoId === cliente.id}
                                onClick={() => handleMudarEstagio(cliente, 'encerrado')}
                                title="Concluir e Arquivar"
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all"
                              >
                                Encerrar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
