import { useState, useEffect } from 'react';
import { X, Shield, Sparkles, Loader2, Globe, User } from 'lucide-react';
import { supabase, Role, ModuloSistema, AcaoPermissao, EscopoAcesso } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const MODULOS_SISTEMA: { id: ModuloSistema; label: string; descricao: string }[] = [
  { id: 'clientes', label: 'Clientes & CRM', descricao: 'Cadastro, histórico e gestão da carteira' },
  { id: 'casos', label: 'Processos & Casos', descricao: 'Ações judiciais, consultorias e fases' },
  { id: 'agenda', label: 'Agenda & Prazos', descricao: 'Audiências, tarefas, compromissos' },
  { id: 'documentos', label: 'Documentos & Minutas', descricao: 'Geração de docx, modelos e uploads' },
  { id: 'financeiro', label: 'Financeiro & Honorários', descricao: 'Contratos, valores e faturamento' },
  { id: 'relatorios', label: 'Relatórios & Métricas', descricao: 'Dashboards e análises gerenciais' },
  { id: 'usuarios', label: 'Usuários da Equipe', descricao: 'Criação e gerenciamento de contas' },
  { id: 'perfis_acesso', label: 'Perfis & Governança', descricao: 'Configuração do RBAC e permissões' },
];

export const ACOES_PERMISSAO: { id: AcaoPermissao; label: string }[] = [
  { id: 'visualizar', label: 'Visualizar' },
  { id: 'criar', label: 'Criar' },
  { id: 'editar', label: 'Editar' },
  { id: 'deletar', label: 'Deletar' },
];

// Templates prontos de fábrica para agilizar a criação
const TEMPLATES_PADRAO: Record<string, { nome: string; escopo: EscopoAcesso; perms: { modulo: ModuloSistema; acao: AcaoPermissao }[] }> = {
  administrador: {
    nome: 'Base: Administrador',
    escopo: 'geral',
    perms: MODULOS_SISTEMA.flatMap((m) =>
      ACOES_PERMISSAO.map((a) => ({ modulo: m.id, acao: a.id }))
    ),
  },
  socio: {
    nome: 'Base: Sócio',
    escopo: 'geral',
    perms: [
      ...['clientes', 'casos', 'agenda', 'documentos', 'financeiro', 'relatorios'].flatMap((m) =>
        ACOES_PERMISSAO.map((a) => ({ modulo: m as ModuloSistema, acao: a.id }))
      ),
      { modulo: 'usuarios', acao: 'visualizar' },
    ],
  },
  associado: {
    nome: 'Base: Advogado Associado',
    escopo: 'individual',
    perms: ['clientes', 'casos', 'agenda', 'documentos'].flatMap((m) =>
      ACOES_PERMISSAO.map((a) => ({ modulo: m as ModuloSistema, acao: a.id }))
    ),
  },
  estagiario: {
    nome: 'Base: Estagiário / Assistente',
    escopo: 'geral',
    perms: [
      { modulo: 'clientes', acao: 'visualizar' },
      { modulo: 'casos', acao: 'visualizar' },
      { modulo: 'agenda', acao: 'visualizar' },
      { modulo: 'agenda', acao: 'criar' },
      { modulo: 'documentos', acao: 'visualizar' },
      { modulo: 'documentos', acao: 'criar' },
      { modulo: 'documentos', acao: 'editar' },
      { modulo: 'relatorios', acao: 'visualizar' },
    ],
  },
};

interface ModalPerfilProps {
  open: boolean;
  roleParaEditar?: Role | null;
  onClose: () => void;
  onSalvo: () => void;
}

