import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AsaasSyncBadgeProps {
  customerId?: string | null;
  loading?: boolean;
  onSync?: () => void;
  className?: string;
  showRefreshButton?: boolean;
}

export function AsaasSyncBadge({
  customerId,
  loading = false,
  onSync,
  className,
  showRefreshButton = true,
}: AsaasSyncBadgeProps) {
  if (customerId) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 text-xs transition-colors group select-none shadow-sm',
          className
        )}
        title={`Identificador do cliente no Asaas: ${customerId}`}
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] shrink-0" />
          Asaas
        </span>
        <span className="h-3 w-px bg-white/10" />
        <span className="font-mono text-[11px] text-slate-300 tracking-tight group-hover:text-white transition-colors">
          {customerId}
        </span>
        {showRefreshButton && onSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={loading}
            className="text-slate-500 hover:text-[#C9A961] disabled:opacity-50 transition-colors p-0.5 rounded hover:bg-white/5 ml-0.5"
            title="Re-sincronizar cadastro no Asaas"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin text-[#C9A961]')} />
          </button>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onSync}
      disabled={loading}
      className={cn(
        'h-7 px-3 text-xs font-medium rounded-md border border-white/15 bg-white/[0.03] hover:bg-[#C9A961]/10 text-slate-300 hover:text-[#C9A961] hover:border-[#C9A961]/40 transition-all gap-1.5 shadow-sm',
        className
      )}
      title="Sincronizar cadastro do cliente com a API do Asaas"
    >
      <RefreshCw className={cn('w-3 h-3 text-[#C9A961]', loading && 'animate-spin')} />
      <span>{loading ? 'Sincronizando...' : 'Sincronizar com Asaas'}</span>
    </Button>
  );
}
