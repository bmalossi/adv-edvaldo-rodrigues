import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderPlus,
  Upload,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Link2,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode,
  File,
  Loader2,
  AlertCircle,
  Clock,
  HardDrive,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  DriveItem,
  DriveBreadcrumb,
} from "@/domain/crm/drive";
import {
  buscarConteudoPastaDrive,
  criarSubpastaDrive,
  uploadArquivoDrive,
} from "@/domain/crm/drive-service";

interface DriveFileExplorerProps {
  initialFolderId: string;
  initialFolderName?: string;
  className?: string;
  tituloPersonalizado?: string;
}

export function DriveFileExplorer({
  initialFolderId,
  initialFolderName = "Pasta do Cliente",
  className = "",
  tituloPersonalizado,
}: DriveFileExplorerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([
    { id: initialFolderId, name: initialFolderName },
  ]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const [currentFolderViewLink, setCurrentFolderViewLink] = useState<string | null>(null);
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Busca interna
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Nova Pasta
  const [modalNovaPastaAberto, setModalNovaPastaAberto] = useState(false);
  const [nomeNovaPasta, setNomeNovaPasta] = useState("");
  const [salvandoPasta, setSalvandoPasta] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadando, setUploadando] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const carregarPasta = async (folderId: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const conteudo = await buscarConteudoPastaDrive(folderId);
      setFolders(conteudo.folders);
      setFiles(conteudo.files);
      if (conteudo.currentFolder.webViewLink) {
        setCurrentFolderViewLink(conteudo.currentFolder.webViewLink);
      }
    } catch (err: any) {
      const msg = err.message || "Não foi possível carregar a pasta do Google Drive.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentFolder?.id) {
      carregarPasta(currentFolder.id);
    }
  }, [currentFolder.id]);

  const entrarNaPasta = (pasta: DriveItem) => {
    setSearchQuery("");
    setBreadcrumbs((prev) => [...prev, { id: pasta.id, name: pasta.name }]);
  };

  const navegarParaBreadcrumb = (index: number) => {
    if (index === breadcrumbs.length - 1) return;
    setSearchQuery("");
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const voltarUmNivel = () => {
    if (breadcrumbs.length <= 1) return;
    setSearchQuery("");
    setBreadcrumbs((prev) => prev.slice(0, prev.length - 1));
  };

  const handleCriarNovaPasta = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nomeNovaPasta.trim();
    if (!nomeLimpo) {
      toast.error("Informe o nome da nova pasta.");
      return;
    }

    setSalvandoPasta(true);
    try {
      const novaPasta = await criarSubpastaDrive(currentFolder.id, nomeLimpo);
      toast.success(`Pasta "${novaPasta.name}" criada com sucesso no Google Drive!`);
      setNomeNovaPasta("");
      setModalNovaPastaAberto(false);
      await carregarPasta(currentFolder.id, true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar subpasta no Google Drive.");
    } finally {
      setSalvandoPasta(false);
    }
  };

  const processarUploadArquivos = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setUploadando(true);
    let sucessos = 0;

    for (const file of filesArray) {
      try {
        await uploadArquivoDrive(currentFolder.id, file);
        sucessos++;
      } catch (err: any) {
        toast.error(`Falha ao enviar "${file.name}": ${err.message}`);
      }
    }

    if (sucessos > 0) {
      toast.success(`${sucessos} arquivo(s) enviado(s) para a pasta "${currentFolder.name}"!`);
      await carregarPasta(currentFolder.id, true);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadando(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processarUploadArquivos(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processarUploadArquivos(e.dataTransfer.files);
    }
  };

  const copiarLinkArquivo = async (link?: string | null) => {
    if (!link) {
      toast.error("Link não disponível para este arquivo.");
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Link do Google Drive copiado!");
  };

  const formatarTamanho = (bytes?: number | null) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatarData = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-rose-400 shrink-0" />;
    if (mimeType.includes("word") || mimeType.includes("document"))
      return <FileText className="w-5 h-5 text-blue-400 shrink-0" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (mimeType.includes("image")) return <FileImage className="w-5 h-5 text-amber-400 shrink-0" />;
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("compressed"))
      return <FileArchive className="w-5 h-5 text-orange-400 shrink-0" />;
    if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html"))
      return <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />;
    return <File className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  // Filtro de busca
  const foldersFiltradas = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filesFiltrados = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 flex flex-col gap-4 text-slate-100 ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ─── Cabeçalho e Barra de Ferramentas ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 text-base">
              {tituloPersonalizado || "Google Drive — Gerenciador de Pastas"}
            </h3>
            <p className="text-xs text-slate-400">
              {folders.length} pasta(s) e {files.length} arquivo(s) neste diretório
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Nova Pasta */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalNovaPastaAberto(true)}
            className="border-white/10 hover:bg-slate-800 text-slate-200 gap-1.5 h-8 text-xs"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#C9A961]" />
            Nova Pasta
          </Button>

          {/* Botão Upload de Arquivo */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            size="sm"
            disabled={uploadando}
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#C9A961] hover:bg-[#b09352] text-slate-950 font-medium gap-1.5 h-8 text-xs shadow-sm"
          >
            {uploadando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploadando ? "Enviando..." : "Enviar Arquivo"}
          </Button>

          {/* Botão Abrir no Google Drive */}
          {currentFolderViewLink && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(currentFolderViewLink, "_blank", "noopener,noreferrer")}
              className="border-white/10 hover:bg-slate-800 text-slate-300 gap-1.5 h-8 text-xs"
              title="Abrir esta pasta diretamente no Google Drive"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Ver no Drive
            </Button>
          )}

          {/* Atualizar */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => carregarPasta(currentFolder.id, true)}
            disabled={loading || refreshing}
            className="h-8 w-8 text-slate-400 hover:text-white"
            title="Recarregar pasta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ─── Breadcrumbs (Caminho de Pastas) & Busca ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {breadcrumbs.length > 1 && (
            <button
              type="button"
              onClick={voltarUmNivel}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors mr-1"
              title="Voltar pasta anterior"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id + idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <button
                  type="button"
                  onClick={() => navegarParaBreadcrumb(idx)}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    isLast
                      ? "bg-slate-800 text-white font-medium border border-white/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${isLast ? "text-[#C9A961]" : "text-slate-500"}`} />
                  <span className="truncate max-w-[160px]">{crumb.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar arquivo ou pasta..."
            className="pl-8 h-8 text-xs bg-slate-900 border-white/10 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* ─── Zona Drag & Drop Feedback ─── */}
      {isDragOver && (
        <div className="border-2 border-dashed border-[#C9A961] bg-[#C9A961]/10 rounded-lg p-6 text-center text-[#C9A961] flex flex-col items-center justify-center gap-2 animate-pulse">
          <Upload className="w-8 h-8" />
          <p className="font-medium text-sm">Solte os arquivos aqui para fazer upload nesta pasta!</p>
        </div>
      )}

      {/* ─── Conteúdo: Carregando, Erro ou Listagem ─── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#C9A961]" />
          <p className="text-xs">Sincronizando com o Google Drive...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <p className="font-medium">{errorMsg}</p>
          <p className="text-slate-400 text-[11px] max-w-md">
            Verifique se a pasta do Google Drive ainda existe e se as credenciais de acesso possuem permissão.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => carregarPasta(currentFolder.id)}
            className="mt-2 border-rose-500/30 text-rose-300 hover:bg-rose-500/10 h-7 text-xs"
          >
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* ─── Seção 1: Subpastas ─── */}
          {foldersFiltradas.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pastas ({foldersFiltradas.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {foldersFiltradas.map((pasta) => (
                  <button
                    key={pasta.id}
                    type="button"
                    onClick={() => entrarNaPasta(pasta)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/40 hover:bg-slate-800/60 border border-white/5 hover:border-[#C9A961]/40 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-md bg-[#C9A961]/10 flex items-center justify-center text-[#C9A961] group-hover:scale-110 transition-transform shrink-0">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                        {pasta.name}
                      </p>
                      <p className="text-[10px] text-slate-500">Subpasta do Drive</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Seção 2: Arquivos ─── */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Arquivos ({filesFiltrados.length})
            </span>

            {filesFiltrados.length === 0 && foldersFiltradas.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-lg text-slate-500 text-xs">
                <Folder className="w-8 h-8 text-slate-600" />
                <p>Esta pasta está vazia.</p>
                <p className="text-[11px] text-slate-600">
                  Clique em "Enviar Arquivo" ou arraste documentos para cá.
                </p>
              </div>
            ) : filesFiltrados.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Nenhum arquivo encontrado diretamente nesta pasta (apenas subpastas acima).
              </p>
            ) : (
              <div className="border border-white/5 rounded-lg overflow-hidden bg-slate-950/30 divide-y divide-white/5">
                {filesFiltrados.map((arq) => (
                  <div
                    key={arq.id}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Informações do Arquivo */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getFileIcon(arq.mimeType)}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-200 truncate hover:text-white">
                          {arq.name}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>{formatarTamanho(arq.size)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatarData(arq.modifiedTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Visualizar */}
                      {arq.webViewLink && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(arq.webViewLink!, "_blank", "noopener,noreferrer")}
                          className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                          title="Visualizar no Google Drive"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Download */}
                      {(arq.webContentLink || arq.webViewLink) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            window.open(arq.webContentLink || arq.webViewLink!, "_blank", "noopener,noreferrer")
                          }
                          className="h-7 w-7 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                          title="Fazer Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Copiar Link */}
                      {arq.webViewLink && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => copiarLinkArquivo(arq.webViewLink)}
                          className="h-7 w-7 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                          title="Copiar Link do Google Drive"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal Criar Nova Pasta ─── */}
      <Dialog open={modalNovaPastaAberto} onOpenChange={setModalNovaPastaAberto}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#C9A961]" />
              Nova Subpasta no Google Drive
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarNovaPasta} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Nome da Pasta (dentro de "{currentFolder.name}"):
              </label>
              <Input
                autoFocus
                value={nomeNovaPasta}
                onChange={(e) => setNomeNovaPasta(e.target.value)}
                placeholder="Ex.: Certidões de Imóveis, Procurações..."
                className="bg-slate-950 border-white/10 text-white text-xs h-9"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalNovaPastaAberto(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoPasta || !nomeNovaPasta.trim()}
                className="bg-[#C9A961] hover:bg-[#b09352] text-slate-950 font-medium text-xs"
              >
                {salvandoPasta ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Criando...
                  </>
                ) : (
                  "Criar Pasta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
