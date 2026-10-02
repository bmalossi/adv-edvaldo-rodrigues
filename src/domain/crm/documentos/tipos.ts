import { Cliente } from '@/domain/crm/cliente'

export type TipoDocumento = 
  | 'contrato' 
  | 'procuracao' 
  | 'hipossuficiencia' 
  | 'irpf' 
  | 'residencia' 
  | 'recibo'

export interface ConfigDocumentos {
  prefixo: string
  empresa: string
  socOab: string
  cnpj: string
  foro: string
  lawyerCpf: string
  pix: string
}

export interface ClausulaContrato {
  id: string
  titulo: string
  conteudo: string
}

export interface RodapeConfig {
  linha1?: string
  linha2?: string
  linha3?: string
  numerarPaginas?: boolean
}

export interface OpcaoContrato {
  objeto: string
  incluidos: string
  excluidos: string
  valorFixo: string
  valorExtenso: string
  entrada: string
  parcelas: string
  valorParcela: string
  diaVencimento: string
  primeiroVencimento: string
  percentualExito: string
  multa: string
  foro: string
  clausulaExtra?: string
  useSignature?: boolean
  incluirTestemunhas?: boolean
  testemunha1Nome?: string
  testemunha1Cpf?: string
  testemunha2Nome?: string
  testemunha2Cpf?: string
  clausulas?: ClausulaContrato[]

  // Atuação conjunta com outro advogado
  atuacaoConjunta?: boolean
  advogadoConjuntoTipo?: 'sistema' | 'avulso'
  advogadoConjuntoId?: string
  advogadoConjuntoNome?: string
  advogadoConjuntoTratamento?: string
  advogadoConjuntoOab?: string
  advogadoConjuntoEndereco?: string

  // Preâmbulo / Qualificação totalmente editável
  preambuloPersonalizado?: string

  // Cabeçalho, rodapé e numeração de páginas
  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean

  // Opções visuais de layout
  centralizarTitulos?: boolean

  // Multi-clientes (co-contratantes / clientes adicionais)
  clientesAdicionais?: Partial<Cliente>[]
}

export interface OpcaoProcuracao {
  receber: boolean
  transigir: boolean
  hipossuf: boolean
  substabelecer: boolean
  inss: boolean
  receita: boolean
  poderesExtras?: string
  finalidadeProc?: string
  useSignature?: boolean

  // Atuação conjunta com outro advogado
  atuacaoConjunta?: boolean
  advogadoConjuntoNome?: string
  advogadoConjuntoTratamento?: string
  advogadoConjuntoOab?: string
  advogadoConjuntoEndereco?: string

  // Minuta personalizada / texto livre
  textoPersonalizado?: string

  // Cabeçalho, rodapé e numeração de páginas
  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean

  // Multi-clientes
  clientesAdicionais?: Partial<Cliente>[]
}

export interface OpcaoHipossuficiencia {
  rendaMensal?: string
  dependentes?: string
  situacao?: string
  hipoExtra?: string

  // Minuta personalizada / texto livre
  textoPersonalizado?: string

  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean

  // Multi-clientes
  clientesAdicionais?: Partial<Cliente>[]
}

export interface OpcaoIrpf {
  exercicios: string
  finalidade?: string

  // Minuta personalizada / texto livre
  textoPersonalizado?: string

  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean

  // Multi-clientes
  clientesAdicionais?: Partial<Cliente>[]
}

export interface OpcaoRecibo {
  valorRecibo: string
  valorExtenso: string
  formaPagamento: string
  referenciaRecibo: string
  parcelaRecibo?: string
  obsRecibo?: string
  useSignature?: boolean

  // Minuta personalizada / texto livre
  textoPersonalizado?: string

  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean

  // Multi-clientes
  clientesAdicionais?: Partial<Cliente>[]
}

export interface OpcaoResidencia {
  destinoResidencia?: string
  tipoResidencia: 'proprio' | 'terceiro'
  titularResidencia?: string
  cpfTitular?: string
  vinculoTitular?: string

  // Minuta personalizada / texto livre
  textoPersonalizado?: string

  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean

  // Multi-clientes
  clientesAdicionais?: Partial<Cliente>[]
}

export interface OpcoesDocumentoForm {
  data: string
  cidade: string
  uf: string
  useSignature: boolean
  cabecalhoPersonalizado?: string
  rodapeLinha1?: string
  rodapeLinha2?: string
  rodapeLinha3?: string
  numerarPaginas?: boolean
  centralizarTitulos?: boolean
  contrato: OpcaoContrato
  procuracao: OpcaoProcuracao
  hipossuficiencia: OpcaoHipossuficiencia
  irpf: OpcaoIrpf
  recibo: OpcaoRecibo
  residencia: OpcaoResidencia
}

export interface DocumentoEmitido {
  id: string
  advogado_id: string
  cliente_id: string | null
  cliente_nome: string
  tipo: string
  numero: string
  titulo: string
  html_content: string
  opcoes_json: Record<string, unknown> | null
  emitido_em: string
  updated_at: string
}

export interface AdvogadoConfigDoc {
  nome: string
  oab: string
  telefone: string
  email: string
  endereco?: string
}
