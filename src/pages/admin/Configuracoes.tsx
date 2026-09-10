import { useEffect, useState, useRef } from 'react'
import {
    Loader2,
    Save,
    FileText,
    Upload,
    Trash2,
    Image as ImageIcon,
    Shield,
    User as UserIcon,
    Users,
    History,
    Lock,
    PenTool,
    Building2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabPerfisAcesso } from '@/components/admin/rbac/TabPerfisAcesso'
import { TabUsuarios } from '@/components/admin/rbac/TabUsuarios'
import { TabAuditLog } from '@/components/admin/rbac/TabAuditLog'
import { toast } from 'sonner'
import {
    carregarConfigDocumentosLocal,
    salvarConfigDocumentosLocal,
    carregarLogoLocal,
    salvarLogoLocal,
    removerLogoLocal,
    carregarAssinaturaLocal,
    salvarAssinaturaLocal,
    removerAssinaturaLocal,
    DEFAULTS_CONFIG
} from '@/domain/crm/documentos/config-local'
import { ConfigDocumentos } from '@/domain/crm/documentos/tipos'

export default function Configuracoes() {
    const { user, advogado, perfil, role, papel } = useAuth()
    const isAdm = role?.nome === 'Administrador' || papel === 'Administrador' || papel === 'admin'
    const canVerPerfis = usePermission('perfis_acesso', 'visualizar')
    const canVerUsuarios = usePermission('usuarios', 'visualizar')
    const [abaAtiva, setAbaAtiva] = useState<'geral' | 'perfis' | 'usuarios' | 'auditoria'>('geral')

    // Dados do Perfil
    const [nome, setNome] = useState('')
    const [oab, setOab] = useState('')
    const [telefone, setTelefone] = useState('')
    const [email, setEmail] = useState('')
    const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null)
    const [salvandoPerfil, setSalvandoPerfil] = useState(false)
    const fileAssinaturaRef = useRef<HTMLInputElement>(null)

    // Segurança
    const [novaSenha, setNovaSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [salvandoSenha, setSalvandoSenha] = useState(false)

    // Configurações de Documentos Jurídicos & Logotipo (Apenas Administrador)
    const [docConfig, setDocConfig] = useState<ConfigDocumentos>(DEFAULTS_CONFIG)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [salvandoDocs, setSalvandoDocs] = useState(false)
    const fileLogoRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user && !perfil && !advogado) return

        setNome(perfil?.nome || advogado?.nome || '')
        setOab(perfil?.oab || advogado?.oab || '')
        setTelefone(perfil?.telefone || advogado?.telefone_whatsapp || '')
        setEmail(perfil?.email || advogado?.email || '')

        // Assinatura digital exclusiva de cada perfil
        const assinaturaSalva = perfil?.assinatura_url || (user?.id ? carregarAssinaturaLocal(user.id) : null)
        setAssinaturaUrl(assinaturaSalva)

        // Configurações institucionais
        setDocConfig(carregarConfigDocumentosLocal())
        setLogoUrl(carregarLogoLocal())

        setLoading(false)
    }, [user?.id, perfil?.id, perfil?.assinatura_url, advogado?.id])

    const handleSalvarPerfil = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user && !advogado) return
        setSalvandoPerfil(true)

        try {
            if (user?.id) {
                const { error: perfilErr } = await supabase
                    .from('perfis')
                    .update({
                        nome: nome.trim(),
                        oab: oab.trim() || null,
                        telefone: telefone.trim() || null,
                        email: email.trim(),
                        assinatura_url: assinaturaUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id)

                if (perfilErr) throw perfilErr
            }

            if (advogado?.id && advogado?.user_id === user?.id) {
                await supabase
                    .from('advogados')
                    .update({
                        nome: nome.trim(),
                        oab: oab.trim() || null,
                        telefone_whatsapp: telefone.trim() || null,
                        email: email.trim(),
                        assinatura_url: assinaturaUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', advogado.id)
            }

            toast.success('Perfil atualizado com sucesso!')
        } catch (err: any) {
            console.error('Erro ao atualizar perfil:', err)
            toast.error(err?.message || 'Falha ao salvar dados do perfil.')
        } finally {
            setSalvandoPerfil(false)
        }
    }

    const handleSalvarSenha = async (e: React.FormEvent) => {
        e.preventDefault()
        if (novaSenha !== confirmarSenha) {
            toast.error('As senhas não coincidem.')
            return
        }
        if (novaSenha.length < 8) {
            toast.error('A nova senha deve ter no mínimo 8 caracteres.')
            return
        }

        try {
            setSalvandoSenha(true)
            const { error } = await supabase.auth.updateUser({ password: novaSenha })
            if (error) throw error

            toast.success('Senha atualizada com sucesso!')
            setNovaSenha('')
            setConfirmarSenha('')
        } catch (err: any) {
            console.error('Erro ao atualizar senha:', err)
            toast.error(err?.message || 'Erro ao alterar a senha.')
        } finally {
            setSalvandoSenha(false)
        }
    }

    // Assinatura Digital do Perfil Individual
    const handleUploadAssinatura = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem válida (PNG, JPG, WebP).')
            return
        }

        const reader = new FileReader()
        reader.onload = async () => {
            const dataUrl = reader.result as string
            salvarAssinaturaLocal(dataUrl, user?.id)
            setAssinaturaUrl(dataUrl)

            if (user?.id) {
                await supabase
                    .from('perfis')
                    .update({ assinatura_url: dataUrl, updated_at: new Date().toISOString() })
                    .eq('id', user.id)
            }
            if (advogado?.id && advogado?.user_id === user?.id) {
                await supabase
                    .from('advogados')
                    .update({ assinatura_url: dataUrl, updated_at: new Date().toISOString() })
                    .eq('id', advogado.id)
            }

            toast.success('Assinatura digitalizada salva!')
        }
        reader.readAsDataURL(file)
    }

    const handleRemoverAssinatura = async () => {
        if (user?.id) {
            removerAssinaturaLocal(user.id)
        }
        setAssinaturaUrl(null)
        if (fileAssinaturaRef.current) fileAssinaturaRef.current.value = ''

        if (user?.id) {
            await supabase
                .from('perfis')
                .update({ assinatura_url: null, updated_at: new Date().toISOString() })
                .eq('id', user.id)
        }
        if (advogado?.id && advogado?.user_id === user?.id) {
            await supabase
                .from('advogados')
                .update({ assinatura_url: null, updated_at: new Date().toISOString() })
                .eq('id', advogado.id)
        }

        toast.info('Assinatura digitalizada removida.')
    }

    // Logotipo Institucional (Exclusivo Administrador)
    const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem válida (PNG, JPG, WebP).')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = reader.result as string
            salvarLogoLocal(dataUrl)
            setLogoUrl(dataUrl)
            toast.success('Logotipo institucional atualizado!')
        }
        reader.readAsDataURL(file)
    }

    const handleRemoverLogo = () => {
        removerLogoLocal()
        setLogoUrl(null)
        if (fileLogoRef.current) fileLogoRef.current.value = ''
        toast.info('Logotipo institucional removido.')
    }

    const handleSalvarDocConfig = (e: React.FormEvent) => {
        e.preventDefault()
        setSalvandoDocs(true)
        salvarConfigDocumentosLocal(docConfig)
        setSalvandoDocs(false)
        toast.success('Dados institucionais salvos com sucesso!')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header da Página */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">Configurações</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">Gerencie seu perfil profissional, credenciais de acesso e parâmetros do escritório.</p>
                </div>
            </div>

            {/* Abas de Navegação Responsivas */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar scroll-smooth">
                <button
                    type="button"
                    onClick={() => setAbaAtiva('geral')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                        abaAtiva === 'geral'
                            ? 'bg-secondary text-primary font-bold shadow-md shadow-secondary/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <UserIcon className="w-4 h-4" />
                    Geral & Perfil
                </button>

                {canVerPerfis && (
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('perfis')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                            abaAtiva === 'perfis'
                                ? 'bg-secondary text-primary font-bold shadow-md shadow-secondary/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Shield className="w-4 h-4" />
                        Perfis de Acesso
                    </button>
                )}

                {canVerUsuarios && (
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('usuarios')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                            abaAtiva === 'usuarios'
                                ? 'bg-secondary text-primary font-bold shadow-md shadow-secondary/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Usuários
                    </button>
                )}

                {canVerPerfis && (
                    <button
                        type="button"
                        onClick={() => setAbaAtiva('auditoria')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                            abaAtiva === 'auditoria'
                                ? 'bg-secondary text-primary font-bold shadow-md shadow-secondary/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <History className="w-4 h-4" />
                        Auditoria
                    </button>
                )}
            </div>

            {/* Conteúdo Dinâmico por Aba */}
            {abaAtiva === 'perfis' && canVerPerfis ? (
                <TabPerfisAcesso />
            ) : abaAtiva === 'usuarios' && canVerUsuarios ? (
                <TabUsuarios />
            ) : abaAtiva === 'auditoria' && canVerPerfis ? (
                <TabAuditLog />
            ) : (
                <div className="space-y-6">
                    {/* Grid Superior: Dados do Perfil e Segurança */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Seção: Dados do Perfil (Colunas 1 e 2) */}
                        <section className="lg:col-span-2 bg-card border border-white/[0.08] rounded-2xl p-6 relative shadow-lg">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                <div className="p-2 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white tracking-tight">Dados do Perfil</h2>
                                    <p className="text-slate-400 text-xs mt-0.5">Suas informações de identificação e assinatura pessoal no sistema.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSalvarPerfil} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">Nome completo</Label>
                                        <Input
                                            value={nome}
                                            onChange={(e) => setNome(e.target.value)}
                                            placeholder="Seu nome completo"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">Inscrição OAB (se aplicável)</Label>
                                        <Input
                                            value={oab}
                                            onChange={(e) => setOab(e.target.value)}
                                            placeholder="Ex: SP 123456"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">WhatsApp / Celular</Label>
                                        <Input
                                            value={telefone}
                                            onChange={(e) => setTelefone(e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">E-mail de acesso</Label>
                                        <Input
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            type="email"
                                            placeholder="seuemail@advocacia.com"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Bloco: Assinatura Digital Exclusiva do Perfil */}
                                <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <PenTool className="w-4 h-4 text-secondary" />
                                        <span className="text-xs font-semibold text-white">Assinatura Digitalizada Pessoal</span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Exclusiva do seu perfil. Será inserida automaticamente em recibos, procurações e documentos que você emitir.
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                                        <div className="w-36 h-16 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden p-2 shrink-0">
                                            {assinaturaUrl ? (
                                                <img src={assinaturaUrl} alt="Assinatura Pessoal" className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <span className="text-[11px] text-slate-500 font-medium">Sem assinatura</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                type="file"
                                                ref={fileAssinaturaRef}
                                                onChange={handleUploadAssinatura}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileAssinaturaRef.current?.click()}
                                                className="h-9 px-3 text-xs bg-slate-900 border-white/10 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg gap-1.5"
                                            >
                                                <Upload className="w-3.5 h-3.5 text-secondary" />
                                                {assinaturaUrl ? 'Trocar assinatura' : 'Enviar assinatura'}
                                            </Button>
                                            {assinaturaUrl && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoverAssinatura}
                                                    className="h-9 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg gap-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Remover
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        disabled={salvandoPerfil}
                                        className="h-10 px-5 bg-cta-gold hover:opacity-90 text-primary font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-secondary/20 transition-all active:scale-[0.98]"
                                    >
                                        {salvandoPerfil ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Salvando...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Save className="w-4 h-4" />
                                                Salvar Dados do Perfil
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </section>

                        {/* Seção: Segurança da Conta (Coluna 3) */}
                        <section className="bg-card border border-white/[0.08] rounded-2xl p-6 relative shadow-lg">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                <div className="p-2 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white tracking-tight">Segurança</h2>
                                    <p className="text-slate-400 text-xs mt-0.5">Altere sua senha de acesso.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSalvarSenha} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-300">Nova senha</Label>
                                    <Input
                                        type="password"
                                        value={novaSenha}
                                        onChange={(e) => setNovaSenha(e.target.value)}
                                        placeholder="Mínimo 8 caracteres"
                                        className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-300">Confirmar nova senha</Label>
                                    <Input
                                        type="password"
                                        value={confirmarSenha}
                                        onChange={(e) => setConfirmarSenha(e.target.value)}
                                        placeholder="Repita a nova senha"
                                        className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        required
                                    />
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={salvandoSenha || !novaSenha}
                                        className="w-full h-10 bg-cta-gold hover:opacity-90 text-primary font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-secondary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {salvandoSenha ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Atualizando...
                                            </span>
                                        ) : (
                                            'Atualizar Senha'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* Seção: Documentos Jurídicos & Logotipo — EXCLUSIVO ADMINISTRADOR */}
                    {isAdm && (
                        <section className="bg-card border border-white/[0.08] rounded-2xl p-6 relative shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-base font-bold text-white tracking-tight">Documentos Jurídicos & Logotipo</h2>
                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/15 text-secondary border border-secondary/25">
                                                Exclusivo Administrador
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs mt-0.5">Parâmetros institucionais e identidade visual aplicados a contratos, procurações e minutas de todo o escritório.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bloco de Logotipo Institucional */}
                            <div className="p-4 sm:p-5 bg-slate-950/50 rounded-xl border border-white/5 mb-6">
                                <Label className="text-xs font-semibold text-white block mb-2">Logotipo do Cabeçalho dos Documentos</Label>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="w-36 sm:w-44 h-16 sm:h-18 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden p-2 shrink-0">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Logotipo do Escritório" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                <ImageIcon className="w-4 h-4" />
                                                <span>Sem logo</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="file"
                                            ref={fileLogoRef}
                                            onChange={handleUploadLogo}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileLogoRef.current?.click()}
                                            className="h-9 px-3.5 text-xs bg-slate-900 border-white/10 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg gap-1.5"
                                        >
                                            <Upload className="w-3.5 h-3.5 text-secondary" />
                                            {logoUrl ? 'Trocar logotipo' : 'Enviar logotipo'}
                                        </Button>
                                        {logoUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemoverLogo}
                                                className="h-9 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg gap-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Remover
                                            </Button>
                                        )}
                                        <p className="text-[11px] text-slate-400 w-full sm:w-auto mt-1 sm:mt-0 sm:ml-2">
                                            Recomendado: PNG com fundo transparente.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Formulário de Parâmetros Institucionais */}
                            <form onSubmit={handleSalvarDocConfig} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">Razão Social da Sociedade</Label>
                                        <Input
                                            value={docConfig.empresa}
                                            onChange={(e) => setDocConfig({ ...docConfig, empresa: e.target.value })}
                                            placeholder="EDVALDO RODRIGUES FERREIRA SOCIEDADE INDIVIDUAL DE ADVOCACIA"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">OAB Societária</Label>
                                        <Input
                                            value={docConfig.socOab}
                                            onChange={(e) => setDocConfig({ ...docConfig, socOab: e.target.value })}
                                            placeholder="62.067"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">CNPJ da Sociedade</Label>
                                        <Input
                                            value={docConfig.cnpj}
                                            onChange={(e) => setDocConfig({ ...docConfig, cnpj: e.target.value })}
                                            placeholder="00.000.000/0001-00"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">CPF do Advogado Titular (para Recibos)</Label>
                                        <Input
                                            value={docConfig.lawyerCpf}
                                            onChange={(e) => setDocConfig({ ...docConfig, lawyerCpf: e.target.value })}
                                            placeholder="000.000.000-00"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">Chave PIX do Escritório</Label>
                                        <Input
                                            value={docConfig.pix}
                                            onChange={(e) => setDocConfig({ ...docConfig, pix: e.target.value })}
                                            placeholder="(13) 99682-4364 ou e-mail/CNPJ"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">Foro Padrão dos Contratos</Label>
                                        <Input
                                            value={docConfig.foro}
                                            onChange={(e) => setDocConfig({ ...docConfig, foro: e.target.value })}
                                            placeholder="Comarca de Praia Grande/SP"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-slate-300">Prefixo da Numeração</Label>
                                        <Input
                                            value={docConfig.prefixo}
                                            onChange={(e) => setDocConfig({ ...docConfig, prefixo: e.target.value })}
                                            placeholder="ERF"
                                            className="h-10 bg-slate-950/60 border-white/10 text-sm text-white placeholder:text-slate-500 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        disabled={salvandoDocs}
                                        className="h-10 px-5 bg-cta-gold hover:opacity-90 text-primary font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-secondary/20 transition-all active:scale-[0.98]"
                                    >
                                        {salvandoDocs ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Salvando...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Salvar Dados do Escritório
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
