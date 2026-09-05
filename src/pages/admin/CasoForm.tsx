import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Briefcase, User, Scale } from 'lucide-react';
import { supabase, Caso, Cliente, TipoDemanda, StatusCaso, VisibilidadeRegistro } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { validarNovoCaso, AREAS_DIREITO_PADRAO } from '@/domain/crm/caso';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CasoForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processosDisponiveis, setProcessosDisponiveis] = useState<any[]>([]);
  const [processosSelecionadosIds, setProcessosSelecionadosIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<Caso>>({
    cliente_id: '',
    titulo: '',
    descricao: '',
    area_direito: 'Trabalhista',
    tipo_demanda: 'judicial',
    status: 'em_andamento',
    visibilidade: 'colegiado',
  });

  useEffect(() => {
    const carregarDependencias = async () => {
      // Carrega clientes para o select
      const { data: dataClientes } = await supabase
        .from('clientes')
        .select('*')
        .is('deleted_at', null)
        .order('nome_razao_social');
      if (dataClientes) setClientes(dataClientes as Cliente[]);

      // Carrega processos judiciais já monitorados no JusTrack
      const { data: dataProcessos } = await supabase
        .from('processos')
        .select('id, numero_cnj, etiqueta, tribunal_base, caso_id')
        .order('created_at', { ascending: false });
      if (dataProcessos) setProcessosDisponiveis(dataProcessos);

      if (isEditing && id) {
        setFetching(true);
        const { data: casoData, error } = await supabase
          .from('casos')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !casoData) {
          toast.error('Erro ao carregar dados do caso.');
          navigate('/admin/crm/casos');
        } else {
          setFormData(casoData as Caso);
          // Marca os processos vinculados a este caso
          const vinculados = (dataProcessos || [])
            .filter((p: any) => p.caso_id === id)
            .map((p: any) => p.id);
          setProcessosSelecionadosIds(vinculados);
        }
        setFetching(false);
      }
    };

    carregarDependencias();
  }, [id, isEditing, navigate]);

  const handleChange = (field: keyof Caso, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleProcesso = (processoId: string) => {
    setProcessosSelecionadosIds((prev) =>
      prev.includes(processoId)
        ? prev.filter((pid) => pid !== processoId)
        : [...prev, processoId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validacao = validarNovoCaso(formData);
    if (!validacao.valido) {
      toast.error(validacao.erros[0]);
      return;
    }

    setLoading(true);

    try {
      let casoIdSalvo = id;

      if (isEditing && id) {
        const { error } = await supabase
          .from('casos')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        toast.success('Caso atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('casos')
          .insert({
            ...formData,
            responsavel_id: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        casoIdSalvo = data?.id;
        toast.success('Novo caso cadastrado com sucesso!');
      }

      // Atualiza o vínculo dos processos judiciais selecionados
      if (casoIdSalvo) {
        // Desvincula processos que foram desmarcados
        await supabase
          .from('processos')
          .update({ caso_id: null })
          .eq('caso_id', casoIdSalvo);

        // Vincula os processos atualmente selecionados
        if (processosSelecionadosIds.length > 0) {
          await supabase
            .from('processos')
            .update({ caso_id: casoIdSalvo })
            .in('id', processosSelecionadosIds);
        }

        navigate(`/admin/crm/casos/${casoIdSalvo}`);
      } else {
        navigate('/admin/crm/casos');
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar caso:', err);
      const msg = err instanceof Error ? err.message : 'Erro no banco de dados';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-12 text-center text-slate-400 italic animate-pulse">
        Carregando informações do caso...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/casos">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-white">
              {isEditing ? 'Editar Caso' : 'Novo Caso Jurídico'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Definição de demanda, cliente vinculado e processos judiciais conexos.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar Caso'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Informações Gerais do Caso */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-secondary" />
            Dados da Demanda
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cliente Vinculado *
              </label>
              <select
                required
                value={formData.cliente_id || ''}
                onChange={(e) => handleChange('cliente_id', e.target.value)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_razao_social} ({c.tipo_pessoa}) - {c.status_ciclo.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Área do Direito *
              </label>
              <select
                required
                value={formData.area_direito || 'Trabalhista'}
                onChange={(e) => handleChange('area_direito', e.target.value)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                {AREAS_DIREITO_PADRAO.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título / Identificação do Caso *
            </label>
            <Input
              required
              value={formData.titulo || ''}
              onChange={(e) => handleChange('titulo', e.target.value)}
              placeholder="Ex: Ação Trabalhista c/c Pedido de Insalubridade e Horas Extras"
              className="bg-slate-900/50 border-white/10 text-white rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Demanda
              </label>
              <select
                value={formData.tipo_demanda || 'judicial'}
                onChange={(e) => handleChange('tipo_demanda', e.target.value as TipoDemanda)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                <option value="judicial">Judicial (Contencioso em Tribunal)</option>
                <option value="extrajudicial">Extrajudicial (Cartório / Notificação / Acordo)</option>
                <option value="consultivo">Consultivo (Elaboração Contratual / Parecer)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status do Caso</label>
              <select
                value={formData.status || 'em_andamento'}
                onChange={(e) => handleChange('status', e.target.value as StatusCaso)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                <option value="analise">Em Análise Inicial</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="aguardando_documentos">Aguardando Documentos</option>
                <option value="concluido">Concluído</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Visibilidade da Carteira
              </label>
              <select
                value={formData.visibilidade || 'colegiado'}
                onChange={(e) => handleChange('visibilidade', e.target.value as VisibilidadeRegistro)}
                className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
              >
                <option value="colegiado">Colegiado (Toda a banca jurídica)</option>
                <option value="privado">Privado (Restrito ao responsável/delegados)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descrição / Resumo dos Fatos
            </label>
            <textarea
              rows={3}
              value={formData.descricao || ''}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Principais teses, fatos narrados e pretensão jurídica..."
              className="w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
            />
          </div>
        </div>

        {/* Bloco 2: Processos Judiciais Conexos (JusTrack / DataJud) */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-secondary" />
              Processos Judiciais Conexos (JusTrack / DataJud)
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {processosSelecionadosIds.length} selecionado(s)
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Se este caso já possui um ou mais números CNJ monitorados pelo JusTrack, selecione-os abaixo para integrar as movimentações e andamentos ao dossiê.
          </p>

          {processosDisponiveis.length === 0 ? (
            <div className="p-4 border border-white/5 rounded-xl text-slate-500 text-xs italic">
              Nenhum processo cadastrado no JusTrack. Você pode cadastrar processos a qualquer momento pelo menu Processos.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {processosDisponiveis.map((proc: any) => {
                const isSelected = processosSelecionadosIds.includes(proc.id);
                return (
                  <div
                    key={proc.id}
                    onClick={() => handleToggleProcesso(proc.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-secondary/15 border-secondary text-white'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{proc.etiqueta || 'Processo sem etiqueta'}</p>
                      <p className="text-[11px] font-mono text-slate-400">{proc.numero_cnj}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {proc.tribunal_base || 'Tribunal'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="ghost" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/casos">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl shadow-lg px-6"
          >
            {loading ? 'Salvando...' : isEditing ? 'Atualizar Caso' : 'Cadastrar Caso'}
          </Button>
        </div>
      </form>
    </div>
  );
}
