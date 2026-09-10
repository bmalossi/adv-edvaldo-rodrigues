import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function TrocarSenha() {
  const navigate = useNavigate();
  const { session, mustChangePassword, loading: authLoading } = useAuth();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Critério 164: Se o usuário já autenticado NÃO precisa trocar senha, redireciona para o dashboard
  useEffect(() => {
    if (!authLoading && session && !mustChangePassword) {
      navigate('/admin/crm/funil', { replace: true });
    }
  }, [authLoading, session, mustChangePassword, navigate]);

  const temTamanhoMinimo = novaSenha.length >= 8;
  const temNumero = /\d/.test(novaSenha);
  const temLetra = /[a-zA-Z]/.test(novaSenha);
  const senhasConferem = novaSenha.length > 0 && novaSenha === confirmarSenha;
  const senhaValida = temTamanhoMinimo && temNumero && temLetra && senhasConferem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!temTamanhoMinimo) {
      toast.error('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    if (!temLetra || !temNumero) {
      toast.error('A senha deve conter pelo menos uma letra e um número.');
      return;
    }

    if (!senhasConferem) {
      toast.error('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setSalvando(true);

      // 1. Atualiza PRIMEIRO a flag must_change_password na tabela perfis para evitar race condition no onAuthStateChange
      if (session?.user?.id) {
        const { error: perfilError } = await supabase
          .from('perfis')
          .update({
            must_change_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        if (perfilError) {
          console.warn('[TrocarSenha] Aviso ao atualizar flag de perfil:', perfilError);
        }
      }

      // 2. Atualiza a senha no Supabase Auth sincronizando o metadata
      const { error: authError } = await supabase.auth.updateUser({
        password: novaSenha,
        data: { must_change_password: false },
      });

      if (authError) {
        throw authError;
      }

      toast.success('Senha atualizada com sucesso! Bem-vindo ao sistema.');

      // 3. Redireciona de forma suave para o dashboard do CRM
      setTimeout(() => {
        navigate('/admin/crm/funil', { replace: true });
      }, 300);
    } catch (err: any) {
      console.error('[TrocarSenha] Erro ao atualizar senha:', err);
      toast.error(err?.message || 'Falha ao atualizar a senha. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Luzes de Fundo Institucionais */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card do Formulário */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/60">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary mb-4 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-secondary animate-pulse" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
              Troca Obrigatória de Senha
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Por medidas de segurança e conformidade, você precisa cadastrar uma nova senha pessoal no seu primeiro acesso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nova Senha */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showNovaSenha ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus:border-secondary focus:ring-secondary/20"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Senha */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus:border-secondary focus:ring-secondary/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Requisitos visuais da senha */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 space-y-2 mt-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Requisitos de Segurança:
              </span>
              <ul className="text-xs space-y-1.5">
                <li className={`flex items-center gap-2 ${temTamanhoMinimo ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${temTamanhoMinimo ? 'text-emerald-400' : 'text-slate-600'}`} />
                  Mínimo de 8 caracteres
                </li>
                <li className={`flex items-center gap-2 ${temLetra && temNumero ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${temLetra && temNumero ? 'text-emerald-400' : 'text-slate-600'}`} />
                  Contém letras e números
                </li>
                <li className={`flex items-center gap-2 ${senhasConferem ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${senhasConferem ? 'text-emerald-400' : 'text-slate-600'}`} />
                  As duas senhas coincidem
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={salvando || !senhaValida}
              className="w-full bg-cta-gold hover:opacity-90 text-primary font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-secondary/20 mt-4 disabled:opacity-50"
            >
              {salvando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Atualizando Senha...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Salvar Nova Senha e Continuar
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
