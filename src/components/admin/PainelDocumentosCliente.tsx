import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Search,
  ArrowUpDown,
  MoreVertical,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File,
  ExternalLink,
  Download,
  Link2,
  FolderSymlink,
  Edit2,
  Trash2,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { supabase, DocumentoCliente, Cliente } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PainelDocumentosClienteProps {
  cliente: Cliente;
}

export function PainelDocumentosCliente({ cliente }: PainelDocumentosClienteProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentos, setDocumentos] = useState<DocumentoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadando, setUploadando] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordemCrescente, setOrdemCrescente] = useState(true);

  // Modal Renomear
  const [docParaRenomear, setDocParaRenomear] = useState<DocumentoCliente | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);

  // Modal Excluir
  const [docParaExcluir, setDocParaExcluir] = useState<DocumentoCliente | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarDocumentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documentos_clientes')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Se a tabela ainda não tiver sido criada localmente, trata silenciosamente
        console.warn('Aviso ao buscar documentos_clientes:', error.message);
        setDocumentos([]);
      } else {
        setDocumentos((data as DocumentoCliente[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, [cliente.id]);

  const formatarTamanho = (bytes?: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatarData = (isoString?: string) => {
    if (!isoString) return '';
    const data = new Date(isoString);
    const dia = data.getDate();
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear().toString().slice(-2);
    return `${dia} ${mes} ${ano}`;
  };

  const getIconeArquivo = (mime?: string | null, nome?: string) => {
    const ext = nome?.split('.').pop()?.toLowerCase() || '';
    if (mime?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      return <FileImage className="w-6 h-6 text-sky-400 shrink-0" />;
    }
    if (mime?.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-6 h-6 text-red-400 shrink-0" />;
    }
    if (mime?.includes('sheet') || mime?.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-6 h-6 text-emerald-400 shrink-0" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="w-6 h-6 text-blue-400 shrink-0" />;
    }
    return <File className="w-6 h-6 text-slate-400 shrink-0" />;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadando(true);
    let sucessos = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const timestamp = Date.now();
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${cliente.id}/${timestamp}_${cleanName}`;

        // 1. Upload no Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from('documentos-clientes')
          .upload(storagePath, file, { upsert: true });

        if (uploadErr) {
          console.warn('Erro ao subir para storage:', uploadErr.message);
        }

        // 2. Grava registro na tabela documentos_clientes
        const { error: dbErr } = await supabase
          .from('documentos_clientes')
          .insert({
            cliente_id: cliente.id,
            nome_arquivo: file.name,
            tamanho_bytes: file.size,
            mime_type: file.type || 'application/octet-stream',
            storage_path: storagePath,
            criado_por: user?.id || null,
          });

        if (dbErr) {
          console.warn('Erro ao registrar no banco:', dbErr.message);
        } else {
          sucessos++;
        }
      } catch (err: any) {
        console.error('Falha no upload do arquivo:', err);
      }
    }

    if (sucessos > 0) {
      toast.success(`${sucessos} arquivo(s) adicionado(s) com sucesso!`);
      await carregarDocumentos();
    } else {
      toast.error('Não foi possível enviar os arquivos. Tente novamente.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadando(false);
  };

  const obterUrlArquivo = async (storagePath: string, paraDownload = false, nomeArquivo = '') => {
    // Gera URL assinada de 1 hora
    const { data, error } = await supabase.storage
      .from('documentos-clientes')
      .createSignedUrl(storagePath, 3600, {
        download: paraDownload ? nomeArquivo : undefined,
      });

    if (error || !data?.signedUrl) {
      // Tenta fallback com URL pública caso configurado
      const { data: publicData } = supabase.storage
        .from('documentos-clientes')
        .getPublicUrl(storagePath);
      return publicData?.publicUrl || null;
    }

    return data.signedUrl;
  };

  const handleAbrirEmNovaGuia = async (doc: DocumentoCliente) => {
    const url = await obterUrlArquivo(doc.storage_path, false);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Não foi possível gerar o link de abertura do arquivo.');
    }
  };

  const handleDownload = async (doc: DocumentoCliente) => {
    const url = await obterUrlArquivo(doc.storage_path, true, doc.nome_arquivo);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nome_arquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Download de "${doc.nome_arquivo}" iniciado`);
    } else {
      toast.error('Não foi possível realizar o download.');
    }
  };

  const handleCopiarLink = async (doc: DocumentoCliente) => {
    const url = await obterUrlArquivo(doc.storage_path, false);
    if (url) {
      await navigator.clipboard.writeText(url);
      toast.success('Link do arquivo copiado para a área de transferência!');
    } else {
      toast.error('Erro ao copiar link.');
    }
  };

  const abrirModalRenomear = (doc: DocumentoCliente) => {
    setDocParaRenomear(doc);
    setNovoNome(doc.nome_arquivo);
  };

  const salvarNovoNome = async () => {
    if (!docParaRenomear || !novoNome.trim()) return;
    setSalvandoNome(true);
    try {
      const { error } = await supabase
        .from('documentos_clientes')
        .update({ nome_arquivo: novoNome.trim(), updated_at: new Date().toISOString() })
        .eq('id', docParaRenomear.id);

      if (error) throw error;
      toast.success('Arquivo renomeado com sucesso!');
      setDocParaRenomear(null);
      await carregarDocumentos();
    } catch (err: any) {
      toast.error('Erro ao renomear arquivo: ' + err.message);
    } finally {
      setSalvandoNome(false);
    }
  };

  const confirmarExcluir = async () => {
    if (!docParaExcluir) return;
    setExcluindo(true);
    try {
      // 1. Remove do storage
      await supabase.storage
        .from('documentos-clientes')
        .remove([docParaExcluir.storage_path]);

      // 2. Remove da tabela
      const { error } = await supabase
        .from('documentos_clientes')
        .delete()
        .eq('id', docParaExcluir.id);

      if (error) throw error;
      toast.success('Arquivo excluído com sucesso!');
      setDocParaExcluir(null);
      await carregarDocumentos();
    } catch (err: any) {
      toast.error('Erro ao excluir arquivo: ' + err.message);
    } finally {
      setExcluindo(false);
    }
  };

  // Filtragem e ordenação
  const docsFiltrados = documentos
    .filter((d) => d.nome_arquivo.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      const cmp = a.nome_arquivo.localeCompare(b.nome_arquivo);
      return ordemCrescente ? cmp : -cmp;
    });

  return (
    <div className="bg-[#111622] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 text-slate-200">
      {/* Botões de Ação Topo */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadando}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm transition-all"
        >
          {uploadando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{uploadando ? 'Enviando...' : 'Selecionar arquivo'}</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          title="Mais opções"
          className="border-white/10 bg-[#1A2234] hover:bg-white/5 text-slate-300 rounded-xl w-9 h-9"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Barra de Busca estilo imagem */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar em todas as pastas"
          className="w-full pl-9 pr-3 py-2 bg-[#172033] border-white/5 rounded-xl text-xs text-white placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cabeçalho de Ordenação */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 px-1">
        <button
          onClick={() => setOrdemCrescente(!ordemCrescente)}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <span>Nome</span>
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono">{docsFiltrados.length} arquivo(s)</span>
      </div>

      {/* Lista de Arquivos */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 italic flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-secondary" />
            Carregando arquivos...
          </div>
        ) : docsFiltrados.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic border border-dashed border-white/10 rounded-xl p-6">
            {busca ? 'Nenhum arquivo encontrado para esta busca.' : 'Nenhum arquivo anexado a este cliente ainda.'}
          </div>
        ) : (
          docsFiltrados.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#172033]/60 hover:bg-[#1A243A] border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="p-1.5 rounded-lg bg-slate-800/80 border border-white/5 shrink-0">
                  {getIconeArquivo(doc.mime_type, doc.nome_arquivo)}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-medium text-white truncate max-w-[280px] sm:max-w-md cursor-pointer hover:underline"
                    title={doc.nome_arquivo}
                    onClick={() => handleAbrirEmNovaGuia(doc)}
                  >
                    {doc.nome_arquivo}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{formatarData(doc.created_at)}</span>
                    <span>•</span>
                    <span>{formatarTamanho(doc.tamanho_bytes)}</span>
                  </p>
                </div>
              </div>

              {/* Menu de Opções Dropdown exatamente como na imagem */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#131B2A] border-white/10 text-slate-200 rounded-xl p-1.5 shadow-2xl z-50"
                >
                  <DropdownMenuItem
                    onClick={() => handleAbrirEmNovaGuia(doc)}
                    className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    Abrir em nova guia
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-white/10 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Fazer download
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleCopiarLink(doc)}
                    className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-white/10 hover:text-white"
                  >
                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                    Copiar link
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => toast.info('O arquivo já está na pasta do cliente.')}
                    className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-white/10 hover:text-white text-slate-400"
                  >
                    <FolderSymlink className="w-3.5 h-3.5" />
                    Mover para pasta compartilhada
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => abrirModalRenomear(doc)}
                    className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-white/10 hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    Renomear
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/10 my-1" />

                  <DropdownMenuItem
                    onClick={() => setDocParaExcluir(doc)}
                    className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir arquivo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Modal de Renomear Arquivo */}
      <Dialog open={Boolean(docParaRenomear)} onOpenChange={(open) => !open && setDocParaRenomear(null)}>
        <DialogContent className="bg-[#131B2A] border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Renomear arquivo</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <label className="text-xs text-slate-400 block mb-1.5">Novo nome do arquivo</label>
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="bg-slate-900/60 border-white/10 text-white rounded-xl text-sm"
              placeholder="exemplo.pdf"
              autoFocus
            />
          </div>
          <DialogFooter className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDocParaRenomear(null)}
              className="rounded-xl text-slate-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={salvarNovoNome}
              disabled={salvandoNome || !novoNome.trim()}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-medium"
            >
              {salvandoNome ? 'Salvando...' : 'Salvar Alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={Boolean(docParaExcluir)} onOpenChange={(open) => !open && setDocParaExcluir(null)}>
        <DialogContent className="bg-[#131B2A] border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-red-400">Excluir arquivo</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tem certeza que deseja excluir permanentemente o arquivo{' '}
            <strong className="text-white">"{docParaExcluir?.nome_arquivo}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="flex items-center gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDocParaExcluir(null)}
              className="rounded-xl text-slate-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarExcluir}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
            >
              {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
