import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL e ANON_KEY devem estar configurados no .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Tipos do banco ───────────────────────────────────────────

export type Advogado = {
    id: string
    user_id: string
    nome: string
    oab: string | null
    telefone_whatsapp: string | null
    email: string | null
    assinatura_url?: string | null
    ativo: boolean
    created_at: string
    updated_at: string
}

export type Processo = {
    id: string
    advogado_id: string
    numero_cnj: string
    etiqueta: string
    status_processo: 'ativo' | 'arquivado' | 'suspenso' | 'encerrado'
    ativo: boolean
    numero_cnj_limpo: string | null
    tribunal_base: string | null
    classe_nome: string | null
    classe_codigo: number | null
    grau: string | null
    data_ajuizamento: string | null
    orgao_julgador_nome: string | null
    data_hora_ultima_atualizacao_datajud: string | null
    data_ultima_consulta_n8n: string | null
    tem_novidade: boolean
    created_at: string
    updated_at: string
}

export type Movimentacao = {
    id: string
    processo_id: string
    codigo: number | null
    nome: string | null
    data_hora: string
    orgao_julgador_nome: string | null
    complementos_json: Record<string, unknown>[] | null
    chave_unica: string
    nova: boolean
    notificado_whatsapp: boolean
    payload_completo: Record<string, unknown> | null
    created_at: string
}

export type Notificacao = {
    id: string
    advogado_id: string
    processo_id: string
    movimentacao_id: string | null
    canal: 'whatsapp' | 'email' | 'push'
    status_envio: 'pendente' | 'enviado' | 'falhou'
    mensagem_enviada: string | null
    resposta_api: Record<string, unknown> | null
    created_at: string
    enviado_em: string | null
}

export type ConfiguracoesAdvogado = {
    advogado_id: string
    notificar_whatsapp: boolean
    consolidar_notificacoes: boolean
    horario_notificacao: string
    timezone: string
    updated_at: string
}

// ─── CRM Jurídico ─────────────────────────────────────────────
export type {
    PerfilUsuario,
    PapelUsuario,
    Cliente,
    DocumentoCliente,
    StatusCicloCliente,
    TipoPessoa,
    VisibilidadeRegistro,
    ResultadoValidacao,
    ResultadoTransicao,
} from '@/domain/crm/cliente'

export type {
    ModuloSistema,
    AcaoPermissao,
    EscopoAcesso,
    Role,
    Permission,
    AuditLog,
} from '@/domain/crm/rbac'

export type {
    InteracaoCliente,
    TipoInteracao,
} from '@/domain/crm/interacao'

export type {
    Caso,
    TipoDemanda,
    StatusCaso,
    CasoColaborador,
} from '@/domain/crm/caso'

export type {
    ContratoFinanceiro,
    TipoHonorario,
} from '@/domain/crm/financeiro'

export type {
    PendenciaCRM,
    TipoPendencia,
    StatusPendencia,
} from '@/domain/crm/agenda'

export {
    obterDiasDoMes,
    obterDiasDaSemana,
    formatarDataChave,
    agruparPendenciasPorData,
    classificarStatusEvento,
} from '@/domain/crm/agenda-calendario'
export type {
    DiaCalendario,
    StatusVisualEvento,
} from '@/domain/crm/agenda-calendario'

export type {
    TemplateMinuta,
    CategoriaTemplate,
    VariaveisMinuta,
} from '@/domain/crm/minuta'

export {
    gerarDocxAPartirDeTexto,
} from '@/domain/crm/minuta'

export {
    CATEGORIAS_TEMPLATE,
    validarNovoTemplate,
    extrairVariaveisDoTexto,
    filtrarTemplatesAtivos,
} from '@/domain/crm/template-minuta'
export type {
    CategoriaTemplateInfo,
    NovoTemplateInput,
} from '@/domain/crm/template-minuta'

export type {
    DocumentoCaso,
    TipoDocumentoCaso,
} from '@/domain/crm/drive'

export type {
    EscopoBackup,
    StatusBackup,
    ConfiguracaoDrive,
    HistoricoBackup,
    ManifestoBackup,
    DadosColetadosBackup,
} from '@/domain/crm/backup'

export {
    converterClientesParaCSV,
    gerarManifestoBackup,
    gerarNomeArquivoZip,
    validarConfiguracaoDrive,
} from '@/domain/crm/backup'

export type {
    TipoDocumento,
    ConfigDocumentos,
    OpcaoContrato,
    OpcaoProcuracao,
    OpcaoHipossuficiencia,
    OpcaoIrpf,
    OpcaoRecibo,
    OpcaoResidencia,
    DocumentoEmitido,
} from '@/domain/crm/documentos/tipos'

