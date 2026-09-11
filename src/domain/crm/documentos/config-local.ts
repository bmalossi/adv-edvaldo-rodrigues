import { ConfigDocumentos, OpcoesDocumentoForm } from './tipos'

const STORAGE_KEYS = {
  logo: 'erf_doc_logo_v1',
  signature: 'erf_doc_signature_v1',
  config: 'erf_doc_config_v1',
  counters: 'erf_doc_counters_v1',
  padroes: 'erf_doc_padroes_templates_v1',
}

export const DEFAULTS_CONFIG: ConfigDocumentos = {
  prefixo: 'ERF',
  empresa: 'EDVALDO RODRIGUES FERREIRA SOCIEDADE INDIVIDUAL DE ADVOCACIA – ME',
  socOab: '62.067',
  cnpj: '62.068.076/0001-06',
  foro: 'Comarca de Praia Grande/SP',
  lawyerCpf: '925.540.401-68',
  pix: '(13) 99682-4364'
}

export function carregarConfigDocumentosLocal(): ConfigDocumentos {
  try {
    const salvo = localStorage.getItem(STORAGE_KEYS.config)
    if (!salvo) return DEFAULTS_CONFIG
    return { ...DEFAULTS_CONFIG, ...JSON.parse(salvo) }
  } catch {
    return DEFAULTS_CONFIG
  }
}

export function salvarConfigDocumentosLocal(cfg: Partial<ConfigDocumentos>): void {
  try {
    const atual = carregarConfigDocumentosLocal()
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify({ ...atual, ...cfg }))
  } catch (e) {
    console.warn('Erro ao salvar configurações de documento em localStorage', e)
  }
}

export function carregarLogoLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.logo)
  } catch {
    return null
  }
}

export function salvarLogoLocal(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.logo, dataUrl)
  } catch (e) {
    console.warn('Erro ao salvar logo em localStorage', e)
  }
}

export function removerLogoLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.logo)
  } catch (e) {
    console.warn('Erro ao remover logo', e)
  }
}

export function carregarAssinaturaLocal(userId?: string): string | null {
  try {
    // Remove chave global legada compartilhada para evitar vazamentos entre perfis
    try {
      localStorage.removeItem(STORAGE_KEYS.signature)
    } catch {
      // noop
    }

    if (!userId) return null
    return localStorage.getItem(`${STORAGE_KEYS.signature}_${userId}`)
  } catch {
    return null
  }
}

export function salvarAssinaturaLocal(dataUrl: string, userId?: string): void {
  try {
    if (!userId) return
    localStorage.setItem(`${STORAGE_KEYS.signature}_${userId}`, dataUrl)
  } catch (e) {
    console.warn('Erro ao salvar assinatura em localStorage', e)
  }
}

export function removerAssinaturaLocal(userId?: string): void {
  try {
    if (!userId) return
    localStorage.removeItem(`${STORAGE_KEYS.signature}_${userId}`)
  } catch (e) {
    console.warn('Erro ao remover assinatura', e)
  }
}

export function proximoNumeroDoc(tipo: string, prefixo: string = 'ERF', commit: boolean = true): string {
  const ano = new Date().getFullYear()
  const key = `${tipo}_${ano}`
  let counters: Record<string, number> = {}

  try {
    const salvo = localStorage.getItem(STORAGE_KEYS.counters)
    if (salvo) counters = JSON.parse(salvo)
  } catch {
    counters = {}
  }

  const proximo = (counters[key] || 0) + 1

  if (commit) {
    counters[key] = proximo
    try {
      localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters))
    } catch (e) {
      console.warn('Erro ao atualizar contadores', e)
    }
  }

  return `${prefixo}-${String(proximo).padStart(4, '0')}/${ano}`
}

export const DEFAULTS_FORM_DOCUMENTO: OpcoesDocumentoForm = {
  data: new Date().toISOString().slice(0, 10),
  cidade: 'Praia Grande',
  uf: 'SP',
  useSignature: false,
  contrato: {
    objeto: 'análise, preparação, ajuizamento e acompanhamento da ação judicial, em primeiro grau, até a sentença',
    incluidos: 'reuniões indispensáveis; análise e organização documental; petição inicial; manifestações ordinárias; réplica; audiência; acompanhamento de perícia judicial; memoriais e acompanhamento até a sentença',
    excluidos: 'recursos e contrarrazões; liquidação, cumprimento ou execução de sentença; ações autônomas ou conexas; reconvenção; incidentes complexos; atuação criminal, administrativa ou extrajudicial distinta; tribunais, STJ ou STF; diligências fora da Comarca; peritos, assistentes, correspondentes e outros profissionais',
    valorFixo: '5.000,00',
    valorExtenso: 'cinco mil reais',
    entrada: '1.000,00',
    parcelas: '4',
    valorParcela: '1.000,00',
    diaVencimento: '02',
    primeiroVencimento: '',
    percentualExito: '30',
    multa: '10',
    foro: 'Comarca de Praia Grande/SP',
    clausulaExtra: '',
    useSignature: false,
    incluirTestemunhas: false,
    testemunha1Nome: '',
    testemunha1Cpf: '',
    testemunha2Nome: '',
    testemunha2Cpf: ''
  },
  procuracao: {
    receber: true,
    transigir: true,
    hipossuf: true,
    substabelecer: true,
    inss: false,
    receita: false,
    poderesExtras: '',
    finalidadeProc: '',
    useSignature: false
  },
  hipossuficiencia: {
    rendaMensal: '',
    dependentes: '',
    situacao: '',
    hipoExtra: ''
  },
  irpf: {
    exercicios: `${new Date().getFullYear() - 1} e ${new Date().getFullYear()}`,
    finalidade: 'instrução de pedido de gratuidade da justiça'
  },
  recibo: {
    valorRecibo: '1.000,00',
    valorExtenso: 'um mil reais',
    formaPagamento: 'PIX',
    referenciaRecibo: 'prestação de serviços advocatícios',
    parcelaRecibo: '1ª parcela',
    obsRecibo: '',
    useSignature: false
  },
  residencia: {
    destinoResidencia: 'empresa ou órgão solicitante',
    tipoResidencia: 'proprio',
    titularResidencia: '',
    cpfTitular: '',
    vinculoTitular: ''
  }
}

export function carregarPadroesDocumentosLocal(): Partial<OpcoesDocumentoForm> {
  try {
    const salvo = localStorage.getItem(STORAGE_KEYS.padroes)
    if (!salvo) return {}
    return JSON.parse(salvo)
  } catch {
    return {}
  }
}

export function salvarPadraoDocumentoLocal<K extends keyof OpcoesDocumentoForm>(
  chave: K,
  valor: OpcoesDocumentoForm[K]
): void {
  try {
    const atuais = carregarPadroesDocumentosLocal()
    const novos = { ...atuais, [chave]: valor }
    localStorage.setItem(STORAGE_KEYS.padroes, JSON.stringify(novos))
  } catch (e) {
    console.warn('Erro ao salvar padrão de documento em localStorage', e)
  }
}

export function restaurarPadraoDocumentoFabrica(chave?: keyof OpcoesDocumentoForm): void {
  try {
    if (!chave) {
      localStorage.removeItem(STORAGE_KEYS.padroes)
      return
    }
    const atuais = carregarPadroesDocumentosLocal()
    delete atuais[chave]
    localStorage.setItem(STORAGE_KEYS.padroes, JSON.stringify(atuais))
  } catch (e) {
    console.warn('Erro ao restaurar padrão de documento', e)
  }
}
