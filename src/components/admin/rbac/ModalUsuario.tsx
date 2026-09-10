import { useState, useEffect } from 'react';
import { X, UserPlus, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { supabase, Role, PerfilUsuario } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface ModalUsuarioProps {
  open: boolean;
  usuarioParaEditar?: PerfilUsuario | null;
  rolesDisponiveis: Role[];
  onClose: () => void;
  onSalvo: () => void;
}

export function ModalUsuario({
  open,
  usuarioParaEditar,
  rolesDisponiveis,
  onClose,
  onSalvo,
}: ModalUsuarioProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [oab, setOab] = useState('');
  const [telefone, setTelefone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [forcarTrocaSenha, setForcarTrocaSenha] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (usuarioParaEditar) {
      setNome(usuarioParaEditar.nome || '');
      setEmail(usuarioParaEditar.email || '');
      setOab(usuarioParaEditar.oab || '');
      setTelefone(usuarioParaEditar.telefone || '');
      setRoleId(usuarioParaEditar.role_id || '');
      setForcarTrocaSenha(Boolean(usuarioParaEditar.must_change_password));
      setSenha('');
      setConfirmarSenha('');
    } else {
      setNome('');
      setEmail('');
      setOab('');
      setTelefone('');
      setSenha('');
      setConfirmarSenha('');
      setForcarTrocaSenha(true);
      // Seleciona uma role padrão (Advogado Associado ou primeira da lista)
      const associadoRole = rolesDisponiveis.find((r) => r.nome.toLowerCase().includes('associado'));
      setRoleId(associadoRole ? associadoRole.id : rolesDisponiveis[0]?.id || '');
    }
  }, [open, usuarioParaEditar, rolesDisponiveis]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || !roleId) {
      toast.error('Preencha os campos obrigatórios (Nome, E-mail e Perfil de Acesso).');
      return;
    }

    // Modo Criação: exige senha temporária com validação
    if (!usuarioParaEditar) {
      if (!senha || senha.length < 6) {
        toast.error('A senha temporária deve conter no mínimo 6 caracteres.');
        return;
      }
      if (senha !== confirmarSenha) {
        toast.error('As senhas não coincidem.');
        return;
      }
    }

    try {
      setSalvando(true);

      if (usuarioParaEditar) {
        // Modo Edição: atualiza perfil diretamente via Supabase
        const { error: updateError } = await supabase
          .from('perfis')
          .update({
            nome: nome.trim(),
            oab: oab.trim() || null,
            telefone: telefone.trim() || null,
            role_id: roleId,
            must_change_password: forcarTrocaSenha,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usuarioParaEditar.id);

        if (updateError) {
          // Trata violação da trigger de soft rule check_last_admin
          if (updateError.message?.includes('Administrador')) {
            throw new Error(updateError.message);
          }
          throw updateError;
        }

        toast.success(`Dados de ${nome} atualizados com sucesso!`);
      } else {
        // Modo Criação: usa exclusivamente a Edge Function (auth.admin.createUser bypassa triggers problemáticos)
        const { data: funcData, error: funcError } = await supabase.functions.invoke('criar-usuario', {
          body: {
            email: email.trim(),
            password: senha,
            nome: nome.trim(),
            oab: oab.trim() || null,
            telefone: telefone.trim() || null,
            role_id: roleId,
            must_change_password: forcarTrocaSenha,
          },
        });

        if (funcError) {
          // FunctionsHttpError: funcData é null quando status é não-2xx.
          // O body real da resposta está em funcError.context (objeto Response).
          let msg = funcError.message;
          try {
            const errBody = await (funcError as any).context?.json?.();
            if (errBody?.error) msg = errBody.error;
          } catch { /* body já consumido ou não-JSON; usa funcError.message */ }
          throw new Error(msg);
        }

        if ((funcData as any)?.error) {
          throw new Error((funcData as any).error);
        }

        toast.success(`Conta para ${nome} criada com sucesso!`);
      }

      onSalvo();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err);
      toast.error(err?.message || 'Falha ao salvar a conta do usuário.');
    } finally {
      setSalvando(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {usuarioParaEditar ? 'Editar Usuário' : 'Novo Usuário do Escritório'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {usuarioParaEditar
                  ? 'Atualize os dados e o papel de acesso do colaborador.'
                  : 'Crie uma conta com credencial provisória para o novo membro.'}
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
        <form onSubmit={handleSalvar} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              Nome Completo *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Dr. Nome do Advogado ou Assistente"
              className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-lg"
              required
            />
          </div>

          <div>
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              E-mail de Acesso *
            </Label>
            <Input
              type="email"
              disabled={Boolean(usuarioParaEditar)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@edvaldorodrigues.adv.br"
              className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-lg disabled:opacity-50"
              required
            />
            {usuarioParaEditar && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                O e-mail é o identificador de login e não pode ser alterado diretamente.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Inscrição OAB (opcional)
              </Label>
              <Input
                value={oab}
                onChange={(e) => setOab(e.target.value)}
                placeholder="Ex: SP 123456"
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-lg"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Telefone / WhatsApp
              </Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-lg"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              Perfil de Acesso (Papel) *
            </Label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950/50 border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-amber-500"
              required
            >
              <option value="" disabled>
                Selecione a função do usuário...
              </option>
              {rolesDisponiveis.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nome} {role.is_default ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Campos de Senha Temporária apenas na Criação */}
          {!usuarioParaEditar && (
            <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <KeyRound className="w-3.5 h-3.5" />
                Senha Temporária de Acesso
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs block mb-1">Senha Inicial</Label>
                  <div className="relative">
                    <Input
                      type={showSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="bg-slate-900 border-white/10 text-white pr-8 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400 text-xs block mb-1">Confirmar Senha</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmarSenha ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a senha"
                      className="bg-slate-900 border-white/10 text-white pr-8 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showConfirmarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="chk-troca"
                  checked={forcarTrocaSenha}
                  onCheckedChange={(c) => setForcarTrocaSenha(Boolean(c))}
                  className="data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-primary rounded"
                />
                <label
                  htmlFor="chk-troca"
                  className="text-xs text-slate-300 font-medium cursor-pointer"
                >
                  Exigir troca de senha no primeiro acesso do colaborador
                </label>
              </div>
            </div>
          )}

          {/* Footer de Ações */}
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
              ) : usuarioParaEditar ? (
                'Atualizar Dados'
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
