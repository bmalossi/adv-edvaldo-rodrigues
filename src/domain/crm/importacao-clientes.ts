import * as XLSX from 'xlsx'
import { Cliente, TipoPessoa, StatusCicloCliente, VisibilidadeRegistro } from './cliente'

export interface ClienteImportadoLinha {
  nome_razao_social: string
  tipo_pessoa: TipoPessoa
  cpf_cnpj?: string | null
  rg_ie?: string | null
  nacionalidade?: string | null
  estado_civil?: string | null
  profissao?: string | null
  email?: string | null
  telefone_whatsapp: string
  telefone_secundario?: string | null
  endereco_logradouro?: string | null
  endereco_numero?: string | null
  endereco_complemento?: string | null
  endereco_bairro?: string | null
  endereco_cidade?: string | null
  endereco_uf?: string | null
  endereco_cep?: string | null
  anotacoes_gerais?: string | null
  origem_contato?: string | null
  status_ciclo: StatusCicloCliente
  visibilidade: VisibilidadeRegistro
  _duplicado?: boolean
  _motivoDuplicado?: string
  _clienteExistenteId?: string
}

export type ModoResolucaoDuplicados = 'pular' | 'atualizar_vazios' | 'sobrescrever'

export interface ResultadoAnaliseImportacao {
  totalLidos: number
  validos: ClienteImportadoLinha[]
  invalidos: { linha: number; motivo: string; dados: any }[]
  duplicados: number
  novos: number
}

function normalizarTexto(texto: string = ''): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function apenasDigitos(v: string | number | null | undefined): string {
  return String(v || '').replace(/\D/g, '')
}

const ALIASES: Record<keyof Omit<ClienteImportadoLinha, '_duplicado' | '_motivoDuplicado' | '_clienteExistenteId'>, string[]> = {
  nome_razao_social: ['nome', 'nomecompleto', 'razaosocial', 'cliente', 'nomedocliente', 'contato', 'name'],
  tipo_pessoa: ['tipo', 'tipopessoa', 'pessoafisicaoujuridica', 'kind'],
  cpf_cnpj: ['cpf', 'cnpj', 'cpfcnpj', 'documento', 'doc', 'cpff', 'cnpjcpf', 'identificador'],
  rg_ie: ['rg', 'rgie', 'identidade', 'inscricaoestadual', 'cnh'],
  nacionalidade: ['nacionalidade', 'paisorigem'],
  estado_civil: ['estadocivil', 'civil', 'estadocivilnome'],
  profissao: ['profissao', 'cargo', 'ocupacao', 'funcao'],
  email: ['email', 'correioeletronico', 'correio', 'mail'],
  telefone_whatsapp: ['whatsapp', 'telefone', 'celular', 'tel', 'fone', 'cel', 'telefonicowhatsapp'],
  telefone_secundario: ['telefonesecundario', 'telefone2', 'celular2', 'contato2', 'fixo'],
  endereco_logradouro: ['rua', 'logradouro', 'endereco', 'enderecocompleto', 'avenida', 'alameda'],
  endereco_numero: ['numero', 'num', 'n'],
  endereco_complemento: ['complemento', 'comp', 'apto', 'bloco', 'sala'],
  endereco_bairro: ['bairro', 'distrito'],
  endereco_cidade: ['cidade', 'municipio', 'localidade'],
  endereco_uf: ['uf', 'estado'],
  endereco_cep: ['cep', 'codigopostal'],
  anotacoes_gerais: ['observacoes', 'observacao', 'obs', 'notas', 'anotacoes', 'historico'],
  origem_contato: ['origem', 'campanha', 'origemcontato', 'canal'],
  status_ciclo: ['status', 'ciclo', 'statusciclo', 'etapa'],
  visibilidade: ['visibilidade', 'privacidade']
}

function encontrarValorColuna(row: Record<string, any>, aliases: string[]): string {
  const chaves = Object.keys(row)
  for (const alias of aliases) {
    const aliasNorm = normalizarTexto(alias)
    const encontrada = chaves.find(k => normalizarTexto(k) === aliasNorm)
    if (encontrada && row[encontrada] !== undefined && row[encontrada] !== null) {
      const val = String(row[encontrada]).trim()
      if (val) return val
    }
  }
  return ''
}

export function formatarCpfCnpj(v: string): string {
  const d = apenasDigitos(v)
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return v
}

export function formatarTelefone(v: string): string {
  const d = apenasDigitos(v)
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return v || '(00) 00000-0000'
}

