import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Briefcase,
  User,
  Scale,
  Building2,
  FileCheck2,
  DollarSign,
  Lock,
  ExternalLink,
  Save,
  CheckCircle2,
  FileDown,
  Trash2
} from 'lucide-react';
import {
  supabase,
  Caso,
  Cliente,
  StatusCaso,
  TipoDemanda,
  ContratoFinanceiro,
  TipoHonorario,
} from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  validarContratoFinanceiro,
  podeVisualizarHonorarios,
  TIPOS_HONORARIO_CONFIG,
} from '@/domain/crm/financeiro';
import { usePermission } from '@/hooks/usePermission';
import { useRBAC } from '@/contexts/RBACContext';
import { PermissionGuard } from '@/components/admin/PermissionGuard';
import { ModalGerarMinuta } from '@/components/admin/ModalGerarMinuta';
import { PainelDocumentosCaso } from '@/components/admin/PainelDocumentosCaso';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_CASO_BADGES: Record<StatusCaso, { label: string; color: string }> = {
  analise: { label: 'Em Análise Inicial', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  aguardando_documentos: { label: 'Aguardando Docs', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  concluido: { label: 'Concluído / Julgado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  arquivado: { label: 'Arquivado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const TIPO_DEMANDA_BADGES: Record<TipoDemanda, { label: string; icon: any }> = {
  judicial: { label: 'Judicial (Contencioso)', icon: Scale },
  extrajudicial: { label: 'Extrajudicial (Cartório/Acordo)', icon: FileCheck2 },
  consultivo: { label: 'Consultivo / Parecer', icon: Building2 },
};

export default function CasoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { papel } = useAuth();
  const { isAdmin } = useRBAC();
  const canVerFinanceiro = usePermission('financeiro', 'visualizar');
  const canCriarFinanceiro = usePermission('financeiro', 'criar');
  const canEditarFinanceiro = usePermission('financeiro', 'editar');
  const canExcluirCaso = usePermission('casos', 'excluir');

  const canAcessarFinanceiro = isAdmin || canVerFinanceiro || podeVisualizarHonorarios(papel);
  const canSalvarFinanceiro = isAdmin || canEditarFinanceiro || canCriarFinanceiro || podeVisualizarHonorarios(papel);

  const [caso, setCaso] = useState<Caso | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [processosConexos, setProcessosConexos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMinutaOpen, setModalMinutaOpen] = useState(false);

  // Módulo de Honorários (Blindado por RLS / Papel Advogado)
  const [contratoFinanceiro, setContratoFinanceiro] = useState<ContratoFinanceiro | null>(null);
  const [editandoFinanceiro, setEditandoFinanceiro] = useState(false);
  const [salvandoFinanceiro, setSalvandoFinanceiro] = useState(false);
  const [formFinanceiro, setFormFinanceiro] = useState<Partial<ContratoFinanceiro>>({
    tipo_honorario: 'fixo',
    valor_total: 0,
    valor_entrada: 0,
    numero_parcelas: 1,
    percentual_exito: 0,
    condicoes_pagamento: '',
    dados_bancarios: '',
  });

  const fetchCasoCompleto = async () => {
    if (!id) return;
    setLoading(true);

    // Carrega dados do caso
    const { data: casoData, error: casoError } = await supabase
      .from('casos')
      .select('*, responsavel:perfis(nome)')
      .eq('id', id)
      .single();

    if (casoError || !casoData) {
      toast.error('Caso não encontrado.');
      navigate('/admin/crm/casos');
      return;
    }

    setCaso({
      ...casoData,
      responsavel_nome: (casoData as any).responsavel?.nome || 'Advogado do Escritório',
    } as Caso);

    // Carrega dados do cliente vinculado
    if (casoData.cliente_id) {
      const { data: cliData } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', casoData.cliente_id)
        .single();
      if (cliData) setCliente(cliData as Cliente);
    }

    // Carrega processos vinculados do JusTrack
    const { data: procData } = await supabase
      .from('processos')
      .select('*')
      .eq('caso_id', id)
      .order('updated_at', { ascending: false });
    if (procData) setProcessosConexos(procData);

    // Se o usuário tem permissão para visualizar financeiro, busca dados da tabela de contratos financeiros
    if (canAcessarFinanceiro) {
      const { data: finData } = await supabase
        .from('contratos_financeiros')
        .select('*')
        .eq('caso_id', id)
        .maybeSingle();

      if (finData) {
        setContratoFinanceiro(finData as ContratoFinanceiro);
        setFormFinanceiro(finData as ContratoFinanceiro);
      } else {
        setFormFinanceiro({
          caso_id: id,
          tipo_honorario: 'fixo',
          valor_total: undefined,
          valor_entrada: undefined,
          numero_parcelas: 1,
          percentual_exito: undefined,
          condicoes_pagamento: '',
          dados_bancarios: '',
        });
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCasoCompleto();
  }, [id, papel, canVerFinanceiro, isAdmin]);

  const handleExcluirCaso = async () => {
    if (!caso) return;
    const confirmar = window.confirm('Deseja realmente mover este caso para o arquivo / lixeira?');
    if (!confirmar) return;

    const { error } = await supabase
      .from('casos')
      .delete()
      .eq('id', caso.id);

    if (error) {
      toast.error('Erro ao excluir caso: ' + error.message);
    } else {
      toast.success('Caso excluído com sucesso');
      navigate('/admin/crm/casos');
    }
  };

  const handleSalvarFinanceiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!canSalvarFinanceiro) {
      toast.error('Você não possui permissão para salvar contratos de honorários.');
      return;
    }

    const validacao = validarContratoFinanceiro({
      ...formFinanceiro,
      caso_id: id,
    });

    if (!validacao.valido) {
      toast.error(validacao.erros[0]);
      return;
    }

    setSalvandoFinanceiro(true);
    try {
      const payload = {
        caso_id: id,
        tipo_honorario: formFinanceiro.tipo_honorario || 'fixo',
        valor_total:
          formFinanceiro.valor_total !== undefined &&
          formFinanceiro.valor_total !== null &&
          !isNaN(Number(formFinanceiro.valor_total))
            ? Number(formFinanceiro.valor_total)
            : null,
        valor_entrada:
          formFinanceiro.valor_entrada !== undefined &&
          formFinanceiro.valor_entrada !== null &&
          !isNaN(Number(formFinanceiro.valor_entrada))
            ? Number(formFinanceiro.valor_entrada)
            : null,
        numero_parcelas: formFinanceiro.numero_parcelas ? Number(formFinanceiro.numero_parcelas) : 1,
        percentual_exito:
          formFinanceiro.percentual_exito !== undefined &&
          formFinanceiro.percentual_exito !== null &&
          !isNaN(Number(formFinanceiro.percentual_exito))
            ? Number(formFinanceiro.percentual_exito)
            : null,
        condicoes_pagamento: formFinanceiro.condicoes_pagamento ? String(formFinanceiro.condicoes_pagamento).trim() : null,
        dados_bancarios: formFinanceiro.dados_bancarios ? String(formFinanceiro.dados_bancarios).trim() : null,
      };

      if (contratoFinanceiro?.id) {
        const { data, error } = await supabase
          .from('contratos_financeiros')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contratoFinanceiro.id)
          .select()
          .single();

        if (error) throw error;
        setContratoFinanceiro(data as ContratoFinanceiro);
        toast.success('Contrato de honorários atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('contratos_financeiros')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setContratoFinanceiro(data as ContratoFinanceiro);
        toast.success('Contrato de honorários registrado com sucesso!');
      }
      setEditandoFinanceiro(false);
    } catch (err: unknown) {
      console.error('Erro ao salvar financeiro:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao salvar honorários';
      toast.error(msg);
    } finally {
      setSalvandoFinanceiro(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 italic animate-pulse">Carregando dossiê do caso...</div>;
  }

  if (!caso) return null;

  const TipoConfig = TIPO_DEMANDA_BADGES[caso.tipo_demanda] || TIPO_DEMANDA_BADGES.judicial;
  const IconTipo = TipoConfig.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-white">
            <Link to="/admin/crm/casos">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-white">{caso.titulo}</h1>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                  STATUS_CASO_BADGES[caso.status]?.color
                )}
              >
                {STATUS_CASO_BADGES[caso.status]?.label}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Área: <span className="text-white font-medium">{caso.area_direito}</span> • Responsável: <span className="text-white font-medium">{caso.responsavel_nome}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cliente && (
            <PermissionGuard modulo="documentos" acao="visualizar">
              <Button
                onClick={() => setModalMinutaOpen(true)}
                className="rounded-xl gap-1.5 bg-secondary hover:opacity-90 text-primary font-bold shadow-md"
              >
                <FileDown className="w-4 h-4" />
                Gerar Minuta (.docx)
              </Button>
            </PermissionGuard>
          )}

          <PermissionGuard modulo="casos" acao="editar">
            <Button asChild variant="outline" className="border-white/10 text-white rounded-xl gap-1.5">
              <Link to={`/admin/crm/casos/${caso.id}/editar`}>
                <Edit className="w-4 h-4 text-secondary" />
                Editar Caso
              </Link>
            </Button>
          </PermissionGuard>

          <PermissionGuard modulo="casos" acao="excluir">
            <Button
              variant="ghost"
              onClick={handleExcluirCaso}
              className="text-destructive hover:bg-destructive/10 rounded-xl"
              title="Excluir Caso"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Detalhes, Processos Conexos e Honorários */}
        <div className="md:col-span-2 space-y-6">
          {/* Informações da Causa */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              <IconTipo className="w-4 h-4 text-secondary" />
              Objeto da Demanda & Resumo Fático
            </h2>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Tipo:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-200 font-medium">
                {TipoConfig.label}
              </span>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {caso.descricao || 'Nenhuma descrição detalhada informada para este caso.'}
            </p>
          </div>

          {/* Processos Judiciais Conexos (JusTrack) */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-secondary" />
                Processos Judiciais Conexos (DataJud)
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {processosConexos.length} processo(s)
              </span>
            </div>

            {processosConexos.length === 0 ? (
              <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-xs italic">
                Nenhum processo judicial CNJ vinculado a este caso (demanda em fase pré-processual ou extrajudicial).
              </div>
            ) : (
              <div className="space-y-3">
                {processosConexos.map((proc) => (
                  <div
                    key={proc.id}
                    className="bg-slate-900/50 border border-white/10 hover:border-secondary/30 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{proc.etiqueta || 'Processo'}</span>
                        {proc.tem_novidade && (
                          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        )}
                      </div>
                      <p className="font-mono text-slate-300 text-xs mt-0.5">{proc.numero_cnj}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Tribunal: {proc.tribunal_base || 'Não identificado'} • Status: {proc.status_processo}
                      </span>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="text-secondary hover:text-white text-xs gap-1">
                      <Link to={`/admin/processos/${proc.id}`}>
                        Ver no JusTrack <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Módulo de Contrato de Honorários (Blindado por RBAC em dupla camada) */}
          <PermissionGuard modulo="financeiro" acao="visualizar">
            <div className="bg-card border border-amber-500/20 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cta-gold" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Contrato de Honorários Advocatícios
                  </h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Apenas Autorizados
                </span>
              </div>

              {!editandoFinanceiro && contratoFinanceiro ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                      <span className="text-slate-400 block">Modalidade</span>
                      <span className="text-white font-bold text-sm">
                        {TIPOS_HONORARIO_CONFIG[contratoFinanceiro.tipo_honorario]?.label}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                      <span className="text-slate-400 block">Valor Fixo / Inicial</span>
                      <span className="text-cta-gold font-bold text-sm">
                        {contratoFinanceiro.valor_total
                          ? `R$ ${Number(contratoFinanceiro.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Sob êxito'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                      <span className="text-slate-400 block">Êxito (Quota-Litis)</span>
                      <span className="text-secondary font-bold text-sm">
                        {contratoFinanceiro.percentual_exito ? `${contratoFinanceiro.percentual_exito}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {contratoFinanceiro.condicoes_pagamento && (
                    <div className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                      <span className="text-slate-400 block mb-1 font-semibold">Condições de Pagamento:</span>
                      {contratoFinanceiro.condicoes_pagamento}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <PermissionGuard modulo="financeiro" acao="editar">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditandoFinanceiro(true)}
                        className="border-white/10 text-white rounded-xl text-xs"
                      >
                        Atualizar Termos de Honorários
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSalvarFinanceiro} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Modalidade de Honorários *
                      </label>
                      <select
                        value={formFinanceiro.tipo_honorario || 'fixo'}
                        onChange={(e) =>
                          setFormFinanceiro((prev) => ({
                            ...prev,
                            tipo_honorario: e.target.value as TipoHonorario,
                          }))
                        }
                        className="w-full h-10 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:border-secondary"
                      >
                        <option value="fixo">Valor Fixo (Pró-labore)</option>
                        <option value="exito">Quota-Litis (Êxito)</option>
                        <option value="misto">Misto (Fixo + Êxito)</option>
                        <option value="mensal">Partido Mensal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Valor Total / Inicial (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formFinanceiro.valor_total ?? ''}
                        onChange={(e) =>
                          setFormFinanceiro((prev) => ({
                            ...prev,
                            valor_total: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        placeholder="Ex: 5000.00"
                        className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Valor de Entrada (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formFinanceiro.valor_entrada ?? ''}
                        onChange={(e) =>
                          setFormFinanceiro((prev) => ({
                            ...prev,
                            valor_entrada: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        placeholder="Ex: 1500.00"
                        className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nº de Parcelas
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formFinanceiro.numero_parcelas || 1}
                        onChange={(e) =>
                          setFormFinanceiro((prev) => ({
                            ...prev,
                            numero_parcelas: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Percentual de Êxito (%)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        max="100"
                        value={formFinanceiro.percentual_exito ?? ''}
                        onChange={(e) =>
                          setFormFinanceiro((prev) => ({
                            ...prev,
                            percentual_exito: e.target.value ? parseFloat(e.target.value) : undefined,
                          }))
                        }
                        placeholder="Ex: 20"
                        className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Condições de Pagamento / Vencimento
                    </label>
                    <Input
                      value={formFinanceiro.condicoes_pagamento || ''}
                      onChange={(e) =>
                        setFormFinanceiro((prev) => ({
                          ...prev,
                          condicoes_pagamento: e.target.value,
                        }))
                      }
                      placeholder="Ex: Entrada no ato + 3 parcelas todo dia 10 via PIX"
                      className="bg-slate-900/50 border-white/10 text-white rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    {contratoFinanceiro && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditandoFinanceiro(false)}
                        className="rounded-xl text-xs text-slate-400"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={salvandoFinanceiro}
                      className="bg-cta-gold text-primary font-bold rounded-xl text-xs gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {salvandoFinanceiro ? 'Salvando...' : 'Salvar Honorários'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </PermissionGuard>

          {/* Módulo de Documentos e Google Drive (Issue #8) */}
          <PainelDocumentosCaso caso={caso} cliente={cliente} />
        </div>

        {/* Coluna 3: Cliente Vinculado & Governança */}
        <div className="space-y-6">
          {/* Card do Cliente */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-secondary" />
              Cliente
            </h2>

            {cliente ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Nome / Razão Social</span>
                  <Link
                    to={`/admin/crm/clientes/${cliente.id}`}
                    className="text-white font-bold text-sm hover:text-secondary transition-colors"
                  >
                    {cliente.nome_razao_social}
                  </Link>
                </div>

                <div>
                  <span className="text-slate-400 block">CPF / CNPJ</span>
                  <span className="text-slate-200 font-mono">{cliente.cpf_cnpj || 'Não informado'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block">Telefone / WhatsApp</span>
                  <span className="text-slate-200">{cliente.telefone_whatsapp}</span>
                </div>

                <Button asChild size="sm" variant="outline" className="w-full border-white/10 text-white rounded-xl mt-2 text-xs">
                  <Link to={`/admin/crm/clientes/${cliente.id}`}>
                    Ver Ficha Completa do Cliente
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-slate-500 text-xs italic">Cliente não encontrado</div>
            )}
          </div>

          {/* Governança e Visibilidade */}
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              Governança da Carteira
            </h2>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Visibilidade:</span>
                <span className="font-bold text-white uppercase">{caso.visibilidade}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Sigilo Financeiro:</span>
                <span className="text-amber-400 font-medium">Restrito a Advogados</span>
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
          caso={caso}
          processoNumero={processosConexos[0]?.numero_processo || null}
        />
      )}
    </div>
  );
}
