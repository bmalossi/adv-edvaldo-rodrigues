import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Trash2
} from 'lucide-react';
import { supabase, Cliente, StatusCicloCliente } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_CICLO_BADGES: Record<StatusCicloCliente, { label: string; color: string }> = {
  lead: { label: 'Lead / Prospecção', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  consulta: { label: 'Consulta / Reunião', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ativo: { label: 'Cliente Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  encerrado: { label: 'Encerrado / Arquivado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { papel } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchCliente = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        toast.error('Cliente não encontrado');
        navigate('/admin/crm/clientes');
      } else {
        setCliente(data as Cliente);
      }
      setLoading(false);
    };
    fetchCliente();
  }, [id, navigate]);

  const handleExcluirOuArquivar = async () => {
    if (!cliente) return;

    if (cliente.status_ciclo === 'lead') {
      const confirmacao = window.confirm(
        'Confirmar exclusão definitiva deste lead? (Conformidade LGPD - Exclusão do Titular)'
      );
      if (!confirmacao) return;

      const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
      if (error) {
        toast.error('Erro ao excluir lead: ' + error.message);
      } else {
        toast.success('Lead excluído permanentemente com sucesso.');
        navigate('/admin/crm/clientes');
      }
    } else {
      const confirmacao = window.confirm(
        'Este registro possui histórico ou qualificação jurídica. Será mantido em Custódia Legal protegida (5 anos conforme Estatuto da OAB). Deseja arquivar?'
      );
      if (!confirmacao) return;

      const { error } = await supabase
        .from('clientes')
        .update({
          deleted_at: new Date().toISOString(),
          status_ciclo: 'encerrado',
        })
        .eq('id', cliente.id);

      if (error) {
        toast.error('Erro ao arquivar cliente: ' + error.message);
      } else {
        toast.success('Cliente arquivado sob custódia legal.');
        navigate('/admin/crm/clientes');
      }
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 italic animate-pulse">Carregando ficha...</div>;
  }

  if (!cliente) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Barra de Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/clientes">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-white">{cliente.nome_razao_social}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  STATUS_CICLO_BADGES[cliente.status_ciclo]?.color
                }`}
              >
                {STATUS_CICLO_BADGES[cliente.status_ciclo]?.label}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Cadastrado em {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-white/10 text-white rounded-xl gap-1.5">
            <Link to={`/admin/crm/clientes/${cliente.id}/editar`}>
              <Edit className="w-4 h-4 text-secondary" />
              Editar Cadastro
            </Link>
          </Button>

          {papel === 'advogado' && (
            <Button
              variant="ghost"
              onClick={handleExcluirOuArquivar}
              className="text-destructive hover:bg-destructive/10 rounded-xl"
              title="Excluir ou Arquivar"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Dossiê e Qualificação */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              {cliente.tipo_pessoa === 'PF' ? <User className="w-4 h-4 text-secondary" /> : <Building2 className="w-4 h-4 text-secondary" />}
              Qualificação Jurídica
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Documento (CPF / CNPJ)</span>
                <span className="text-white font-mono font-medium">{cliente.cpf_cnpj || 'Não informado'}</span>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">RG / Inscrição Estadual</span>
                <span className="text-white font-medium">{cliente.rg_ie || 'Não informado'}</span>
              </div>

              {cliente.tipo_pessoa === 'PF' ? (
                <>
                  <div>
                    <span className="text-slate-400 text-xs block">Nacionalidade</span>
                    <span className="text-white font-medium">{cliente.nacionalidade || 'Não informado'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Estado Civil</span>
                    <span className="text-white font-medium">{cliente.estado_civil || 'Não informado'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Profissão</span>
                    <span className="text-white font-medium">{cliente.profissao || 'Não informado'}</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-slate-400 text-xs block">Nome Fantasia</span>
                  <span className="text-white font-medium">{cliente.nome_fantasia || 'Não informado'}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10">
              <span className="text-slate-400 text-xs block mb-1">Endereço Completo</span>
              <div className="flex items-start gap-2 text-slate-200 text-sm">
                <MapPin className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <span>
                  {cliente.endereco_logradouro
                    ? `${cliente.endereco_logradouro}, ${cliente.endereco_numero || 'S/N'}${
                        cliente.endereco_complemento ? ' - ' + cliente.endereco_complemento : ''
                      }, ${cliente.endereco_bairro || ''}, ${cliente.endereco_cidade || ''} - ${
                        cliente.endereco_uf || ''
                      }, CEP: ${cliente.endereco_cep || ''}`
                    : 'Endereço não cadastrado'}
                </span>
              </div>
            </div>
          </div>

          {/* Observações Iniciais */}
          {cliente.observacoes_iniciais && (
            <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Observações do Atendimento</h2>
              <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                {cliente.observacoes_iniciais}
              </p>
            </div>
          )}
        </div>

        {/* Coluna 3: Contato & Metadados */}
        <div className="space-y-6">
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              Canais de Contato
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-slate-200">
                <Phone className="w-4 h-4 text-secondary" />
                <span className="font-bold">{cliente.telefone_whatsapp}</span>
              </div>

              {cliente.email && (
                <div className="flex items-center gap-2.5 text-slate-300 text-xs truncate">
                  <Mail className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              )}

              {cliente.origem_contato && (
                <div className="pt-2 border-t border-white/10 text-xs text-slate-400">
                  Origem: <span className="text-white font-medium">{cliente.origem_contato}</span>
                </div>
              )}
            </div>
          </div>

          {/* Visibilidade e Custódia Legal */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Segurança e Governança</h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Carteira:</span>
                <span className="font-bold text-white uppercase">{cliente.visibilidade}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Custódia LGPD:</span>
                <span className="text-green-400 font-medium">Ativa (5 anos)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
