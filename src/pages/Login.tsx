import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) return

        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)

        if (error) {
            toast.error('Credenciais inválidas. Verifique e-mail e senha.')
            return
        }

        navigate('/admin/crm/funil', { replace: true })
    }

    const handleResetPassword = async () => {
        if (!email) {
            toast.error('Informe seu e-mail para recuperar a senha.')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login`,
        })
        setLoading(false)

        if (error) {
            toast.error('Erro ao enviar e-mail de recuperação.')
            return
        }

        toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            {/* Fundo decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 mb-4">
                        <Scale className="w-7 h-7 text-slate-950" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">JusTrack</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Painel de monitoramento de processos
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-lg font-semibold text-white mb-6">Entrar</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <Label htmlFor="email" className="text-slate-300 text-sm mb-1.5 block">
                                E-mail
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="advogado@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20"
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-slate-300 text-sm mb-1.5 block">
                                Senha
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-1">
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="text-[11px] text-amber-500/70 hover:text-amber-500 transition-colors"
                                >
                                    Esqueci minha senha
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    Adv. Edvaldo Rodrigues © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    )
}
