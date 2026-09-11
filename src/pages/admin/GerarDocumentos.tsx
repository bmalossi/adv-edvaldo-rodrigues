import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  FileText,
  FileSignature,
  Download,
  Printer,
  Eye,
  CheckSquare,
  Square,
  Search,
  User,
  Settings,
  Trash2,
  Edit,
  History,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet,
  Save,
  RotateCcw,
  Plus,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { supabase, Cliente, Advogado } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { ModalImportarClientes } from '@/components/admin/ModalImportarClientes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  TipoDocumento,
  ConfigDocumentos,
  OpcoesDocumentoForm,
  DocumentoEmitido,
  AdvogadoConfigDoc,
  ClausulaContrato
} from '@/domain/crm/documentos/tipos'
import {
  carregarConfigDocumentosLocal,
  carregarLogoLocal,
  carregarAssinaturaLocal,
  proximoNumeroDoc,
  DEFAULTS_CONFIG,
  DEFAULTS_FORM_DOCUMENTO,
  CLAUSULAS_PADRAO_CONTRATO,
  carregarPadroesDocumentosLocal,
  salvarPadraoDocumentoLocal,
  restaurarPadraoDocumentoFabrica
} from '@/domain/crm/documentos/config-local'
import {
  buildContrato,
  buildProcuracao,
  buildHipossuficiencia,
  buildIrpf,
  buildRecibo,
  buildResidencia
} from '@/domain/crm/documentos/templates'
import { downloadWord, imprimirDocumento, estilosDocumentoCss } from '@/domain/crm/documentos/exportacao'
import { TIPO_NOMES, dateShort } from '@/domain/crm/documentos/formatacao'

