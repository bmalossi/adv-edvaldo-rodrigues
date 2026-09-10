import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  FolderOpen,
  Scale,
  Building2,
  FileCheck2,
  Eye,
  ShieldAlert,
  Users
} from 'lucide-react';
import { supabase, Caso, StatusCaso, TipoDemanda } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PermissionGuard } from '@/components/admin/PermissionGuard';

const STATUS_CASO_BADGES: Record<StatusCaso, { label: string; color: string }> = {
  analise: { label: 'Em Análise Inicial', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  aguardando_documentos: { label: 'Aguardando Docs', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  concluido: { label: 'Concluído / Julgado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  arquivado: { label: 'Arquivado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const TIPO_DEMANDA_BADGES: Record<TipoDemanda, { label: string; icon: any }> = {
  judicial: { label: 'Judicial (Contencioso)', icon: Scale },
  extrajudicial: { label: 'Extrajudicial (Cartório/Acordo)', icon: FileCheck2 },
  consultivo: { label: 'Consultivo / Parecer', icon: Building2 },
};

export default function Casos() {
  const { papel } = useAuth();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  const fetchCasos = async () => {
    setLoading(true);
    let query = supabase
      .from('casos')
      .select('*, cliente:clientes(nome_razao_social), responsavel:perfis(nome)')
      .order('created_at', { ascending: false });

    if (filtroTipo) query = query.eq('tipo_demanda', filtroTipo);
    if (filtroStatus) query = query.eq('status', filtroStatus);

    const { data, error } = await query;
    if (!error && data) {
      const formatados: Caso[] = data.map((item: any) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        cliente_nome: item.cliente?.nome_razao_social || 'Cliente não identificado',
        titulo: item.titulo,
        descricao: item.descricao,
        area_direito: item.area_direito,
        tipo_demanda: item.tipo_demanda as TipoDemanda,
        status: item.status as StatusCaso,
        visibilidade: item.visibilidade,
        responsavel_id: item.responsavel_id,
        responsavel_nome: item.responsavel?.nome || 'Advogado do Escritório',
        google_drive_folder_id: item.google_drive_folder_id,
        created_at: item.created_at,
      }));
      setCasos(formatados);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCasos();
  }, [filtroTipo, filtroStatus]);

  const casosFiltrados = casos.filter((c) => {
    const termo = busca.toLowerCase();
    const tituloOk = c.titulo.toLowerCase().includes(termo);
    const clienteOk = c.cliente_nome ? c.cliente_nome.toLowerCase().includes(termo) : false;
    const areaOk = c.area_direito.toLowerCase().includes(termo);
    return tituloOk || clienteOk || areaOk;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Dossiê de Casos</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10 uppercase">
              {papel}
            </span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Gestão unificada de demandas judiciais, extrajudiciais e consultivas do escritório.
          </p>
        </div>

        <PermissionGuard modulo="casos" acao="criar">
          <Button asChild className="bg-cta-gold hover:opacity-90 text-primary font-bold shadow-lg rounded-xl">
            <Link to="/admin/crm/casos/novo" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Caso
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center gap-4 bg-card/50 border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Pesquisar por título do caso, cliente ou área..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 h-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-secondary rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="h-10 px-3.5 bg-slate-900/50 border border-white/10 text-white text-sm rounded-xl focus:border-secondary cursor-pointer"
          >
            <option value="">Todos os tipos de demanda</option>
            <option value="judicial">Judicial (Contencioso)</option>
            <option value="extrajudicial">Extrajudicial</option>
            <option value="consultivo">Consultivo</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-10 px-3.5 bg-slate-900/50 border border-white/10 text-white text-sm rounded-xl focus:border-secondary cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="analise">Em Análise</option>
            <option value="aguardando_documentos">Aguardando Docs</option>
            <option value="concluido">Concluído</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Casos */}
      <div className="bg-card border border-white/10 rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 italic animate-pulse">
            Carregando dossiê de casos...
          </div>
        ) : casosFiltrados.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <Briefcase className="w-7 h-7" />
            </div>
            <p className="font-serif text-lg text-white font-medium">Nenhum caso cadastrado</p>
            <p className="text-slate-400 text-xs max-w-sm">
              Crie o primeiro caso judicial, extrajudicial ou consultivo para centralizar documentos e processos.
            </p>
            <PermissionGuard modulo="casos" acao="criar">
              <Button asChild className="mt-2 bg-cta-gold text-primary font-bold rounded-xl">
                <Link to="/admin/crm/casos/novo">Cadastrar Caso</Link>
              </Button>
            </PermissionGuard>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-slate-300 uppercase text-[11px] tracking-wider font-semibold">
                  <th className="px-6 py-4">Caso & Área</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Tipo de Demanda</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Visibilidade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {casosFiltrados.map((caso) => {
                  const TipoConfig = TIPO_DEMANDA_BADGES[caso.tipo_demanda] || TIPO_DEMANDA_BADGES.judicial;
                  const IconTipo = TipoConfig.icon;

                  return (
                    <tr key={caso.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link
                            to={`/admin/crm/casos/${caso.id}`}
                            className="font-bold text-white group-hover:text-secondary transition-colors"
                          >
                            {caso.titulo}
                          </Link>
                          <span className="text-slate-400 text-xs mt-0.5">
                            {caso.area_direito} • Resp: {caso.responsavel_nome}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          to={`/admin/crm/clientes/${caso.cliente_id}`}
                          className="text-slate-200 text-xs hover:text-secondary font-medium transition-colors"
                        >
                          {caso.cliente_nome}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-white/10 text-slate-300">
                          <IconTipo className="w-3.5 h-3.5 text-secondary" />
                          {TipoConfig.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                            STATUS_CASO_BADGES[caso.status]?.color
                          )}
                        >
                          {STATUS_CASO_BADGES[caso.status]?.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        {caso.visibilidade === 'privado' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400/90">
                            <ShieldAlert className="w-3.5 h-3.5" /> Privada
                          </span>
                        ) : (
                          <span className="text-slate-400">Colegiada</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white">
                          <Link to={`/admin/crm/casos/${caso.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Dossiê
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
