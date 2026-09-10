import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase, Role, Permission, ModuloSistema, AcaoPermissao, PerfilUsuario } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface RBACContextValue {
  perfil: PerfilUsuario | null;
  role: Role | null;
  permissions: Permission[];
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (modulo: ModuloSistema, acao: AcaoPermissao) => boolean;
  refreshPermissions: () => Promise<void>;
}

const RBACContext = createContext<RBACContextValue>({
  perfil: null,
  role: null,
  permissions: [],
  isAdmin: false,
  isLoading: true,
  hasPermission: () => false,
  refreshPermissions: async () => {},
});

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRBAC = async () => {
    if (!session?.user?.id) {
      setPerfil(null);
      setRole(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 1. Busca perfil do usuário autenticado com o papel associado (role)
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select(`
          *,
          role:roles (
            id,
            nome,
            descricao,
            is_default,
            created_by,
            created_at
          )
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      if (perfilError) {
        console.error('[RBACContext] Erro ao carregar perfil:', perfilError);
        setIsLoading(false);
        return;
      }

      if (!perfilData) {
        setPerfil(null);
        setRole(null);
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      const roleObj = perfilData.role as Role | null;
      setPerfil(perfilData as PerfilUsuario);
      setRole(roleObj);

      // 2. Se houver role associada, carrega a lista de permissões
      if (perfilData.role_id) {
        const { data: permsData, error: permsError } = await supabase
          .from('permissions')
          .select('id, role_id, modulo, acao')
          .eq('role_id', perfilData.role_id);

        if (permsError) {
          console.error('[RBACContext] Erro ao carregar permissões:', permsError);
          setPermissions([]);
        } else {
          setPermissions((permsData as Permission[]) || []);
        }
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('[RBACContext] Exceção inesperada ao carregar RBAC:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRBAC();
  }, [session?.user?.id]);

  const isAdmin = useMemo(() => {
    if (!role?.nome) return false;
    const nomeNormalizado = role.nome.toLowerCase().trim();
    return nomeNormalizado === 'administrador' || nomeNormalizado === 'admin';
  }, [role]);

  const hasPermission = (modulo: ModuloSistema, acao: AcaoPermissao): boolean => {
    // Administrador possui acesso total por definição
    if (isAdmin) return true;

    return permissions.some(
      (p) => p.modulo === modulo && p.acao === acao
    );
  };

  const value = useMemo(
    () => ({
      perfil,
      role,
      permissions,
      isAdmin,
      isLoading,
      hasPermission,
      refreshPermissions: loadRBAC,
    }),
    [perfil, role, permissions, isAdmin, isLoading]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC deve ser utilizado dentro de um RBACProvider');
  }
  return context;
}
