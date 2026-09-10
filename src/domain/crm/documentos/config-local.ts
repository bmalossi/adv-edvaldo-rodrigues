import { ConfigDocumentos } from './tipos'

const STORAGE_KEYS = {
  logo: 'erf_doc_logo_v1',
  signature: 'erf_doc_signature_v1',
  config: 'erf_doc_config_v1',
  counters: 'erf_doc_counters_v1',
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
