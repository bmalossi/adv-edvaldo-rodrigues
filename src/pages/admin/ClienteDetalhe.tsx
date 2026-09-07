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
  Trash2,
  MessageSquare,
  PhoneCall,
  Users as UsersIcon,
  FileText,
  Send,
  Calendar,
  Clock,
  FileDown,
  ShieldCheck,
  FolderOpen,
  Info
} from 'lucide-react';
import {
  supabase,
  Cliente,
  StatusCicloCliente,
  InteracaoCliente,
  TipoInteracao,
} from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  validarNovaInteracao,
  ordenarInteracoesCronologicamente,
  TIPOS_INTERACAO_CONFIG,
} from '@/domain/crm/interacao';
import { ModalGerarMinuta } from '@/components/admin/ModalGerarMinuta';
import { PainelDocumentosCliente } from '@/components/admin/PainelDocumentosCliente';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_CICLO_BADGES: Record<StatusCicloCliente, { label: string; color: string }> = {
  lead: { label: 'Lead / Prospecção', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  consulta: { label: 'Consulta / Reunião', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ativo: { label: 'Cliente Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  encerrado: { label: 'Encerrado / Arquivado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, papel } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  // Timeline de Interações
  const [interacoes, setInteracoes] = useState<InteracaoCliente[]>([]);
  const [loadingInteracoes, setLoadingInteracoes] = useState(true);
  const [novaInteracaoTipo, setNovaInteracaoTipo] = useState<TipoInteracao>('whatsapp');
  const [novaInteracaoDesc, setNovaInteracaoDesc] = useState('');
  const [enviandoInteracao, setEnviandoInteracao] = useState(false);
  const [modalMinutaOpen, setModalMinutaOpen] = useState(false);

  const fetchCliente = async () => {
    if (!id) return;
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

  const fetchInteracoes = async () => {
    if (!id) return;
    setLoadingInteracoes(true);
    const { data, error } = await supabase
      .from('interacoes_cliente')
      .select('*, autor:perfis(nome)')
      .eq('cliente_id', id)
      .order('data_interacao', { ascending: false });

    if (!error && data) {
      const formatadas: InteracaoCliente[] = data.map((item: any) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        autor_id: item.autor_id,
        autor_nome: item.autor?.nome || 'Colaborador',
        tipo: item.tipo as TipoInteracao,
        descricao: item.descricao,
        data_interacao: item.data_interacao,
        created_at: item.created_at,
      }));
      setInteracoes(ordenarInteracoesCronologicamente(formatadas));
    }
    setLoadingInteracoes(false);
  };

  useEffect(() => {
    fetchCliente();
    fetchInteracoes();
  }, [id]);

  const handleAdicionarInteracao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    const validacao = validarNovaInteracao({
      cliente_id: cliente.id,
      tipo: novaInteracaoTipo,
      descricao: novaInteracaoDesc.trim(),
    });

    if (!validacao.valido) {
      toast.error(validacao.erros.join(', '));
      return;
    }

    setEnviandoInteracao(true);
    try {
      const { error } = await supabase.from('interacoes_cliente').insert({
        cliente_id: cliente.id,
        autor_id: user?.id,
        tipo: novaInteracaoTipo,
        descricao: novaInteracaoDesc.trim(),
      });

      if (error) throw error;
      toast.success('Interação registrada!');
      setNovaInteracaoDesc('');
      fetchInteracoes();
    } catch (err: any) {
      toast.error('Erro ao salvar interação: ' + err.message);
    } finally {
      setEnviandoInteracao(false);
    }
  };

  const handleExcluirOuArquivar = async () => {
    if (!cliente) return;
    if (cliente.status_ciclo === 'ativo') {
      const confirmar = window.confirm(
        'Este cliente está com status ATIVO. Deseja arquivá-lo em vez de excluí-lo?'
      );
      if (confirmar) {
        await supabase
          .from('clientes')
          .update({ status_ciclo: 'encerrado', updated_at: new Date().toISOString() })
          .eq('id', cliente.id);
        toast.success('Cliente arquivado com sucesso!');
        fetchCliente();
      }
      return;
    }

    const confirmar = window.confirm('Deseja realmente mover este cliente para a lixeira?');
    if (!confirmar) return;

    const { error } = await supabase
      .from('clientes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', cliente.id);

    if (error) {
      toast.error('Erro ao excluir cliente');
    } else {
      toast.success('Registro excluído com sucesso');
      navigate('/admin/crm/clientes');
    }
  };

  const renderIconeCanal = (tipo: TipoInteracao) => {
    switch (tipo) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'ligacao':
        return <PhoneCall className="w-4 h-4 text-blue-400" />;
      case 'reuniao':
        return <UsersIcon className="w-4 h-4 text-purple-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 italic animate-pulse">Carregando ficha...</div>;
  }

  if (!cliente) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
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
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                  STATUS_CICLO_BADGES[cliente.status_ciclo]?.color
                )}
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
          <Button
            onClick={() => setModalMinutaOpen(true)}
            className="rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-white"
          >
            <FileDown className="w-4 h-4" />
            Gerar Minuta (.docx)
          </Button>

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

      {/* Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Qualificação + Representante + Anexos + Timeline */}
        <div className="md:col-span-2 space-y-6">
          {/* Dossiê de Qualificação */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              {cliente.tipo_pessoa === 'PF' ? (
                <User className="w-4 h-4 text-secondary" />
              ) : (
                <Building2 className="w-4 h-4 text-secondary" />
              )}
              Qualificação Jurídica
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Documento (CPF / CNPJ)</span>
                <span className="text-white font-mono font-medium">{cliente.cpf_cnpj || 'Não informado'}</span>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">RG / National ID</span>
                <span className="text-white font-medium">{cliente.rg_ie || 'Não informado'}</span>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">Data de Nascimento</span>
                <span className="text-white font-medium">
                  {cliente.data_nascimento
                    ? new Date(cliente.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                    : 'Não informada'}
                </span>
              </div>

              {cliente.tipo_pessoa === 'PF' ? (
                <>
                  <div>
                    <span className="text-slate-400 text-xs block">Sexo / Gênero</span>
                    <span className="text-white font-medium">{cliente.sexo || 'Não informado'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Estado Civil</span>
                    <span className="text-white font-medium">{cliente.estado_civil || 'Não informado'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Nacionalidade</span>
                    <span className="text-white font-medium">{cliente.nacionalidade || 'Não informado'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Profissão / Atividade</span>
                    <span className="text-white font-medium">{cliente.profissao || 'Não informado'}</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-slate-400 text-xs block">Nome Fantasia</span>
                  <span className="text-white font-medium">{cliente.nome_fantasia || 'Não informado'}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400 text-xs block">País</span>
                <span className="text-white font-medium">{cliente.pais || 'Brasil'}</span>
              </div>
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
                      }${cliente.endereco_cep ? `, CEP: ${cliente.endereco_cep}` : ''}${
                        cliente.pais && cliente.pais !== 'Brasil' ? ` (${cliente.pais})` : ''
                      }`
                    : 'Endereço não cadastrado'}
                </span>
              </div>
            </div>
          </div>

          {/* Dossiê do Representante Legal (se houver) */}
          {(cliente.tem_representante || cliente.rep_nome) && (
            <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                Representante Legal
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-xs block">Nome do Representante</span>
                  <span className="text-white font-medium">{cliente.rep_nome || 'Não informado'}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">CPF / CNPJ</span>
                  <span className="text-white font-mono font-medium">{cliente.rep_cpf_cnpj || 'Não informado'}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">RG</span>
                  <span className="text-white font-medium">{cliente.rep_rg || 'Não informado'}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Data de Nascimento</span>
                  <span className="text-white font-medium">
                    {cliente.rep_data_nascimento
                      ? new Date(cliente.rep_data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">País</span>
                  <span className="text-white font-medium">{cliente.rep_pais || 'Brasil'}</span>
                </div>
              </div>

              {(cliente.rep_endereco || cliente.rep_cidade || cliente.rep_cep) && (
                <div className="pt-2 border-t border-white/10 text-xs text-slate-300 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                  <span>
                    {[
                      cliente.rep_endereco,
                      cliente.rep_bairro,
                      cliente.rep_cidade && cliente.rep_uf ? `${cliente.rep_cidade}/${cliente.rep_uf}` : cliente.rep_cidade,
                      cliente.rep_cep ? `CEP: ${cliente.rep_cep}` : null
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Módulo de Documentos e Arquivos do Cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-secondary" />
                Arquivos e Documentos do Cliente
              </h2>
              <span className="text-xs text-slate-400">Armazenamento em nuvem</span>
            </div>
            <PainelDocumentosCliente cliente={cliente} />
          </div>

          {/* Timeline de Interações (Issue #3) */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                Histórico & Timeline de Interações
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {interacoes.length} registro(s)
              </span>
            </div>

            {/* Formulário Rápido de Nova Interação */}
            <form onSubmit={handleAdicionarInteracao} className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Canal:</span>
                {(['whatsapp', 'ligacao', 'reuniao', 'email', 'nota_interna'] as TipoInteracao[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNovaInteracaoTipo(t)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5',
                        novaInteracaoTipo === t
                          ? 'bg-secondary text-primary border-secondary font-bold'
                          : 'bg-slate-900/50 text-slate-400 border-white/10 hover:border-white/20'
                      )}
                    >
                      {renderIconeCanal(t)}
                      {TIPOS_INTERACAO_CONFIG[t].label}
                    </button>
                  )
                )}
              </div>

              <textarea
                required
                rows={2}
                value={novaInteracaoDesc}
                onChange={(e) => setNovaInteracaoDesc(e.target.value)}
                placeholder="Registrar anotação de ligação, WhatsApp, alinhamento ou consulta..."
                className="w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-secondary focus:outline-none"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={enviandoInteracao || !novaInteracaoDesc.trim()}
                  className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {enviandoInteracao ? 'Registrando...' : 'Adicionar ao Histórico'}
                </Button>
              </div>
            </form>

            {/* Lista Cronológica */}
            {loadingInteracoes ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                Carregando interações...
              </div>
            ) : interacoes.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                Nenhuma interação registrada ainda. Registre a primeira anotação acima.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
                {interacoes.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-secondary flex items-center justify-center -translate-x-1/2" />
                    <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1',
                              TIPOS_INTERACAO_CONFIG[item.tipo]?.corBadge
                            )}
                          >
                            {renderIconeCanal(item.tipo)}
                            {TIPOS_INTERACAO_CONFIG[item.tipo]?.label}
                          </span>
                          <span className="text-slate-400 font-semibold">{item.autor_nome}</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {item.data_interacao
                            ? new Date(item.data_interacao).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                        {item.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Contato & Governança & Anotações */}
        <div className="space-y-6">
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              Canais de Contato
            </h2>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block">WhatsApp / Telefone 1:</span>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <Phone className="w-4 h-4 text-secondary shrink-0" />
                  <span className="font-bold">{cliente.telefone_whatsapp}</span>
                </div>
              </div>

              {cliente.telefone_secundario && (
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-400 block">Telefone 2 / Adicional:</span>
                  <div className="flex items-center gap-2.5 text-slate-300 text-xs">
                    <Phone className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span>{cliente.telefone_secundario}</span>
                  </div>
                </div>
              )}

              {cliente.email && (
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-400 block">E-mail:</span>
                  <div className="flex items-center gap-2.5 text-slate-300 text-xs truncate">
                    <Mail className="w-4 h-4 text-secondary shrink-0" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                </div>
              )}

              {cliente.origem_contato && (
                <div className="pt-2 border-t border-white/10 text-xs text-slate-400">
                  Origem: <span className="text-white font-medium">{cliente.origem_contato}</span>
                </div>
              )}
            </div>
          </div>

          {/* Anotações Gerais e Senhas */}
          {cliente.anotacoes_gerais && (
            <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-secondary" />
                Anotações & Senhas
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/50 p-3 rounded-xl border border-white/5 font-mono">
                {cliente.anotacoes_gerais}
              </p>
            </div>
          )}

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

      {cliente && (
        <ModalGerarMinuta
          open={modalMinutaOpen}
          onOpenChange={setModalMinutaOpen}
          cliente={cliente}
        />
      )}
    </div>
  );
}
