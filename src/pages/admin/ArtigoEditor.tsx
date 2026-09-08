import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Calendar,
  Image as ImageIcon,
  Lock,
  Unlock,
  Plus,
  X,
  Clock,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Images,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  getArticleById,
  getAllCategories,
  getAllTags,
  createTag,
  saveArticle,
  getArticleStatus,
  type Article,
  type Category,
  type Tag,
} from '@/lib/articles'
import { useAuth } from '@/hooks/useAuth'
import { TipTapEditor } from '@/components/admin/TipTapEditor'
import { ImageLibraryModal } from '@/components/admin/ImageLibraryModal'
import { uploadArticleImage } from '@/lib/storage/uploadImage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function ArtigoEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { advogado } = useAuth()

  const isEditing = Boolean(id)

  // Estados principais
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [initialLoadedContent, setInitialLoadedContent] = useState<Record<string, unknown> | null>(null)

  // Dados do formulário
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugLocked, setIsSlugLocked] = useState(isEditing)
  const [isSlugCustomized, setIsSlugCustomized] = useState(isEditing)
  const [excerpt, setExcerpt] = useState('')
  const [contentJson, setContentJson] = useState<Record<string, unknown>>({})
  const [contentHtml, setContentHtml] = useState('')

  // Metadados
  const [categoryId, setCategoryId] = useState<string>('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverImageAlt, setCoverImageAlt] = useState('')
  const [authorName, setAuthorName] = useState(advogado?.nome || 'Dr. Edvaldo Rodrigues Ferreira')
  const [authorOab, setAuthorOab] = useState(advogado?.oab || 'OAB/SP nº 465.818')

  // SEO
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoOpen, setSeoOpen] = useState(false)

  // Publicação e Agendamento
  const [publishMode, setPublishMode] = useState<'draft' | 'now' | 'schedule'>('draft')
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('')

  // Dados auxiliares
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverLibraryOpen, setCoverLibraryOpen] = useState(false)

  // Carrega categorias e tags
  useEffect(() => {
    Promise.all([getAllCategories(), getAllTags()]).then(([cats, tgs]) => {
      setCategories(cats)
      setAvailableTags(tgs)
      if (!isEditing && cats.length > 0) {
        setCategoryId(cats[0].id)
      }
    })
  }, [isEditing])

  // Carrega artigo para edição
  useEffect(() => {
    if (!id) return

    setLoading(true)
    getArticleById(id)
      .then((art) => {
        if (!art) {
          toast.error('Artigo não encontrado.')
          navigate('/admin/artigos')
          return
        }

        setTitle(art.title)
        setSlug(art.slug)
        setExcerpt(art.excerpt || '')
        setContentJson(art.content || {})
        setContentHtml(art.content_html || '')
        setInitialLoadedContent(art.content || art.content_html || null)
        setCategoryId(art.category_id || '')
        setSelectedTagIds(art.tags?.map((t) => t.id) || [])
        setCoverImageUrl(art.cover_image_url || '')
        setCoverImageAlt(art.cover_image_alt || '')
        setAuthorName(art.author_name)
        setAuthorOab(art.author_oab || '')
        setSeoTitle(art.seo_title || '')
        setSeoDescription(art.seo_description || '')

        // Determina modo de publicação
        const status = getArticleStatus(art.published_at)
        if (status === 'draft') {
          setPublishMode('draft')
        } else if (status === 'scheduled' && art.published_at) {
          setPublishMode('schedule')
          // Formata data para datetime-local
          try {
            const d = new Date(art.published_at)
            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
            setScheduledDateTime(localIso)
          } catch {
            setScheduledDateTime('')
          }
        } else {
          setPublishMode('now')
        }
      })
      .catch(() => {
        toast.error('Erro ao carregar dados do artigo.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, navigate])

  // Gerador de slug a partir do título
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isSlugLocked && !isSlugCustomized) {
      setSlug(generateSlug(val))
    }
  }

  // Estimativa de tempo de leitura
  const readingTime = useMemo(() => {
    const textOnly = contentHtml.replace(/<[^>]*>/g, ' ')
    const words = textOnly.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
  }, [contentHtml])

  // Adição de nova tag
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return
    const created = await createTag(newTagInput.trim())
    if (created) {
      if (!availableTags.some((t) => t.id === created.id)) {
        setAvailableTags((prev) => [...prev, created])
      }
      if (!selectedTagIds.includes(created.id)) {
        setSelectedTagIds((prev) => [...prev, created.id])
      }
      setNewTagInput('')
      toast.success(`Tag "${created.name}" adicionada!`)
    }
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  // Upload de Imagem de Capa
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    const result = await uploadArticleImage(file)
    setUploadingCover(false)

    if (e.target) e.target.value = ''

    if (result.url) {
      setCoverImageUrl(result.url)
      toast.success('Imagem de capa enviada com sucesso!')
    } else {
      toast.error(result.error || 'Erro no upload da capa.')
      if (result.requiresFallback) {
        toast.info('Você também pode colar o link direto da imagem no campo abaixo.')
      }
    }
  }

  // Salvar artigo (Rascunho, Publicado ou Agendado)
  const performSave = async (overrideMode?: 'draft' | 'now' | 'schedule') => {
    if (!title.trim()) {
      toast.error('O título do artigo é obrigatório.')
      return null
    }

    const currentSlug = slug.trim() || generateSlug(title)
    if (!currentSlug) {
      toast.error('O slug do artigo é obrigatório.')
      return null
    }

    const mode = overrideMode || publishMode

    // Se for publicar, validar capa alt
    if (mode !== 'draft' && coverImageUrl && !coverImageAlt.trim()) {
      toast.error('O texto alternativo da imagem de capa é obrigatório para publicação.')
      return null
    }

    let publishedAtIso: string | null = null
    if (mode === 'now') {
      publishedAtIso = new Date().toISOString()
    } else if (mode === 'schedule') {
      if (!scheduledDateTime) {
        toast.error('Informe a data e hora para o agendamento.')
        return null
      }
      publishedAtIso = new Date(scheduledDateTime).toISOString()
    }

    setSaving(true)

    const payload: Partial<Article> = {
      ...(id ? { id } : {}),
      title: title.trim(),
      slug: currentSlug,
      excerpt: excerpt.trim() || null,
      content: contentJson,
      content_html: contentHtml,
      cover_image_url: coverImageUrl.trim() || null,
      cover_image_alt: coverImageAlt.trim() || null,
      category_id: categoryId || null,
      author_name: authorName.trim() || 'Dr. Edvaldo Rodrigues Ferreira',
      author_oab: authorOab.trim() || 'OAB/SP nº 465.818',
      advogado_id: advogado?.id || null,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      reading_time_minutes: readingTime,
      published_at: publishedAtIso,
    }

    try {
      const saved = await saveArticle(payload, selectedTagIds)
      setSaving(false)

      if (saved) {
        setIsSlugLocked(true)
        return saved
      } else {
        toast.error('Erro ao salvar artigo no banco de dados.')
        return null
      }
    } catch {
      setSaving(false)
      toast.error('Erro inesperado ao salvar.')
      return null
    }
  }

  const handleSaveDraft = async () => {
    const saved = await performSave('draft')
    if (saved) {
      setPublishMode('draft')
      toast.success('Rascunho salvo com sucesso!')
      if (!id) {
        navigate(`/admin/artigos/${saved.id}/editar`, { replace: true })
      }
    }
  }

  const handlePublishOrSchedule = async () => {
    const saved = await performSave()
    if (saved) {
      if (publishMode === 'now') {
        toast.success('Artigo publicado com sucesso!')
      } else if (publishMode === 'schedule') {
        toast.success('Artigo agendado com sucesso!')
      } else {
        toast.success('Rascunho salvo!')
      }
      if (!id) {
        navigate(`/admin/artigos/${saved.id}/editar`, { replace: true })
      }
    }
  }

  // Visualizar: salva como rascunho automaticamente e abre em nova aba
  const handlePreview = async () => {
    const saved = await performSave(publishMode === 'now' ? 'now' : 'draft')
    if (saved) {
      toast.info('Abrindo pré-visualização em nova aba...')
      window.open(`/conteudo-juridico/${saved.slug}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <Loader2 className="size-8 animate-spin mx-auto text-secondary" />
        <p className="text-sm">Carregando editor...</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Barra de Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/artigos"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Voltar para a lista"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isEditing ? 'Editar Artigo' : 'Novo Artigo Jurídico'}
            </h1>
            <p className="text-xs text-slate-400">
              {isEditing ? `Editando ID: ${id}` : 'Redija e publique orientações para o site'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Visualizar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={saving}
            className="border-white/10 text-slate-200 hover:bg-white/10 text-xs"
          >
            <Eye className="size-3.5 mr-1.5" />
            Visualizar
          </Button>

          {/* Botão Salvar Rascunho */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={saving}
            className="border-white/10 text-slate-200 hover:bg-white/10 text-xs"
          >
            <Save className="size-3.5 mr-1.5" />
            Salvar Rascunho
          </Button>

          {/* Botão Ação Principal */}
          <Button
            type="button"
            size="sm"
            onClick={handlePublishOrSchedule}
            disabled={saving}
            className="bg-secondary text-primary hover:bg-secondary/90 font-bold text-xs shadow-md shadow-secondary/10"
          >
            {saving ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="size-3.5 mr-1.5" />
            )}
            {publishMode === 'schedule'
              ? 'Agendar Publicação'
              : publishMode === 'now'
              ? 'Publicar Agora'
              : 'Salvar Artigo'}
          </Button>
        </div>
      </div>

      {/* Grid Principal do Editor (2 Colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Principal (8 Colunas) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Título Principal */}
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Digite o título do artigo aqui..."
              className="bg-slate-900/60 border-white/10 text-white font-serif text-2xl sm:text-3xl font-bold py-6 px-4 rounded-xl placeholder:text-slate-600 focus-visible:ring-secondary"
            />

            {/* Controle de Slug com Trava */}
            <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Link permanente:</span>
              <span className="font-mono text-slate-300">/conteudo-juridico/</span>
              {isSlugLocked ? (
                <span className="font-mono font-bold text-secondary">{slug || '...'}</span>
              ) : (
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value))
                    setIsSlugCustomized(true)
                  }}
                  placeholder="slug-do-artigo"
                  className="h-7 w-60 py-0 px-2 bg-slate-950/60 border-white/20 text-white font-mono text-xs rounded"
                />
              )}
              <button
                type="button"
                onClick={() => setIsSlugLocked(!isSlugLocked)}
                className="p-1 hover:text-white transition-colors"
                title={isSlugLocked ? 'Editar slug' : 'Bloquear slug'}
              >
                {isSlugLocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Resumo / Excerpt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <Label className="text-xs text-slate-300 font-semibold">Resumo (Excerpt)</Label>
              <span>{excerpt.length}/220 caracteres</span>
            </div>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Breve introdução do tema para exibição nos cards e motores de busca..."
              rows={3}
              maxLength={220}
              className="bg-slate-900/60 border-white/10 text-white text-sm placeholder:text-slate-600 rounded-xl resize-none"
            />
          </div>

          {/* Editor TipTap */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-semibold px-1">Corpo do Artigo</Label>
            <TipTapEditor
              initialContent={initialLoadedContent || undefined}
              onChange={(json, html) => {
                setContentJson(json)
                setContentHtml(html)
              }}
            />
          </div>
        </div>

        {/* Coluna Lateral (4 Colunas) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Caixa de Publicação */}
          <div className="bg-slate-900/60 rounded-xl border border-white/10 p-5 space-y-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/10 pb-3 flex items-center justify-between">
              <span>Publicação</span>
              <span className="flex items-center gap-1 text-[11px] text-secondary font-normal lowercase">
                <Clock className="size-3" /> {readingTime} min de leitura
              </span>
            </h3>

            {/* Status / Modo */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Status da Publicação</Label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPublishMode('draft')}
                  className={`py-1.5 rounded transition-all ${
                    publishMode === 'draft'
                      ? 'bg-secondary text-primary font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`py-1.5 rounded transition-all ${
                    publishMode === 'now'
                      ? 'bg-secondary text-primary font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Publicar
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  className={`py-1.5 rounded transition-all ${
                    publishMode === 'schedule'
                      ? 'bg-secondary text-primary font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Agendar
                </button>
              </div>
            </div>

            {/* Data e hora se Agendado */}
            {publishMode === 'schedule' && (
              <div className="space-y-1.5 bg-sky-500/10 p-3 rounded-lg border border-sky-500/20 text-xs">
                <Label className="text-sky-300 font-semibold flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Data e Hora de Lançamento
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="bg-slate-900 border-white/20 text-white text-xs mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  O artigo será visível publicamente a partir desse horário.
                </p>
              </div>
            )}

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Categoria</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-950/60 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Tags</Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950/40 rounded-lg border border-white/5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-secondary text-primary font-bold shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>

              {/* Criar nova tag */}
              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Nova tag..."
                  className="h-8 text-xs bg-slate-950/60 border-white/10 text-white"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddTag}
                  className="h-8 px-2 text-xs border-white/10 text-slate-300 hover:bg-white/10"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Imagem de Capa */}
          <div className="bg-slate-900/60 rounded-xl border border-white/10 p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <ImageIcon className="size-4 text-secondary" />
              Imagem de Capa
            </h3>

            {coverImageUrl ? (
              <div className="space-y-3">
                <div className="aspect-[16/9] rounded-lg overflow-hidden border border-white/10 relative group bg-slate-950">
                  <img src={coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageUrl('')
                      setCoverImageAlt('')
                    }}
                    className="absolute top-2 right-2 bg-red-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover capa"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Texto Alternativo (Alt para SEO) *</Label>
                  <Input
                    value={coverImageAlt}
                    onChange={(e) => setCoverImageAlt(e.target.value)}
                    placeholder="Descrição para leitores de tela e Google..."
                    className="bg-slate-950/60 border-white/10 text-white text-xs mt-1"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Opção Banco de Imagens */}
                <div className="p-3 rounded-lg border border-[#C9A961]/30 bg-[#C9A961]/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Images className="size-4 text-[#C9A961]" />
                    <span className="text-xs font-bold text-white">Banco de Imagens</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCoverLibraryOpen(true)}
                    className="bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-bold text-xs h-7 px-3"
                  >
                    Selecionar do Banco
                  </Button>
                </div>

                <div className="text-center text-[10px] text-slate-500 uppercase tracking-wider">ou envie novo arquivo</div>

                <label className="border border-dashed border-white/20 hover:border-secondary/60 rounded-xl p-4 block text-center cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                  <input
                    type="file"
                    onChange={handleCoverUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  {uploadingCover ? (
                    <Loader2 className="size-6 mx-auto text-secondary animate-spin" />
                  ) : (
                    <ImageIcon className="size-6 mx-auto text-slate-500" />
                  )}
                  <p className="text-xs font-semibold text-white mt-1.5">
                    {uploadingCover ? 'Enviando imagem...' : 'Clique para selecionar arquivo'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG ou WebP até 5MB</p>
                </label>

                <div className="text-center text-[10px] text-slate-500 uppercase tracking-wider">ou cole a URL direta</div>

                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/capa.webp"
                  className="bg-slate-950/60 border-white/10 text-white text-xs"
                />
              </div>
            )}
          </div>

          {/* Bloco de SEO (Colapsável) */}
          <div className="bg-slate-900/60 rounded-xl border border-white/10 p-5 shadow-lg space-y-3">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider text-white"
            >
              <span className="flex items-center gap-2">
                <Globe className="size-4 text-secondary" />
                Configurações de SEO
              </span>
              {seoOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {seoOpen && (
              <div className="space-y-4 pt-3 border-t border-white/10 text-xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <Label className="text-xs text-slate-300">Título SEO</Label>
                    <span>{seoTitle.length}/60</span>
                  </div>
                  <Input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Título otimizado para o Google...'}
                    maxLength={70}
                    className="bg-slate-950/60 border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <Label className="text-xs text-slate-300">Meta Descrição</Label>
                    <span>{seoDescription.length}/155</span>
                  </div>
                  <Textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder={excerpt || 'Descrição concisa para os resultados do Google...'}
                    maxLength={160}
                    rows={3}
                    className="bg-slate-950/60 border-white/10 text-white text-xs resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Autoria */}
          <div className="bg-slate-900/60 rounded-xl border border-white/10 p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/10 pb-3">
              Autoria do Artigo
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs text-slate-300">Nome do Autor</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-white text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Inscrição na OAB</Label>
                <Input
                  value={authorOab}
                  onChange={(e) => setAuthorOab(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-white text-xs mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Banco de Imagens para a Capa */}
      <ImageLibraryModal
        open={coverLibraryOpen}
        onClose={() => setCoverLibraryOpen(false)}
        title="Selecionar Imagem de Capa do Banco"
        onSelectImage={(url, fileName) => {
          setCoverImageUrl(url)
          if (!coverImageAlt && fileName) {
            // Sugere nome limpo do arquivo como texto alt inicial
            const cleanAlt = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
            setCoverImageAlt(cleanAlt)
          }
          toast.success('Imagem de capa selecionada!')
        }}
      />
    </div>
  )
}
