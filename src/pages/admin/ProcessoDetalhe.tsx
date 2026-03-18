import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft, CheckCircle, Pencil, Loader2,
    Bell, BellOff, Calendar, Building2, FileText, ChevronRight, Trash2, Activity
} from 'lucide-react'
import { supabase, Processo, Movimentacao, Notificacao } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    ativo: { label: 'Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    arquivado: { label: 'Arquivado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    suspenso: { label: 'Suspenso', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    encerrado: { label: 'Encerrado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}
const STATUS_OPTIONS = ['ativo', 'arquivado', 'suspenso', 'encerrado']

export default function ProcessoDetalhe() {
    const { id } = useParams<{ id: string }>()
    const { advogado } = useAuth()
    const navigate = useNavigate()

    const [processo, setProcesso] = useState<Processo | null>(null)
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
    const [loading, setLoading] = useState(true)
    const [editando, setEditando] = useState(false)
    const [novaEtiqueta, setNovaEtiqueta] = useState('')
    const [novoStatus, setNovoStatus] = useState('')
    const [novaDataAtualizacao, setNovaDataAtualizacao] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [deletando, setDeletando] = useState(false)
    const [abaAtiva, setAbaAtiva] = useState<'movimentacoes' | 'notificacoes'>('movimentacoes')

    const fetchData = async () => {
        if (!id) return
        setLoading(true)

        const [{ data: proc }, { data: movs }, { data: nots }] = await Promise.all([
            supabase.from('processos').select('*').eq('id', id).single(),
            supabase.from('movimentacoes').select('*').eq('processo_id', id).order('data_hora', { ascending: false }),
            supabase.from('notificacoes').select('*').eq('processo_id', id).order('created_at', { ascending: false }),
        ])

        if (!proc) { navigate('/admin/processos'); return }
        setProcesso(proc)
        setMovimentacoes(movs ?? [])
        setNotificacoes(nots ?? [])
        setNovaEtiqueta(proc.etiqueta)
        setNovoStatus(proc.status_processo)

        let dateStr = ''
        if (proc.data_hora_ultima_atualizacao_datajud) {
            try {
                dateStr = format(parseISO(proc.data_hora_ultima_atualizacao_datajud), "yyyy-MM-dd'T'HH:mm")
            } catch (e) {
                // Ignore parse error
            }
        }
        setNovaDataAtualizacao(dateStr)

        setLoading(false)
    }

    useEffect(() => { fetchData() }, [id])

    // Realtime: escuta novos inserts de movimentacoes
    useEffect(() => {
        if (!id) return
        const channel = supabase
            .channel(`movimentacoes-${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'movimentacoes',
                filter: `processo_id=eq.${id}`,
            }, (payload) => {
                setMovimentacoes((prev) => [payload.new as Movimentacao, ...prev])
                setProcesso((p) => p ? { ...p, tem_novidade: true } : p)
                toast('🔔 Nova movimentação recebida!', { description: (payload.new as Movimentacao).nome ?? '' })
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    const handleMarcarVisualizado = async () => {
        if (!id) return

        const [resProcessos, resMovimentacoes] = await Promise.all([
            supabase.from('processos').update({ tem_novidade: false }).eq('id', id).select(),
            supabase.from('movimentacoes').update({ nova: false }).eq('processo_id', id).select(),
        ])

        if (resProcessos.error || resMovimentacoes.error) {
            console.error("Erro ao atualizar processos:", resProcessos.error)
            console.error("Erro ao atualizar movimentacoes:", resMovimentacoes.error)
            toast.error('Erro ao marcar como visualizado. Verifique o console.')
            return
        }

        if (!resProcessos.data || resProcessos.data.length === 0) {
            console.warn("Nenhum processo foi atualizado. (Bloqueio de RLS?)")
            toast.error('Permissão negada ou processo não encontrado.')
            return
        }

        // resMovimentacoes.data can be empty if there are no 'nova' movimentacoes, but usually there are.
        // If there are no new ones, it's fine, but if it's an RLS issue, it also returns empty.

        setProcesso((p) => p ? { ...p, tem_novidade: false } : p)
        setMovimentacoes((prev) => prev.map((m) => ({ ...m, nova: false })))
        toast.success('Novidades marcadas como visualizadas')
    }

    const handleSalvarEdicao = async () => {
        if (!id) return
        setSalvando(true)

        let finalDate: string | null = null
        if (novaDataAtualizacao) {
            // Enviamos no formato "yyyy-MM-dd HH:mm:ss" sem o "Z"
            // Assim o banco (em SP) entende que é o horário brasileiro local.
            finalDate = novaDataAtualizacao.replace('T', ' ') + ':00'
        }

        const { error } = await supabase.from('processos').update({
            etiqueta: novaEtiqueta.trim(),
            status_processo: novoStatus,
            data_hora_ultima_atualizacao_datajud: finalDate,
            updated_at: new Date().toISOString(),
        }).eq('id', id)

        setSalvando(false)

        if (error) {
            toast.error('Erro ao atualizar processo')
            return
        }

        setEditando(false)
        setProcesso((p) => p ? {
            ...p,
            etiqueta: novaEtiqueta.trim(),
            status_processo: novoStatus as Processo['status_processo'],
            data_hora_ultima_atualizacao_datajud: finalDate
        } : p)
        toast.success('Processo atualizado')
    }

    const handleExcluirProcesso = async () => {
        if (!id) return
        if (!window.confirm('Tem certeza que deseja excluir ESTE processo permanentemente?\n\nIsso apagará todas as movimentações e o histórico de envio associados a ele. Esta ação não pode ser desfeita.')) return

        setDeletando(true)
        const { error } = await supabase.from('processos').delete().eq('id', id)

        if (error) {
            setDeletando(false)
            toast.error('Erro ao excluir processo')
            return
        }

        toast.success('Processo excluído com sucesso')
        navigate('/admin/processos')
    }

    const fmt = (iso: string) =>
        format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
        )
    }
    if (!processo) return null

    const statusInfo = STATUS_LABELS[processo.status_processo]
    const temNovidadeGeral = processo.tem_novidade || movimentacoes.some(m => m.nova)


    return (
        <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-300 mb-8">
                <Link to="/admin/processos" className="hover:text-secondary transition-colors">Processos</Link>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-white truncate max-w-[200px]">{processo.etiqueta}</span>
            </div>

            {/* Header */}
            <div className="flex items-start gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="mt-1 p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                >
                    <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                            <h1 className="font-serif text-3xl font-bold text-white tracking-tight leading-tight truncate">{processo.etiqueta}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-slate-300 font-mono text-[13px] tracking-tight font-medium">{processo.numero_cnj}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${statusInfo?.color}`}>
                                {statusInfo?.label}
                            </span>
                            {temNovidadeGeral && (
                                <button
                                    onClick={handleMarcarVisualizado}
                                    className="flex items-center gap-1.5 text-[10px] px-3.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-bold uppercase tracking-tight transition-all active:scale-[0.98]"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Visualizado
                                </button>
                            )}
                            <div className="flex items-center gap-1 border border-border/40 p-1 rounded-xl bg-white/5">
                                <button
                                    onClick={() => setEditando(!editando)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleExcluirProcesso}
                                    disabled={deletando}
                                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    title="Excluir"
                                >
                                    {deletando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edição inline */}
            {editando && (
                <div className="bg-card border-premium border-secondary/30 rounded-2xl p-6 mb-10 shadow-card animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <Pencil className="w-4 h-4 text-secondary" />
                        </div>
                        <h3 className="font-serif text-lg font-bold text-white tracking-tight">Ajustes manuais</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-1">Apelido interno</Label>
                            <Input
                                value={novaEtiqueta}
                                onChange={(e) => setNovaEtiqueta(e.target.value)}
                                className="h-12 bg-slate-900/50 border-border/40 text-white focus:border-secondary/50 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-1">Status do monitoramento</Label>
                            <select
                                value={novoStatus}
                                onChange={(e) => setNovoStatus(e.target.value)}
                                className="w-full h-12 px-4 bg-slate-900/50 border border-border/40 text-white text-sm rounded-xl focus:outline-none focus:border-secondary transition-all appearance-none cursor-pointer"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]?.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <Label className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-1">Última atualização (Sincronização)</Label>
                            <Input
                                type="datetime-local"
                                value={novaDataAtualizacao}
                                onChange={(e) => setNovaDataAtualizacao(e.target.value)}
                                className="w-fit h-12 bg-slate-900/50 border-border/40 text-white focus:border-secondary/50 rounded-xl [color-scheme:dark]"
                            />
                            <p className="text-[10px] text-slate-300 leading-relaxed font-bold pl-1">
                                <span className="text-secondary font-bold uppercase tracking-tighter">Dica:</span> Para reprocessar todos os andamentos, altere para <span className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono">01/01/1900</span>.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-8">
                        <Button variant="ghost" size="sm" onClick={() => setEditando(false)} className="px-6 h-10 text-slate-400 font-bold hover:text-white rounded-xl">
                            Descartar
                        </Button>
                        <Button size="sm" onClick={handleSalvarEdicao} disabled={salvando} className="px-8 h-10 bg-cta-gold text-primary font-bold rounded-xl shadow-lg shadow-secondary/10">
                            {salvando ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Atualizando</> : 'Aplicar mudanças'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <InfoCard icon={<Building2 className="w-4 h-4 text-blue-400" />} label="Tribunal" value={processo.tribunal_base ?? 'Detectando...'} />
                <InfoCard icon={<FileText className="w-4 h-4 text-secondary" />} label="Classe" value={processo.classe_nome ?? 'Não informada'} />
                <InfoCard icon={<FileText className="w-4 h-4 text-slate-400" />} label="Grau" value={processo.grau ?? '—'} />
                <InfoCard
                    icon={<Calendar className="w-4 h-4 text-green-400" />}
                    label="Ajuizamento"
                    value={processo.data_ajuizamento ? format(parseISO(processo.data_ajuizamento), 'dd/MM/yyyy', { locale: ptBR }) : 'Pendente'}
                />
            </div>

            {/* Órgão julgador */}
            {processo.orgao_julgador_nome && (
                <div className="bg-card/40 border-premium rounded-2xl px-5 py-4 mb-10 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary border border-border flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Órgão Julgador</p>
                            <p className="text-[13px] text-white mt-0.5 leading-tight font-bold tracking-tight">{processo.orgao_julgador_nome}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Abas */}
            <div className="flex border-b border-border/40 mb-8 gap-6 px-2">
                {(['movimentacoes', 'notificacoes'] as const).map((aba) => (
                    <button
                        key={aba}
                        onClick={() => setAbaAtiva(aba)}
                        className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${abaAtiva === aba
                            ? 'text-secondary'
                            : 'text-slate-300 hover:text-white'
                            }`}
                    >
                        {aba === 'movimentacoes' ? 'Andamentos' : 'Comunicados'}
                        {abaAtiva === aba && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary shadow-[0_0_10px_rgba(201,169,97,0.4)]" />
                        )}
                        {aba === 'movimentacoes' && movimentacoes.some((m) => m.nova) && (
                            <span className="absolute -top-1 -right-3 w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                        )}
                    </button>
                ))}
            </div>

            {/* Timeline de movimentações */}
            {abaAtiva === 'movimentacoes' && (
                <div className="transition-all duration-300">
                    {movimentacoes.length === 0 ? (
                        <div className="py-20 text-center bg-card/40 border-premium rounded-2xl">
                            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 text-sm font-medium">Nenhum andamento registrado até o momento.</p>
                            <p className="text-slate-600 text-xs mt-1">O JusTrack sincroniza os dados automaticamente.</p>
                        </div>
                    ) : (
                        <div className="relative pl-3">
                            {/* Linha vertical */}
                            <div className="absolute left-[15px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-border/60 via-border/20 to-transparent" />
                            <ul className="space-y-4">
                                {movimentacoes.map((mov, idx) => (
                                    <li
                                        key={mov.id}
                                        className={`relative flex gap-6 pb-6 ${idx === movimentacoes.length - 1 ? 'pb-2' : ''} group`}
                                    >
                                        {/* Dot with pulse for new items */}
                                        <div className={`relative z-10 size-8 rounded-full flex items-center justify-center mt-1 border transition-all duration-500 ${mov.nova
                                            ? 'bg-secondary border-secondary shadow-[0_0_15px_rgba(201,169,97,0.3)]'
                                            : 'bg-primary border-border/40 group-hover:border-secondary/40'
                                            }`}>
                                            <div className={`size-2.5 rounded-full ${mov.nova ? 'bg-primary animate-pulse' : 'bg-slate-600 group-hover:bg-slate-500'}`} />
                                        </div>

                                        {/* Conteúdo */}
                                        <div className={`flex-1 bg-card border-premium rounded-2xl px-6 py-5 shadow-card hover:shadow-card-hover transition-all duration-300 ${mov.nova ? 'border-secondary/30 ring-1 ring-secondary/10' : ''
                                            }`}>
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div className="min-w-0 space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-serif text-[15px] font-bold text-slate-100 tracking-tight leading-snug">
                                                            {mov.nome ?? 'Andamento processual'}
                                                        </h4>
                                                        {mov.nova && (
                                                            <span className="text-[9px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Novo</span>
                                                        )}
                                                    </div>

                                                    {mov.orgao_julgador_nome && (
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{mov.orgao_julgador_nome}</p>
                                                    )}

                                                    {/* Complementos */}
                                                    {mov.complementos_json && Array.isArray(mov.complementos_json) && mov.complementos_json.length > 0 && (
                                                        <div className="mt-3 grid gap-1.5">
                                                            {(mov.complementos_json as { nome?: string; descricao?: string }[])
                                                                .filter(c => c.nome || c.descricao)
                                                                .map((c, i) => (
                                                                    <div key={i} className="flex gap-2 text-[12px] leading-relaxed">
                                                                        <span className="text-secondary/60 font-bold shrink-0">◇</span>
                                                                        <p className="text-slate-400 italic">
                                                                            <span className="text-slate-300 font-medium not-italic">{c.nome}:</span> {c.descricao}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <time className="text-[11px] font-bold text-slate-500 tabular-nums uppercase tracking-widest shrink-0 sm:pt-1">
                                                    {fmt(mov.data_hora)}
                                                </time>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Notificações */}
            {abaAtiva === 'notificacoes' && (
                <div className="bg-card border-premium rounded-2xl overflow-hidden shadow-card animate-in fade-in transition-all">
                    {notificacoes.length === 0 ? (
                        <div className="py-20 text-center">
                            <BellOff className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 text-sm font-medium">Nenhum comunicado enviado.</p>
                            <p className="text-slate-600 text-xs mt-1">Alertas de WhatsApp aparecerão aqui.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/20">
                            {notificacoes.map((n) => (
                                <li key={n.id} className="group flex items-center gap-5 px-6 py-5 hover:bg-white/[0.01] transition-all">
                                    <div className={`relative flex-shrink-0 w-3 h-3 rounded-full ${n.status_envio === 'enviado' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                                        n.status_envio === 'falhou' ? 'bg-red-500' : 'bg-secondary'
                                        }`} />

                                    <div className={`p-2 rounded-lg bg-white/5 border border-border/40 group-hover:border-secondary/30 transition-colors ${n.canal === 'whatsapp' ? 'text-green-500' : 'text-slate-500'
                                        }`}>
                                        {n.canal === 'whatsapp' ? (
                                            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.593-.466-.511-.643-.52-.164-.008-.353-.01-.541-.01-.188 0-.422.05-.623.238-.201.188-.767.75-0.767 1.83 0 1.08.788 2.126.897 2.274.11.148 1.551 2.368 3.758 3.321.524.226.933.361 1.253.463.526.168 1.004.144 1.381.088.421-.063 1.298-.531 1.48-.94.183-.41.183-.762.128-.836-.055-.075-.201-.115-.497-.265zM12 2C6.477 2 2 6.477 2 12c0 1.786.468 3.463 1.287 4.914L2 22l5.244-1.377A9.972 9.972 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                                            </svg>
                                        ) : (
                                            <Bell className="size-5" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{n.mensagem_enviada ?? 'Mensagem automática'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{n.canal}</span>
                                            <span className="text-slate-700">·</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${n.status_envio === 'enviado' ? 'text-green-500' : 'text-red-400'
                                                }`}>{n.status_envio}</span>
                                        </div>
                                    </div>
                                    <time className="text-[11px] font-bold text-slate-500 tabular-nums uppercase tracking-widest shrink-0">
                                        {fmt(n.created_at)}
                                    </time>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-card border-premium rounded-2xl p-5 shadow-sm hover:shadow-card transition-all group">
            <div className="flex items-center gap-2.5 mb-2 px-0.5">
                <div className="p-1.5 bg-primary rounded-lg border border-border/40 group-hover:border-secondary/20 transition-colors">
                    {icon}
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">{label}</span>
            </div>
            <p className="text-[15px] text-white font-bold tracking-tight px-0.5 leading-tight truncate" title={value}>{value}</p>
        </div>
    )
}
