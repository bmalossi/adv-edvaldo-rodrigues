import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Power,
  Shield,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { supabase, PerfilUsuario, Role } from '@/lib/supabase';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalUsuario } from './ModalUsuario';
import { toast } from 'sonner';

export function TabUsuarios() {
  const canCriar = usePermission('usuarios', 'criar');
  const canEditar = usePermission('usuarios', 'editar');

  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<PerfilUsuario | null>(null);
  const [alternandoStatusId, setAlternandoStatusId] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // 1. Busca todas as roles disponíveis
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('nome', { ascending: true });

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // 2. Busca todos os usuários com suas respectivas roles
      const { data: perfisData, error: perfisError } = await supabase
        .from('perfis')
        .select(`
          *,
          role:roles (
            id,
            nome,
            descricao,
            is_default
          )
        `)
        .order('created_at', { ascending: false });

      if (perfisError) throw perfisError;
      setUsuarios((perfisData as PerfilUsuario[]) || []);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      toast.error('Não foi possível listar os usuários do escritório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAlternarStatus = async (user: PerfilUsuario) => {
    const novoStatus = !user.ativo;
    const acaoTexto = novoStatus ? 'ativar' : 'desativar';

    const confirmacao = window.confirm(
      `Deseja realmente ${acaoTexto} a conta de "${user.nome}"?`
    );
    if (!confirmacao) return;

    try {
      setAlternandoStatusId(user.id);

      const { error } = await supabase
        .from('perfis')
        .update({
          ativo: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        if (error.message?.includes('Administrador')) {
          throw new Error(error.message);
        }
        throw error;
      }

      toast.success(`Conta de ${user.nome} ${novoStatus ? 'ativada' : 'desativada'} com sucesso.`);
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao alterar status:', err);
      toast.error(err?.message || `Falha ao ${acaoTexto} a conta.`);
    } finally {
      setAlternandoStatusId(null);
    }
  };

  const handleResetSenha = async (user: PerfilUsuario) => {
    const confirmacao = window.confirm(
      `Deseja forçar a troca de senha para "${user.nome}" no próximo acesso?`
    );
    if (!confirmacao) return;

    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Troca de senha exigida no próximo login de ${user.nome}.`);
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao forçar troca de senha:', err);
      toast.error('Falha ao configurar a troca de senha.');
    }
  };

  // Filtragem em memória
  const usuariosFiltrados = usuarios.filter((u) => {
    const matchBusca =
      !busca.trim() ||
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      (u.oab && u.oab.toLowerCase().includes(busca.toLowerCase()));

    const matchRole = filtroRole === 'todos' || u.role_id === filtroRole;
    const matchStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'ativos' && u.ativo) ||
      (filtroStatus === 'inativos' && !u.ativo);

    return matchBusca && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Topo com Título e Botão de Novo Usuário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-secondary" />
            Equipe & Contas de Usuários
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie colaboradores, atribua perfis de acesso e controle credenciais.
          </p>
        </div>

        {canCriar && (
          <Button
            onClick={() => {
              setUsuarioEmEdicao(null);
              setModalOpen(true);
            }}
            className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-md gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou OAB..."
            className="pl-9 bg-slate-900 border-white/10 text-white placeholder:text-slate-500 rounded-xl"
          />
        </div>

        <div>
          <select
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className="w-full h-10 px-3 bg-slate-900 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-secondary focus:border-secondary outline-none"
          >
            <option value="todos">Todos os perfis</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full h-10 px-3 bg-slate-900 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-secondary focus:border-secondary outline-none"
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Apenas ativos</option>
            <option value="inativos">Apenas desativados</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-secondary" />
          <span className="text-slate-400 text-sm">Carregando usuários do escritório...</span>
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Nenhum usuário encontrado</h3>
          <p className="text-slate-400 text-sm mt-1">
            Tente ajustar os termos da busca ou filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Colaborador</th>
                  <th className="py-3.5 px-4">Perfil / Função</th>
                  <th className="py-3.5 px-4">Contato / OAB</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usuariosFiltrados.map((u) => {
                  const roleNome = u.role?.nome || 'Sem Perfil';
                  const isAdminRole = roleNome.toLowerCase().includes('admin');

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{u.nome}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isAdminRole
                              ? 'bg-secondary/10 text-secondary border-secondary/20'
                              : 'bg-white/5 text-slate-300 border-white/10'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {roleNome}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300 space-y-0.5">
                        {u.oab && <div>OAB: <span className="font-mono text-slate-400">{u.oab}</span></div>}
                        {u.telefone && <div>Tel: <span className="font-mono text-slate-400">{u.telefone}</span></div>}
                        {!u.oab && !u.telefone && <span className="text-slate-500">-</span>}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {u.ativo ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Inativo
                          </span>
                        )}
                        {u.must_change_password && (
                          <span className="block text-[10px] text-amber-400/90 mt-0.5">
                            Troca pendente
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEditar && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setUsuarioEmEdicao(u);
                                  setModalOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                                title="Editar dados e perfil"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetSenha(u)}
                                className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg"
                                title="Exigir troca de senha no próximo login"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={alternandoStatusId === u.id}
                                onClick={() => handleAlternarStatus(u)}
                                className={`h-8 w-8 p-0 rounded-lg ${
                                  u.ativo
                                    ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                                    : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={u.ativo ? 'Desativar conta' : 'Reativar conta'}
                              >
                                {alternandoStatusId === u.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Usuário */}
      <ModalUsuario
        open={modalOpen}
        usuarioParaEditar={usuarioEmEdicao}
        rolesDisponiveis={roles}
        onClose={() => setModalOpen(false)}
        onSalvo={carregarDados}
      />
    </div>
  );
}
