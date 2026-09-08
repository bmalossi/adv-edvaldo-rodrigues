import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Clock, Calendar, Gavel, DollarSign, Hash, User, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Caso, RESULTADO_LABELS } from '@/domain/crm/caso';
import { FASES_FUNIL_CONFIG } from '@/domain/crm/etapa-funil';
import { EventoCaso, formatarEventoParaLinha } from '@/domain/crm/evento-caso';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DrawerCasoProps {
  caso: Caso | null;
  onFechar: () => void;
  onAvancarFase: (caso: Caso) => void;
}

export function DrawerCaso({ caso, onFechar, onAvancarFase }: DrawerCasoProps) {
  const [eventos, setEventos] = useState<EventoCaso[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);

  useEffect(() => {
    if (!caso) { setEventos([]); return; }
    setLoadingEventos(true);
    supabase
      .from('eventos_caso')
      .select('*')
      .eq('caso_id', caso.id)
      .order('data_evento', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setEventos((data as EventoCaso[]) ?? []);
        setLoadingEventos(false);
      });
  }, [caso?.id]);

  if (!caso) return null;

  const faseConfig = FASES_FUNIL_CONFIG.find((f) => f.id === caso.fase_funil);

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

  const fmtValor = (v?: number | null) =>
    v != null
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onFechar}
      />

      {/* Painel lateral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-primary border-l border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {faseConfig && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', faseConfig.corBadge, faseConfig.corBorda)}>
                  {faseConfig.label}
                </span>
              )}
              {caso.etapa_nome && (
                <span className="text-[10px] text-slate-400">{caso.etapa_nome}</span>
              )}
            </div>
            <h2 className="font-bold text-white text-base leading-tight line-clamp-2">
              {caso.titulo}
            </h2>
            {caso.cliente_nome && (
              <p className="text-slate-400 text-sm mt-0.5">{caso.cliente_nome}</p>
            )}
          </div>
          <button onClick={onFechar} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Campos principais */}
          <div className="grid grid-cols-2 gap-3">
            <Campo icone={<Hash className="w-3.5 h-3.5" />} label="Nº Processo" valor={caso.numero_processo || '—'} />
            <Campo icone={<User className="w-3.5 h-3.5" />} label="Responsável" valor={caso.responsavel_nome || '—'} />
            <Campo icone={<Gavel className="w-3.5 h-3.5" />} label="Área" valor={caso.area_direito} />
            <Campo icone={<Gavel className="w-3.5 h-3.5" />} label="Tipo" valor={caso.tipo_demanda} />
            <Campo icone={<DollarSign className="w-3.5 h-3.5" />} label="Valor da causa" valor={fmtValor(caso.valor_causa)} />
            {caso.resultado_final && (
              <Campo icone={<Gavel className="w-3.5 h-3.5" />} label="Resultado" valor={RESULTADO_LABELS[caso.resultado_final] ?? caso.resultado_final} />
            )}
          </div>

          {/* Datas críticas */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Datas</h3>
            <div className="grid grid-cols-2 gap-2">
              <DataCampo icone={<Clock className="w-3 h-3 text-red-400" />} label="Prazo" valor={fmt(caso.data_prazo)} critico={!!caso.data_prazo && (new Date(caso.data_prazo).getTime() - Date.now()) / 86400000 <= 3} />
              <DataCampo icone={<Calendar className="w-3 h-3 text-blue-400" />} label="Audiência" valor={fmt(caso.data_audiencia)} />
              <DataCampo icone={<Calendar className="w-3 h-3 text-slate-400" />} label="Fechamento" valor={fmt(caso.data_fechamento)} />
              <DataCampo icone={<Calendar className="w-3 h-3 text-slate-400" />} label="Trânsito" valor={fmt(caso.data_transito_julgado)} />
            </div>
          </div>

          {/* Linha do tempo */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Linha do tempo</h3>
            {loadingEventos ? (
              <div className="text-slate-500 text-xs animate-pulse">Carregando eventos...</div>
            ) : eventos.length === 0 ? (
              <div className="text-slate-500 text-xs">Nenhum evento registrado.</div>
            ) : (
              <div className="space-y-2">
                {eventos.map((ev) => {
                  const fmt2 = formatarEventoParaLinha(ev);
                  return (
                    <div key={ev.id} className="flex gap-2.5 text-xs">
                      <span className="text-base leading-none mt-0.5">{fmt2.icone}</span>
                      <div className="min-w-0">
                        <div className="text-white font-medium line-clamp-2">{fmt2.descricao}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">{fmt2.label} · {fmt2.data}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com ações */}
        <div className="p-4 border-t border-white/5 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAvancarFase(caso)}
            className="flex-1 border-secondary/40 text-secondary hover:bg-secondary/10 text-xs"
          >
            Avançar fase →
          </Button>
          <Button asChild size="sm" className="flex-1 bg-secondary hover:opacity-90 text-primary text-xs font-bold gap-1">
            <Link to={`/admin/crm/casos/${caso.id}`}>
              <ExternalLink className="w-3.5 h-3.5" />
              Página completa
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function Campo({ icone, label, valor }: { icone: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icone}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-white text-xs font-medium truncate">{valor}</p>
    </div>
  );
}

function DataCampo({ icone, label, valor, critico }: { icone: React.ReactNode; label: string; valor: string; critico?: boolean }) {
  return (
    <div className={cn('bg-white/[0.03] border rounded-lg p-2', critico ? 'border-red-500/30' : 'border-white/5')}>
      <div className="flex items-center gap-1 mb-0.5">
        {icone}
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      <p className={cn('text-xs font-medium', critico ? 'text-red-400' : 'text-white')}>{valor}</p>
    </div>
  );
}