export function ModalPerfil({ open, roleParaEditar, onClose, onSalvo }: ModalPerfilProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [escopo, setEscopo] = useState<EscopoAcesso>('individual');
  const [permissoesMarcadas, setPermissoesMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (roleParaEditar) {
      setNome(roleParaEditar.nome);
      setDescricao(roleParaEditar.descricao || '');
      setEscopo(roleParaEditar.escopo || 'individual');
      carregarPermissoesRole(roleParaEditar.id);
    } else {
      setNome('');
      setDescricao('');
      setEscopo('individual');
      // Por padrão em novo perfil, seleciona o template de Advogado Associado
      aplicarTemplate('associado');
    }
  }, [open, roleParaEditar]);

  const carregarPermissoesRole = async (roleId: string) => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('permissions')
        .select('modulo, acao')
        .eq('role_id', roleId);

      if (error) throw error;

      const keys = new Set<string>();
      (data || []).forEach((p) => {
        keys.add(`${p.modulo}:${p.acao}`);
      });
      setPermissoesMarcadas(keys);
    } catch (err) {
      console.error('Erro ao carregar permissões do perfil:', err);
      toast.error('Erro ao carregar permissões.');
    } finally {
      setCarregando(false);
    }
  };

  const togglePermissao = (modulo: ModuloSistema, acao: AcaoPermissao) => {
    const chave = `${modulo}:${acao}`;
    setPermissoesMarcadas((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) {
        next.delete(chave);
      } else {
        next.add(chave);
      }
      return next;
    });
  };

  const toggleLinhaModulo = (modulo: ModuloSistema) => {
    const acoesDoModulo = ACOES_PERMISSAO.map((a) => `${modulo}:${a.id}`);
    const todasMarcadas = acoesDoModulo.every((k) => permissoesMarcadas.has(k));

    setPermissoesMarcadas((prev) => {
      const next = new Set(prev);
      acoesDoModulo.forEach((k) => {
        if (todasMarcadas) {
          next.delete(k);
        } else {
          next.add(k);
        }
      });
      return next;
    });
  };

  const aplicarTemplate = (templateKey: string) => {
    const tpl = TEMPLATES_PADRAO[templateKey];
    if (!tpl) return;
    setEscopo(tpl.escopo);
    const keys = new Set<string>();
    tpl.perms.forEach((p) => keys.add(`${p.modulo}:${p.acao}`));
    setPermissoesMarcadas(keys);
    toast.info(`Template "${tpl.nome}" aplicado à matriz.`);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Informe o nome do perfil de acesso.');
      return;
    }

    try {
      setSalvando(true);
      let roleId = roleParaEditar?.id;

      // 1. Salva ou atualiza a Role
      if (roleParaEditar) {
        const { error: updateError } = await supabase
          .from('roles')
          .update({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            escopo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', roleParaEditar.id);

        if (updateError) throw updateError;
      } else {
        const { data: newRole, error: insertError } = await supabase
          .from('roles')
          .insert({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            escopo,
            is_default: false,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        roleId = newRole.id;
      }

      if (!roleId) throw new Error('ID do perfil não identificado.');

      // 2. Atualiza as permissões associadas (exclui existentes e reinsere atômico)
      const { error: deletePermsError } = await supabase
        .from('permissions')
        .delete()
        .eq('role_id', roleId);

      if (deletePermsError) throw deletePermsError;

      const novasPermissoes = Array.from(permissoesMarcadas).map((chave) => {
        const [modulo, acao] = chave.split(':');
        return {
          role_id: roleId,
          modulo,
          acao,
        };
      });

      if (novasPermissoes.length > 0) {
        const { error: insertPermsError } = await supabase
          .from('permissions')
          .insert(novasPermissoes);

        if (insertPermsError) throw insertPermsError;
      }

      toast.success(
        roleParaEditar
          ? 'Perfil de acesso atualizado com sucesso!'
          : 'Novo perfil de acesso criado com sucesso!'
      );
      onSalvo();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      toast.error(err?.message || 'Falha ao salvar o perfil de acesso.');
    } finally {
      setSalvando(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {roleParaEditar ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Configure a granularidade de permissões para este perfil de colaborador.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Identificação básica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Nome do Perfil *
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Secretária Jurídica, Correspondente..."
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-lg"
                required
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Carregar Template Base
              </Label>
              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) aplicarTemplate(e.target.value);
                  }}
                  className="w-full h-10 px-3 bg-slate-950/50 border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-amber-500"
                >
                  <option value="" disabled>
                    Escolha um modelo de permissão...
                  </option>
                  <option value="administrador">Administrador (Total)</option>
                  <option value="socio">Sócio (Gestão + Processos + Financeiro)</option>
                  <option value="associado">Advogado Associado (Técnico CRUD)</option>
                  <option value="estagiario">Estagiário (Apoio / Sem Delete)</option>
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Descrição da Função
              </Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva as responsabilidades ou escopo deste perfil no escritório..."
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-lg resize-none h-18 text-sm"
              />
            </div>
          </div>

          {/* Escopo de Visualização e Gestão */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block">
              Escopo de Visualização & Gestão de Dados
            </Label>
            <p className="text-xs text-slate-400">
              Define se os membros deste perfil visualizam apenas seus próprios registros ou os dados de toda a banca jurídica.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEscopo('individual')}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                  escopo === 'individual'
                    ? 'bg-secondary/10 border-secondary ring-1 ring-secondary/50'
                    : 'bg-slate-950/40 border-white/10 hover:border-white/20'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg mt-0.5',
                    escopo === 'individual'
                      ? 'bg-secondary text-primary font-bold'
                      : 'bg-slate-800 text-slate-400'
                  )}
                >
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Visualização Individual apenas</span>
                    {escopo === 'individual' && (
                      <span className="text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded font-medium border border-secondary/30">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Usuário tem acesso restrito aos seus próprios clientes, processos/casos e tarefas/agenda (salvo compartilhamentos explícitos).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEscopo('geral')}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                  escopo === 'geral'
                    ? 'bg-secondary/10 border-secondary ring-1 ring-secondary/50'
                    : 'bg-slate-950/40 border-white/10 hover:border-white/20'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg mt-0.5',
                    escopo === 'geral'
                      ? 'bg-secondary text-primary font-bold'
                      : 'bg-slate-800 text-slate-400'
                  )}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Visualização Geral (Toda a banca)</span>
                    {escopo === 'geral' && (
                      <span className="text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded font-medium border border-secondary/30">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Usuário tem visibilidade global de todos os clientes, casos e agenda de todos os colaboradores do escritório (conforme permissões da matriz).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Matriz de Permissões */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Matriz de Permissões por Módulo
                </h3>
                <p className="text-xs text-slate-400">
                  Marque as ações permitidas para os usuários deste perfil.
                </p>
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                {permissoesMarcadas.size} permissões ativas
              </span>
            </div>

            {carregando ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/70 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 min-w-[220px]">Módulo do Sistema</th>
                        {ACOES_PERMISSAO.map((acao) => (
                          <th key={acao.id} className="py-3 px-3 text-center min-w-[90px]">
                            {acao.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {MODULOS_SISTEMA.map((modulo) => {
                        return (
                          <tr key={modulo.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => toggleLinhaModulo(modulo.id)}
                                className="text-left group"
                                title="Clique para marcar/desmarcar todas as ações deste módulo"
                              >
                                <span className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors block">
                                  {modulo.label}
                                </span>
                                <span className="text-xs text-slate-500 block">
                                  {modulo.descricao}
                                </span>
                              </button>
                            </td>
                            {ACOES_PERMISSAO.map((acao) => {
                              const chave = `${modulo.id}:${acao.id}`;
                              return (
                                <td key={acao.id} className="py-3 px-3 text-center">
                                  <div className="flex justify-center items-center">
                                    <Checkbox
                                      checked={permissoesMarcadas.has(chave)}
                                      onCheckedChange={() => togglePermissao(modulo.id, acao.id)}
                                      className="data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-primary border-slate-600 rounded"
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Ações */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/10 text-slate-300 hover:text-white rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-cta-gold hover:opacity-90 text-primary font-bold px-6 rounded-xl shadow-md"
            >
              {salvando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                'Salvar Perfil'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
