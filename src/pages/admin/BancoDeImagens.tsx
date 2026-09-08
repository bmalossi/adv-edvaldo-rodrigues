import { useState, useEffect } from 'react'
import {
  getArticleImages,
  deleteArticleImage,
  type ArticleImage,
} from '@/lib/articles'
import { uploadArticleImage } from '@/lib/storage/uploadImage'
import {
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function BancoDeImagens() {
  const [images, setImages] = useState<ArticleImage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const loadImages = async () => {
    setLoading(true)
    const data = await getArticleImages()
    setImages(data)
    setLoading(false)
  }

  useEffect(() => {
    loadImages()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const res = await uploadArticleImage(file)
    setUploading(false)

    if (e.target) e.target.value = ''

    if (res.url) {
      toast.success('Imagem enviada e armazenada com sucesso no R2!')
      loadImages()
    } else {
      toast.error(res.error || 'Erro no envio da imagem.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover esta imagem do catálogo?')) return

    setDeletingId(id)
    const ok = await deleteArticleImage(id)
    setDeletingId(null)

    if (ok) {
      toast.success('Imagem removida do catálogo.')
      setImages((prev) => prev.filter((img) => img.id !== id))
    } else {
      toast.error('Não foi possível remover a imagem.')
    }
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    toast.success('URL copiada!')
    setTimeout(() => setCopiedUrl(null), 2500)
  }

  const filteredImages = images.filter((img) =>
    (img.file_name || img.url).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="size-6 text-[#C9A961]" />
            Banco de Imagens (Cloudflare R2)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Imagens hospedadas na nuvem prontas para uso em capas e no corpo dos artigos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadImages}
            disabled={loading}
            className="border-white/10 text-slate-300 hover:bg-white/5 h-9 text-xs"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <label className="cursor-pointer">
            <input
              type="file"
              onChange={handleUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
            />
            <span className="inline-flex items-center gap-2 bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-bold text-xs px-4 py-2 rounded-md transition-all shadow-md h-9">
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? 'Enviando ao R2...' : 'Fazer Novo Upload'}
            </span>
          </label>
        </div>
      </div>

      {/* Barra de Busca e Filtro */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do arquivo ou URL..."
            className="bg-slate-950/60 border-white/10 text-white text-xs pl-9 h-9"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {filteredImages.length} {filteredImages.length === 1 ? 'mídia cadastrada' : 'mídias cadastradas'}
        </span>
      </div>

      {/* Grid de Fotos */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="size-8 text-[#C9A961] animate-spin" />
          <p className="text-sm">Carregando catálogo de imagens do R2...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2 text-center bg-slate-900/40 rounded-2xl border border-white/5 p-8">
          <ImageIcon className="size-12 stroke-1 text-slate-600 mb-1" />
          <p className="text-base font-medium text-slate-300">Nenhuma imagem no banco</p>
          <p className="text-xs max-w-sm text-slate-500">
            {search
              ? 'Nenhum resultado corresponde à busca.'
              : 'Clique em "Fazer Novo Upload" para enviar fotos para o Cloudflare R2.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              className="group bg-slate-900/70 rounded-xl border border-white/10 overflow-hidden hover:border-[#C9A961]/50 hover:shadow-lg transition-all flex flex-col"
            >
              <div className="aspect-video w-full bg-slate-950 overflow-hidden relative">
                <img
                  src={img.url}
                  alt={img.file_name || 'Mídia'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-xs font-semibold text-white truncate" title={img.file_name || img.url}>
                    {img.file_name || 'Imagem'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                    {img.url}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(img.url)}
                    className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    {copiedUrl === img.url ? (
                      <Check className="size-3 mr-1 text-emerald-400" />
                    ) : (
                      <Copy className="size-3 mr-1" />
                    )}
                    {copiedUrl === img.url ? 'Copiado' : 'Copiar link'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === img.id}
                    onClick={() => handleDelete(img.id)}
                    className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title="Remover do catálogo"
                  >
                    {deletingId === img.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
