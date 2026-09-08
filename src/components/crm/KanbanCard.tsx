import { AlertTriangle, Clock, CalendarX, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Caso } from '@/domain/crm/caso';
import { calcularPendencias } from '@/domain/crm/evento-caso';

interface KanbanCardProps {
  caso: Caso;
  onAbrirDrawer: (caso: Caso) => void;
  onAvancarFase: (caso: Caso) => void;
  onDragStart: (e: React.DragEvent, casoId: string) => void;
}

export function KanbanCard({ caso, onAbrirDrawer, onAvancarFase, onDragStart }: KanbanCardProps) {
  const pendencias = calcularPendencias(caso.data_prazo ?? null, [], 0);

  const corPendencia =
    pendencias.prazosVencendo > 0
      ? 'text-red-400 bg-red-500/15 border-red-500/30'
      : pendencias.documentosPendentes > 0
      ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
      : 'text-blue-400 bg-blue-500/15 border-blue-500/30';

  const prazoFormatado = caso.data_prazo
    ? new Date(caso.data_prazo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null;

  const prazoCritico =
    caso.data_prazo &&
    (new Date(caso.data_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 3;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, caso.id)}
      className="bg-card border border-white/10 hover:border-secondary/40 rounded-xl p-3.5 shadow-sm space-y-2.5 transition-all group cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onAbrirDrawer(caso)}
          className="font-bold text-white text-sm group-hover:text-secondary transition-colors line-clamp-2 text-left"
        >
          {caso.titulo}
        </button>
        {pendencias.total > 0 && (
          <span className={cn('flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border', corPendencia)}>
            <AlertTriangle className="w-3 h-3" />
            {pendencias.total}
          </span>
        )}
      </div>

      <div className="space-y-1 text-xs text-slate-300">
        {caso.cliente_nome && <div className="truncate text-slate-400">{caso.cliente_nome}</div>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] uppercase font-mono">{caso.tipo_demanda}</span>
          <span className="text-[10px] text-slate-500 truncate">{caso.area_direito}</span>
        </div>
      </div>

      {caso.numero_processo && (
        <div className="text-[10px] text-slate-500 font-mono truncate">{caso.numero_processo}</div>
      )}

      {prazoFormatado && (
        <div className={cn('flex items-center gap-1 text-[11px] font-semibold', prazoCritico ? 'text-red-400' : 'text-slate-400')}>
          {prazoCritico ? <CalendarX className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          Prazo: {prazoFormatado}
        </div>
      )}

      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1 text-[11px]">
        {caso.responsavel_nome && <span className="text-slate-500 truncate">{caso.responsavel_nome}</span>}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAbrirDrawer(caso)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] transition-all flex items-center gap-0.5"
          >
            Ver <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => onAvancarFase(caso)}
            className="px-2 py-1 rounded bg-secondary/15 hover:bg-secondary/30 text-secondary text-[11px] font-bold transition-all"
            title="Avançar fase"
          >
            Fase →
          </button>
        </div>
      </div>
    </div>
  );
}
