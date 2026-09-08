import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EtapaFunil, FaseFunil, FASES_FUNIL_CONFIG, podeDeletarEtapa, validarNovaEtapa } from '@/domain/crm/etapa-funil';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GerenciarEtapasProps {
  etapas: EtapaFunil[];
  onFechar: () => void;
  onAtualizar: () => void;
  usuarioId: string;
}

export function GerenciarEtapas({ etapas, onFechar, onAtualizar, usuarioId }: GerenciarEtapasProps) {
  const [faseAtiva, setFaseAtiva] = useState<FaseFunil>('negociacao');
  const [novaEtapa, setNovaEtapa] = useState('');
  const [salvando, setSalvando] = useState(false);

  const etapasDaFase = etapas.filter((e) => e.fase === faseAtiva).sort((a, b) => a.ordem - b.ordem);
  const faseConfig = FASES_FUNIL_CONFIG.find((f) => f.id === faseAtiva);

  const handleAdicionarEtapa = async () => {
    const { valido, erros } = validarNovaEtapa(novaEtapa, faseAtiva, etapas);
    if (!valido) { toast.error(erros[0]); return; }
    setSalvando(true);
    const maxOrdem = Math.max(0, ...etapasDaFase.map((e) => e.ordem));
    const { error } = await supabase.from('etapas_funil').insert({
      fase: faseAtiva,
      nome: novaEtapa.trim(),
      ordem: maxOrdem + 1,
      eh_padrao: false,
      criada_por: usuarioId,
    });
    setSalvando(false);
    if (error) { toast.error('Erro ao criar etapa: ' + error.message); return; }
    toast.success('Etapa criada!');
    setNovaEtapa('');
    onAtualizar();
  };

  const handleExcluir = async (etapa: EtapaFunil) => {
    // Verifica se há processos ativos nessa etapa
    const { count } = await supabase
      .from('casos')
      .select('id', { count: 'exact', head: true })
      .eq('etapa_id', etapa.id);

    const { pode, motivo } = podeDeletarEtapa(etapa, count ?? 0);
    if (!pode) { toast.error(motivo); return; }

    const { error } = await supabase.from('etapas_funil').delete().eq('id', etapa.id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Etapa excluída.');
    onAtualizar();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-primary border-l border-white/10 shadow-2xl flex flex-col">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-white text-base">Gerenciar Etapas do Funil</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">
            Fechar
          </button>
        </div>

        {/* Seleção de fase */}
        <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto">
          {FASES_FUNIL_CONFIG.map((f) => (
            <button
              key={f.id}
              onClick={() => setFaseAtiva(f.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                faseAtiva === f.id
                  ? `bg-secondary text-primary`
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de etapas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className={cn('text-xs font-semibold mb-3', faseConfig?.corHeader)}>
            {faseConfig?.label} — {etapasDaFase.length} etapa(s)
          </p>
          {etapasDaFase.map((etapa) => (
            <div
              key={etapa.id}
              className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5"
            >
              <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <span className="flex-1 text-sm text-white">{etapa.nome}</span>
              {etapa.eh_padrao && (
                <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/5">padrão</span>
              )}
              <button
                onClick={() => handleExcluir(etapa)}
                disabled={etapa.eh_padrao}
                title={etapa.eh_padrao ? 'Etapas padrão não podem ser excluídas' : 'Excluir etapa'}
                className="p-1.5 rounded hover:bg-red-500/15 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar nova etapa */}
        <div className="p-4 border-t border-white/5">
          <p className="text-xs text-slate-400 mb-2">Nova etapa em <strong className={faseConfig?.corHeader}>{faseConfig?.label}</strong></p>
          <div className="flex gap-2">
            <Input
              value={novaEtapa}
              onChange={(e) => setNovaEtapa(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdicionarEtapa()}
              placeholder="Nome da nova etapa..."
              className="flex-1 h-9 text-sm bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-secondary rounded-lg"
            />
            <Button
              onClick={handleAdicionarEtapa}
              disabled={!novaEtapa.trim() || salvando}
              size="sm"
              className="bg-secondary hover:opacity-90 text-primary font-bold gap-1"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
