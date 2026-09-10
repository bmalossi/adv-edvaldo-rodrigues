import { useRBAC } from '@/contexts/RBACContext';
import { ModuloSistema, AcaoPermissao } from '@/lib/supabase';

/**
 * Hook centralizado de checagem de permissões RBAC.
 * Consome o RBACContext global em memória (zero chamadas extras de banco).
 *
 * @param modulo Módulo do sistema a ser verificado
 * @param acao Ação requerida ('visualizar' | 'criar' | 'editar' | 'deletar')
 * @returns boolean indicando se o usuário possui a permissão
 */
export function usePermission(modulo: ModuloSistema, acao: AcaoPermissao): boolean {
  const { hasPermission, isLoading } = useRBAC();

  if (isLoading) {
    return false;
  }

  return hasPermission(modulo, acao);
}
