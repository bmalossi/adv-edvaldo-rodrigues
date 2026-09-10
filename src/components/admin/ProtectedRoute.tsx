import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { useRBAC } from '@/contexts/RBACContext';
import { ModuloSistema, AcaoPermissao } from '@/lib/supabase';
import { toast } from 'sonner';

type Props = {
  children: React.ReactNode;
  requires?: {
    modulo: ModuloSistema;
    acao: AcaoPermissao;
  };
};

export function ProtectedRoute({ children, requires }: Props) {
  const { session, mustChangePassword, loading: authLoading } = useAuth();
  const { isLoading: rbacLoading } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();

  // Se requires for informado, valida com o hook usePermission
  const hasRequiredPermission = usePermission(
    requires?.modulo || 'clientes',
    requires?.acao || 'visualizar'
  );

  useEffect(() => {
    // 1. Redirecionamento se não autenticado
    if (!authLoading && !session) {
      navigate('/login', { replace: true });
      return;
    }

    // 2. Redirecionamento se precisa trocar a senha obrigatoriamente
    if (
      !authLoading &&
      session &&
      mustChangePassword &&
      location.pathname !== '/admin/trocar-senha'
    ) {
      navigate('/admin/trocar-senha', { replace: true });
      return;
    }

    // 3. Verificação de permissão granular se requires estiver configurado
    if (!authLoading && !rbacLoading && session && requires) {
      if (!hasRequiredPermission) {
        toast.error('Acesso não autorizado para este módulo.');
        navigate('/admin/crm/funil', { replace: true });
      }
    }
  }, [
    session,
    mustChangePassword,
    authLoading,
    rbacLoading,
    requires,
    hasRequiredPermission,
    navigate,
    location.pathname,
  ]);

  if (authLoading || (requires && rbacLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Carregando permissões...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Se requer permissão e ainda não tem, não renderiza os filhos enquanto redireciona
  if (requires && !hasRequiredPermission) {
    return null;
  }

  return <>{children}</>;
}
