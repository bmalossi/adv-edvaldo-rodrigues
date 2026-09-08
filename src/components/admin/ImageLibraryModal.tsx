import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Check,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface ImageLibraryModalProps {
  open: boolean
  onClose: () => void
  onSelectImage: (imageUrl: string, fileName?: string) => void
  title?: string
}

export function ImageLibraryModal({
  open,
  onClose,
  onSelectImage,
  title = 'Banco de Imagens',
}: ImageLibraryModalProps) {
  const [images, setImages] = useState<ArticleImage[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadImages = async () => {
    setLoading(true)
    const data = await getArticleImages()
    setImages(data)
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadImages()
      setSelectedUrl(null)
      setSearch('')
    }
  }, [open])

  const handleUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const res = await uploadArticleImage(file)
    setUploading(false)

    if (e.target) e.target.value = ''

    if (res.url) {
      toast.success('Imagem enviada e adicionada ao banco!')
      await loadImages()
      setSelectedUrl(res.url)
    } else {
      toast.error(res.error || 'Erro no upload da imagem.')
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Deseja remover esta imagem do catálogo?')) return

    setDeletingId(id)
    const ok = await deleteArticleImage(id)
    setDeletingId(null)

    if (ok) {
      toast.success('Imagem removida do catálogo.')
      setImages((prev) => prev.filter((img) => img.id !== id))
      if (images.find((img) => img.id === id)?.url === selectedUrl) {
        setSelectedUrl(null)
      }
    } else {
      toast.error('Não foi possível remover a imagem.')
    }
  }

  const filteredImages = images.filter((img) =>
    (img.file_name || img.url).toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirmSelection = () => {
    if (!selectedUrl) return
    const sel = images.find((img) => img.url === selectedUrl)
    onSelectImage(selectedUrl, sel?.file_name || undefined)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl bg-slate-900 border border-white/10 text-white p-6 sm:rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10 pr-6">
          <DialogTitle className="font-serif text-xl font-bold flex items-center gap-2.5 text-white">
            <ImageIcon className="size-5 text-[#C9A961]" />
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadImages}
              disabled={loading}
              className="border-white/10 text-slate-300 hover:bg-white/5 h-8 text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <label className="cursor-pointer">
              <input
                type="file"
                onChange={handleUploadNew}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
              />
              <span className="inline-flex items-center gap-1.5 bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-bold text-xs px-3 py-1.5 rounded-md transition-colors h-8">
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {uploading ? 'Enviando...' : 'Fazer Upload'}
              </span>
            </label>
          </div>
        </DialogHeader>

        {/* Barra de Busca e Contador */}
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da imagem..."
              className="bg-slate-950/60 border-white/10 text-white text-xs pl-9 h-9"
            />
          </div>
          <span className="text-xs text-slate-400">
            {filteredImages.length} {filteredImages.length === 1 ? 'imagem' : 'imagens'}
          </span>
        </div>

        {/* Grade de Imagens */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] p-2 bg-slate-950/50 rounded-xl border border-white/5">
          {loading ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="size-8 text-[#C9A961] animate-spin" />
              <p className="text-xs">Carregando catálogo de imagens...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 gap-2 p-8 text-center">
              <ImageIcon className="size-12 stroke-1 text-slate-600 mb-1" />
              <p className="text-sm font-medium text-slate-300">Nenhuma imagem encontrada</p>
              <p className="text-xs max-w-sm text-slate-500">
                {search
                  ? 'Nenhum resultado corresponde à sua pesquisa.'
                  : 'Faça upload da primeira imagem para começar o banco de mídias.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredImages.map((img) => {
                const isSelected = selectedUrl === img.url
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedUrl(img.url)}
                    className={`group relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer bg-slate-900 transition-all ${
                      isSelected
                        ? 'border-[#C9A961] shadow-lg shadow-[#C9A961]/20 scale-[1.02]'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.file_name || 'Imagem'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay com nome do arquivo */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-[10px] text-white truncate opacity-90">
                      {img.file_name || 'Imagem R2'}
                    </div>

                    {/* Ícone de Seleção */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-[#C9A961] text-[#0D1B30] p-1 rounded-full shadow-md">
                        <Check className="size-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Botão de Exclusão do Catálogo */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(img.id, e)}
                      disabled={deletingId === img.id}
                      className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Excluir do catálogo"
                    >
                      {deletingId === img.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé com Seleção e Ações */}
        <DialogFooter className="pt-4 border-t border-white/10 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
            {selectedUrl ? (
              <span className="text-white font-medium">Imagem selecionada</span>
            ) : (
              <span>Selecione uma imagem acima</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedUrl}
              onClick={handleConfirmSelection}
              className="bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-bold text-xs px-5 shadow-sm"
            >
              Usar Imagem
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
