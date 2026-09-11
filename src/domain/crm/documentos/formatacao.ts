import { Cliente } from '@/domain/crm/cliente'

export function esc(v: string | number | null | undefined = ''): string {
  return String(v ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c] || c))
}

export function nl(v: string | null | undefined = ''): string {
  return esc(v).replace(/\n/g, '<br>')
}

export function dateLong(v?: string): string {
  const d = v ? new Date(v + 'T12:00:00') : new Date()
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

export function dateShort(v?: string): string {
  const d = v ? new Date(v + 'T12:00:00') : new Date()
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatarDataBr(v?: string | null): string {
  if (!v) return ''
  const s = String(v).trim()
  if (!s) return ''

  // Se for formato ISO yyyy-MM-dd
  const matchIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (matchIso) {
    const [, ano, mes, dia] = matchIso
    return `${dia}/${mes}/${ano}`
  }

  // Se já for formato dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    return s
  }

  // Se for formato dd-MM-yyyy, converte para dd/MM/yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s.replace(/-/g, '/')
  }

  // Se for uma data ISO com timestamp
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00')
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('pt-BR').format(d)
  }

  return s
}

export function parseMoney(v: string | number | null | undefined): number {
  return Number(String(v || 0).replace(/\./g, '').replace(',', '.')) || 0
}

export function money(v: string | number | null | undefined): string {
  return parseMoney(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function clienteEndereco(c: Partial<Cliente>): string {
  const partes = [
    c.endereco_logradouro,
    c.endereco_numero ? 'nº ' + c.endereco_numero : '',
    c.endereco_complemento,
    c.endereco_bairro,
    c.endereco_cidade && c.endereco_uf ? `${c.endereco_cidade}/${c.endereco_uf}` : (c.endereco_cidade || c.endereco_uf),
    c.endereco_cep ? 'CEP ' + c.endereco_cep : ''
  ]
  return partes.filter(Boolean).join(', ')
}

export function clienteQualificacao(c: Partial<Cliente>): string {
  const nome = c.nome_razao_social || ''
  const doc = c.cpf_cnpj ? (c.tipo_pessoa === 'PJ' ? 'inscrita no CNPJ nº ' + c.cpf_cnpj : 'inscrito(a) no CPF nº ' + c.cpf_cnpj) : ''
  const rg = c.rg_ie ? `portador(a) do RG nº ${c.rg_ie}` : ''
  const end = clienteEndereco(c)

  const partes = [
    nome,
    c.nacionalidade,
    c.estado_civil,
    c.profissao,
    rg,
    doc,
    end ? 'residente e domiciliado(a) em ' + end : '',
    c.email ? 'e-mail: ' + c.email : '',
    c.telefone_whatsapp ? 'telefone: ' + c.telefone_whatsapp : ''
  ]

  return partes.filter(Boolean).join(', ')
}

export const TIPO_NOMES: Record<string, string> = {
  contrato: 'Contrato de honorários',
  procuracao: 'Procuração',
  hipossuficiencia: 'Declaração de hipossuficiência',
  irpf: 'Declaração de isenção de IRPF',
  recibo: 'Recibo de pagamento',
  residencia: 'Declaração de residência',
  lote: 'Pacote de Documentos'
}
