import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// Valida padrão CNJ: 0000000-00.0000.0.00.0000
const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/

function aplicarMascaraCNJ(value: string): string {
    const nums = value.replace(/\D/g, '').slice(0, 20)
    let result = ''
    if (nums.length > 0) result = nums.slice(0, 7)
    if (nums.length > 7) result += '-' + nums.slice(7, 9)
    if (nums.length > 9) result += '.' + nums.slice(9, 13)
    if (nums.length > 13) result += '.' + nums.slice(13, 14)
    if (nums.length > 14) result += '.' + nums.slice(14, 16)
    if (nums.length > 16) result += '.' + nums.slice(16, 20)
    return result
}

const STATUS_OPTIONS = [
    { value: 'ativo', label: 'Ativo' },
    { value: 'arquivado', label: 'Arquivado' },
    { value: 'suspenso', label: 'Suspenso' },
    { value: 'encerrado', label: 'Encerrado' },
]

export default function ProcessoNovo() {
    const { advogado } = useAuth()
    const navigate = useNavigate()

    const [numeroCnj, setNumeroCnj] = useState('')
    const [etiqueta, setEtiqueta] = useState('')
    const [dataAtualizacao, setDataAtualizacao] = useState('')
    const [status, setStatus] = useState<'ativo' | 'arquivado' | 'suspenso' | 'encerrado'>('ativo')
    const [loading, setLoading] = useState(false)
    const [erros, setErros] = useState<{ numeroCnj?: string; etiqueta?: string }>({})

    const handleNumeroCnjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNumeroCnj(aplicarMascaraCNJ(e.target.value))
        if (erros.numeroCnj) setErros((ev) => ({ ...ev, numeroCnj: undefined }))
    }

    const validar = () => {
        const novosErros: typeof erros = {}
        if (!CNJ_REGEX.test(numeroCnj)) {
            novosErros.numeroCnj = 'Formato inválido. Use: 0000000-00.0000.0.00.0000'
        }
        if (!etiqueta.trim()) {
            novosErros.etiqueta = 'O apelido é obrigatório'
        }
        setErros(novosErros)
        return Object.keys(novosErros).length === 0
    }

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validar()) return

        if (!advogado) {
            toast.error('Erro de perfil', {
                description: 'Perfil de advogado não encontrado. Recarregue a página ou faça login novamente.'
            })
            return
        }

        setLoading(true)

        const fallbackDate = '1900-01-01 00:00:00'
        // Ao remover o .toISOString(), enviamos a string yyyy-MM-dd HH:mm:ss 
        // para que o banco (configurado em SP) interprete corretamente o fuso.
        const finalDate = dataAtualizacao ? dataAtualizacao.replace('T', ' ') + ':00' : fallbackDate

        const { error } = await supabase.from('processos').insert({
            advogado_id: advogado.id,
            numero_cnj: numeroCnj,
            etiqueta: etiqueta.trim(),
            status_processo: status,
            ativo: true,
            data_hora_ultima_atualizacao_datajud: finalDate,
        })
        setLoading(false)

        if (error) {
            if (error.code === '23505') {
                setErros({ numeroCnj: 'Este processo já está cadastrado.' })
            } else {
                toast.error('Erro ao cadastrar processo. Tente novamente.')
            }
            return
        }

        toast.success('Processo cadastrado com sucesso!')
        navigate('/admin/processos')
    }

    return (
        <div className="max-w-lg">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                >
                    <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Novo processo</h1>
                    <p className="text-slate-200 text-sm mt-1 font-medium italic">Configure o monitoramento automático via DataJud</p>
                </div>
            </div>

            <div className="bg-card border-premium rounded-2xl p-8 shadow-card relative overflow-hidden">
                {/* Decorative accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />

                <form onSubmit={handleSalvar} className="space-y-7 relative">
                    {/* Número CNJ */}
                    <div>
                        <Label htmlFor="numero-cnj" className="text-slate-200 text-sm mb-1.5 block font-bold tracking-tight">
                            Número do processo (CNJ) <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="numero-cnj"
                            type="text"
                            inputMode="numeric"
                            placeholder="0000000-00.0000.0.00.0000"
                            value={numeroCnj}
                            onChange={handleNumeroCnjChange}
                            className={`h-12 bg-slate-900 border-border/60 text-white font-mono placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all ${erros.numeroCnj ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        />
                        {erros.numeroCnj && (
                            <p className="text-red-400 text-xs mt-1 font-bold italic">{erros.numeroCnj}</p>
                        )}
                        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
                            O tribunal e demais dados serão identificados automaticamente pelo sistema.
                        </p>
                    </div>

                    {/* Apelido interno */}
                    <div>
                        <Label htmlFor="etiqueta" className="text-slate-200 text-sm mb-1.5 block font-bold tracking-tight">
                            Apelido interno <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="etiqueta"
                            type="text"
                            placeholder="Ex.: Reclamatória João Silva, Inventário Maria..."
                            value={etiqueta}
                            onChange={(e) => {
                                setEtiqueta(e.target.value)
                                if (erros.etiqueta) setErros((ev) => ({ ...ev, etiqueta: undefined }))
                            }}
                            className={`h-12 bg-slate-900 border-border/60 text-white placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all ${erros.etiqueta ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        />
                        {erros.etiqueta && (
                            <p className="text-red-400 text-xs mt-1 font-bold italic">{erros.etiqueta}</p>
                        )}
                    </div>

                    {/* Data de Última Atualização */}
                    <div>
                        <Label htmlFor="data-atualizacao" className="text-slate-200 text-sm mb-1.5 block font-bold tracking-tight">
                            Data de última atualização (Opcional)
                        </Label>
                        <Input
                            id="data-atualizacao"
                            type="datetime-local"
                            value={dataAtualizacao}
                            onChange={(e) => setDataAtualizacao(e.target.value)}
                            className="w-full h-12 bg-slate-900 border-border/60 text-white placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary/20 rounded-xl transition-all [color-scheme:dark]"
                        />
                        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
                            Se não preenchido, o sistema assumirá a data padrão (01/01/1900) para forçar uma varredura completa.
                        </p>
                    </div>

                    {/* Status */}
                    <div>
                        <Label htmlFor="status" className="text-slate-200 text-sm mb-1.5 block font-bold tracking-tight">
                            Status inicial
                        </Label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as typeof status)}
                            className="w-full h-12 px-4 bg-slate-900 border border-border/60 text-white text-sm rounded-xl focus:outline-none focus:border-secondary transition-all cursor-pointer appearance-none"
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Aviso */}
                    <div className="flex items-start gap-4 bg-secondary/5 border border-secondary/20 rounded-xl px-5 py-4">
                        <span className="text-lg">⚖️</span>
                        <p className="text-[11px] text-secondary/80 leading-relaxed font-medium uppercase tracking-wider">
                            Após o cadastro, o sistema automático irá consultar o DataJud e preencher os dados completos do processo na próxima execução.
                        </p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="flex-1 h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-[1.5] h-12 bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg shadow-secondary/10 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Cadastrar processo'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
