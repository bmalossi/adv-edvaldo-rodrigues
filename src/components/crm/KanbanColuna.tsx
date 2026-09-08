import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Caso } from '@/domain/crm/caso';
import { EtapaFunil } from '@/domain/crm/etapa-funil';
import { KanbanCard } from './KanbanCard';

interface KanbanColunaProps {
  etapa: EtapaFunil;
  casos: Caso[];
  corHeader: string;
  corBorda: string;
  isAdmin: boolean;
  onAbrirDrawer: (caso: Caso) => void;
  onAvancarFase: (caso: Caso) => void;
  onDragStart: (e: React.DragEvent, casoId: string) => void;
  onDrop: (e: React.DragEvent, etapaId: string) => void;
  onAdicionarEtapa?: () => void;
}

export function KanbanColuna({
  etapa,
  casos,
  corHeader,
  corBorda,
  isAdmin,
  onAbrirDrawer,
  onAvancarFase,
  onDragStart,
  onDrop,
  onAdicionarEtapa,
}: KanbanColunaProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-card/40 border rounded-2xl overflow-hidden shadow-sm min-w-[260px] w-[260px] flex-shrink-0',
        corBorda
      )}
    >
      {/* Header da coluna */}
      <div className="p-3.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className={cn('text-xs font-bold truncate', corHeader)}>{etapa.nome}</h3>
        </div>
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
          {casos.length}
        </span>
      </div>

      {/* Zona de drop */}
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => onDrop(e, etapa.id)}
        className="p-2.5 space-y-2.5 min-h-[400px] max-h-[640px] overflow-y-auto flex-1"
      >
        {casos.length === 0 ? (
          <div className="h-24 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-500 text-xs text-center p-3">
            Sem processos
          </div>
        ) : (
          casos.map((caso) => (
            <KanbanCard
              key={caso.id}
              caso={caso}
              onAbrirDrawer={onAbrirDrawer}
              onAvancarFase={onAvancarFase}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>

      {/* Botão adicionar etapa (admin only) */}
      {isAdmin && onAdicionarEtapa && (
        <div className="p-2 border-t border-white/5">
          <button
            onClick={onAdicionarEtapa}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Plus className="w-3 h-3" />
            Adicionar etapa
          </button>
        </div>
      )}
    </div>
  );
}
