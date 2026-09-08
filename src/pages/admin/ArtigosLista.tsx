import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit2,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  Calendar,
  Filter,
  FileText,
  Loader2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getAdminArticles,
  getAllCategories,
  deleteArticle,
  duplicateArticle,
  getArticleStatus,
  type Article,
  type Category,
  type ArticleStatus,
} from '@/lib/articles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function ArtigosLista() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros locais
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')

  // Estado para modal de confirmação de exclusão
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [arts, cats] = await Promise.all([getAdminArticles(), getAllCategories()])
      setArticles(arts)
      setCategories(cats)
    } catch {
      toast.error('Erro ao carregar lista de artigos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // Filtro de texto
      const matchesSearch =
        art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.slug.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro de categoria
      const matchesCategory =
        selectedCategory === 'todos' || art.category_id === selectedCategory

      // Filtro de status
      const status = getArticleStatus(art.published_at)
      const matchesStatus =
        selectedStatus === 'todos' || status === selectedStatus

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [articles, searchTerm, selectedCategory, selectedStatus])

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id)
    try {
      const duplicated = await duplicateArticle(id)
      if (duplicated) {
        toast.success('Artigo duplicado com sucesso como rascunho!')
        await loadData()
      } else {
        toast.error('Não foi possível duplicar o artigo.')
      }
    } catch {
      toast.error('Erro ao processar duplicação.')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return
    setDeleting(true)
    try {
      const success = await deleteArticle(articleToDelete.id)
      if (success) {
        toast.success(`Artigo "${articleToDelete.title}" excluído com sucesso.`)
        setArticles((prev) => prev.filter((a) => a.id !== articleToDelete.id))
      } else {
        toast.error('Falha ao excluir o artigo.')
      }
    } catch {
      toast.error('Erro inesperado ao excluir o artigo.')
    } finally {
      setDeleting(false)
      setArticleToDelete(null)
    }
  }

  const renderStatusBadge = (status: ArticleStatus, publishedAt: string | null) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Publicado
          </span>
        )
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span className="size-1.5 rounded-full bg-sky-400" />
            Agendado
          </span>
        )
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="size-1.5 rounded-full bg-slate-400" />
            Rascunho
          </span>
        )
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileText className="size-7 text-secondary" />
            Conteúdo Jurídico — Artigos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie, redija e agende as publicações jurídicas institucionais do escritório.
          </p>
        </div>

        <Button
          asChild
          className="bg-secondary text-primary hover:bg-secondary/90 font-bold shadow-lg shadow-secondary/10"
        >
          <Link to="/admin/artigos/novo">
            <Plus className="size-4 mr-2" />
            Novo Artigo
          </Link>
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
        {/* Busca por texto */}
        <div className="sm:col-span-6 relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por título ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filtro por Categoria */}
        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-slate-900/60 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="todos">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Status */}
        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-slate-900/60 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="todos">Todos os status</option>
            <option value="published">Publicados</option>
            <option value="scheduled">Agendados</option>
            <option value="draft">Rascunhos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Artigos */}
      <div className="bg-slate-900/40 rounded-xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="size-8 animate-spin mx-auto text-secondary" />
            <p className="text-sm">Carregando artigos...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-4">
            <FileText className="size-12 mx-auto text-slate-600" />
            <div>
              <p className="text-base font-semibold text-white">Nenhum artigo encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os termos de busca ou filtros selecionados.
              </p>
            </div>
            {articles.length === 0 && (
              <Button asChild size="sm" className="bg-secondary text-primary font-bold">
                <Link to="/admin/artigos/novo">
                  <Plus className="size-3.5 mr-1" /> Criar primeiro artigo
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Título / Slug</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Categoria</th>
                  <th className="py-3.5 px-4 font-semibold">Data</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Views</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredArticles.map((article) => {
                  const status = getArticleStatus(article.published_at)
                  const dateDisplay = article.published_at
                    ? format(parseISO(article.published_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                    : 'Não agendado'

                  return (
                    <tr
                      key={article.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Título & Slug */}
                      <td className="py-4 px-4 max-w-md">
                        <Link
                          to={`/admin/artigos/${article.id}/editar`}
                          className="font-bold text-white hover:text-secondary transition-colors line-clamp-1 block text-[15px]"
                        >
                          {article.title}
                        </Link>
                        <span className="text-xs text-slate-500 font-mono line-clamp-1 mt-0.5">
                          /{article.slug}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {renderStatusBadge(status, article.published_at)}
                      </td>

                      {/* Categoria */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {article.category ? (
                          <span className="text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                            {article.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400">
                        {dateDisplay}
                      </td>

                      {/* Views */}
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300">
                          <Eye className="size-3.5 text-slate-500" />
                          {article.view_count || 0}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Visualizar */}
                          <a
                            href={`/conteudo-juridico/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            title="Visualizar artigo"
                          >
                            <ExternalLink className="size-4" />
                          </a>

                          {/* Editar */}
                          <Link
                            to={`/admin/artigos/${article.id}/editar`}
                            className="p-1.5 text-slate-400 hover:text-secondary hover:bg-white/10 rounded-md transition-colors"
                            title="Editar artigo"
                          >
                            <Edit2 className="size-4" />
                          </Link>

                          {/* Duplicar */}
                          <button
                            onClick={() => handleDuplicate(article.id)}
                            disabled={duplicatingId === article.id}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                            title="Duplicar artigo"
                          >
                            {duplicatingId === article.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => setArticleToDelete(article)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Excluir artigo"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão de artigo</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza de que deseja excluir o artigo{' '}
              <strong className="text-white">"{articleToDelete?.title}"</strong>? Esta ação é irreversível e removerá a publicação do site e do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white hover:bg-white/20 border-none">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
              {deleting ? 'Excluindo...' : 'Excluir artigo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
