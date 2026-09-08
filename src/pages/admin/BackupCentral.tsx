import { useState, useEffect } from 'react';
import {
  Cloud,
  CloudDownload,
  FolderSync,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  HardDrive,
  ExternalLink,
  Settings2,
  FileArchive,
  RefreshCw,
  Layers,
  HelpCircle,
  Save,
  Check,
  ChevronRight
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  supabase,
  EscopoBackup,
  StatusBackup,
  ConfiguracaoDrive,
  HistoricoBackup,
  converterClientesParaCSV,
  gerarManifestoBackup,
  gerarNomeArquivoZip,
  validarConfiguracaoDrive,
  Cliente,
  Caso,
  InteracaoCliente
} from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function BackupCentral() {
  const { user } = useAuth();

  // Estados do Backup
  const [escopo, setEscopo] = useState<EscopoBackup>('completo');
  const [status, setStatus] = useState<StatusBackup>('idle');
  const [progressoTexto, setProgressoTexto] = useState('');
  const [progressoPorcentagem, setProgressoPorcentagem] = useState(0);

  // Configuração Google Drive
  const [driveConfig, setDriveConfig] = useState<ConfiguracaoDrive>({
    ativo: false,
    google_drive_folder_id: '',
    webhook_backup_url: '',
    frequencia_automatica: 'manual',
  });
  const [salvandoDrive, setSalvandoDrive] = useState(false);
  const [carregandoConfig, setCarregandoConfig] = useState(true);

  // Histórico
  const [historico, setHistorico] = useState<HistoricoBackup[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  // Carregar Configuração e Histórico do Banco
  const carregarDados = async () => {
    try {
      // 1. Configurações
      const { data: configData } = await supabase
        .from('configuracoes_backup_drive')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configData) {
        setDriveConfig({
          id: configData.id,
          ativo: Boolean(configData.ativo),
          google_drive_folder_id: configData.google_drive_folder_id || '',
          webhook_backup_url: configData.webhook_backup_url || '',
          frequencia_automatica: configData.frequencia_automatica || 'manual',
          ultimo_backup_em: configData.ultimo_backup_em,
          ultimo_status: configData.ultimo_status,
        });
      }

      // 2. Histórico
      const { data: histData } = await supabase
        .from('historico_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (histData) {
        setHistorico(histData as HistoricoBackup[]);
      }
    } catch (err) {
      console.warn('Tabelas de backup ainda não inicializadas ou vazias:', err);
    } finally {
      setCarregandoConfig(false);
      setCarregandoHistorico(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const salvarConfiguracaoDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const validacao = validarConfiguracaoDrive(driveConfig);
    if (!validacao.valido) {
      toast.error(validacao.erros.join(', '));
      return;
    }

    setSalvandoDrive(true);
    try {
      if (driveConfig.id) {
        const { error } = await supabase
          .from('configuracoes_backup_drive')
          .update({
            ativo: driveConfig.ativo,
            google_drive_folder_id: driveConfig.google_drive_folder_id.trim(),
            webhook_backup_url: driveConfig.webhook_backup_url?.trim(),
            frequencia_automatica: driveConfig.frequencia_automatica,
            updated_at: new Date().toISOString(),
          })
          .eq('id', driveConfig.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('configuracoes_backup_drive')
          .insert({
            ativo: driveConfig.ativo,
            google_drive_folder_id: driveConfig.google_drive_folder_id.trim(),
            webhook_backup_url: driveConfig.webhook_backup_url?.trim(),
            frequencia_automatica: driveConfig.frequencia_automatica,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setDriveConfig((prev) => ({ ...prev, id: data.id }));
      }

      toast.success('Configurações do Google Drive salvas com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar configurações: ' + err.message);
    } finally {
      setSalvandoDrive(false);
    }
  };

  // ─── Rotina de Execução e Empacotamento do Backup ────────────────────────────
  const executarBackup = async () => {
    setStatus('coletando_dados');
    setProgressoTexto('Coletando cadastros de clientes e dados do banco...');
    setProgressoPorcentagem(15);

    const zip = new JSZip();
    const nomeZip = gerarNomeArquivoZip(escopo);
    const pastaDados = zip.folder('dados');
    const pastaDocs = zip.folder('documentos_clientes');
    const pastaMidias = zip.folder('imagens_e_midias');

    let totalClientes = 0;
    let totalCasos = 0;
    let totalInteracoes = 0;
    let totalDocumentos = 0;
    const listaArquivos: string[] = [];

    try {
      // 1. Coletar dados tabulares
      const { data: clientesData } = await supabase.from('clientes').select('*');
      const clientes = (clientesData as Cliente[]) || [];
      totalClientes = clientes.length;

      const { data: casosData } = await supabase.from('casos').select('*');
      const casos = (casosData as Caso[]) || [];
      totalCasos = casos.length;

      const { data: interacoesData } = await supabase.from('interacoes_cliente').select('*');
      const interacoes = (interacoesData as InteracaoCliente[]) || [];
      totalInteracoes = interacoes.length;

      // Adiciona JSONs ao ZIP
      if (escopo === 'completo' || escopo === 'apenas_dados') {
        pastaDados?.file('clientes.json', JSON.stringify(clientes, null, 2));
        pastaDados?.file('clientes.csv', converterClientesParaCSV(clientes));
        pastaDados?.file('casos.json', JSON.stringify(casos, null, 2));
        pastaDados?.file('interacoes.json', JSON.stringify(interacoes, null, 2));
        listaArquivos.push('dados/clientes.json', 'dados/clientes.csv', 'dados/casos.json', 'dados/interacoes.json');
      }

      setProgressoPorcentagem(40);

      // 2. Coletar documentos de clientes (Supabase Storage)
      if (escopo === 'completo' || escopo === 'apenas_documentos') {
        setStatus('baixando_documentos');
        setProgressoTexto('Localizando e baixando documentos anexados...');

        const { data: docsClientes } = await supabase.from('documentos_clientes').select('*');

        if (docsClientes && docsClientes.length > 0) {
          totalDocumentos = docsClientes.length;

          for (let i = 0; i < docsClientes.length; i++) {
            const doc = docsClientes[i];
            const pct = 40 + Math.floor(((i + 1) / docsClientes.length) * 35);
            setProgressoPorcentagem(pct);
            setProgressoTexto(`Baixando documento ${i + 1} de ${docsClientes.length}: ${doc.nome_arquivo}...`);

            try {
              const { data: fileBlob } = await supabase.storage
                .from('documentos-clientes')
                .download(doc.storage_path);

              if (fileBlob) {
                // Organiza por pasta do cliente
                const clienteDono = clientes.find((c) => c.id === doc.cliente_id);
                const nomePastaCli = clienteDono
                  ? `${clienteDono.nome_razao_social.replace(/[^a-zA-Z0-9_-]/g, '_')}_${clienteDono.id.slice(0, 6)}`
                  : doc.cliente_id;

                const caminhoArquivo = `${nomePastaCli}/${doc.nome_arquivo}`;
                pastaDocs?.file(caminhoArquivo, fileBlob);
                listaArquivos.push(`documentos_clientes/${caminhoArquivo}`);
              }
            } catch (errDoc) {
              console.warn(`Erro ao obter arquivo ${doc.nome_arquivo}:`, errDoc);
            }
          }
        }
      }

      // 3. Manifesto do Backup
      setStatus('gerando_pacote');
      setProgressoTexto('Consolidando manifesto e compactando pacote (.zip)...');
      setProgressoPorcentagem(85);

      const manifesto = gerarManifestoBackup(
        escopo,
        {
          total_clientes: totalClientes,
          total_casos: totalCasos,
          total_interacoes: totalInteracoes,
          total_documentos: totalDocumentos,
        },
        listaArquivos
      );
      zip.file('manifesto.json', JSON.stringify(manifesto, null, 2));

      // 4. Gerar o arquivo ZIP final
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const tamanhoBytes = zipBlob.size;
      setProgressoPorcentagem(95);

      // 5. Integração com Google Drive (Se ativo)
      let statusEnvioDrive = 'local';
      let driveLink = null;

      if (driveConfig.ativo && driveConfig.webhook_backup_url) {
        setStatus('enviando_drive');
        setProgressoTexto('Enviando cópia para o Google Drive configurado...');
        try {
          // Dispara webhook com pacote para automação n8n ou worker do Google Drive
          const formData = new FormData();
          formData.append('file', zipBlob, nomeZip);
          formData.append('folder_id', driveConfig.google_drive_folder_id);

          await fetch(driveConfig.webhook_backup_url, {
            method: 'POST',
            body: formData,
          });

          statusEnvioDrive = 'google_drive';
          toast.success('Backup sincronizado com sucesso com o Google Drive!');
        } catch (errDrive) {
          console.warn('Falha no envio para webhook do Google Drive:', errDrive);
          toast.warning('Backup gerado, mas o envio automático ao Google Drive falhou. O download local foi liberado.');
        }
      }

      // 6. Download imediato do arquivo localmente
      saveAs(zipBlob, nomeZip);

      // 7. Salvar registro no histórico
      try {
        await supabase.from('historico_backups').insert({
          nome_arquivo: nomeZip,
          escopo,
          tamanho_bytes: tamanhoBytes,
          total_clientes: totalClientes,
          total_documentos: totalDocumentos,
          total_casos: totalCasos,
          status: statusEnvioDrive === 'google_drive' ? 'enviado_drive' : 'concluido',
          destino: statusEnvioDrive === 'google_drive' ? 'ambos' : 'local',
          google_drive_file_id: driveConfig.google_drive_folder_id || null,
          google_drive_link: driveLink,
          criado_por: user?.id || null,
        });

        if (driveConfig.id) {
          await supabase
            .from('configuracoes_backup_drive')
            .update({
              ultimo_backup_em: new Date().toISOString(),
              ultimo_status: 'sucesso',
            })
            .eq('id', driveConfig.id);
        }
      } catch (errHist) {
        console.warn('Erro ao gravar histórico:', errHist);
      }

      setStatus('concluido');
      setProgressoPorcentagem(100);
      setProgressoTexto('Backup concluído e baixado com sucesso!');
      toast.success(`Pacote de backup ${nomeZip} gerado com sucesso!`);
      await carregarDados();
    } catch (err: any) {
      console.error('Erro na rotina de backup:', err);
      setStatus('erro');
      setProgressoTexto('Erro ao gerar backup: ' + err.message);
      toast.error('Ocorreu um erro ao gerar o backup.');
    }
  };

  const formatarBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-secondary/10 rounded-xl text-secondary">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase">
            Governança & Segurança
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Central de Backups & Google Drive
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Exportação completa de dados, contratos, imagens e arquivos cadastrados com salvamento em nuvem.
        </p>
      </div>

      {/* Grid Principal: Gerador de Backup e Configuração Drive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Execução de Backup */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-secondary" />
                <div>
                  <h2 className="text-base font-bold text-white">Criar Novo Pacote de Backup</h2>
                  <p className="text-xs text-slate-400">
                    Gera um arquivo compacto (.zip) contendo planilhas, cadastros e pastas de documentos.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                JusTrack v2.0
              </span>
            </div>

            {/* Seleção de Escopo */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Selecione o conteúdo do backup:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setEscopo('completo')}
                  disabled={status !== 'idle' && status !== 'concluido' && status !== 'erro'}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    escopo === 'completo'
                      ? 'bg-secondary/15 border-secondary text-white'
                      : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Layers className="w-4 h-4 text-secondary" />
                    {escopo === 'completo' && <Check className="w-4 h-4 text-secondary" />}
                  </div>
                  <p className="text-xs font-bold text-white">Backup Completo</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Todos os clientes, casos, documentos e mídias.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEscopo('apenas_dados')}
                  disabled={status !== 'idle' && status !== 'concluido' && status !== 'erro'}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    escopo === 'apenas_dados'
                      ? 'bg-secondary/15 border-secondary text-white'
                      : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Database className="w-4 h-4 text-secondary" />
                    {escopo === 'apenas_dados' && <Check className="w-4 h-4 text-secondary" />}
                  </div>
                  <p className="text-xs font-bold text-white">Apenas Cadastros</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clientes, processos e histórico em JSON e CSV.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEscopo('apenas_documentos')}
                  disabled={status !== 'idle' && status !== 'concluido' && status !== 'erro'}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    escopo === 'apenas_documentos'
                      ? 'bg-secondary/15 border-secondary text-white'
                      : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <FileArchive className="w-4 h-4 text-secondary" />
                    {escopo === 'apenas_documentos' && <Check className="w-4 h-4 text-secondary" />}
                  </div>
                  <p className="text-xs font-bold text-white">Apenas Arquivos</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Todos os PDFs, comprovantes e minutas anexas.
                  </p>
                </button>
              </div>
            </div>

            {/* Painel de Status / Progresso */}
            {status !== 'idle' && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    {status === 'concluido' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : status === 'erro' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                    )}
                    {progressoTexto}
                  </span>
                  <span className="font-mono text-secondary font-bold">{progressoPorcentagem}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-secondary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressoPorcentagem}%` }}
                  />
                </div>
              </div>
            )}

            {/* Ação de Disparo */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400 shrink-0" />
                <span>O arquivo será salvo localmente e replicado para o Google Drive se ativo.</span>
              </div>

              <Button
                onClick={executarBackup}
                disabled={status !== 'idle' && status !== 'concluido' && status !== 'erro'}
                className="w-full sm:w-auto bg-cta-gold hover:opacity-90 text-primary font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                {status !== 'idle' && status !== 'concluido' && status !== 'erro' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processando Backup...
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-4 h-4" /> Executar Backup Agora (.zip)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Coluna 3: Integração Google Drive */}
        <div className="space-y-6">
          <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-secondary" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Destino Google Drive
                </h2>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  driveConfig.ativo
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {driveConfig.ativo ? 'Conectado' : 'Aguardando Configuração'}
              </span>
            </div>

            <form onSubmit={salvarConfiguracaoDrive} className="space-y-4 text-xs">
              {/* Toggle de ativação */}
              <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <div>
                  <p className="font-semibold text-white">Sincronização Ativa</p>
                  <p className="text-[11px] text-slate-400">Enviar cópias automaticamente ao Drive</p>
                </div>
                <input
                  type="checkbox"
                  checked={driveConfig.ativo}
                  onChange={(e) => setDriveConfig((prev) => ({ ...prev, ativo: e.target.checked }))}
                  className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  ID da Pasta de Destino no Google Drive
                </label>
                <Input
                  value={driveConfig.google_drive_folder_id}
                  onChange={(e) =>
                    setDriveConfig((prev) => ({ ...prev, google_drive_folder_id: e.target.value }))
                  }
                  placeholder="Ex: 1A2b3C4d5E6f7G8h9I0..."
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  O ID é o código final na barra de endereço ao abrir a pasta no Google Drive.
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Webhook / Endpoint de Sincronização (Opcional)
                </label>
                <Input
                  value={driveConfig.webhook_backup_url || ''}
                  onChange={(e) =>
                    setDriveConfig((prev) => ({ ...prev, webhook_backup_url: e.target.value }))
                  }
                  placeholder="https://webhook.automab.dev/... ou Google Cloud"
                  className="bg-slate-900/50 border-white/10 text-white rounded-xl text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Pode ser integrado diretamente via automação n8n ou webhook seguro.
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Frequência</label>
                <select
                  value={driveConfig.frequencia_automatica}
                  onChange={(e) =>
                    setDriveConfig((prev) => ({
                      ...prev,
                      frequencia_automatica: e.target.value as any,
                    }))
                  }
                  className="w-full h-9 px-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-xs focus:border-secondary"
                >
                  <option value="manual">Manual (Apenas sob demanda)</option>
                  <option value="diario">Diário (Noite)</option>
                  <option value="semanal">Semanal (Domingos)</option>
                  <option value="mensal">Mensal (Dia 1º)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={salvandoDrive}
                  className="w-full bg-secondary hover:bg-secondary/90 text-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {salvandoDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {salvandoDrive ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Histórico de Backups Anteriores */}
      <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <h2 className="text-base font-bold text-white">Histórico de Backups Realizados</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={carregarDados}
            className="text-slate-400 hover:text-white rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>

        {carregandoHistorico ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">Carregando histórico...</div>
        ) : historico.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic border border-dashed border-white/10 rounded-xl p-6">
            Nenhum registro de backup encontrado. Execute o primeiro backup acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Arquivo</th>
                  <th className="py-2.5 px-3 font-semibold">Data / Hora</th>
                  <th className="py-2.5 px-3 font-semibold">Escopo</th>
                  <th className="py-2.5 px-3 font-semibold">Registros</th>
                  <th className="py-2.5 px-3 font-semibold">Tamanho</th>
                  <th className="py-2.5 px-3 font-semibold">Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {historico.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono text-white font-medium flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-secondary shrink-0" />
                      <span className="truncate max-w-xs">{item.nome_arquivo}</span>
                    </td>
                    <td className="py-3 px-3">
                      {new Date(item.created_at).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                        {item.escopo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {item.total_clientes} cli • {item.total_documentos} docs
                    </td>
                    <td className="py-3 px-3 font-mono">{formatarBytes(item.tamanho_bytes)}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.destino === 'google_drive' || item.destino === 'ambos'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {item.destino === 'google_drive' || item.destino === 'ambos'
                          ? 'Google Drive'
                          : 'Download Local'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
