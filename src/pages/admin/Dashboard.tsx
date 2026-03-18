import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, AlertCircle, Activity, Clock, Plus } from 'lucide-react'
import { supabase, Processo, Movimentacao } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type KPI = {
    total: number
    comNovidade: number
    ultimoCiclo: string | null
}

export default function Dashboard() {
    const { advogado } = useAuth()
    const [kpi, setKpi] = useState<KPI>({ total: 0, comNovidade: 0, ultimoCiclo: null })
    const [recentMov, setRecentMov] = useState<(Movimentacao & { processos: { numero_cnj: string; etiqueta: string } })[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!advogado) return

        const fetchData = async () => {
            setLoading(true)

            // KPIs: processos
            const { data: processos } = await supabase
                .from('processos')
                .select('id, tem_novidade, data_ultima_consulta_n8n, ativo')
                .eq('advogado_id', advogado.id)

            const total = processos?.length ?? 0
            const comNovidade = processos?.filter((p: Processo) => p.tem_novidade).length ?? 0
            const ultimoCiclo = processos?.reduce((acc: string | null, p: Processo) => {
                if (!p.data_ultima_consulta_n8n) return acc
                if (!acc || p.data_ultima_consulta_n8n > acc) return p.data_ultima_consulta_n8n
                return acc
            }, null) ?? null

            setKpi({ total, comNovidade, ultimoCiclo })

            // Últimas 8 movimentações
            const processIds = processos?.map((p: Processo) => p.id) ?? []
            if (processIds.length > 0) {
                const { data: movs } = await supabase
                    .from('movimentacoes')
                    .select(`*, processos(numero_cnj, etiqueta)`)
                    .in('processo_id', processIds)
                    .order('data_hora', { ascending: false })
                    .limit(8)

                setRecentMov((movs ?? []) as (Movimentacao & { processos: { numero_cnj: string; etiqueta: string } })[])
            }

            setLoading(false)
        }

        fetchData()
    }, [advogado])

    const formatDate = (iso: string) =>
        format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-slate-200 text-sm mt-1">
                        Seja bem-vindo, <span className="text-secondary font-bold">{advogado?.nome?.split(' ')[0] ?? 'Advogado'}</span>. Aqui está o resumo de hoje.
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <KPICard
                    icon={<FolderOpen className="w-6 h-6 text-blue-400" />}
                    label="Processos ativos"
                    value={loading ? '—' : String(kpi.total)}
                    bg="bg-blue-400/10"
                />
                <KPICard
                    icon={<AlertCircle className="w-6 h-6 text-secondary" />}
                    label="Com novidade"
                    value={loading ? '—' : String(kpi.comNovidade)}
                    bg="bg-secondary/10"
                    highlight={kpi.comNovidade > 0}
                />
                <KPICard
                    icon={<Clock className="w-6 h-6 text-green-400" />}
                    label="Última consulta"
                    value={loading || !kpi.ultimoCiclo ? 'Pendente' : formatDate(kpi.ultimoCiclo)}
                    bg="bg-green-400/10"
                    small
                />
            </div>

            {/* Feed de movimentações recentes */}
            <div className="bg-card border-premium rounded-2xl shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <Activity className="w-4 h-4 text-secondary" />
                        </div>
                        <h2 className="font-serif text-lg font-semibold text-white tracking-tight">Movimentações recentes</h2>
                    </div>
                    <Link to="/admin/processos" className="text-xs font-bold text-secondary hover:text-secondary/80 uppercase tracking-widest transition-colors">
                        Ver todos
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
                ) : recentMov.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        Nenhuma movimentação registrada ainda.
                    </div>
                ) : (
                    <ul className="divide-y divide-border/30">
                        {recentMov.map((mov) => (
                            <li key={mov.id} className="group relative">
                                <Link
                                    to={`/admin/processos/${mov.processo_id}`}
                                    className="flex items-start gap-4 px-6 py-5 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${mov.nova ? 'bg-secondary animate-pulse' : 'bg-slate-700'}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-white font-semibold truncate group-hover:text-secondary transition-colors">
                                                {mov.nome ?? 'Movimentação'}
                                            </p>
                                            {mov.nova && (
                                                <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Novo</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-300 mt-1 truncate">
                                            <span className="text-secondary font-bold">{mov.processos?.etiqueta}</span> · <span className="text-slate-400 font-medium">{mov.processos?.numero_cnj}</span>
                                        </p>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-bold tabular-nums bg-slate-900/80 px-2 py-1 rounded border border-border/40 group-hover:border-secondary/40 transition-colors">
                                        {formatDate(mov.data_hora)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

function KPICard({
    icon,
    label,
    value,
    bg,
    highlight = false,
    small = false,
}: {
    icon: React.ReactNode
    label: string
    value: string
    bg: string
    highlight?: boolean
    small?: boolean
}) {
    return (
        <div className={`bg-card border-premium rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group`}>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

            <div className="relative flex items-center gap-4">
                <div className={`${bg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{label}</p>
                    <p className={`font-serif leading-none mt-1.5 ${highlight ? 'text-red-400' : 'text-white'} ${small ? 'text-base' : 'text-3xl'} font-bold`}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    )
}