export default function GerarDocumentos() {
  const [searchParams] = useSearchParams()
  const clienteIdUrl = searchParams.get('clienteId')
  const { user, advogado, perfil } = useAuth()

  // Lista de clientes
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [modalImportarOpen, setModalImportarOpen] = useState(false)

  // Documentos selecionados
  const [docsSelecionados, setDocsSelecionados] = useState<Record<TipoDocumento, boolean>>({
    contrato: true,
    procuracao: true,
    hipossuficiencia: false,
    irpf: false,
    residencia: false,
    recibo: false
  })

  // Configurações e ativos
  const [config, setConfig] = useState<ConfigDocumentos>(DEFAULTS_CONFIG)
  const [logo, setLogo] = useState<string | null>(null)
  const [assinatura, setAssinatura] = useState<string | null>(null)

  // Formulário de dados compartilhados e específicos
  const [formData, setFormData] = useState<OpcoesDocumentoForm>(() => {
    const padroes = carregarPadroesDocumentosLocal()
    return {
      ...DEFAULTS_FORM_DOCUMENTO,
      ...padroes,
      contrato: {
        ...DEFAULTS_FORM_DOCUMENTO.contrato,
        ...(padroes.contrato || {}),
        clausulas: padroes.contrato?.clausulas || DEFAULTS_FORM_DOCUMENTO.contrato.clausulas
      },
      procuracao: {
        ...DEFAULTS_FORM_DOCUMENTO.procuracao,
        ...(padroes.procuracao || {})
      },
      hipossuficiencia: {
        ...DEFAULTS_FORM_DOCUMENTO.hipossuficiencia,
        ...(padroes.hipossuficiencia || {})
      },
      irpf: {
        ...DEFAULTS_FORM_DOCUMENTO.irpf,
        ...(padroes.irpf || {})
      },
      recibo: {
        ...DEFAULTS_FORM_DOCUMENTO.recibo,
        ...(padroes.recibo || {})
      },
      residencia: {
        ...DEFAULTS_FORM_DOCUMENTO.residencia,
        ...(padroes.residencia || {})
      }
    }
  })

  // Histórico de emissões
  const [historico, setHistorico] = useState<DocumentoEmitido[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [buscaHistorico, setBuscaHistorico] = useState('')

  // Modal de preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTitulo, setPreviewTitulo] = useState('')

  // Acordeões abertos no formulário
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({
    contrato: true,
    procuracao: true,
    hipossuficiencia: true,
    irpf: true,
    residencia: true,
    recibo: true
  })

  // Sub-aba do contrato: 'parametros' ou 'clausulas'
  const [abaContrato, setAbaContrato] = useState<'parametros' | 'clausulas'>('parametros')

  // Carregar dados iniciais
  useEffect(() => {
    setConfig(carregarConfigDocumentosLocal())
    setLogo(carregarLogoLocal())
    const userSig = perfil?.assinatura_url || advogado?.assinatura_url || carregarAssinaturaLocal(user?.id)
    setAssinatura(userSig)

    // Primeiro vencimento padrão = próximo mês (se não houver padrão salvo)
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    const proximoMes = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    setFormData(prev => ({
      ...prev,
      contrato: {
        ...prev.contrato,
        primeiroVencimento: prev.contrato.primeiroVencimento || proximoMes
      }
    }))

    carregarClientes()
    carregarHistorico()
  }, [])

  // Sincroniza assinatura exclusiva do perfil assim que autenticação carregar
  useEffect(() => {
    if (user || perfil || advogado) {
      const advSig = advogado?.user_id === user?.id ? advogado?.assinatura_url : null
      const userSig = perfil?.assinatura_url || advSig || (user?.id ? carregarAssinaturaLocal(user.id) : null)
      setAssinatura(userSig || null)
    }
  }, [user?.id, perfil?.id, perfil?.assinatura_url, advogado?.id, advogado?.assinatura_url])

  // Atualizar cliente se vier na URL
  useEffect(() => {
    if (clienteIdUrl && clientes.length > 0) {
      const c = clientes.find(item => item.id === clienteIdUrl)
      if (c) setClienteSelecionado(c)
    }
  }, [clienteIdUrl, clientes])

  const carregarClientes = async () => {
    setLoadingClientes(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .is('deleted_at', null)
      .order('nome_razao_social')

    if (!error && data) {
      setClientes(data)
    }
    setLoadingClientes(false)
  }

  const carregarHistorico = async () => {
    setLoadingHistorico(true)
    const { data, error } = await supabase
      .from('documentos_emitidos')
      .select('*')
      .order('emitido_em', { ascending: false })
      .limit(50)

    if (!error && data) {
      setHistorico(data)
    }
    setLoadingHistorico(false)
  }

  // Filtragem de clientes para a busca
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes
    const q = buscaCliente.toLowerCase()
    return clientes.filter(c =>
      c.nome_razao_social.toLowerCase().includes(q) ||
      (c.cpf_cnpj && c.cpf_cnpj.includes(q)) ||
      (c.telefone_whatsapp && c.telefone_whatsapp.includes(q))
    )
  }, [clientes, buscaCliente])

  // Objeto de dados do advogado para renderizar nos templates
  const advDoc: AdvogadoConfigDoc = useMemo(() => {
    return {
      nome: advogado?.nome || 'EDVALDO RODRIGUES FERREIRA',
      oab: advogado?.oab ? (advogado.oab.toUpperCase().includes('OAB') ? advogado.oab : `OAB/SP ${advogado.oab}`) : 'OAB/SP 465.818',
      telefone: advogado?.telefone_whatsapp || '(13) 99682-4364',
      email: advogado?.email || 'edvaldorodrigues.advocacia@gmail.com',
      endereco: 'Avenida Presidente Costa e Silva, nº 733, sala 21, 2º andar – Office Brasil, Boqueirão, Praia Grande/SP'
    }
  }, [advogado])

  // Gerar HTML de um documento específico
  const gerarHtmlDoc = (tipo: TipoDocumento, c: Cliente, num: string): string => {
    const opts = {
      date: formData.data,
      city: formData.cidade,
      uf: formData.uf,
      number: num,
      useSignature: formData.useSignature,
      signatureImg: assinatura
    }

    switch (tipo) {
      case 'contrato':
        return buildContrato(c, advDoc, config, logo, { ...formData.contrato, ...opts })
      case 'procuracao':
        return buildProcuracao(c, advDoc, config, logo, { ...formData.procuracao, ...opts })
      case 'hipossuficiencia':
        return buildHipossuficiencia(c, advDoc, config, logo, { ...formData.hipossuficiencia, ...opts })
      case 'irpf':
        return buildIrpf(c, advDoc, config, logo, { ...formData.irpf, ...opts })
      case 'recibo':
        return buildRecibo(c, advDoc, config, logo, { ...formData.recibo, ...opts })
      case 'residencia':
        return buildResidencia(c, advDoc, config, logo, { ...formData.residencia, ...opts })
      default:
        return ''
    }
  }

  // Lista dos documentos atualmente marcados
  const tiposMarcados = useMemo(() => {
    return (Object.keys(docsSelecionados) as TipoDocumento[]).filter(t => docsSelecionados[t])
  }, [docsSelecionados])

  // Gerar pacote ou documento único
  const gerarPacoteHtml = (commitCounters: boolean = false): { html: string; titulo: string; tipo: string; numero: string } => {
    if (!clienteSelecionado) {
      throw new Error('Selecione um cliente para gerar os documentos.')
    }
    if (tiposMarcados.length === 0) {
      throw new Error('Selecione pelo menos um documento para emissão.')
    }

    if (tiposMarcados.length === 1) {
      const tipo = tiposMarcados[0]
      const numero = proximoNumeroDoc(tipo, config.prefixo, commitCounters)
      const html = gerarHtmlDoc(tipo, clienteSelecionado, numero)
      const titulo = `${TIPO_NOMES[tipo]} - ${clienteSelecionado.nome_razao_social}`
      return { html, titulo, tipo, numero }
    } else {
      const numero = proximoNumeroDoc('lote', config.prefixo, commitCounters)
      const docsHtml = tiposMarcados.map(tipo => {
        const subNum = proximoNumeroDoc(tipo, config.prefixo, commitCounters)
        return gerarHtmlDoc(tipo, clienteSelecionado, subNum)
      })
      const html = `<div class="package-document">${docsHtml.join('')}</div>`
      const titulo = `Pacote (${tiposMarcados.length} docs) - ${clienteSelecionado.nome_razao_social}`
      return { html, titulo, tipo: 'lote', numero }
    }
  }

  // Salvar no histórico Supabase
  const salvarHistorico = async (doc: { html: string; titulo: string; tipo: string; numero: string }) => {
    if (!advogado?.id || !clienteSelecionado) return

    try {
      const { data, error } = await supabase
        .from('documentos_emitidos')
        .insert({
          advogado_id: advogado.id,
          cliente_id: clienteSelecionado.id,
          cliente_nome: clienteSelecionado.nome_razao_social,
          tipo: doc.tipo,
          numero: doc.numero,
          titulo: doc.titulo,
          html_content: doc.html,
          opcoes_json: formData as any
        })
        .select()
        .single()

      if (!error && data) {
        setHistorico(prev => [data, ...prev])
      }
    } catch (e) {
      console.warn('Erro ao salvar no histórico', e)
    }
  }

  // Ações de Botões Principais
  const handleVisualizar = () => {
    try {
      const doc = gerarPacoteHtml(false)
      setPreviewHtml(doc.html)
      setPreviewTitulo(doc.titulo)
      setPreviewOpen(true)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar visualização')
    }
  }

  const handleGerarWord = async () => {
    try {
      const doc = gerarPacoteHtml(true)
      downloadWord(doc.html, doc.titulo)
      await salvarHistorico(doc)
      toast.success('Documento Word (.doc) baixado com sucesso!')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar Word')
    }
  }

  const handleImprimir = async () => {
    try {
      const doc = gerarPacoteHtml(true)
      imprimirDocumento(doc.html, doc.titulo)
      await salvarHistorico(doc)
      toast.success('Janela de impressão gerada.')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao imprimir')
    }
  }

  // Ações do Histórico
  const handleAbrirHistorico = (item: DocumentoEmitido) => {
    setPreviewHtml(item.html_content)
    setPreviewTitulo(item.titulo)
    setPreviewOpen(true)
  }

  const handleWordHistorico = (item: DocumentoEmitido) => {
    downloadWord(item.html_content, item.titulo)
    toast.success('Word baixado do histórico.')
  }

  const handleExcluirHistorico = async (id: string) => {
    if (!confirm('Deseja realmente remover este documento do histórico?')) return
    const { error } = await supabase.from('documentos_emitidos').delete().eq('id', id)
    if (!error) {
      setHistorico(prev => prev.filter(h => h.id !== id))
      toast.success('Item removido do histórico.')
    } else {
      toast.error('Não foi possível remover o item.')
    }
  }

  const toggleSecao = (key: string) => {
    setSecaoAberta(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSalvarPadrao = <K extends keyof OpcoesDocumentoForm>(
    tipo: K,
    nomeAmigavel: string
  ) => {
    salvarPadraoDocumentoLocal(tipo, formData[tipo])
    toast.success(`Padrão de "${nomeAmigavel}" salvo com sucesso!`, {
      description: 'As próximas emissões utilizarão estas configurações como padrão do escritório.'
    })
  }

  const handleRestaurarPadrao = <K extends keyof OpcoesDocumentoForm>(
    tipo: K,
    nomeAmigavel: string
  ) => {
    restaurarPadraoDocumentoFabrica(tipo)
    setFormData(prev => ({
      ...prev,
      [tipo]: DEFAULTS_FORM_DOCUMENTO[tipo]
    }))
    toast.info(`Padrão de fábrica de "${nomeAmigavel}" restaurado.`)
  }

  // Manipulação de cláusulas do contrato
  const handleAdicionarClausula = () => {
    const atuais = formData.contrato.clausulas || []
    const proximoNum = atuais.length + 1
    const nova: ClausulaContrato = {
      id: `clausula-${Date.now()}`,
      titulo: `CLÁUSULA ${proximoNum}ª – DISPOSIÇÕES ESPECIAIS`,
      conteudo: `${proximoNum}.1. As partes convencionam que...`
    }
    setFormData(prev => ({
      ...prev,
      contrato: {
        ...prev.contrato,
        clausulas: [...(prev.contrato.clausulas || []), nova]
      }
    }))
    setAbaContrato('clausulas')
    toast.success(`Cláusula ${proximoNum}ª adicionada ao contrato.`, {
      description: 'Você pode editar o título e o texto livremente e salvá-la como padrão do escritório.'
    })
  }

  const handleRemoverClausula = (id: string, titulo: string) => {
    if (!confirm(`Deseja remover a cláusula "${titulo}" deste contrato?`)) return
    setFormData(prev => ({
      ...prev,
      contrato: {
        ...prev.contrato,
        clausulas: (prev.contrato.clausulas || []).filter(c => c.id !== id)
      }
    }))
    toast.info('Cláusula removida.')
  }

  const handleMoverClausula = (index: number, direcao: 'cima' | 'baixo') => {
    const atuais = [...(formData.contrato.clausulas || [])]
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1
    if (novoIndex < 0 || novoIndex >= atuais.length) return
    const temp = atuais[index]
    atuais[index] = atuais[novoIndex]
    atuais[novoIndex] = temp
    setFormData(prev => ({
      ...prev,
      contrato: {
        ...prev.contrato,
        clausulas: atuais
      }
    }))
  }

  const handleAtualizarClausula = (id: string, campo: 'titulo' | 'conteudo', valor: string) => {
    setFormData(prev => ({
      ...prev,
      contrato: {
        ...prev.contrato,
        clausulas: (prev.contrato.clausulas || []).map(c =>
          c.id === id ? { ...c, [campo]: valor } : c
        )
      }
    }))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Gerador de Documentos Jurídicos</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/20 text-secondary border border-secondary/30">
              6 Modelos Oficiais
            </span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Emita Contratos, Procurações, Hipossuficiências e Declarações individuais ou em lote.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalImportarOpen(true)}
            className="border-white/15 text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-secondary" />
            Importar Planilha
          </Button>

          <Button asChild variant="outline" className="border-border/60 text-slate-300 hover:text-white rounded-xl">
            <Link to="/admin/configuracoes">
              <Settings className="w-4 h-4 mr-2 text-secondary" />
              Configurar Logo & Dados
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid Principal: Configuração & Emissão */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Dados do Cliente e Parâmetros */}
        <div className="lg:col-span-8 space-y-6">
          {/* Passo 1: Seleção de Cliente */}
          <section className="bg-card border-premium rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="font-serif text-lg font-bold text-white">1. Selecionar Cliente do CRM</h2>
              </div>
              {clienteSelecionado && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClienteSelecionado(null)}
                  className="text-slate-400 hover:text-white h-7 text-xs"
                >
                  Trocar cliente
                </Button>
              )}
            </div>

            {clienteSelecionado ? (
              <div className="p-4 bg-slate-900/80 border border-secondary/30 rounded-xl flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{clienteSelecionado.nome_razao_social}</h3>
                  <div className="text-xs text-slate-300 space-y-0.5 mt-1">
                    <p>
                      <strong>Documento:</strong> {clienteSelecionado.cpf_cnpj || 'Não informado'} |{' '}
                      <strong>RG:</strong> {clienteSelecionado.rg_ie || 'Não informado'}
                    </p>
                    <p>
                      <strong>WhatsApp:</strong> {clienteSelecionado.telefone_whatsapp} |{' '}
                      <strong>E-mail:</strong> {clienteSelecionado.email || 'Não informado'}
                    </p>
                    <p>
                      <strong>Endereço:</strong>{' '}
                      {[
                        clienteSelecionado.endereco_logradouro,
                        clienteSelecionado.endereco_numero && 'nº ' + clienteSelecionado.endereco_numero,
                        clienteSelecionado.endereco_cidade && `${clienteSelecionado.endereco_cidade}/${clienteSelecionado.endereco_uf}`
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Endereço não cadastrado'}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/admin/crm/clientes/${clienteSelecionado.id}`}
                  className="text-secondary hover:underline text-xs flex items-center gap-1 font-medium"
                >
                  Ver Ficha <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, CPF/CNPJ ou WhatsApp..."
                    value={buscaCliente}
                    onChange={e => setBuscaCliente(e.target.value)}
                    className="pl-9 h-11 bg-slate-900 border-border/60 text-white rounded-xl"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto border border-white/5 rounded-xl divide-y divide-white/5 bg-slate-900/40">
                  {loadingClientes ? (
                    <div className="p-4 text-center text-slate-500 text-xs">Carregando clientes...</div>
                  ) : clientesFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">Nenhum cliente encontrado.</div>
                  ) : (
                    clientesFiltrados.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setClienteSelecionado(c)}
                        className="p-3 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors text-sm"
                      >
                        <div>
                          <p className="font-bold text-white text-sm">{c.nome_razao_social}</p>
                          <p className="text-xs text-slate-400">
                            {c.cpf_cnpj || 'Sem CPF/CNPJ'} · {c.telefone_whatsapp} · {c.endereco_cidade || 'Cidade não informada'}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-secondary hover:text-white h-7 text-xs">
                          Selecionar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Passo 2: Seleção de Documentos */}
          <section className="bg-card border-premium rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                <FileSignature className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-white">2. Selecionar Documentos a Emitir</h2>
                <p className="text-xs text-slate-400">Marque os documentos desejados para emissão individual ou em lote unificado.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(
                [
                  { id: 'contrato', label: 'Contrato de Honorários', desc: '5 páginas com escopo, honorários e cláusulas' },
                  { id: 'procuracao', label: 'Procuração Ad Judicia', desc: 'Com poderes do art. 105 CPC' },
                  { id: 'hipossuficiencia', label: 'Declaração de Hipossuficiência', desc: 'Para gratuidade da justiça' },
                  { id: 'irpf', label: 'Isenção de IRPF', desc: 'Declaração sob a Lei 7.115/83' },
                  { id: 'residencia', label: 'Declaração de Residência', desc: 'Própria ou com terceiro' },
                  { id: 'recibo', label: 'Recibo de Pagamento', desc: 'Honorários e parcelas' }
                ] as const
              ).map(item => {
                const ativo = docsSelecionados[item.id]
                return (
                  <div
                    key={item.id}
                    onClick={() => setDocsSelecionados({ ...docsSelecionados, [item.id]: !ativo })}
                    className={cn(
                      'p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none',
                      ativo
                        ? 'bg-secondary/10 border-secondary shadow-[0_0_12px_rgba(201,169,97,0.15)] text-white'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold">{item.label}</span>
                      {ativo ? (
                        <CheckSquare className="w-4 h-4 text-secondary flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 leading-tight">{item.desc}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Passo 3: Dados Gerais da Emissão */}
          <section className="bg-card border-premium rounded-2xl p-6 shadow-card">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Dados Gerais da Emissão</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Data da Emissão</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={e => setFormData({ ...formData, data: e.target.value })}
                  className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs [color-scheme:dark]"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Praia Grande"
                  className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">UF</Label>
                <Input
                  value={formData.uf}
                  onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <Checkbox
                  checked={formData.useSignature}
                  onCheckedChange={v => setFormData({ ...formData, useSignature: !!v })}
                />
                Inserir assinatura digitalizada do advogado (se cadastrada nas Configurações)
              </label>
              {!assinatura && formData.useSignature && (
                <span className="text-[11px] text-amber-400">Nenhuma assinatura cadastrada</span>
              )}
            </div>
          </section>

          {/* Passo 4: Formulários Específicos por Documento */}
          {docsSelecionados.contrato && (
            <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSecao('contrato')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <h3 className="font-bold text-white text-sm">Parâmetros do Contrato de Honorários</h3>
                </div>
                {secaoAberta.contrato ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {secaoAberta.contrato && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  {/* Seletor de visualização do Contrato: Parâmetros vs Cláusulas */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-white/10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAbaContrato('parametros')}
                        className={cn(
                          'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          abaContrato === 'parametros'
                            ? 'bg-secondary/20 text-secondary border border-secondary/30 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Parâmetros Comerciais & Financeiros
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaContrato('clausulas')}
                        className={cn(
                          'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                          abaContrato === 'clausulas'
                            ? 'bg-secondary/20 text-secondary border border-secondary/30 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        <FileText className="w-3.5 h-3.5 text-secondary" />
                        Texto das Cláusulas do Modelo
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-secondary/20 text-secondary font-bold">
                          {formData.contrato.clausulas?.length || 10}
                        </span>
                      </button>
                    </div>

                    {abaContrato === 'clausulas' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAdicionarClausula}
                        className="bg-secondary text-slate-950 hover:bg-secondary/90 h-7 text-xs font-bold gap-1 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Nova Cláusula
                      </Button>
                    )}
                  </div>

                  {abaContrato === 'parametros' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Objeto da Contratação</Label>
                        <textarea
                          rows={2}
                          value={formData.contrato.objeto}
                          onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, objeto: e.target.value } })}
                          className="w-full bg-slate-900 border border-border/60 rounded-xl p-3 text-white text-xs focus:border-secondary"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Atos Incluídos</Label>
                          <textarea
                            rows={3}
                            value={formData.contrato.incluidos}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, incluidos: e.target.value } })}
                            className="w-full bg-slate-900 border border-border/60 rounded-xl p-3 text-white text-xs focus:border-secondary"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Atos Excluídos</Label>
                          <textarea
                            rows={3}
                            value={formData.contrato.excluidos}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, excluidos: e.target.value } })}
                            className="w-full bg-slate-900 border border-border/60 rounded-xl p-3 text-white text-xs focus:border-secondary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Honorários Fixos (R$)</Label>
                          <Input
                            value={formData.contrato.valorFixo}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, valorFixo: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Valor por Extenso</Label>
                          <Input
                            value={formData.contrato.valorExtenso}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, valorExtenso: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Entrada (R$)</Label>
                          <Input
                            value={formData.contrato.entrada}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, entrada: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Nº Parcelas</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.contrato.parcelas}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, parcelas: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Valor da Parcela (R$)</Label>
                          <Input
                            value={formData.contrato.valorParcela}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, valorParcela: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Dia Vencimento</Label>
                          <Input
                            value={formData.contrato.diaVencimento}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, diaVencimento: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Primeiro Vencimento</Label>
                          <Input
                            type="date"
                            value={formData.contrato.primeiroVencimento}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, primeiroVencimento: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Êxito (%)</Label>
                          <Input
                            value={formData.contrato.percentualExito}
                            onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, percentualExito: e.target.value } })}
                            className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Cláusula Adicional (opcional)</Label>
                        <Input
                          placeholder="Deixe em branco caso não haja cláusula personalizada"
                          value={formData.contrato.clausulaExtra}
                          onChange={e => setFormData({ ...formData, contrato: { ...formData.contrato, clausulaExtra: e.target.value } })}
                          className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                        />
                      </div>

                      {/* Bloco de Testemunhas */}
                      <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-3">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                          <Checkbox
                            checked={formData.contrato.incluirTestemunhas || false}
                            onCheckedChange={v =>
                              setFormData({
                                ...formData,
                                contrato: { ...formData.contrato, incluirTestemunhas: !!v }
                              })
                            }
                          />
                          <span>Incluir campo de testemunhas no contrato</span>
                        </label>

                        {formData.contrato.incluirTestemunhas && (
                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <p className="text-[11px] text-slate-400">
                              Preencha os dados das testemunhas ou deixe em branco para assinatura manual com caneta.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2 p-3 rounded-lg bg-slate-950/40 border border-white/5">
                                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                                  Testemunha 1
                                </span>
                                <div>
                                  <Label className="text-slate-400 text-[10px] uppercase font-bold pl-1 mb-1 block">Nome Completo</Label>
                                  <Input
                                    placeholder="Nome da testemunha 1..."
                                    value={formData.contrato.testemunha1Nome || ''}
                                    onChange={e =>
                                      setFormData({
                                        ...formData,
                                        contrato: { ...formData.contrato, testemunha1Nome: e.target.value }
                                      })
                                    }
                                    className="h-9 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-slate-400 text-[10px] uppercase font-bold pl-1 mb-1 block">CPF</Label>
                                  <Input
                                    placeholder="000.000.000-00"
                                    value={formData.contrato.testemunha1Cpf || ''}
                                    onChange={e =>
                                      setFormData({
                                        ...formData,
                                        contrato: { ...formData.contrato, testemunha1Cpf: e.target.value }
                                      })
                                    }
                                    className="h-9 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2 p-3 rounded-lg bg-slate-950/40 border border-white/5">
                                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                                  Testemunha 2
                                </span>
                                <div>
                                  <Label className="text-slate-400 text-[10px] uppercase font-bold pl-1 mb-1 block">Nome Completo</Label>
                                  <Input
                                    placeholder="Nome da testemunha 2..."
                                    value={formData.contrato.testemunha2Nome || ''}
                                    onChange={e =>
                                      setFormData({
                                        ...formData,
                                        contrato: { ...formData.contrato, testemunha2Nome: e.target.value }
                                      })
                                    }
                                    className="h-9 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-slate-400 text-[10px] uppercase font-bold pl-1 mb-1 block">CPF</Label>
                                  <Input
                                    placeholder="000.000.000-00"
                                    value={formData.contrato.testemunha2Cpf || ''}
                                    onChange={e =>
                                      setFormData({
                                        ...formData,
                                        contrato: { ...formData.contrato, testemunha2Cpf: e.target.value }
                                      })
                                    }
                                    className="h-9 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {abaContrato === 'clausulas' && (
                    <div className="space-y-4 pt-1">
                      {/* Banner de Ajuda e Tags */}
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-secondary/20 text-xs text-slate-300 space-y-2">
                        <div className="flex items-center gap-2 text-secondary font-bold">
                          <Sparkles className="w-4 h-4" />
                          <span>Editor de Cláusulas Contratuais do Modelo</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Edite o texto de qualquer cláusula, altere a ordem ou adicione novas cláusulas personalizadas. As variáveis entre chaves são preenchidas dinamicamente pelos parâmetros comerciais da emissão.
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider self-center mr-1">
                            Tags disponíveis:
                          </span>
                          {[
                            '{objeto}',
                            '{honorarios_fixos}',
                            '{honorarios_extenso}',
                            '{entrada}',
                            '{parcelas}',
                            '{valor_parcela}',
                            '{dia_vencimento}',
                            '{primeiro_vencimento}',
                            '{percentual_exito}',
                            '{multa}',
                            '{foro}',
                            '{texto_executivo}',
                            '{nome_cliente}',
                            '{cpf_cliente}',
                            '{nome_advogado}',
                            '{oab_advogado}'
                          ].map(tag => (
                            <code
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-slate-950 text-secondary text-[10px] font-mono border border-secondary/20 cursor-default"
                              title="Substituído automaticamente pelos dados da emissão"
                            >
                              {tag}
                            </code>
                          ))}
                        </div>
                      </div>

                      {/* Lista de Cláusulas */}
                      <div className="space-y-3">
                        {(formData.contrato.clausulas || []).map((clausula, idx) => (
                          <div
                            key={clausula.id}
                            className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-3 shadow-sm hover:border-white/20 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="px-2 py-1 rounded-md text-[10px] font-extrabold bg-slate-800 text-secondary border border-secondary/20 shrink-0">
                                  #{idx + 1}
                                </span>
                                <Input
                                  value={clausula.titulo}
                                  onChange={e => handleAtualizarClausula(clausula.id, 'titulo', e.target.value)}
                                  placeholder="Título da Cláusula (ex: CLÁUSULA 1ª – OBJETO DO CONTRATO)"
                                  className="h-8 bg-slate-950/70 border-border/60 text-white font-bold text-xs rounded-lg flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-1 self-end sm:self-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={idx === 0}
                                  onClick={() => handleMoverClausula(idx, 'cima')}
                                  className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-20"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={idx === (formData.contrato.clausulas?.length || 1) - 1}
                                  onClick={() => handleMoverClausula(idx, 'baixo')}
                                  className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-20"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoverClausula(clausula.id, clausula.titulo)}
                                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Remover esta cláusula"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <textarea
                                rows={4}
                                value={clausula.conteudo}
                                onChange={e => handleAtualizarClausula(clausula.id, 'conteudo', e.target.value)}
                                placeholder="Conteúdo textual da cláusula..."
                                className="w-full bg-slate-950/80 border border-border/60 rounded-lg p-3 text-white text-xs leading-relaxed focus:border-secondary font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botão de Adicionar Nova Cláusula */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAdicionarClausula}
                        className="w-full border-dashed border-white/20 text-slate-300 hover:text-white hover:border-secondary hover:bg-secondary/5 h-10 gap-2 rounded-xl text-xs font-semibold"
                      >
                        <Plus className="w-4 h-4 text-secondary" />
                        Adicionar Nova Cláusula ao Contrato
                      </Button>
                    </div>
                  )}

                  {/* Rodapé de Ações de Padrão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurarPadrao('contrato', 'Contrato de Honorários')}
                      className="text-slate-400 hover:text-white h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão de Fábrica
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSalvarPadrao('contrato', 'Contrato de Honorários')}
                      className="bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 h-8 gap-1.5 font-semibold rounded-xl"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar como Padrão do Escritório
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {docsSelecionados.procuracao && (
            <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSecao('procuracao')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <h3 className="font-bold text-white text-sm">Poderes da Procuração</h3>
                </div>
                {secaoAberta.procuracao ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {secaoAberta.procuracao && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <Checkbox
                        checked={formData.procuracao.receber}
                        onCheckedChange={v => setFormData({ ...formData, procuracao: { ...formData.procuracao, receber: !!v } })}
                      />
                      Receber e levantar valores
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <Checkbox
                        checked={formData.procuracao.transigir}
                        onCheckedChange={v => setFormData({ ...formData, procuracao: { ...formData.procuracao, transigir: !!v } })}
                      />
                      Transigir e conciliar
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <Checkbox
                        checked={formData.procuracao.hipossuf}
                        onCheckedChange={v => setFormData({ ...formData, procuracao: { ...formData.procuracao, hipossuf: !!v } })}
                      />
                      Assinar hipossuficiência
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <Checkbox
                        checked={formData.procuracao.substabelecer}
                        onCheckedChange={v => setFormData({ ...formData, procuracao: { ...formData.procuracao, substabelecer: !!v } })}
                      />
                      Substabelecer poderes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <Checkbox
                        checked={formData.procuracao.inss}
                        onCheckedChange={v => setFormData({ ...formData, procuracao: { ...formData.procuracao, inss: !!v } })}
                      />
                      Atuação perante o INSS
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <Checkbox
                        checked={formData.procuracao.receita}
                        onCheckedChange={v => setFormData({ ...formData, procuracao: { ...formData.procuracao, receita: !!v } })}
                      />
                      Atuação perante Receita Federal
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Poderes Especiais Adicionais</Label>
                      <Input
                        placeholder="Ex: representar perante cartórios, Detran..."
                        value={formData.procuracao.poderesExtras}
                        onChange={e => setFormData({ ...formData, procuracao: { ...formData.procuracao, poderesExtras: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Finalidade Específica (opcional)</Label>
                      <Input
                        placeholder="Ex: Ação de cobrança em face de Fulano"
                        value={formData.procuracao.finalidadeProc}
                        onChange={e => setFormData({ ...formData, procuracao: { ...formData.procuracao, finalidadeProc: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Rodapé de Ações de Padrão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurarPadrao('procuracao', 'Procuração Ad Judicia')}
                      className="text-slate-400 hover:text-white h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão de Fábrica
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSalvarPadrao('procuracao', 'Procuração Ad Judicia')}
                      className="bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 h-8 gap-1.5 font-semibold rounded-xl"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar como Padrão do Escritório
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {docsSelecionados.hipossuficiencia && (
            <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSecao('hipossuficiencia')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <h3 className="font-bold text-white text-sm">Dados da Declaração de Hipossuficiência</h3>
                </div>
                {secaoAberta.hipossuficiencia ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {secaoAberta.hipossuficiencia && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Renda Mensal Aproximada</Label>
                      <Input
                        placeholder="Ex: R$ 1.800,00"
                        value={formData.hipossuficiencia.rendaMensal}
                        onChange={e => setFormData({ ...formData, hipossuficiencia: { ...formData.hipossuficiencia, rendaMensal: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Nº de Dependentes</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ex: 2"
                        value={formData.hipossuficiencia.dependentes}
                        onChange={e => setFormData({ ...formData, hipossuficiencia: { ...formData.hipossuficiencia, dependentes: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Condição de Trabalho</Label>
                      <Input
                        placeholder="desempregado(a), autônomo(a)..."
                        value={formData.hipossuficiencia.situacao}
                        onChange={e => setFormData({ ...formData, hipossuficiencia: { ...formData.hipossuficiencia, situacao: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Informações Complementares</Label>
                    <Input
                      placeholder="Ex: Custos com medicamentos de uso contínuo..."
                      value={formData.hipossuficiencia.hipoExtra}
                      onChange={e => setFormData({ ...formData, hipossuficiencia: { ...formData.hipossuficiencia, hipoExtra: e.target.value } })}
                      className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                    />
                  </div>

                  {/* Rodapé de Ações de Padrão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurarPadrao('hipossuficiencia', 'Declaração de Hipossuficiência')}
                      className="text-slate-400 hover:text-white h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão de Fábrica
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSalvarPadrao('hipossuficiencia', 'Declaração de Hipossuficiência')}
                      className="bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 h-8 gap-1.5 font-semibold rounded-xl"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar como Padrão do Escritório
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {docsSelecionados.irpf && (
            <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSecao('irpf')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <h3 className="font-bold text-white text-sm">Dados da Declaração de Isenção IRPF</h3>
                </div>
                {secaoAberta.irpf ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {secaoAberta.irpf && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Exercício(s)</Label>
                      <Input
                        placeholder="2025 e 2026"
                        value={formData.irpf.exercicios}
                        onChange={e => setFormData({ ...formData, irpf: { ...formData.irpf, exercicios: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Finalidade</Label>
                      <Input
                        placeholder="instrução de pedido de gratuidade..."
                        value={formData.irpf.finalidade}
                        onChange={e => setFormData({ ...formData, irpf: { ...formData.irpf, finalidade: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Rodapé de Ações de Padrão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurarPadrao('irpf', 'Isenção de IRPF')}
                      className="text-slate-400 hover:text-white h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão de Fábrica
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSalvarPadrao('irpf', 'Isenção de IRPF')}
                      className="bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 h-8 gap-1.5 font-semibold rounded-xl"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar como Padrão do Escritório
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {docsSelecionados.residencia && (
            <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSecao('residencia')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <h3 className="font-bold text-white text-sm">Declaração de Residência</h3>
                </div>
                {secaoAberta.residencia ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {secaoAberta.residencia && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Destinatário ou Finalidade</Label>
                      <Input
                        value={formData.residencia.destinoResidencia}
                        onChange={e => setFormData({ ...formData, residencia: { ...formData.residencia, destinoResidencia: e.target.value } })}
                        placeholder="empresa ou órgão solicitante"
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Tipo de Declaração</Label>
                      <select
                        value={formData.residencia.tipoResidencia}
                        onChange={e => setFormData({ ...formData, residencia: { ...formData.residencia, tipoResidencia: e.target.value as any } })}
                        className="w-full h-10 bg-slate-900 border border-border/60 rounded-xl px-3 text-white text-xs"
                      >
                        <option value="proprio">O próprio cliente declara</option>
                        <option value="terceiro">Titular do comprovante declara residência do cliente</option>
                      </select>
                    </div>
                  </div>

                  {formData.residencia.tipoResidencia === 'terceiro' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-900/60 rounded-xl border border-white/5">
                      <div>
                        <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Nome do Titular</Label>
                        <Input
                          value={formData.residencia.titularResidencia}
                          onChange={e => setFormData({ ...formData, residencia: { ...formData.residencia, titularResidencia: e.target.value } })}
                          className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">CPF do Titular</Label>
                        <Input
                          value={formData.residencia.cpfTitular}
                          onChange={e => setFormData({ ...formData, residencia: { ...formData.residencia, cpfTitular: e.target.value } })}
                          className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Vínculo</Label>
                        <Input
                          placeholder="mãe, cônjuge, amigo..."
                          value={formData.residencia.vinculoTitular}
                          onChange={e => setFormData({ ...formData, residencia: { ...formData.residencia, vinculoTitular: e.target.value } })}
                          className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Rodapé de Ações de Padrão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurarPadrao('residencia', 'Declaração de Residência')}
                      className="text-slate-400 hover:text-white h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão de Fábrica
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSalvarPadrao('residencia', 'Declaração de Residência')}
                      className="bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 h-8 gap-1.5 font-semibold rounded-xl"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar como Padrão do Escritório
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {docsSelecionados.recibo && (
            <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSecao('recibo')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <h3 className="font-bold text-white text-sm">Dados do Recibo de Pagamento</h3>
                </div>
                {secaoAberta.recibo ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {secaoAberta.recibo && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Valor (R$)</Label>
                      <Input
                        value={formData.recibo.valorRecibo}
                        onChange={e => setFormData({ ...formData, recibo: { ...formData.recibo, valorRecibo: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Valor por Extenso</Label>
                      <Input
                        value={formData.recibo.valorExtenso}
                        onChange={e => setFormData({ ...formData, recibo: { ...formData.recibo, valorExtenso: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Forma de Pagamento</Label>
                      <select
                        value={formData.recibo.formaPagamento}
                        onChange={e => setFormData({ ...formData, recibo: { ...formData.recibo, formaPagamento: e.target.value } })}
                        className="w-full h-10 bg-slate-900 border border-border/60 rounded-xl px-3 text-white text-xs"
                      >
                        <option value="PIX">PIX</option>
                        <option value="transferência bancária">Transferência Bancária</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartão de crédito">Cartão de Crédito</option>
                        <option value="boleto">Boleto</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Referente a</Label>
                      <Input
                        value={formData.recibo.referenciaRecibo}
                        onChange={e => setFormData({ ...formData, recibo: { ...formData.recibo, referenciaRecibo: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-[11px] font-bold uppercase tracking-widest pl-1 mb-1 block">Identificação da Parcela</Label>
                      <Input
                        placeholder="Ex: 1ª de 4 parcelas"
                        value={formData.recibo.parcelaRecibo}
                        onChange={e => setFormData({ ...formData, recibo: { ...formData.recibo, parcelaRecibo: e.target.value } })}
                        className="h-10 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Rodapé de Ações de Padrão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurarPadrao('recibo', 'Recibo de Pagamento')}
                      className="text-slate-400 hover:text-white h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão de Fábrica
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSalvarPadrao('recibo', 'Recibo de Pagamento')}
                      className="bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 h-8 gap-1.5 font-semibold rounded-xl"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar como Padrão do Escritório
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Coluna Direita: Ações de Emissão & Resumo */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border-premium rounded-2xl p-6 shadow-card sticky top-6 space-y-6">
            <h3 className="font-serif text-lg font-bold text-white">Resumo da Emissão</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Cliente selecionado:</span>
                <span className="font-bold text-white text-right truncate max-w-[180px]">
                  {clienteSelecionado?.nome_razao_social || 'Nenhum'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Qtd. Documentos:</span>
                <span className="font-bold text-secondary">{tiposMarcados.length} selecionado(s)</span>
              </div>
              <div className="py-2 border-b border-white/5">
                <span className="text-slate-400 block mb-1.5">Documentos na fila:</span>
                <div className="flex flex-wrap gap-1">
                  {tiposMarcados.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-white/5">
                      {TIPO_NOMES[t]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3 pt-2">
              <PermissionGuard modulo="documentos" acao="visualizar">
                <Button
                  onClick={handleVisualizar}
                  disabled={!clienteSelecionado || tiposMarcados.length === 0}
                  variant="outline"
                  className="w-full h-11 border-secondary/40 text-secondary hover:bg-secondary/10 rounded-xl font-bold"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar Documento(s)
                </Button>
              </PermissionGuard>

              <PermissionGuard modulo="documentos" acao="criar">
                <Button
                  onClick={handleGerarWord}
                  disabled={!clienteSelecionado || tiposMarcados.length === 0}
                  className="w-full h-12 bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg shadow-secondary/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar no Word (.doc)
                </Button>

                <Button
                  onClick={handleImprimir}
                  disabled={!clienteSelecionado || tiposMarcados.length === 0}
                  variant="outline"
                  className="w-full h-11 border-border/60 text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir ou Salvar em PDF
                </Button>
              </PermissionGuard>
            </div>

            {!clienteSelecionado && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Selecione um cliente no passo 1 para habilitar os botões de emissão.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção Inferior: Histórico de Documentos Emitidos */}
      <section className="bg-card border-premium rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Histórico de Emissões</h2>
              <p className="text-xs text-slate-400">Documentos gerados e registrados no sistema.</p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Filtrar histórico..."
              value={buscaHistorico}
              onChange={e => setBuscaHistorico(e.target.value)}
              className="h-9 bg-slate-900 border-border/60 text-white rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Número</th>
                <th className="p-3">Documento</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Data</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/40">
              {loadingHistorico ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    Carregando histórico...
                  </td>
                </tr>
              ) : historico.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    Nenhum documento emitido ainda.
                  </td>
                </tr>
              ) : (
                historico
                  .filter(h =>
                    h.cliente_nome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
                    h.numero.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
                    h.titulo.toLowerCase().includes(buscaHistorico.toLowerCase())
                  )
                  .map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-secondary font-bold">{item.numero}</td>
                      <td className="p-3 font-medium text-white">{item.titulo}</td>
                      <td className="p-3">{item.cliente_nome}</td>
                      <td className="p-3 text-slate-400">{dateShort(item.emitido_em.slice(0, 10))}</td>
                      <td className="p-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAbrirHistorico(item)}
                          className="h-7 text-xs text-slate-300 hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleWordHistorico(item)}
                          className="h-7 text-xs text-secondary hover:text-white"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> Word
                        </Button>
                        <PermissionGuard modulo="documentos" acao="excluir">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleExcluirHistorico(item.id)}
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </PermissionGuard>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Pré-visualização do Documento com Radix Dialog (fecha no X, ESC e clique fora) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col bg-slate-900 border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white">
          <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between bg-slate-950 pr-12">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-white truncate max-w-md">
              <FileText className="w-5 h-5 text-secondary flex-shrink-0" />
              <span className="truncate">{previewTitulo}</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => downloadWord(previewHtml, previewTitulo)}
                className="h-8 border-secondary/40 text-secondary hover:bg-secondary/10 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Baixar Word
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => imprimirDocumento(previewHtml, previewTitulo)}
                className="h-8 bg-cta-gold hover:opacity-90 text-primary font-bold text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Área com rolagem suave (scroll vertical) para visualizar as folhas do documento */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/90 flex flex-col items-center">
            <style dangerouslySetInnerHTML={{ __html: estilosDocumentoCss() }} />
            <div
              className="preview-content-box w-full max-w-[210mm] text-slate-900"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação de Contatos/Clientes */}
      <ModalImportarClientes
        open={modalImportarOpen}
        onOpenChange={setModalImportarOpen}
        clientesExistentes={clientes}
        onSuccess={carregarClientes}
      />
    </div>
  )
}
