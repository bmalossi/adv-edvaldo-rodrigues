import { useState, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  ExternalLink,
  FileText,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { supabase, DocumentoCaso, TipoDocumentoCaso, Caso, Cliente } from '@/lib/supabase';
import {
  TIPOS_DOCUMENTO_CASO,
  validarNovoDocumentoCaso,
} from '@/domain/crm/drive';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DriveFileExplorer } from '@/components/crm/DriveFileExplorer';
import { toast } from 'sonner';

interface PainelDocumentosCasoProps {
  caso: Caso;
  cliente: Cliente | null;
}

export function PainelDocumentosCaso({ caso, cliente }: PainelDocumentosCasoProps) {
  const { user, papel } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoCaso[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadando, setUploadando] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(caso.google_drive_folder_id || null);
  const [modoVisualizacao, setModoVisualizacao] = useState<'explorador' | 'lista'>('explorador');

  // Form de novo documento / upload
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCaso>('prova_documental');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  const fetchDocumentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documentos_casos')
      .select('*')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocumentos(data as DocumentoCaso[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocumentos();
  }, [caso.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoSelecionado(file);
      if (!nomeArquivo) {
        setNomeArquivo(file.name);
      }
    }
  };

  const handleUploadDocumento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivoSelecionado) {
      toast.error('Selecione um arquivo para enviar.');
      return;
    }

    const validacao = validarNovoDocumentoCaso({
      caso_id: caso.id,
      nome_arquivo: nomeArquivo.trim(),
      tipo_documento: tipoDocumento,
      tamanho_bytes: arquivoSelecionado.size,
      mime_type: arquivoSelecionado.type,
    });

    if (!validacao.valido) {
      toast.error(validacao.erros.join(', '));
      return;
    }

    setUploadando(true);
    try {
      // 1. Monta FormData para a Edge Function
      const form = new FormData();
      form.append('file', arquivoSelecionado, nomeArquivo.trim() || arquivoSelecionado.name);
      form.append('caso_id', caso.id);
      form.append('cliente_nome', cliente?.nome_razao_social || 'Cliente');
      form.append('cliente_id', caso.cliente_id);
      form.append('caso_titulo', caso.titulo);
      form.append('tipo_documento', tipoDocumento);

      // 2. Chama Edge Function (faz upload real no Google Drive)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-documento-drive`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: form,
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro no upload para o Drive.');

      const { file_id, view_link, folder_id } = result as {
        file_id: string;
        view_link: string;
        folder_id: string;
      };

      // 3. Salva metadados no Supabase (com link real do Drive)
      const { data, error } = await supabase
        .from('documentos_casos')
        .insert({
          caso_id: caso.id,
          nome_arquivo: nomeArquivo.trim(),
          tipo_documento: tipoDocumento,
          tamanho_bytes: arquivoSelecionado.size,
          mime_type: arquivoSelecionado.type || 'application/octet-stream',
          google_drive_file_id: file_id,
          google_drive_view_link: view_link,
          criado_por: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualiza folder_id do caso se ainda não tinha
      if (folder_id && !driveFolderId) {
        setDriveFolderId(folder_id);
        await supabase
          .from('casos')
          .update({ google_drive_folder_id: folder_id })
          .eq('id', caso.id);
      }

      setDocumentos((prev) => [data as DocumentoCaso, ...prev]);
      toast.success('Documento enviado ao Google Drive com sucesso!');
      setNomeArquivo('');
      setArquivoSelecionado(null);
      setMostrandoForm(false);
    } catch (err: any) {
      toast.error('Erro ao arquivar documento: ' + err.message);
    } finally {
      setUploadando(false);
    }
  };


  const handleExcluir = async (id: string) => {
    const confirm = window.confirm('Deseja remover este registro de documento do caso?');
    if (!confirm) return;

    const { error } = await supabase.from('documentos_casos').delete().eq('id', id);
    if (!error) {
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
      toast.success('Documento desvinculado.');
    }
  };

  const linkPastaDrive = driveFolderId
    ? `https://drive.google.com/drive/folders/${driveFolderId}`
    : `https://drive.google.com/drive/search?q=${encodeURIComponent(caso.titulo)}`;

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-secondary" />
            Documentos & Google Drive
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sincronização em tempo real na árvore de pastas do escritório
          </p>
        </div>

        <div className="flex items-center gap-2">
          {driveFolderId && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('explorador')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  modoVisualizacao === 'explorador'
                    ? 'bg-[#C9A961] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Explorador de Pastas
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('lista')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  modoVisualizacao === 'lista'
                    ? 'bg-[#C9A961] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lista ({documentos.length})
              </button>
            </div>
          )}

          <a
            href={linkPastaDrive}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-secondary" />
            Abrir Pasta no Drive
          </a>

          <Button
            size="sm"
            onClick={() => setMostrandoForm(!mostrandoForm)}
            className="rounded-xl gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {mostrandoForm ? 'Fechar' : 'Anexar Documento'}
          </Button>
        </div>
      </div>

      {/* Formulário de Upload / Registro */}
      {mostrandoForm && (
        <form
          onSubmit={handleUploadDocumento}
          className="p-4 rounded-xl bg-muted/40 border border-border space-y-4 text-xs"
        >
          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-primary" />
            Anexar Documento Jurídico
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">
                Arquivo local
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">
                Nome de Exibição / Título <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="Ex: Contrato de Locação Assinado.pdf"
                value={nomeArquivo}
                onChange={(e) => setNomeArquivo(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Classificação Jurídica <span className="text-red-400">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoCaso)}
              className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(TIPOS_DOCUMENTO_CASO).map(([chave, item]) => (
                <option key={chave} value={chave}>
                  {item.label} — {item.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrandoForm(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={uploadando} className="gap-1.5">
              {uploadando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sincronizando no Drive...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Salvar e Sincronizar
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Listagem ou Explorador de Pastas */}
      {driveFolderId && modoVisualizacao === 'explorador' ? (
        <DriveFileExplorer
          initialFolderId={driveFolderId}
          initialFolderName={caso.titulo}
          tituloPersonalizado={`Google Drive — ${caso.titulo}`}
        />
      ) : (
        <>
          {loading ? (
            <div className="py-6 text-center text-xs text-muted-foreground italic">
              Carregando documentos sincronizados...
            </div>
          ) : documentos.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              Nenhum documento anexado a este caso ainda. Clique em "Anexar Documento" para sincronizar com o Drive.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {documentos.map((doc) => {
                const configTipo = TIPOS_DOCUMENTO_CASO[doc.tipo_documento] || TIPOS_DOCUMENTO_CASO.outros;
                return (
                  <div
                    key={doc.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {doc.nome_arquivo}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-medium">
                            {configTipo.label}
                          </span>
                          <span>•</span>
                          <span>
                            {doc.tamanho_bytes
                              ? `${(doc.tamanho_bytes / 1024).toFixed(1)} KB`
                              : 'Tamanho não informado'}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc.google_drive_view_link && (
                        <a
                          href={doc.google_drive_view_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                          title="Abrir no Google Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {(papel === 'advogado' || doc.criado_por === user?.id) && (
                        <button
                          onClick={() => handleExcluir(doc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Excluir documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
