import type { Cliente } from './cliente';
import type { Caso } from './caso';
import type { InteracaoCliente } from './interacao';

// ─── Tipos e Interfaces do Módulo de Backup ───────────────────────────────────

export type EscopoBackup = 'completo' | 'apenas_dados' | 'apenas_documentos';

export type StatusBackup =
  | 'idle'
  | 'coletando_dados'
  | 'baixando_documentos'
  | 'gerando_pacote'
  | 'enviando_drive'
  | 'concluido'
  | 'erro';

export interface ConfiguracaoDrive {
  id?: string;
  ativo: boolean;
  google_drive_folder_id: string;
  google_service_account_email?: string;
  google_service_account_private_key?: string;
  webhook_backup_url?: string;
  frequencia_automatica: 'manual' | 'diario' | 'semanal' | 'mensal';
  ultimo_backup_em?: string | null;
  ultimo_status?: string | null;
}

export interface HistoricoBackup {
  id: string;
  nome_arquivo: string;
  escopo: EscopoBackup;
  tamanho_bytes: number;
  total_clientes: number;
  total_documentos: number;
  total_casos: number;
  status: 'concluido' | 'falhou' | 'enviado_drive';
  destino: 'local' | 'google_drive' | 'ambos';
  google_drive_file_id?: string | null;
  google_drive_link?: string | null;
  erro_mensagem?: string | null;
  created_at: string;
}

export interface ManifestoBackup {
  versao_backup: string;
  gerado_em: string;
  escopo: EscopoBackup;
  escritorio: {
    nome: string;
    sistema: string;
  };
  estatisticas: {
    total_clientes: number;
    total_casos: number;
    total_interacoes: number;
    total_documentos: number;
  };
  arquivos_incluidos: string[];
}

export interface DadosColetadosBackup {
  clientes: Cliente[];
  casos: Caso[];
  interacoes: InteracaoCliente[];
}

// ─── Funções Utilitárias de Sanitização e Exportação ──────────────────────────

/**
 * Converte a lista de clientes para CSV formatado em UTF-8 com BOM para Excel
 */
export function converterClientesParaCSV(clientes: Cliente[]): string {
  const colunas = [
    'ID',
    'Tipo Pessoa',
    'Nome / Razão Social',
    'Nome Fantasia',
    'CPF / CNPJ',
    'RG / IE',
    'Data de Nascimento',
    'Sexo',
    'Nacionalidade',
    'Estado Civil',
    'Profissão',
    'País',
    'Telefone / WhatsApp',
    'Telefone Secundário',
    'E-mail',
    'Logradouro',
    'Número',
    'Complemento',
    'Bairro',
    'Cidade',
    'UF',
    'CEP',
    'Tem Representante',
    'Nome Representante',
    'CPF/CNPJ Representante',
    'RG Representante',
    'Status Ciclo',
    'Origem Contato',
    'Anotações Gerais',
    'Criado Em',
  ];

  const linhas = clientes.map((c) => [
    c.id || '',
    c.tipo_pessoa || 'PF',
    `"${(c.nome_razao_social || '').replace(/"/g, '""')}"`,
    `"${(c.nome_fantasia || '').replace(/"/g, '""')}"`,
    c.cpf_cnpj || '',
    c.rg_ie || '',
    c.data_nascimento || '',
    c.sexo || '',
    c.nacionalidade || '',
    c.estado_civil || '',
    `"${(c.profissao || '').replace(/"/g, '""')}"`,
    c.pais || 'Brasil',
    c.telefone_whatsapp || '',
    c.telefone_secundario || '',
    c.email || '',
    `"${(c.endereco_logradouro || '').replace(/"/g, '""')}"`,
    c.endereco_numero || '',
    `"${(c.endereco_complemento || '').replace(/"/g, '""')}"`,
    `"${(c.endereco_bairro || '').replace(/"/g, '""')}"`,
    `"${(c.endereco_cidade || '').replace(/"/g, '""')}"`,
    c.endereco_uf || '',
    c.endereco_cep || '',
    c.tem_representante ? 'Sim' : 'Não',
    `"${(c.rep_nome || '').replace(/"/g, '""')}"`,
    c.rep_cpf_cnpj || '',
    c.rep_rg || '',
    c.status_ciclo || '',
    `"${(c.origem_contato || '').replace(/"/g, '""')}"`,
    `"${(c.anotacoes_gerais || '').replace(/"/g, '""')}"`,
    c.created_at || '',
  ]);

  const csvContent = [colunas.join(';'), ...linhas.map((l) => l.join(';'))].join('\r\n');
  return '\uFEFF' + csvContent; // Adiciona BOM para suporte correto a acentos no Excel
}

/**
 * Gera o manifesto com resumo analítico dos registros do backup
 */
export function gerarManifestoBackup(
  escopo: EscopoBackup,
  estatisticas: {
    total_clientes: number;
    total_casos: number;
    total_interacoes: number;
    total_documentos: number;
  },
  arquivos: string[]
): ManifestoBackup {
  return {
    versao_backup: '1.0',
    gerado_em: new Date().toISOString(),
    escopo,
    escritorio: {
      nome: 'Advocacia Edvaldo Rodrigues Ferreira',
      sistema: 'CRM JusTrack v2.0',
    },
    estatisticas,
    arquivos_incluidos: arquivos,
  };
}

/**
 * Formata nome padronizado para o arquivo de backup compactado
 */
export function gerarNomeArquivoZip(escopo: EscopoBackup): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');

  return `backup_edvaldo_adv_${escopo}_${ano}-${mes}-${dia}_${hora}h${min}.zip`;
}

/**
 * Validação de configurações do Google Drive
 */
export function validarConfiguracaoDrive(config: Partial<ConfiguracaoDrive>): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];

  if (config.ativo) {
    if (!config.google_drive_folder_id?.trim() && !config.webhook_backup_url?.trim()) {
      erros.push('Informe o ID da Pasta do Google Drive ou o Webhook de Sincronização');
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}
