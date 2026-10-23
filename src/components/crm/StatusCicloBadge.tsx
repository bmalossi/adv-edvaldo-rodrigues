import React from 'react';
import { StatusCicloCliente } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface StatusCicloBadgeProps {
  status: StatusCicloCliente | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const STATUS_CICLO_THEME: Record<
  StatusCicloCliente,
  {
    label: string;
    container: string;
    dot: string;
  }
> = {
  ativo: {
    label: 'Cliente Ativo',
    container: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/25 hover:border-emerald-500/40',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  },
  lead: {
    label: 'Lead / Prospecção',
    container: 'bg-secondary/10 text-secondary border-secondary/30 hover:border-secondary/50',
    dot: 'bg-secondary shadow-[0_0_8px_rgba(201,169,97,0.5)]',
  },
  consulta: {
    label: 'Consulta / Reunião',
    container: 'bg-blue-950/40 text-blue-300 border-blue-500/25 hover:border-blue-500/40',
    dot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]',
  },
  encerrado: {
    label: 'Encerrado / Arquivado',
    container: 'bg-slate-800/40 text-slate-400 border-white/10 hover:border-white/20',
    dot: 'bg-slate-500',
  },
};

export function StatusCicloBadge({
  status,
  size = 'md',
  className,
}: StatusCicloBadgeProps) {
  const config =
    STATUS_CICLO_THEME[(status as StatusCicloCliente) || 'lead'] ||
    STATUS_CICLO_THEME.lead;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors select-none tracking-tight',
        size === 'sm'
          ? 'px-2 py-0.5 text-[11px] leading-4'
          : 'px-2.5 py-1 text-xs leading-4',
        config.container,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      <span>{config.label}</span>
    </span>
  );
}
