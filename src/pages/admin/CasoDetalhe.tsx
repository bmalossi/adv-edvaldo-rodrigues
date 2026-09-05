import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Briefcase,
  User,
  Scale,
  Building2,
  FileCheck2,
  FolderOpen,
  Calendar,
  Clock,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  Plus
} from 'lucide-react';
import { supabase, Caso, Cliente, StatusCaso, TipoDemanda } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function CasoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { papel } = useAuth();

  const [caso, setCaso] = useState<Caso | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [processosConexos, setProcessosConexos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchCasoCompleto = async () => {
      setLoading(true);
      const { data: casoData, error } = await supabase
        .from('casos')
        .select('*, responsavel:perfis(nome)')
        .eq('id', id)
        .single();

      if (error || !casoData) {
        toast.error('Caso não encontrado');
        navigate('/admin/crm/casos');
        return;
      }

      setCaso({
        ...casoData,
        responsavel_nome: casoData.responsavel?.nome || 'Advogado Responsável',
      } as Caso);

      // Carrega dados do cliente
      if (casoData.cliente_id) {
        const { data: cliData } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', casoData.cliente_id)
          .single();
        if (cliData) setCliente(cliData as Cliente);
      }

      // Carrega processos vinculados do JusTrack
      const { data: procData } = await supabase
        .from('processos')
        .select('*')
        .eq('caso_id', id)
        .order('updated_at', { ascending: false });
      if (procData) setProcessosConexos(procData);

      setLoading(false);
    };

    fetchCasoCompleto();
  }, [id, navigate]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400 italic animate-pulse">Carregando dossiê do caso...</div>;
  }

  if (!caso) return null;

  const TipoConfig = TIPO_DEMANDA_BADGES[caso.tipo_demanda] || TIPO_DEMANDA_BADGES.judicial;
  const IconTipo = TipoConfig.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/casos">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-white">{caso.titulo}</h1>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                  STATUS_CASO_BADGES[caso.status]?.color
                )}
              >
                {STATUS_CASO_BADGES[caso.status]?.label}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Área: <span className="text-white font-medium">{caso.area_direito}</span> • Responsável: <span className="text-white font-medium">{caso.responsavel_nome}</span>
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="border-white/10 text-white rounded-xl gap-1.5">
          <Link to={`/admin/crm/casos/${caso.id}/editar`}>
            <Edit className="w-4 h-4 text-secondary" />
            Editar Caso
          </Link>
        </Button>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Detalhes, Processos Conexos e Minutas */}
        <div className="md:col-span-2 space-y-6">
          {/* Informações da Causa */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              <IconTipo className="w-4 h-4 text-secondary" />
              Objeto da Demanda & Resumo Fático
            </h2>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Tipo:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-200 font-medium">
                {TipoConfig.label}
              </span>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {caso.descricao || 'Nenhuma descrição detalhada informada para este caso.'}
            </p>
          </div>

          {/* Processos Judiciais Conexos (JusTrack) */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-secondary" />
                Processos Judiciais Conexos (DataJud)
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {processosConexos.length} processo(s)
              </span>
            </div>

            {processosConexos.length === 0 ? (
              <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-xs italic">
                Nenhum processo judicial CNJ vinculado a este caso (demanda em fase pré-processual ou extrajudicial).
              </div>
            ) : (
              <div className="space-y-3">
                {processosConexos.map((proc) => (
                  <div
                    key={proc.id}
                    className="bg-slate-900/50 border border-white/10 hover:border-secondary/30 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{proc.etiqueta || 'Processo'}</span>
                        {proc.tem_novidade && (
                          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        )}
                      </div>
                      <p className="font-mono text-slate-300 text-xs mt-0.5">{proc.numero_cnj}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Tribunal: {proc.tribunal_base || 'Não identificado'} • Status: {proc.status_processo}
                      </span>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="text-secondary hover:text-white text-xs gap-1">
                      <Link to={`/admin/processos/${proc.id}`}>
                        Ver no JusTrack <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Cliente Vinculado & Governança */}
        <div className="space-y-6">
          {/* Card do Cliente */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-secondary" />
              Cliente
            </h2>

            {cliente ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Nome / Razão Social</span>
                  <Link
                    to={`/admin/crm/clientes/${cliente.id}`}
                    className="text-white font-bold text-sm hover:text-secondary transition-colors"
                  >
                    {cliente.nome_razao_social}
                  </Link>
                </div>

                <div>
                  <span className="text-slate-400 block">CPF / CNPJ</span>
                  <span className="text-slate-200 font-mono">{cliente.cpf_cnpj || 'Não informado'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block">Telefone / WhatsApp</span>
                  <span className="text-slate-200">{cliente.telefone_whatsapp}</span>
                </div>

                <Button asChild size="sm" variant="outline" className="w-full border-white/10 text-white rounded-xl mt-2 text-xs">
                  <Link to={`/admin/crm/clientes/${cliente.id}`}>
                    Ver Ficha Completa do Cliente
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-slate-500 text-xs italic">Cliente não encontrado</div>
            )}
          </div>

          {/* Governança e Visibilidade */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              Governança da Carteira
            </h2>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Visibilidade:</span>
                <span className="font-bold text-white uppercase">{caso.visibilidade}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Pasta Google Drive:</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {caso.google_drive_folder_id ? 'Sincronizada' : 'Pendente (Ticket 7)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
