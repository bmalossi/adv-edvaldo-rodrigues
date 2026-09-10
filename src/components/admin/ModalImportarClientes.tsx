import { useState, useRef } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Users,
  Loader2,
  X,
  FileText,
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import { supabase, Cliente } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  parseArquivoImportacao,
  baixarModeloPlanilhaClientes,
  ClienteImportadoLinha,
  ModoResolucaoDuplicados,
  ResultadoAnaliseImportacao
} from '@/domain/crm/importacao-clientes'

interface ModalImportarClientesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientesExistentes: Cliente[]
  onSuccess?: () => void
}

export function ModalImportarClientes({
  open,
  onOpenChange,
  clientesExistentes,
  onSuccess
}: ModalImportarClientesProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoAnaliseImportacao | null>(null)
  const [modoDuplicados, setModoDuplicados] = useState<ModoResolucaoDuplicados>('atualizar_vazios')
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState(0)

  const handleSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)
    setAnalisando(true)
    try {
      const res = await parseArquivoImportacao(file, clientesExistentes)
      setResultado(res)
      if (res.validos.length === 0) {
        toast.error('Nenhum contato válido encontrado no arquivo. Verifique se as colunas estão corretas.')
      } else {
        toast.success(`${res.validos.length} contato(s) identificado(s) na planilha.`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao ler arquivo: ' + (err.message || 'formato inválido'))
      setResultado(null)
    } finally {
      setAnalisando(false)
    }
  }

  const handleReset = () => {
    setArquivo(null)
    setResultado(null)
    setProgresso(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmarImportacao = async () => {
    if (!resultado || resultado.validos.length === 0) return

    setImportando(true)
    setProgresso(0)

    try {
      const lista = resultado.validos
      let inseridosCount = 0
      let atualizadosCount = 0
      let puladosCount = 0

      // Separa os novos e os duplicados
      const novosParaInserir: any[] = []
      const duplicadosParaProcessar: ClienteImportadoLinha[] = []

      for (const item of lista) {
        if (!item._duplicado) {
          const { _duplicado, _motivoDuplicado, _clienteExistenteId, ...payload } = item
          novosParaInserir.push({
            ...payload,
            responsavel_id: user?.id || null
          })
        } else {
          duplicadosParaProcessar.push(item)
        }
      }

      // 1. Inserir novos em lotes de 50 para rapidez
      const BATCH_SIZE = 50
      for (let i = 0; i < novosParaInserir.length; i += BATCH_SIZE) {
        const batch = novosParaInserir.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.from('clientes').insert(batch)
        if (error) {
          console.error('Erro no lote de inserção:', error)
          throw error
        }
        inseridosCount += batch.length
        setProgresso(Math.round(((inseridosCount) / lista.length) * 100))
      }

      // 2. Processar duplicados conforme a preferência
      for (const item of duplicadosParaProcessar) {
        if (modoDuplicados === 'pular') {
          puladosCount++
        } else if (item._clienteExistenteId) {
          const { _duplicado, _motivoDuplicado, _clienteExistenteId, ...payload } = item
          
          if (modoDuplicados === 'sobrescrever') {
            await supabase
              .from('clientes')
              .update({
                ...payload,
                updated_at: new Date().toISOString()
              })
              .eq('id', item._clienteExistenteId)
            atualizadosCount++
          } else if (modoDuplicados === 'atualizar_vazios') {
            // Busca o atual para preencher apenas o que for nulo ou vazio
            const atual = clientesExistentes.find(c => c.id === item._clienteExistenteId)
            if (atual) {
              const updates: Record<string, any> = { updated_at: new Date().toISOString() }
              Object.keys(payload).forEach(k => {
                const key = k as keyof typeof payload
                const valAtual = (atual as any)[key]
                const valNovo = payload[key]
                if ((valAtual === null || valAtual === undefined || valAtual === '') && valNovo) {
                  updates[key] = valNovo
                }
              })
              if (Object.keys(updates).length > 1) {
                await supabase.from('clientes').update(updates).eq('id', item._clienteExistenteId)
                atualizadosCount++
              } else {
                puladosCount++
              }
            }
          }
        }
        setProgresso(Math.round(((inseridosCount + atualizadosCount + puladosCount) / lista.length) * 100))
      }

      toast.success(`Importação concluída: ${inseridosCount} novo(s), ${atualizadosCount} atualizado(s), ${puladosCount} pulado(s).`)
      handleReset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro durante a importação: ' + (err.message || 'falha no processamento'))
    } finally {
      setImportando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 flex flex-col bg-slate-900 border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white">
        <DialogHeader className="p-6 border-b border-white/10 bg-slate-950 pr-12">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-serif font-bold text-white">
            <FileSpreadsheet className="w-5 h-5 text-secondary" />
            Importar Lista de Contatos / Clientes em Lote
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Envie sua planilha em Excel (.xlsx, .xls) ou CSV. Os campos e dados de qualificação jurídica serão identificados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Passo 1: Upload ou Download de Modelo */}
          {!resultado ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-secondary/50 bg-slate-950/40 hover:bg-slate-950/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSelecionarArquivo}
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center text-secondary transition-colors mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-white text-base">Clique para selecionar sua planilha</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Suporta arquivos <strong>Excel (.xlsx, .xls)</strong> e <strong>CSV</strong> (qualquer delimitador ou codificação).
                </p>
                {analisando && (
                  <div className="flex items-center gap-2 text-xs text-secondary mt-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analisando planilha...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Planilha Modelo Recomendada</h4>
                    <p className="text-[11px] text-slate-400">Baixe o modelo com as colunas oficiais para preencher ou conferir.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={baixarModeloPlanilhaClientes}
                  className="h-8 border-secondary/40 text-secondary hover:bg-secondary/10 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar Modelo (.csv)
                </Button>
              </div>
            </div>
          ) : (
            /* Passo 2: Sumário da Análise e Opções de Duplicidade */
            <div className="space-y-6">
              {/* Card de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total no arquivo</span>
                  <p className="text-2xl font-bold text-white mt-1">{resultado.totalLidos}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Novos contatos</span>
                  <p className="text-2xl font-bold text-emerald-300 mt-1">{resultado.novos}</p>
                </div>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-amber-400">Já existentes (CRM)</span>
                  <p className="text-2xl font-bold text-amber-300 mt-1">{resultado.duplicados}</p>
                </div>
              </div>

              {/* Opção para tratamento de duplicados */}
              {resultado.duplicados > 0 && (
                <div className="p-4 bg-slate-950 border border-white/10 rounded-xl space-y-3">
                  <Label className="text-slate-300 text-xs font-bold block">
                    Regra para contatos já existentes ({resultado.duplicados} encontrados):
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'atualizar_vazios',
                        label: 'Preencher campos vazios',
                        desc: 'Mantém os dados atuais e preenche o que estiver em branco'
                      },
                      {
                        id: 'pular',
                        label: 'Pular duplicados',
                        desc: 'Não altera os contatos que já existem'
                      },
                      {
                        id: 'sobrescrever',
                        label: 'Sobrescrever existentes',
                        desc: 'Atualiza tudo com os novos dados da planilha'
                      }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setModoDuplicados(opt.id as ModoResolucaoDuplicados)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modoDuplicados === opt.id
                            ? 'bg-secondary/15 border-secondary text-white shadow-sm'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/15'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{opt.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela de Amostra dos Primeiros Contatos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Amostra dos registros lidos:</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-secondary hover:underline text-xs"
                  >
                    Escolher outro arquivo
                  </button>
                </div>

                <div className="border border-white/5 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Nome / Razão Social</th>
                        <th className="p-2.5">CPF / CNPJ</th>
                        <th className="p-2.5">WhatsApp</th>
                        <th className="p-2.5">Cidade/UF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-900/40">
                      {resultado.validos.slice(0, 15).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-2.5">
                            {c._duplicado ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Existente
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Novo
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-medium text-white">{c.nome_razao_social}</td>
                          <td className="p-2.5 font-mono text-slate-400">{c.cpf_cnpj || '—'}</td>
                          <td className="p-2.5">{c.telefone_whatsapp}</td>
                          <td className="p-2.5 text-slate-400">
                            {c.endereco_cidade ? `${c.endereco_cidade}/${c.endereco_uf || 'SP'}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {resultado.validos.length > 15 && (
                  <p className="text-[11px] text-slate-500 text-right">
                    ... e mais {resultado.validos.length - 15} contato(s).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={importando}
            className="text-slate-400 hover:text-white"
          >
            Cancelar
          </Button>

          {resultado && resultado.validos.length > 0 && (
            <div className="flex items-center gap-3">
              {importando && (
                <div className="text-xs text-secondary flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando... {progresso}%
                </div>
              )}
              <Button
                type="button"
                onClick={handleConfirmarImportacao}
                disabled={importando}
                className="bg-cta-gold hover:opacity-90 text-primary font-bold shadow-lg rounded-xl h-10 px-5"
              >
                Confirmar Importação de {resultado.validos.length} Contato(s)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
