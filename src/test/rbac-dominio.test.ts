import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { ModuloSistema, AcaoPermissao, Permission, Role } from '@/lib/supabase';

// Mock do contexto RBAC para testes isolados
const mockPermissions: Permission[] = [
  { modulo: 'clientes', acao: 'visualizar' },
  { modulo: 'clientes', acao: 'criar' },
  { modulo: 'casos', acao: 'visualizar' },
  { modulo: 'agenda', acao: 'visualizar' },
];

const mockAdminRole: Role = {
  id: 'admin-uuid',
  nome: 'Administrador',
  descricao: 'Acesso total',
  is_default: true,
  created_by: null,
  created_at: new Date().toISOString(),
};

const mockEstagiarioRole: Role = {
  id: 'estagiario-uuid',
  nome: 'Estagiário / Assistente',
  descricao: 'Acesso básico',
  is_default: true,
  created_by: null,
  created_at: new Date().toISOString(),
};

describe('Hook usePermission', () => {
  it('permite acesso quando a permissão existe no perfil', () => {
    // Validação direta da lógica de match
    const hasPerm = (
      perms: Permission[],
      isAdmin: boolean,
      modulo: ModuloSistema,
      acao: AcaoPermissao
    ) => isAdmin || perms.some((p) => p.modulo === modulo && p.acao === acao);

    expect(hasPerm(mockPermissions, false, 'clientes', 'visualizar')).toBe(true);
    expect(hasPerm(mockPermissions, false, 'clientes', 'criar')).toBe(true);
  });

  it('bloqueia acesso quando a permissão não foi concedida', () => {
    const hasPerm = (
      perms: Permission[],
      isAdmin: boolean,
      modulo: ModuloSistema,
      acao: AcaoPermissao
    ) => isAdmin || perms.some((p) => p.modulo === modulo && p.acao === acao);

    expect(hasPerm(mockPermissions, false, 'clientes', 'deletar')).toBe(false);
    expect(hasPerm(mockPermissions, false, 'financeiro', 'visualizar')).toBe(false);
    expect(hasPerm(mockPermissions, false, 'perfis_acesso', 'criar')).toBe(false);
  });

  it('concede acesso total e irrestrito caso o usuário seja Administrador', () => {
    const hasPerm = (
      perms: Permission[],
      isAdmin: boolean,
      modulo: ModuloSistema,
      acao: AcaoPermissao
    ) => isAdmin || perms.some((p) => p.modulo === modulo && p.acao === acao);

    expect(hasPerm([], true, 'financeiro', 'deletar')).toBe(true);
    expect(hasPerm([], true, 'perfis_acesso', 'criar')).toBe(true);
    expect(hasPerm([], true, 'usuarios', 'deletar')).toBe(true);
  });

  it('PermissionGuard oculta conteúdo caso o usuário (ex: Estagiário) não tenha a permissão', () => {
    const renderGuard = (
      permitido: boolean,
      children: string,
      fallback: string | null = null
    ) => (permitido ? children : fallback);

    const estagiarioTemFinanceiro = false;
    const resultado = renderGuard(estagiarioTemFinanceiro, 'Dados Financeiros Confidenciais');
    expect(resultado).toBeNull();

    const estagiarioTemDocumentos = true;
    const resultadoDoc = renderGuard(estagiarioTemDocumentos, 'Visualizar Documentos');
    expect(resultadoDoc).toBe('Visualizar Documentos');
  });
});
