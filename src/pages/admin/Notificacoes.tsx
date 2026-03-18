import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { supabase, Notificacao } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type NotificacaoComProcesso = Notificacao & {
    processos: { numero_cnj: string; etiqueta: string } | null
}

const STATUS_CONFIG = {
    enviado: { label: 'Enviado', icon: <CheckCircle className="w-3.5 h-3.5 text-green-400" />, color: 'text-green-400' },
    falhou: { label: 'Falhou', icon: <XCircle className="w-3.5 h-3.5 text-red-400" />, color: 'text-red-400' },
    pendente: { label: 'Pendente', icon: <Clock className="w-3.5 h-3.5 text-yellow-400" />, color: 'text-yellow-400' },
}

export default function Notificacoes() {
    const { advogado } = useAuth()
    const [notificacoes, setNotificacoes] = useState<NotificacaoComProcesso[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!advogado) return
        supabase
            .from('notificacoes')
            .select('*, processos(numero_cnj, etiqueta)')
            .eq('advogado_id', advogado.id)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data }) => {
                setNotificacoes((data ?? []) as NotificacaoComProcesso[])
                setLoading(false)
            })
    }, [advogado])

    const fmt = (iso: string) =>
        format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    return (
        <div>
            <div className="mb-10">
                <h1 className="font-serif text-3xl font-bold text-white tracking-tight leading-tight">Notificações</h1>
                <p className="text-slate-200 text-sm mt-1 font-medium">Histórico de alertas e comunicações automáticas.</p>
            </div>

            <div className="bg-card border-premium rounded-2xl overflow-hidden shadow-card">
                {loading ? (
                    <div className="py-24 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-secondary mx-auto mb-4" />
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest font-mono">Processando dados...</p>
                    </div>
                ) : notificacoes.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-border/60 flex items-center justify-center mx-auto mb-6">
                            <Bell className="w-7 h-7 text-slate-500" />
                        </div>
                        <p className="text-slate-200 text-sm font-bold">Nenhum comunicado enviado.</p>
                        <p className="text-slate-400 text-xs mt-1">Os alertas via WhatsApp aparecerão listados aqui.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border/20">
                        {notificacoes.map((n) => {
                            const statusCfg = STATUS_CONFIG[n.status_envio] ?? STATUS_CONFIG.pendente
                            return (
                                <li key={n.id} className="group flex items-start gap-5 px-8 py-6 hover:bg-white/[0.01] transition-all">
                                    {/* Ícone canal */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-border/40 flex items-center justify-center group-hover:border-secondary/30 transition-colors">
                                        {n.canal === 'whatsapp' ? (
                                            <svg className="size-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.593-.466-.511-.643-.52-.164-.008-.353-.01-.541-.01-.188 0-.422.05-.623.238-.201.188-.767.75-0.767 1.83 0 1.08.788 2.126.897 2.274.11.148 1.551 2.368 3.758 3.321.524.226.933.361 1.253.463.526.168 1.004.144 1.381.088.421-.063 1.298-.531 1.48-.94.183-.41.183-.762.128-.836-.055-.075-.201-.115-.497-.265zM12 2C6.477 2 2 6.477 2 12c0 1.786.468 3.463 1.287 4.914L2 22l5.244-1.377A9.972 9.972 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                                            </svg>
                                        ) : (
                                            <Bell className="size-5 text-slate-500" />
                                        )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="flex-1 min-w-0">
                                        {/* Processo */}
                                        <div className="flex items-center gap-3 mb-1">
                                            {n.processos ? (
                                                <Link
                                                    to={`/admin/processos/${n.processo_id}`}
                                                    className="font-serif text-base font-bold text-white hover:text-secondary transition-colors truncate"
                                                >
                                                    {n.processos.etiqueta}
                                                </Link>
                                            ) : (
                                                <span className="font-serif text-base font-bold text-slate-400 truncate">Processo removido</span>
                                            )}
                                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-border/40 ${statusCfg.color}`}>
                                                {statusCfg.icon}
                                                {statusCfg.label}
                                            </span>
                                        </div>

                                        {/* Mensagem */}
                                        {n.mensagem_enviada && (
                                            <p className="text-[13px] text-slate-300 font-medium line-clamp-2 leading-relaxed italic">{n.mensagem_enviada}</p>
                                        )}

                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal:</span>
                                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">{n.canal}</span>
                                            </div>
                                            {n.processos && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CNJ:</span>
                                                    <span className="text-[10px] font-mono text-slate-200 tracking-tight font-medium">{n.processos.numero_cnj}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Data */}
                                    <time className="text-[11px] font-bold text-slate-400 tabular-nums uppercase tracking-widest shrink-0 mt-1.5">
                                        {fmt(n.created_at)}
                                    </time>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
