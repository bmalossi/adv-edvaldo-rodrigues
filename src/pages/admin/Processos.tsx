import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Eye, ToggleLeft, ToggleRight, CheckCircle, Trash2 } from 'lucide-react'
import { supabase, Processo } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    ativo: { label: 'Ativo', color: 'bg-green-500/20 text-green-400' },
    arquivado: { label: 'Arquivado', color: 'bg-slate-500/20 text-slate-400' },
    suspenso: { label: 'Suspenso', color: 'bg-yellow-500/20 text-yellow-400' },
    encerrado: { label: 'Encerrado', color: 'bg-red-500/20 text-red-400' },
}

export default function Processos() {
    const { advogado } = useAuth()
    const [processos, setProcessos] = useState<Processo[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroNovidade, setFiltroNovidade] = useState(false)
    const [filtroStatus, setFiltroStatus] = useState('')

    const fetchProcessos = async () => {
        if (!advogado) return
        setLoading(true)
        const { data } = await supabase
            .from('processos')
            .select('*')
            .eq('advogado_id', advogado.id)
            .order('updated_at', { ascending: false })
        setProcessos(data ?? [])
        setLoading(false)
    }

    useEffect(() => { fetchProcessos() }, [advogado])

    const handleMarcarVisualizado = async (id: string) => {
        await supabase
            .from('processos')
            .update({ tem_novidade: false })
            .eq('id', id)
        await supabase
            .from('movimentacoes')
            .update({ nova: false })
            .eq('processo_id', id)
        setProcessos((prev) => prev.map((p) => p.id === id ? { ...p, tem_novidade: false } : p))
        toast.success('Novidades marcadas como visualizadas')
    }

    const handleToggleAtivo = async (id: string, ativo: boolean) => {
        await supabase.from('processos').update({ ativo: !ativo }).eq('id', id)
        setProcessos((prev) => prev.map((p) => p.id === id ? { ...p, ativo: !ativo } : p))
        toast.success(!ativo ? 'Monitoramento ativado' : 'Monitoramento pausado')
    }

    const handleExcluirProcesso = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir ESTE processo?\n\nIsso apagará todas as movimentações e o histórico associados. Esta ação não pode ser desfeita.')) return

        const { error } = await supabase.from('processos').delete().eq('id', id)
        if (error) {
            toast.error('Erro ao excluir processo')
            return
        }

        setProcessos((prev) => prev.filter((p) => p.id !== id))
        toast.success('Processo excluído')
    }

    const processosFiltrados = processos.filter((p) => {
        const termo = busca.toLowerCase()
        const buscaOk = !busca || p.numero_cnj.includes(termo) || p.etiqueta.toLowerCase().includes(termo)
        const novidadeOk = !filtroNovidade || p.tem_novidade
        const statusOk = !filtroStatus || p.status_processo === filtroStatus
        return buscaOk && novidadeOk && statusOk
    })

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Processos</h1>
                    <p className="text-slate-200 text-sm mt-1">
                        Gerencie e monitore <span className="text-secondary font-bold">{processos.length} processo{processos.length !== 1 ? 's' : ''}</span> ativos em tempo real.
                    </p>
                </div>
                <Link
                    to="/admin/processos/novo"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-cta-gold hover:opacity-90 text-primary rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 transition-all duration-200 active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    Novo processo
                </Link>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4 mb-10 bg-card/40 border-premium p-4 rounded-2xl">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Pesquisar por CNJ ou etiqueta..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-10 h-10 bg-slate-900/50 border-border/40 text-white placeholder:text-slate-400 focus:border-secondary focus:ring-secondary/20 rounded-xl transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="h-10 px-4 bg-slate-900/50 border border-border/40 text-white text-sm rounded-xl focus:outline-none focus:border-secondary transition-all cursor-pointer appearance-none min-w-[160px]"
                    >
                        <option value="">Todos os status</option>
                        <option value="ativo">Ativos</option>
                        <option value="arquivado">Arquivados</option>
                        <option value="suspenso">Suspensos</option>
                        <option value="encerrado">Encerrados</option>
                    </select>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFiltroNovidade(!filtroNovidade)}
                        className={cn(
                            "h-10 px-4 rounded-xl border border-transparent transition-all",
                            filtroNovidade
                                ? 'bg-secondary/10 text-secondary border-secondary/20 font-bold'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Com novidade
                    </Button>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-card border-premium rounded-2xl shadow-card overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center text-slate-500 text-sm font-medium italic">Sincronizando processos...</div>
                ) : processosFiltrados.length === 0 ? (
                    <div className="p-16 text-center">
                        <FolderEmpty />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/40 text-left bg-white/[0.03]">
                                    <th className="px-6 py-4 text-slate-200 font-bold uppercase tracking-widest text-[10px]">Processo</th>
                                    <th className="px-6 py-4 text-slate-200 font-bold uppercase tracking-widest text-[10px] hidden md:table-cell">Tribunal</th>
                                    <th className="px-6 py-4 text-slate-200 font-bold uppercase tracking-widest text-[10px] hidden lg:table-cell">Última atualização</th>
                                    <th className="px-6 py-4 text-slate-200 font-bold uppercase tracking-widest text-[10px]">Status</th>
                                    <th className="px-6 py-4 text-slate-200 font-bold uppercase tracking-widest text-[10px] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {processosFiltrados.map((p) => (
                                    <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {p.tem_novidade && (
                                                    <div className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 animate-pulse outline outline-4 outline-secondary/20" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-white font-bold truncate group-hover:text-secondary transition-colors">
                                                        {p.etiqueta}
                                                    </p>
                                                    <p className="text-slate-300 text-[11px] font-mono tracking-tight truncate border-l border-white/20 pl-2 mt-1 font-medium">{p.numero_cnj}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-100 text-xs hidden md:table-cell font-medium">
                                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-border">
                                                {p.tribunal_base ?? 'Detectando...'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-200 text-xs font-bold tabular-nums hidden lg:table-cell">
                                            {p.data_hora_ultima_atualizacao_datajud
                                                ? format(parseISO(p.data_hora_ultima_atualizacao_datajud), "dd/MM/yy HH:mm", { locale: ptBR })
                                                : <span className="text-slate-500 italic">—</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${STATUS_LABELS[p.status_processo]?.color}`}>
                                                {STATUS_LABELS[p.status_processo]?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                                                {p.tem_novidade && (
                                                    <button
                                                        title="Marcar visualizado"
                                                        onClick={() => handleMarcarVisualizado(p.id)}
                                                        className="p-2 text-green-400/70 hover:text-green-400 hover:bg-green-400/10 rounded-xl transition-all"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    title={p.ativo ? 'Pausar monitoramento' : 'Ativar monitoramento'}
                                                    onClick={() => handleToggleAtivo(p.id, p.ativo)}
                                                    className="p-2 text-slate-400 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                                                >
                                                    {p.ativo ? <ToggleRight className="w-5 h-5 text-secondary" /> : <ToggleLeft className="w-5 h-5" />}
                                                </button>
                                                <Link
                                                    to={`/admin/processos/${p.id}`}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    title="Excluir"
                                                    onClick={() => handleExcluirProcesso(p.id)}
                                                    className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

function FolderEmpty() {
    return (
        <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-3xl bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-inner">
                <Plus className="w-8 h-8 text-secondary/60" />
            </div>
            <div className="text-center">
                <p className="font-serif text-lg font-semibold text-white">Nenhum processo</p>
                <p className="text-slate-500 text-sm mt-1 max-w-[240px]">
                    Comece cadastrando seu primeiro processo para monitoramento automático.
                </p>
            </div>
            <Button asChild className="bg-cta-gold text-primary font-bold hover:scale-105 transition-transform rounded-xl px-8">
                <Link to="/admin/processos/novo">Cadastrar agora</Link>
            </Button>
        </div>
    )
}
