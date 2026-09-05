import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Building2, User } from 'lucide-react';
import { supabase, Cliente, TipoPessoa, StatusCicloCliente, VisibilidadeRegistro } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { podeTransicionarCiclo } from '@/domain/crm/cliente';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClienteForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<Cliente>>({
    tipo_pessoa: 'PF',
    nome_razao_social: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    rg_ie: '',
    nacionalidade: 'Brasileiro(a)',
    estado_civil: '',
    profissao: '',
    email: '',
    telefone_whatsapp: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_uf: '',
    endereco_cep: '',
    status_ciclo: 'lead',
    origem_contato: '',
    observacoes_iniciais: '',
    visibilidade: 'colegiado',
  });

  useEffect(() => {
    if (isEditing && id) {
      const loadCliente = async () => {
        setFetching(true);
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          toast.error('Erro ao carregar dados do cliente.');
          navigate('/admin/crm/clientes');
        } else {
          setFormData(data as Cliente);
        }
        setFetching(false);
      };
      loadCliente();
    }
  }, [id, isEditing, navigate]);

  const handleChange = (field: keyof Cliente, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errosValidacao.length > 0) setErrosValidacao([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrosValidacao([]);

    const statusAlvo = (formData.status_ciclo || 'lead') as StatusCicloCliente;
    const transicao = podeTransicionarCiclo(formData, statusAlvo);

    if (!transicao.permitido) {
      setErrosValidacao(transicao.erros);
      toast.error('Preencha os campos obrigatórios para ativar o cliente.');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && id) {
        const { error } = await supabase
          .from('clientes')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
        navigate(`/admin/crm/clientes/${id}`);
      } else {
        const { data, error } = await supabase
          .from('clientes')
          .insert({
            ...formData,
            responsavel_id: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Cliente/Lead cadastrado com sucesso!');
        navigate(data?.id ? `/admin/crm/clientes/${data.id}` : '/admin/crm/clientes');
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar cliente:', err);
      const mensagem = err instanceof Error ? err.message : 'Erro ao salvar no banco';
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-12 text-center text-slate-400 italic animate-pulse">
        Carregando informações cadastrais...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/clientes">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-white">
              {isEditing ? 'Editar Ficha Cadastral' : 'Novo Cliente / Lead'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Qualificação jurídica e controle de ciclo de vida do cliente.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar Registro'}
        </Button>
      </div>

      {/* Alerta de Erros de Validação */}
      {errosValidacao.length > 0 && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4" />
            Pendências para o estágio selecionado:
          </div>
          <ul className="list-disc pl-6 space-y-0.5 text-xs">
            {errosValidacao.map((erro, idx) => (
              <li key={idx}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Identificação Básica & Ciclo */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-secondary" />
            Identificação & Ciclo de Vida
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Pessoa</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('tipo_pessoa', 'PF')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    formData.tipo_pessoa === 'PF'
                      ? 'bg-secondary text-primary border-secondary font-bold'
                      : 'bg-slate-900/50 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Física
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('tipo_pessoa', 'PJ')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    formData.tipo_pessoa === 'PJ'
                      ? 'bg-secondary text-primary border-secondary font-bold'
                      : 'bg-slate-900/50 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Jurídica
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estágio Comercial / Ciclo</label>
              <select
                value={formData.status_ciclo}
                onChange={(e) => handleChange('status_ciclo', e.target.value as StatusCicloCliente)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                <option value="lead">Lead (Prospecção)</option>
                <option value="consulta">Consulta Agendada</option>
                <option value="ativo">Cliente Ativo (Contratado)</option>
                <option value="encerrado">Encerrado / Arquivado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Visibilidade da Carteira</label>
              <select
                value={formData.visibilidade}
                onChange={(e) => handleChange('visibilidade', e.target.value as VisibilidadeRegistro)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                <option value="colegiado">Colegiado (Toda a banca)</option>
                <option value="privado">Privado (Apenas responsável)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {formData.tipo_pessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}
              </label>
              <Input
                required
                value={formData.nome_razao_social || ''}
                onChange={(e) => handleChange('nome_razao_social', e.target.value)}
                placeholder={formData.tipo_pessoa === 'PF' ? 'Ex: João da Silva' : 'Ex: Silva & Santos Serviços Ltda'}
                className="bg-slate-900/50 border-white/10 text-white rounded-xl"
              />
            </div>

            {formData.tipo_pessoa === 'PJ' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome Fantasia</label>
                <Input
                  value={formData.nome_fantasia || ''}
                  onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                  placeholder="Ex: Padaria do Silva"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Profissão</label>
                <Input
                  value={formData.profissao || ''}
                  onChange={(e) => handleChange('profissao', e.target.value)}
                  placeholder="Ex: Contador, Servidor Público, Engenheiro"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Telefone / WhatsApp *</label>
              <Input
                required
                value={formData.telefone_whatsapp || ''}
                onChange={(e) => handleChange('telefone_whatsapp', e.target.value)}
                placeholder="(11) 99999-9999"
                className="bg-slate-900/50 border-white/10 text-white rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="cliente@email.com"
                className="bg-slate-900/50 border-white/10 text-white rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Qualificação Jurídica Civil */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
              Qualificação Jurídica (Peças e Procurações)
            </h2>
            <span className="text-[11px] text-slate-400">Opcional para leads, obrigatória para ativo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {formData.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}
              </label>
              <Input
                value={formData.cpf_cnpj || ''}
                onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
                placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                className="bg-slate-900/50 border-white/10 text-white rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {formData.tipo_pessoa === 'PF' ? 'RG / Órgão Emissor' : 'Inscrição Estadual'}
              </label>
              <Input
                value={formData.rg_ie || ''}
                onChange={(e) => handleChange('rg_ie', e.target.value)}
                placeholder={formData.tipo_pessoa === 'PF' ? 'Ex: 12.345.678-9 SSP/SP' : 'Isento ou nº IE'}
                className="bg-slate-900/50 border-white/10 text-white rounded-xl"
              />
            </div>

            {formData.tipo_pessoa === 'PF' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estado Civil</label>
                <select
                  value={formData.estado_civil || ''}
                  onChange={(e) => handleChange('estado_civil', e.target.value)}
                  className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="União Estável">União Estável</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Origem do Contato</label>
                <Input
                  value={formData.origem_contato || ''}
                  onChange={(e) => handleChange('origem_contato', e.target.value)}
                  placeholder="Ex: Indicação, Site, Google Ads"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Endereço Residencial / Comercial */}
          <div className="pt-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Logradouro (Rua / Av.)</label>
                <Input
                  value={formData.endereco_logradouro || ''}
                  onChange={(e) => handleChange('endereco_logradouro', e.target.value)}
                  placeholder="Ex: Rua das Flores"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Número</label>
                <Input
                  value={formData.endereco_numero || ''}
                  onChange={(e) => handleChange('endereco_numero', e.target.value)}
                  placeholder="123"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Complemento</label>
                <Input
                  value={formData.endereco_complemento || ''}
                  onChange={(e) => handleChange('endereco_complemento', e.target.value)}
                  placeholder="Apto 42, Bloco B"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bairro</label>
                <Input
                  value={formData.endereco_bairro || ''}
                  onChange={(e) => handleChange('endereco_bairro', e.target.value)}
                  placeholder="Centro"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cidade</label>
                <Input
                  value={formData.endereco_cidade || ''}
                  onChange={(e) => handleChange('endereco_cidade', e.target.value)}
                  placeholder="São Paulo"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">UF</label>
                <Input
                  value={formData.endereco_uf || ''}
                  onChange={(e) => handleChange('endereco_uf', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Observações Iniciais */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-white">Observações Iniciais do Atendimento</h2>
          <textarea
            rows={3}
            value={formData.observacoes_iniciais || ''}
            onChange={(e) => handleChange('observacoes_iniciais', e.target.value)}
            placeholder="Informações relevantes fornecidas no primeiro contato..."
            className="w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="ghost" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/clientes">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg px-6"
          >
            {loading ? 'Salvando...' : isEditing ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}
