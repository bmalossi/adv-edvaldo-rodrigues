import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings2, Kanban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFunilProcessual } from '@/hooks/useFunilProcessual';
import { FASES_FUNIL_CONFIG, FaseFunil } from '@/domain/crm/etapa-funil';
import { Caso } from '@/domain/crm/caso';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { KanbanColuna } from '@/components/crm/KanbanColuna';
import { FiltroBarra } from '@/components/crm/FiltroBarra';
import { DrawerCaso } from '@/components/crm/DrawerCaso';
import { GerenciarEtapas } from '@/components/crm/GerenciarEtapas';
import { toast } from 'sonner';

interface Perfil { id: string; nome: string; }

export default function FunilProcessual() {
  const { user, papel } = useAuth();
  const isAdmin = papel === 'advogado';

  const {
    etapas, loading, filtros, setFiltros, limparFiltros,
    moverCasoParaEtapa, moverCasoParaFase,
    etapasPorFase, casosPorEtapa, casosSemEtapaNaFase,
    recarregarEtapas, recarregar,
  } = useFunilProcessual();

  const [faseAtiva, setFaseAtiva] = useState<FaseFunil>('negociacao');
  const [casoSelecionado, setCasoSelecionado] = useState<Caso | null>(null);
  const [draggingCasoId, setDraggingCasoId] = useState<string | null>(null);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalAvancarFase, setModalAvancarFase] = useState<Caso | null>(null);

  const faseConfig = FASES_FUNIL_CONFIG.find((f) => f.id === faseAtiva)!;
  const etapasDaFase = etapasPorFase(faseAtiva);

  useEffect(() => {
    supabase
      .from('perfis')
      .select('id, nome')
      .then(({ data }) => setPerfis((data as Perfil[]) ?? []));
  }, []);

  // DnD handlers
  const handleDragStart = (e: React.DragEvent, casoId: string) => {
    setDraggingCasoId(casoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, etapaId: string) => {
    e.preventDefault();
    if (!draggingCasoId) return;
    await moverCasoParaEtapa(draggingCasoId, etapaId);
    setDraggingCasoId(null);
  };

  // Avançar fase: abre modal de confirmação
  const handleAvancarFase = (caso: Caso) => setModalAvancarFase(caso);

  const confirmarAvancarFase = async () => {
    if (!modalAvancarFase) return;
    const idxAtual = FASES_FUNIL_CONFIG.findIndex((f) => f.id === modalAvancarFase.fase_funil);
    if (idxAtual >= FASES_FUNIL_CONFIG.length - 1) {
      toast.info('Este processo já está na última fase.');
      setModalAvancarFase(null);
      return;
    }
    const proximaFase = FASES_FUNIL_CONFIG[idxAtual + 1].id;
    await moverCasoParaFase(modalAvancarFase.id, proximaFase);
    setModalAvancarFase(null);
    if (casoSelecionado?.id === modalAvancarFase.id) setCasoSelecionado(null);
  };

  const totalNaFase = etapasDaFase.reduce(
    (acc, etapa) => acc + casosPorEtapa(etapa.id).length,
    casosSemEtapaNaFase(faseAtiva).length
  );

  return (
    <div className="flex flex-col h-full space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Kanban className="w-6 h-6 text-secondary" />
            <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
              Funil Processual
            </h1>
            <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', faseConfig.corBadge, faseConfig.corBorda)}>
              {faseConfig.label}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{faseConfig.descricao}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGerenciarAberto(true)}
              className="border-white/10 text-slate-300 hover:text-white gap-1.5 text-xs rounded-xl"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Etapas
            </Button>
          )}
          <Button asChild size="sm" className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl gap-1.5 text-xs">
            <Link to="/admin/crm/casos/novo">
              <Plus className="w-3.5 h-3.5" />
              Novo Processo
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <FiltroBarra filtros={filtros} onChange={setFiltros} onLimpar={limparFiltros} perfis={perfis} />

      {/* Abas das 8 fases */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {FASES_FUNIL_CONFIG.map((fase) => {
          const etapasFase = etapasPorFase(fase.id);
          const count = etapasFase.reduce((acc, e) => acc + casosPorEtapa(e.id).length, casosSemEtapaNaFase(fase.id).length);
          return (
            <button
              key={fase.id}
              onClick={() => setFaseAtiva(fase.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border',
                faseAtiva === fase.id
                  ? cn('bg-secondary text-primary border-secondary shadow-md shadow-secondary/20')
                  : 'text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
              )}
            >
              {fase.label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  faseAtiva === fase.id ? 'bg-primary/30' : 'bg-white/10'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contador total da fase */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Total em <strong className={faseConfig.corHeader}>{faseConfig.label}</strong>:</span>
        <span className="px-2 py-0.5 rounded-lg bg-secondary/20 text-secondary font-bold text-sm">{totalNaFase}</span>
      </div>

      {/* Board Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm animate-pulse">
          Carregando funil processual...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {etapasDaFase.map((etapa) => (
            <KanbanColuna
              key={etapa.id}
              etapa={etapa}
              casos={casosPorEtapa(etapa.id)}
              corHeader={faseConfig.corHeader}
              corBorda={faseConfig.corBorda}
              isAdmin={isAdmin}
              onAbrirDrawer={setCasoSelecionado}
              onAvancarFase={handleAvancarFase}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}

          {/* Botão "+ Adicionar outra etapa" à direita de todas as colunas (estilo ADVBOX) */}
          {isAdmin && (
            <div className="flex flex-col items-center justify-start min-w-[220px] w-[220px] flex-shrink-0 pt-1">
              <button
                onClick={() => setGerenciarAberto(true)}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-secondary/60 bg-white/[0.02] hover:bg-secondary/10 text-slate-400 hover:text-white transition-all text-xs font-semibold group shadow-sm"
              >
                <Plus className="w-4 h-4 text-secondary group-hover:scale-125 transition-transform" />
                <span>+ Adicionar outra etapa</span>
              </button>
            </div>
          )}

          {etapasDaFase.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm py-16">
              <p>Nenhuma etapa configurada para esta fase.</p>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setGerenciarAberto(true)} className="border-white/10 text-slate-300 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Adicionar etapa
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drawer lateral */}
      <DrawerCaso
        caso={casoSelecionado}
        onFechar={() => setCasoSelecionado(null)}
        onAvancarFase={handleAvancarFase}
        onAtualizado={recarregar}
      />

      {/* Gerenciar etapas (admin) */}
      {gerenciarAberto && (
        <GerenciarEtapas
          etapas={etapas}
          onFechar={() => setGerenciarAberto(false)}
          onAtualizar={recarregarEtapas}
          usuarioId={user?.id ?? ''}
        />
      )}

      {/* Modal de confirmação de avanço de fase */}
      {modalAvancarFase && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setModalAvancarFase(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-primary border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
              <h3 className="font-bold text-white text-base">Avançar fase?</h3>
              <p className="text-slate-300 text-sm">
                O processo <strong className="text-white">"{modalAvancarFase.titulo}"</strong> será movido para a próxima fase do funil.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-slate-300" onClick={() => setModalAvancarFase(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-secondary hover:opacity-90 text-primary font-bold" onClick={confirmarAvancarFase}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
