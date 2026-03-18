import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { supabase, Advogado, ConfiguracoesAdvogado } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Configuracoes() {
    const { advogado } = useAuth()

    // Perfil
    const [nome, setNome] = useState('')
    const [oab, setOab] = useState('')
    const [telefone, setTelefone] = useState('')
    const [email, setEmail] = useState('')
    const [salvandoPerfil, setSalvandoPerfil] = useState(false)

    // Preferências
    const [notificarWhatsapp, setNotificarWhatsapp] = useState(true)
    const [consolidarNotificacoes, setConsolidarNotificacoes] = useState(false)
    const [horario, setHorario] = useState('07:00')
    const [salvandoPrefs, setSalvandoPrefs] = useState(false)

    // Segurança
    const [novaSenha, setNovaSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [salvandoSenha, setSalvandoSenha] = useState(false)

    const [loading, setLoading] = useState(true)
    const [inicializado, setInicializado] = useState(false)

    useEffect(() => {
        if (!advogado || inicializado) return
        setNome(advogado.nome)
        setOab(advogado.oab ?? '')
        setTelefone(advogado.telefone_whatsapp ?? '')
        setEmail(advogado.email ?? '')

        supabase
            .from('configuracoes_advogado')
            .select('*')
            .eq('advogado_id', advogado.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setNotificarWhatsapp(data.notificar_whatsapp)
                    setConsolidarNotificacoes(data.consolidar_notificacoes)
                    setHorario(data.horario_notificacao?.slice(0, 5) ?? '07:00')
                }
                setLoading(false)
                setInicializado(true)
            })
    }, [advogado, inicializado])

    const handleSalvarPerfil = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!advogado) return
        setSalvandoPerfil(true)
        const { data, error } = await supabase
            .from('advogados')
            .update({ nome, oab, telefone_whatsapp: telefone, email, updated_at: new Date().toISOString() })
            .eq('id', advogado.id)
            .select()
            .single()

        setSalvandoPerfil(false)
        if (error || !data) {
            console.error("Erro no update perfil:", error);
            toast.error('Não foi possível salvar o perfil. Verifique seus dados.');
            return
        }

        toast.success('Perfil atualizado com sucesso')
        // Forçar um pequeno delay e atualizar a página para que o Sidebar e todos 
        // os componentes consumam o novo contexto atualizado.
        setTimeout(() => {
            window.location.reload()
        }, 1000)
    }

    const handleSalvarPrefs = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!advogado) return
        setSalvandoPrefs(true)
        const { error } = await supabase
            .from('configuracoes_advogado')
            .upsert({
                advogado_id: advogado.id,
                notificar_whatsapp: notificarWhatsapp,
                consolidar_notificacoes: consolidarNotificacoes,
                horario_notificacao: horario,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'advogado_id' })
        setSalvandoPrefs(false)
        if (error) { toast.error('Erro ao salvar preferências'); return }
        toast.success('Preferências salvas')
    }

    const handleSalvarSenha = async (e: React.FormEvent) => {
        e.preventDefault()
        if (novaSenha !== confirmarSenha) {
            toast.error('As senhas não coincidem')
            return
        }
        if (novaSenha.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres')
            return
        }

        setSalvandoSenha(true)
        const { error } = await supabase.auth.updateUser({ password: novaSenha })
        setSalvandoSenha(false)

        if (error) {
            toast.error('Erro ao atualizar senha: ' + error.message)
            return
        }

        toast.success('Senha atualizada com sucesso')
        setNovaSenha('')
        setConfirmarSenha('')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <div className="max-w-xl space-y-8">
            <div>
                <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Configurações</h1>
                <p className="text-slate-300 text-sm mt-1">Gerencie seu perfil profissional e preferências de automação.</p>
            </div>

            {/* Perfil */}
            <section className="bg-card border-premium rounded-2xl p-8 shadow-card relative overflow-hidden">
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                        <Save className="w-4 h-4" />
                    </div>
                    <h2 className="font-serif text-xl font-bold text-white tracking-tight">Dados do advogado</h2>
                </div>
                <form onSubmit={handleSalvarPerfil} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-2">Nome completo</Label>
                            <Input value={nome} onChange={(e) => setNome(e.target.value)}
                                className="h-12 bg-slate-900 border-border/60 text-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all" />
                        </div>
                        <div>
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-2">OAB</Label>
                            <Input value={oab} onChange={(e) => setOab(e.target.value)}
                                placeholder="SP 123456"
                                className="h-12 bg-slate-900 border-border/60 text-white placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all" />
                        </div>
                        <div>
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-2">WhatsApp</Label>
                            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)}
                                placeholder="5511999999999"
                                className="h-12 bg-slate-900 border-border/60 text-white placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all" />
                        </div>
                        <div className="sm:col-span-2">
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-2">E-mail de contato</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="h-12 bg-slate-900 border-border/60 text-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all" />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="submit" disabled={salvandoPerfil} className="px-8 h-11 bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg shadow-secondary/10 transition-all active:scale-[0.98]">
                            {salvandoPerfil ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando</> : 'Salvar alterações'}
                        </Button>
                    </div>
                </form>
            </section>

            {/* Notificações */}
            <section className="bg-card border-premium rounded-2xl p-8 shadow-card relative overflow-hidden">
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.593-.466-.511-.643-.52-.164-.008-.353-.01-.541-.01-.188 0-.422.05-.623.238-.201.188-.767.75-0.767 1.83 0 1.08.788 2.126.897 2.274.11.148 1.551 2.368 3.758 3.321.524.226.933.361 1.253.463.526.168 1.004.144 1.381.088.421-.063 1.298-.531 1.48-.94.183-.41.183-.762.128-.836-.055-.075-.201-.115-.497-.265zM12 2C6.477 2 2 6.477 2 12c0 1.786.468 3.463 1.287 4.914L2 22l5.244-1.377A9.972 9.972 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" /></svg>
                    </div>
                    <h2 className="font-serif text-xl font-bold text-white tracking-tight">Notificações WhatsApp</h2>
                </div>
                <form onSubmit={handleSalvarPrefs} className="space-y-5">
                    <ToggleOption
                        id="notificar-whatsapp"
                        label="Ativar notificações WhatsApp"
                        description="Receber alerta sempre que houver nova movimentação"
                        checked={notificarWhatsapp}
                        onChange={setNotificarWhatsapp}
                    />
                    <ToggleOption
                        id="consolidar"
                        label="Resumo diário"
                        description="Receber um único resumo por dia, no horário definido, em vez de um alerta por movimento"
                        checked={consolidarNotificacoes}
                        onChange={setConsolidarNotificacoes}
                    />
                    {consolidarNotificacoes && (
                        <div className="space-y-2 pl-15">
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">Horário do resumo diário</Label>
                            <Input
                                type="time"
                                value={horario}
                                onChange={(e) => setHorario(e.target.value)}
                                className="h-12 bg-slate-900/50 border-border/40 text-white focus:border-secondary/50 rounded-xl w-36 [color-scheme:dark]"
                            />
                        </div>
                    )}
                    <div className="flex justify-end mt-4">
                        <Button type="submit" disabled={salvandoPrefs} className="px-8 h-11 bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg shadow-secondary/10 transition-all active:scale-[0.98]">
                            {salvandoPrefs ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando</> : 'Confirmar preferências'}
                        </Button>
                    </div>
                </form>
            </section>

            {/* Segurança */}
            <section className="bg-card border-premium rounded-2xl p-8 shadow-card relative overflow-hidden">
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h2 className="font-serif text-xl font-bold text-white tracking-tight">Segurança</h2>
                </div>
                <form onSubmit={handleSalvarSenha} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-2">Nova senha</Label>
                            <Input
                                type="password"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                className="h-12 bg-slate-900 border-border/60 text-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-2">Confirmar senha</Label>
                            <Input
                                type="password"
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                className="h-12 bg-slate-900 border-border/60 text-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="submit" disabled={salvandoSenha} className="px-8 h-11 bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg shadow-secondary/10 transition-all active:scale-[0.98]">
                            {salvandoSenha ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando</> : 'Alterar senha'}
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    )
}

function ToggleOption({
    id, label, description, checked, onChange,
}: {
    id: string
    label: string
    description: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-start gap-5 group">
            <button
                type="button"
                id={id}
                onClick={() => onChange(!checked)}
                className={`relative flex-shrink-0 w-12 h-6.5 rounded-full transition-all duration-300 mt-0.5 border border-border/30 ${checked ? 'bg-secondary/40 border-secondary/50 shadow-[0_0_10px_rgba(201,169,97,0.2)]' : 'bg-slate-800'}`}
            >
                <span
                    className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full shadow-lg transition-transform duration-300 ${checked ? 'translate-x-[22px] bg-white' : 'translate-x-0 bg-slate-500'}`}
                />
            </button>
            <label htmlFor={id} className="flex-1 cursor-pointer select-none">
                <p className="text-[15px] text-white font-bold group-hover:text-secondary transition-colors">{label}</p>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed font-medium">{description}</p>
            </label>
        </div>
    )
}