export async function parseArquivoImportacao(
  file: File,
  clientesExistentes: Cliente[] = []
): Promise<ResultadoAnaliseImportacao> {
  let rows: Record<string, any>[] = []

  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (isExcel) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const primeiraAba = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[primeiraAba]
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })
  } else {
    // CSV ou texto delimitado
    const texto = await file.text()
    const cleanText = texto.replace(/^\uFEFF/, '')
    const workbook = XLSX.read(cleanText, { type: 'string' })
    const primeiraAba = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[primeiraAba]
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })
  }

  const validos: ClienteImportadoLinha[] = []
  const invalidos: { linha: number; motivo: string; dados: any }[] = []

  // Mapa de clientes existentes por CPF/CNPJ limpo e por Nome+Telefone limpo
  const mapaExistentesCpf = new Map<string, Cliente>()
  const mapaExistentesNomeTel = new Map<string, Cliente>()

  for (const c of clientesExistentes) {
    if (c.cpf_cnpj) {
      const dig = apenasDigitos(c.cpf_cnpj)
      if (dig) mapaExistentesCpf.set(dig, c)
    }
    const chaveNomeTel = `${normalizarTexto(c.nome_razao_social)}_${apenasDigitos(c.telefone_whatsapp)}`
    mapaExistentesNomeTel.set(chaveNomeTel, c)
  }

  let indexLinha = 1
  for (const row of rows) {
    indexLinha++
    const nome = encontrarValorColuna(row, ALIASES.nome_razao_social)

    if (!nome) {
      invalidos.push({
        linha: indexLinha,
        motivo: 'Nome ou Razão Social não informado',
        dados: row
      })
      continue
    }

    const rawDoc = encontrarValorColuna(row, ALIASES.cpf_cnpj)
    const docDigits = apenasDigitos(rawDoc)
    const tipoPessoaInformado = encontrarValorColuna(row, ALIASES.tipo_pessoa).toUpperCase()
    const tipo_pessoa: TipoPessoa = (tipoPessoaInformado === 'PJ' || docDigits.length === 14) ? 'PJ' : 'PF'

    const rawTel = encontrarValorColuna(row, ALIASES.telefone_whatsapp)
    const telefone_whatsapp = rawTel ? formatarTelefone(rawTel) : '(00) 00000-0000'

    const item: ClienteImportadoLinha = {
      nome_razao_social: nome.trim(),
      tipo_pessoa,
      cpf_cnpj: docDigits ? formatarCpfCnpj(docDigits) : (rawDoc || null),
      rg_ie: encontrarValorColuna(row, ALIASES.rg_ie) || null,
      nacionalidade: encontrarValorColuna(row, ALIASES.nacionalidade) || (tipo_pessoa === 'PF' ? 'brasileiro(a)' : null),
      estado_civil: encontrarValorColuna(row, ALIASES.estado_civil) || null,
      profissao: encontrarValorColuna(row, ALIASES.profissao) || null,
      email: encontrarValorColuna(row, ALIASES.email) || null,
      telefone_whatsapp,
      telefone_secundario: encontrarValorColuna(row, ALIASES.telefone_secundario) || null,
      endereco_logradouro: encontrarValorColuna(row, ALIASES.endereco_logradouro) || null,
      endereco_numero: encontrarValorColuna(row, ALIASES.endereco_numero) || null,
      endereco_complemento: encontrarValorColuna(row, ALIASES.endereco_complemento) || null,
      endereco_bairro: encontrarValorColuna(row, ALIASES.endereco_bairro) || null,
      endereco_cidade: encontrarValorColuna(row, ALIASES.endereco_cidade) || null,
      endereco_uf: (encontrarValorColuna(row, ALIASES.endereco_uf) || 'SP').toUpperCase().slice(0, 2),
      endereco_cep: encontrarValorColuna(row, ALIASES.endereco_cep) || null,
      anotacoes_gerais: encontrarValorColuna(row, ALIASES.anotacoes_gerais) || null,
      origem_contato: encontrarValorColuna(row, ALIASES.origem_contato) || 'Planilha importada',
      status_ciclo: 'lead',
      visibilidade: 'colegiado'
    }

    // Verificar duplicidade
    let existente: Cliente | undefined
    let motivo = ''

    if (docDigits && mapaExistentesCpf.has(docDigits)) {
      existente = mapaExistentesCpf.get(docDigits)
      motivo = `CPF/CNPJ já cadastrado (${item.cpf_cnpj})`
    } else if (!docDigits) {
      const chave = `${normalizarTexto(item.nome_razao_social)}_${apenasDigitos(item.telefone_whatsapp)}`
      if (mapaExistentesNomeTel.has(chave)) {
        existente = mapaExistentesNomeTel.get(chave)
        motivo = `Mesmo nome e telefone de contato`
      }
    }

    if (existente) {
      item._duplicado = true
      item._motivoDuplicado = motivo
      item._clienteExistenteId = existente.id
    }

    validos.push(item)
  }

  const duplicados = validos.filter(v => v._duplicado).length
  const novos = validos.length - duplicados

  return {
    totalLidos: rows.length,
    validos,
    invalidos,
    duplicados,
    novos
  }
}

export function baixarModeloPlanilhaClientes(): void {
  const colunas = [
    'Nome Completo',
    'Tipo (PF ou PJ)',
    'CPF ou CNPJ',
    'RG',
    'Nacionalidade',
    'Estado Civil',
    'Profissão',
    'WhatsApp / Celular',
    'Email',
    'CEP',
    'Logradouro',
    'Número',
    'Complemento',
    'Bairro',
    'Cidade',
    'Estado (UF)',
    'Observações'
  ]

  const linhasExemplo = [
    [
      'Maria Silva dos Santos',
      'PF',
      '123.456.789-00',
      '12.345.678-9 SSP/SP',
      'brasileira',
      'casada',
      'Comerciante',
      '(13) 99123-4567',
      'maria.silva@exemplo.com',
      '11700-000',
      'Avenida Brasil',
      '100',
      'Apto 42',
      'Boqueirão',
      'Praia Grande',
      'SP',
      'Cliente indicada por Dr. Fulano'
    ],
    [
      'Construtora Exemplo Ltda',
      'PJ',
      '12.345.678/0001-90',
      '',
      '',
      '',
      '',
      '(11) 98765-4321',
      'contato@construtoraexemplo.com.br',
      '01310-100',
      'Avenida Paulista',
      '1500',
      '12º andar',
      'Bela Vista',
      'São Paulo',
      'SP',
      'Empresa parceira'
    ]
  ]

  // Monta CSV com BOM UTF-8 e delimitador ';' (padrão de Excel no Brasil)
  const csvLinhas = [
    colunas.map(c => `"${c}"`).join(';'),
    ...linhasExemplo.map(row => row.map(v => `"${v}"`).join(';'))
  ]

  const csvContent = '\ufeff' + csvLinhas.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_clientes_crm.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
