import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  Image as ImageIcon,
  Undo,
  Redo,
  Upload,
  Loader2,
  Images,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { uploadArticleImage } from '@/lib/storage/uploadImage'
import { ImageLibraryModal } from './ImageLibraryModal'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TipTapEditorProps {
  initialContent?: Record<string, unknown> | string
  onChange: (contentJson: Record<string, unknown>, contentHtml: string) => void
}

export function TipTapEditor({ initialContent, onChange }: TipTapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Dialog de inserção de imagem
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [imageAltInput, setImageAltInput] = useState('')
  const [imageWidthInput, setImageWidthInput] = useState('100%')

  // Dialog de link
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrlInput, setLinkUrlInput] = useState('')

  const editor = useEditor({
    extensions: [
      // StarterKit v3 já inclui: Bold, Italic, Underline, Heading, BulletList,
      // OrderedList, Blockquote, Link, Strike, Code, HardBreak, HorizontalRule.
      // NÃO importar nenhuma dessas extensões separadamente para evitar duplicatas.
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        link: {
          openOnClick: false,
        },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: '100%',
              renderHTML: (attributes) => {
                if (!attributes.width) return {}
                return {
                  width: attributes.width,
                  style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
                }
              },
            },
          }
        },
      }).configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl shadow-md mx-auto block my-6 transition-all',
        },
      }),
      Placeholder.configure({
        placeholder: 'Comece a redigir o corpo do artigo jurídico aqui...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class:
          'min-h-[460px] p-6 focus:outline-none text-slate-200 prose prose-invert max-w-none text-base leading-relaxed focus:ring-0',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as Record<string, unknown>, ed.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  // Helper: foca o editor e executa o comando da toolbar.
  // Resolve problema de perda de foco ao clicar nos botões.
  const cmd = (fn: () => void) => {
    editor.view.focus()
    fn()
  }

  // Ação de upload de imagem
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const result = await uploadArticleImage(file)
    setUploadingImage(false)

    if (e.target) e.target.value = ''

    if (result.url) {
      editor
        .chain()
        .focus()
        .setImage({ src: result.url, alt: file.name, width: imageWidthInput })
        .run()
      toast.success('Imagem inserida no texto com sucesso!')
      setImageDialogOpen(false)
    } else {
      toast.error(result.error || 'Erro ao enviar imagem.')
      if (result.requiresFallback) {
        toast.info(
          'Dica: Como as chaves do Cloudflare R2 ainda não foram configuradas, você pode colar uma URL pública direta.',
          { duration: 6000 }
        )
      }
    }
  }

  const handleInsertImageUrl = () => {
    if (!imageUrlInput) {
      toast.error('Informe a URL da imagem.')
      return
    }
    editor
      .chain()
      .focus()
      .setImage({
        src: imageUrlInput,
        alt: imageAltInput || 'Imagem do artigo',
        width: imageWidthInput,
      })
      .run()
    toast.success('Imagem adicionada!')
    setImageUrlInput('')
    setImageAltInput('')
    setImageDialogOpen(false)
  }

  const handleSetLink = () => {
    if (!linkUrlInput) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrlInput })
        .run()
    }
    setLinkDialogOpen(false)
    setLinkUrlInput('')
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden shadow-xl flex flex-col">
      {/* Input escondido para upload de arquivo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Toolbar */}
      <div className="bg-slate-900/90 border-b border-white/10 p-2 flex flex-wrap items-center gap-1">
        {/* Desfazer / Refazer */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().undo().run())}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-white/10 text-slate-300 disabled:opacity-30 transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().redo().run())}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-white/10 text-slate-300 disabled:opacity-30 transition-colors"
          title="Refazer (Ctrl+Y)"
        >
          <Redo className="size-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Negrito / Itálico / Sublinhado */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleBold().run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleItalic().run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleUnderline().run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive('underline')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon className="size-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Títulos H2 / H3 */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleHeading({ level: 2 }).run())}
          className={`p-2 rounded transition-colors text-xs font-bold ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-[#C9A961] text-[#0D1B30]'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Título H2"
        >
          <Heading2 className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleHeading({ level: 3 }).run())}
          className={`p-2 rounded transition-colors text-xs font-bold ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-[#C9A961] text-[#0D1B30]'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Subtítulo H3"
        >
          <Heading3 className="size-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Alinhamento de Texto */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().setTextAlign('left').run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Alinhar à Esquerda"
        >
          <AlignLeft className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().setTextAlign('center').run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Centralizar Texto"
        >
          <AlignCenter className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().setTextAlign('right').run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Alinhar à Direita"
        >
          <AlignRight className="size-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Listas */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleBulletList().run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Lista com Marcadores"
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleOrderedList().run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Lista Numerada"
        >
          <ListOrdered className="size-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => cmd(() => editor.chain().toggleBlockquote().run())}
          className={`p-2 rounded transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Citação / Destaque"
        >
          <Quote className="size-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Link */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href || ''
            setLinkUrlInput(previousUrl)
            setLinkDialogOpen(true)
          }}
          className={`p-2 rounded transition-colors ${
            editor.isActive('link')
              ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
              : 'hover:bg-white/10 text-slate-300'
          }`}
          title="Inserir / Editar Link"
        >
          <Link2 className="size-4" />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => cmd(() => editor.chain().unsetLink().run())}
            className="p-2 rounded hover:bg-white/10 text-red-400 transition-colors"
            title="Remover Link"
          >
            <Unlink className="size-4" />
          </button>
        )}

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Inserir Imagem */}
        <button
          type="button"
          onClick={() => setImageDialogOpen(true)}
          disabled={uploadingImage}
          className="p-2 rounded hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1.5 text-xs"
          title="Inserir Imagem no Artigo"
        >
          {uploadingImage ? (
            <Loader2 className="size-4 animate-spin text-secondary" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          <span>Inserir imagem</span>
        </button>

        {/* Controles de Tamanho de Imagem */}
        {editor.isActive('image') && (
          <>
            <div className="h-5 w-[1px] bg-white/10 mx-1" />
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/10">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Tamanho:</span>
              {[
                { label: 'Pequena (25%)', val: '25%' },
                { label: 'Média (50%)', val: '50%' },
                { label: 'Grande (75%)', val: '75%' },
                { label: 'Total (100%)', val: '100%' },
              ].map((size) => {
                const currentWidth = editor.getAttributes('image').width || '100%'
                const isCurrent = currentWidth === size.val
                return (
                  <button
                    key={size.val}
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => cmd(() => editor.chain().updateAttributes('image', { width: size.val }).run())}
                    className={`px-2 py-0.5 text-xs rounded transition-colors font-medium ${
                      isCurrent
                        ? 'bg-[#C9A961] text-[#0D1B30] font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={`Definir largura da imagem em ${size.val}`}
                  >
                    {size.val}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Editor Content Body */}
      <div className="flex-1 bg-slate-950/40 cursor-text" onClick={() => editor.chain().focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Dialog para Inserção de Imagem */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ImageIcon className="size-5 text-secondary" />
              Inserir Imagem no Artigo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Opção 1: Selecionar do Banco de Imagens */}
            <div className="p-3.5 rounded-xl border border-[#C9A961]/30 bg-[#C9A961]/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Images className="size-5 text-[#C9A961]" />
                <div>
                  <p className="text-xs font-bold text-white">Banco de Imagens do Escritório</p>
                  <p className="text-[11px] text-slate-300">Reutilize imagens já hospedadas no R2</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setImageDialogOpen(false)
                  setLibraryOpen(true)
                }}
                className="bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-bold text-xs h-8 px-3.5"
              >
                Explorar Banco
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">ou envie nova imagem</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            {/* Upload direto */}
            <div className="p-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-center space-y-3">
              <Upload className="size-8 mx-auto text-secondary" />
              <div>
                <p className="text-sm font-semibold text-white">Upload de arquivo do computador</p>
                <p className="text-xs text-slate-400">JPEG, PNG ou WebP de até 5MB</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Escolher arquivo'
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400">ou insira por URL</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            {/* Inserção por URL */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-300">URL da imagem (Unsplash, CDN, etc)</Label>
                <Input
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://exemplo.com/imagem.webp"
                  className="bg-slate-950/60 border-white/10 text-white mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Texto alternativo (Alt para SEO)</Label>
                <Input
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="Descrição da imagem para acessibilidade"
                  className="bg-slate-950/60 border-white/10 text-white mt-1 text-sm"
                />
              </div>

              {/* Largura da Imagem */}
              <div>
                <Label className="text-xs text-slate-300 block mb-1.5">Tamanho da Imagem no Texto</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Pequena', val: '25%' },
                    { label: 'Média', val: '50%' },
                    { label: 'Grande', val: '75%' },
                    { label: 'Total', val: '100%' },
                  ].map((size) => (
                    <button
                      key={size.val}
                      type="button"
                      onClick={() => setImageWidthInput(size.val)}
                      className={`py-1 px-2 text-xs rounded border transition-all text-center ${
                        imageWidthInput === size.val
                          ? 'border-[#C9A961] bg-[#C9A961] text-[#0D1B30] font-bold shadow-sm'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {size.label} ({size.val})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImageDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleInsertImageUrl}
              disabled={!imageUrlInput}
              className="bg-secondary text-primary font-bold"
            >
              Inserir via URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Inserção de Link */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Link2 className="size-5 text-secondary" />
              Inserir / Editar Link
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Label className="text-xs text-slate-300">URL de destino</Label>
            <Input
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
              placeholder="https://exemplo.com.br"
              className="bg-slate-950/60 border-white/10 text-white text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLinkDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSetLink}
              className="bg-secondary text-primary font-bold"
            >
              Aplicar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Banco de Imagens R2 */}
      <ImageLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Inserir Imagem do Banco no Artigo"
        onSelectImage={(url, fileName) => {
          editor
            .chain()
            .focus()
            .setImage({ src: url, alt: fileName || 'Imagem do artigo' })
            .run()
          toast.success('Imagem inserida no artigo!')
        }}
      />
    </div>
  )
}
