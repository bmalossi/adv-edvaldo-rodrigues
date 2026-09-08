import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FiltrosFunil } from '@/hooks/useFunilProcessual';
import { TipoDemanda } from '@/domain/crm/caso';

interface Perfil {
  id: string;
  nome: string;
}

interface FiltroBárraProps {
  filtros: FiltrosFunil;
  onChange: (filtros: FiltrosFunil) => void;
  onLimpar: () => void;
  perfis: Perfil[];
}

const TIPOS_DEMANDA: { value: TipoDemanda | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'judicial', label: 'Judicial' },
  { value: 'extrajudicial', label: 'Extrajudicial' },
  { value: 'consultivo', label: 'Consultivo' },
];

export function FiltroBarra({ filtros, onChange, onLimpar, perfis }: FiltroBárraProps) {
  const temFiltroAtivo =
    filtros.responsavelId || filtros.tipoDemanda || filtros.busca || filtros.dataInicio || filtros.dataFim;

  const set = (campo: keyof FiltrosFunil, valor: string) =>
    onChange({ ...filtros, [campo]: valor });

  return (
    <div className="flex flex-wrap items-center gap-2 bg-card/50 border border-white/10 p-3 rounded-2xl">
      {/* Busca por texto */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Processo, cliente, nº CNJ..."
          value={filtros.busca}
          onChange={(e) => set('busca', e.target.value)}
          className="pl-9 h-8 text-xs bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
        />
      </div>

      {/* Responsável */}
      <select
        value={filtros.responsavelId}
        onChange={(e) => set('responsavelId', e.target.value)}
        className="h-8 px-2 text-xs bg-slate-900/50 border border-white/10 text-white rounded-lg focus:border-secondary outline-none"
      >
        <option value="">Todos os responsáveis</option>
        {perfis.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>

      {/* Tipo de demanda */}
      <select
        value={filtros.tipoDemanda}
        onChange={(e) => set('tipoDemanda', e.target.value as TipoDemanda | '')}
        className="h-8 px-2 text-xs bg-slate-900/50 border border-white/10 text-white rounded-lg focus:border-secondary outline-none"
      >
        {TIPOS_DEMANDA.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Data início */}
      <input
        type="date"
        value={filtros.dataInicio}
        onChange={(e) => set('dataInicio', e.target.value)}
        title="Data de abertura — início"
        className="h-8 px-2 text-xs bg-slate-900/50 border border-white/10 text-slate-300 rounded-lg focus:border-secondary outline-none"
      />
      <span className="text-slate-500 text-xs">até</span>
      <input
        type="date"
        value={filtros.dataFim}
        onChange={(e) => set('dataFim', e.target.value)}
        title="Data de abertura — fim"
        className="h-8 px-2 text-xs bg-slate-900/50 border border-white/10 text-slate-300 rounded-lg focus:border-secondary outline-none"
      />

      {/* Limpar */}
      {temFiltroAtivo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLimpar}
          className="h-8 px-2 text-xs text-slate-400 hover:text-white gap-1"
        >
          <X className="w-3 h-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
