export type ModuloSistema =
  | 'clientes'
  | 'casos'
  | 'agenda'
  | 'documentos'
  | 'financeiro'
  | 'relatorios'
  | 'usuarios'
  | 'perfis_acesso';

export type AcaoPermissao = 'visualizar' | 'criar' | 'editar' | 'deletar';

export type EscopoAcesso = 'individual' | 'geral';

export interface Role {
  id: string;
  nome: string;
  descricao: string | null;
  escopo?: EscopoAcesso;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Permission {
  id?: string;
  role_id?: string;
  modulo: ModuloSistema;
  acao: AcaoPermissao;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}
