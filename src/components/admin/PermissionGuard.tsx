import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { ModuloSistema, AcaoPermissao } from '@/lib/supabase';

interface PermissionGuardProps {
  modulo: ModuloSistema;
  acao: AcaoPermissao;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Componente declarativo que renderiza seus filhos somente se o usuário
 * logado possuir a permissão requerida para o módulo e ação especificados.
 *
 * @example
 * <PermissionGuard modulo="financeiro" acao="visualizar">
 *   <SecaoHonorarios />
 * </PermissionGuard>
 */
export function PermissionGuard({
  modulo,
  acao,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const permitido = usePermission(modulo, acao);

  if (!permitido) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
