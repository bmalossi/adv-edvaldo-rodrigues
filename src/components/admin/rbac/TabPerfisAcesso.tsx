import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Users, Loader2, Lock, CheckCircle2, Globe, User } from 'lucide-react';
import { supabase, Role } from '@/lib/supabase';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { ModalPerfil } from './ModalPerfil';
import { toast } from 'sonner';

interface RoleComContagem extends Role {
  totalUsuarios?: number;
}

export function TabPerfisAcesso() {
  const canCriar = usePermission('perfis_acesso', 'criar');
  const canEditar = usePermission('perfis_acesso', 'editar');
  const canDeletar = usePermission('perfis_acesso', 'deletar');

  const [roles, setRoles] = useState<RoleComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [roleEmEdicao, setRoleEmEdicao] = useState<Role | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregarRoles = async () => {
    try {
      setLoading(true);

      // 1. Busca todas as roles ordenando por padrão primeiro e depois por nome
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('nome', { ascending: true });

      if (rolesError) throw rolesError;

      // 2. Busca a contagem de usuários vinculados a cada perfil
      const { data: perfisData, error: perfisError } = await supabase
        .from('perfis')
        .select('role_id');

      if (perfisError) {
        console.warn('Aviso ao buscar contagem de perfis:', perfisError);
      }

      const contagemMap: Record<string, number> = {};
      (perfisData || []).forEach((p) => {
        if (p.role_id) {
          contagemMap[p.role_id] = (contagemMap[p.role_id] || 0) + 1;
        }
      });

      const rolesFormatadas: RoleComContagem[] = (rolesData || []).map((r) => ({
        ...r,
        totalUsuarios: contagemMap[r.id] || 0,
      }));

      setRoles(rolesFormatadas);
    } catch (err: any) {
      console.error('Erro ao carregar perfis de acesso:', err);
      toast.error('Não foi possível carregar os perfis de acesso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRoles();
  }, []);

  const handleNovoPerfil = () => {
    setRoleEmEdicao(null);
    setModalOpen(true);
  };

  const handleEditarPerfil = (role: Role) => {
    setRoleEmEdicao(role);
    setModalOpen(true);
  };

  const handleExcluirPerfil = async (role: RoleComContagem) => {
    // Regra 189: Impedir exclusão de perfis padrão de fábrica
    if (role.is_default) {
      toast.error('Perfis padrão de fábrica do sistema não podem ser excluídos.');
      return;
    }

    // Regra 188: Impedir exclusão de perfis com usuários associados
    if (role.totalUsuarios && role.totalUsuarios > 0) {
      toast.error(
        `Este perfil está associado a ${role.totalUsuarios} usuário(s). Reatribua os usuários antes de excluir.`
      );
      return;
    }

    const confirmacao = window.confirm(
      `Deseja realmente excluir o perfil "${role.nome}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmacao) return;

    try {
      setExcluindoId(role.id);
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;

      toast.success(`Perfil "${role.nome}" excluído com sucesso.`);
      await carregarRoles();
    } catch (err: any) {
      console.error('Erro ao excluir perfil:', err);
      toast.error(err?.message || 'Falha ao excluir o perfil.');
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" />
            Perfis de Acesso (RBAC)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie as funções da equipe e as permissões de visibilidade e ação por módulo.
          </p>
        </div>

        {canCriar && (
          <Button
            onClick={handleNovoPerfil}
            className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-md gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Perfil
          </Button>
        )}
      </div>

      {/* Listagem de Cards de Roles */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-secondary" />
          <span className="text-slate-400 text-sm">Carregando perfis de acesso...</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-12 text-center">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Nenhum perfil encontrado</h3>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            Crie novos perfis para estruturar o controle de acesso da banca jurídica.
          </p>
          {canCriar && (
            <Button onClick={handleNovoPerfil} className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl">
              Criar Primeiro Perfil
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-slate-900/80 border border-white/10 hover:border-secondary/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-secondary transition-colors">
                      {role.nome}
                    </h3>
                    {role.is_default && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/10 text-secondary border border-secondary/20 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Padrão
                      </span>
                    )}
                    {role.escopo === 'geral' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1" title="Visualização Geral: Acesso aos dados de toda a banca">
                        <Globe className="w-2.5 h-2.5" />
                        Geral
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1" title="Visualização Individual: Acesso apenas aos próprios registros">
                        <User className="w-2.5 h-2.5" />
                        Individual
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-white/5 text-xs text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{role.totalUsuarios || 0}</span>
                    <span className="text-slate-500 text-[11px]">usuários</span>
                  </div>
                </div>

                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                  {role.descricao || 'Sem descrição cadastrada para este perfil.'}
                </p>
              </div>

              {/* Ações do Card */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Ativo no sistema
                </span>

                <div className="flex items-center gap-2">
                  {canEditar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditarPerfil(role)}
                      className="h-8 px-3 border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-lg text-xs gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-secondary" />
                      Editar
                    </Button>
                  )}

                  {canDeletar && !role.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={excluindoId === role.id || Boolean(role.totalUsuarios && role.totalUsuarios > 0)}
                      onClick={() => handleExcluirPerfil(role)}
                      className="h-8 px-2.5 text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                      title={
                        role.totalUsuarios && role.totalUsuarios > 0
                          ? 'Não é permitido excluir perfis com usuários associados'
                          : 'Excluir perfil'
                      }
                    >
                      {excluindoId === role.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Perfil */}
      <ModalPerfil
        open={modalOpen}
        roleParaEditar={roleEmEdicao}
        onClose={() => setModalOpen(false)}
        onSalvo={carregarRoles}
      />
    </div>
  );
}
