import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  AlertOctagon,
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase, TipoPendencia, StatusPendencia } from '@/lib/supabase';
import { validarNovaPendencia } from '@/domain/crm/agenda';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function PendenciaForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const casoIdParam = searchParams.get('caso_id') || '';
  const clienteIdParam = searchParams.get('cliente_id') || '';

  const [tipo, setTipo] = useState<TipoPendencia>('tarefa');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [casoId, setCasoId] = useState(casoIdParam);
  const [clienteId, setClienteId] = useState(clienteIdParam);
  const [status, setStatus] = useState<StatusPendencia>('pendente');
  const [dataVencimento, setDataVencimento] = useState('');

  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  const [casos, setCasos] = useState<{ id: string; titulo: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome_razao_social: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    const carregarAuxiliares = async () => {
      const [{ data: perfisData }, { data: casosData }, { data: clientesData }] = await Promise.all([
        supabase.from('perfis').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('casos').select('id, titulo').order('titulo'),
        supabase.from('clientes').select('id, nome_razao_social').order('nome_razao_social'),
      ]);

      if (perfisData) {
        setColaboradores(perfisData);
        if (user && !responsavelId) {
          setResponsavelId(user.id);
        }
      }
      if (casosData) setCasos(casosData);
      if (clientesData) setClientes(clientesData);
    };

    carregarAuxiliares();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros([]);

    const validacao = validarNovaPendencia({
      tipo,
      titulo,
      responsavel_id: responsavelId,
      data_vencimento: dataVencimento ? new Date(dataVencimento).toISOString() : null,
    });

    if (validacao.length > 0) {
      setErros(validacao);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pendencias_crm').insert([
        {
          tipo,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          responsavel_id: responsavelId,
          caso_id: casoId || null,
          cliente_id: clienteId || null,
          status,
          data_vencimento: dataVencimento ? new Date(dataVencimento).toISOString() : null,
        },
      ]);

      if (error) {
        setErros([error.message]);
      } else {
        navigate('/admin/crm/agenda');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/crm/agenda')}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div>
          <h1 className="text-xl font-serif font-bold text-foreground">
            Nova Pendência / Prazo
          </h1>
          <p className="text-xs text-muted-foreground">
            Cadastre um prazo fatal com efeito preclusivo ou uma tarefa para a equipe
          </p>
        </div>
      </div>

      {erros.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          <ul className="list-disc list-inside space-y-1">
            {erros.map((erro, idx) => (
              <li key={idx}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-xl border border-border space-y-5">
        {/* Seletor de Tipo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block">
            Tipo de Pendência <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipo('prazo_fatal')}
              className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all ${
                tipo === 'prazo_fatal'
                  ? 'border-red-500/60 bg-red-500/10 text-red-400'
                  : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-foreground">Prazo Fatal</div>
                <div className="text-xs text-muted-foreground">
                  Efeito preclusivo judicial. Data de vencimento obrigatória.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipo('tarefa')}
              className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all ${
                tipo === 'tarefa'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-foreground">Tarefa Operacional</div>
                <div className="text-xs text-muted-foreground">
                  Atividades internas, contatos e providências gerais.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Título da Pendência <span className="text-red-400">*</span>
          </label>
          <Input
            placeholder={
              tipo === 'prazo_fatal'
                ? 'Ex.: Apelação Cível - Autos nº 1002345-67...'
                : 'Ex.: Solicitar extratos bancários ao cliente...'
            }
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        {/* Descrição */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Descrição / Instruções
          </label>
          <textarea
            rows={3}
            placeholder="Detalhes sobre o cumprimento, teses a suscitar ou documentos necessários..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Responsável e Data Vencimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Colaborador Responsável <span className="text-red-400">*</span>
            </label>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Selecione o responsável</option>
              {colaboradores.map((colab) => (
                <option key={colab.id} value={colab.id}>
                  {colab.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Data e Hora de Vencimento</span>
              {tipo === 'prazo_fatal' && (
                <span className="text-xs text-red-400 font-semibold">* Obrigatório</span>
              )}
            </label>
            <Input
              type="datetime-local"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required={tipo === 'prazo_fatal'}
            />
          </div>
        </div>

        {/* Vínculo de Caso e Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Vincular ao Caso (Opcional)
            </label>
            <select
              value={casoId}
              onChange={(e) => setCasoId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sem vínculo com caso</option>
              {casos.map((caso) => (
                <option key={caso.id} value={caso.id}>
                  {caso.titulo}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Vincular ao Cliente (Opcional)
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sem vínculo com cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_razao_social}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/crm/agenda')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Pendência'}
          </Button>
        </div>
      </form>
    </div>
  );
}
