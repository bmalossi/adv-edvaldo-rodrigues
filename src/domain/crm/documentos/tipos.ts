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
}

export interface OpcaoHipossuficiencia {
  rendaMensal?: string
  dependentes?: string
  situacao?: string
  hipoExtra?: string
}

export interface OpcaoIrpf {
  exercicios: string
  finalidade?: string
}

export interface OpcaoRecibo {
  valorRecibo: string
  valorExtenso: string
  formaPagamento: string
  referenciaRecibo: string
  parcelaRecibo?: string
  obsRecibo?: string
  useSignature?: boolean
}

export interface OpcaoResidencia {
  destinoResidencia?: string
  tipoResidencia: 'proprio' | 'terceiro'
  titularResidencia?: string
  cpfTitular?: string
  vinculoTitular?: string
}

export interface OpcoesDocumentoForm {
  data: string
  cidade: string
  uf: string
  useSignature: boolean
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
