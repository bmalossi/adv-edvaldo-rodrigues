import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getPublishedArticles,
  getAllCategories,
  type Article,
  type Category,
} from '@/lib/articles'
import { SEOHead } from '@/components/site/SEOHead'
import { SEO, buildBreadcrumb, buildLegalServiceSchema } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'

const ARTICLES_PER_PAGE = 9

export default function ConteudoJuridico() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('categoria') || 'todos'
  const currentPage = parseInt(searchParams.get('pagina') || '1', 10)

  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [totalArticles, setTotalArticles] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carrega categorias disponíveis
  useEffect(() => {
    getAllCategories().then(setCategories)
  }, [])

  // Carrega artigos conforme filtro e página
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    getPublishedArticles({
      categorySlug: activeCategory,
      page: currentPage,
      limit: ARTICLES_PER_PAGE,
    })
      .then(({ articles: fetchedArticles, total }) => {
        if (isMounted) {
          setArticles(fetchedArticles)
          setTotalArticles(total)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeCategory, currentPage])

  const totalPages = Math.max(1, Math.ceil(totalArticles / ARTICLES_PER_PAGE))

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams)
    if (slug === 'todos') {
      params.delete('categoria')
    } else {
      params.set('categoria', slug)
    }
    params.set('pagina', '1')
    setSearchParams(params)
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams)
    params.set('pagina', newPage.toString())
    setSearchParams(params)
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  const whatsappUrl = `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
    'Olá, Dr. Edvaldo! Li os artigos no site e gostaria de agendar uma orientação jurídica.'
  )}`

  return (
    <div className="w-full bg-[#FAF9F6] text-[#0D1B30] min-h-screen flex flex-col">
      <SEOHead
        title="Conteúdo Jurídico | Artigos e Orientações — Dr. Edvaldo Rodrigues Ferreira"
        description="Artigos e orientações jurídicas sobre Direito Empresarial, Civil, Família, Trabalhista, Criminal, Previdenciário e Militar. Informação clara para tomada de decisões seguras."
        canonical="/conteudo-juridico"
        jsonLd={[
          buildLegalServiceSchema(),
          buildBreadcrumb([
            { name: 'Início', url: SEO.siteUrl },
            { name: 'Conteúdo Jurídico', url: `${SEO.siteUrl}/conteudo-juridico` },
          ]),
        ]}
      />

      {/* Hero Header */}
      <section className="bg-[#0D1B30] text-white pt-32 pb-20 lg:pt-36 lg:pb-24 border-b border-[#162846]">
        <div className="container max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 border border-[#C9A961]/40 bg-[#0D1B30]/90 px-3.5 py-1 rounded-full text-[11px] uppercase tracking-[0.2em] text-[#C9A961] font-semibold">
            <span>ARTIGOS & ORIENTAÇÕES JURÍDICAS</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Conteúdo Jurídico
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
            Análises práticas, esclarecimento de dúvidas frequentes e diretrizes preventivas preparadas pelo Dr. Edvaldo Rodrigues Ferreira para proteger sua empresa e seus direitos.
          </p>
        </div>
      </section>

      {/* Seção Principal de Conteúdo */}
      <main className="container py-14 lg:py-20 flex-1">
        {/* Filtro por Categorias (Chips) */}
        <div className="mb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none no-scrollbar">
            <button
              onClick={() => handleCategoryChange('todos')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                activeCategory === 'todos'
                  ? 'bg-[#C9A961] text-[#0D1B30] shadow-md shadow-[#C9A961]/20 font-bold'
                  : 'bg-white text-slate-700 hover:text-[#0D1B30] hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos os artigos
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat.slug
                    ? 'bg-[#C9A961] text-[#0D1B30] shadow-md shadow-[#C9A961]/20 font-bold'
                    : 'bg-white text-slate-700 hover:text-[#0D1B30] hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Artigos */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse flex flex-col h-96"
              >
                <div className="aspect-[16/10] bg-slate-200" />
                <div className="p-6 space-y-4 flex-1">
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-full bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 max-w-xl mx-auto p-8 shadow-sm">
            <div className="size-14 rounded-full bg-[#FAF9F6] border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] mx-auto mb-4">
              <BookOpen className="size-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#0D1B30] mb-2">
              Nenhum artigo encontrado nesta categoria
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              Ainda não há publicações cadastradas para o filtro selecionado. Novos conteúdos são adicionados periodicamente.
            </p>
            <Button
              onClick={() => handleCategoryChange('todos')}
              className="bg-[#0D1B30] text-white hover:bg-[#162846] text-xs font-semibold uppercase tracking-wider"
            >
              Ver todos os artigos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => {
              const formattedDate = article.published_at
                ? format(parseISO(article.published_at), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })
                : ''

              return (
                <article
                  key={article.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#C9A961]/70 transition-all duration-300 flex flex-col"
                >
                  <Link
                    to={`/conteudo-juridico/${article.slug}`}
                    className="block aspect-[16/10] w-full overflow-hidden bg-slate-100 relative"
                  >
                    <img
                      src={
                        article.cover_image_url ||
                        'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80'
                      }
                      alt={article.cover_image_alt || article.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {article.category && (
                      <span className="absolute top-4 left-4 bg-[#C9A961] text-[#0D1B30] text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider shadow-sm">
                        {article.category.name}
                      </span>
                    )}
                  </Link>

                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    {formattedDate && (
                      <time
                        dateTime={article.published_at || undefined}
                        className="text-xs text-slate-500 font-medium mb-3 block"
                      >
                        {formattedDate}
                      </time>
                    )}

                    <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0D1B30] leading-snug mb-3 line-clamp-2 group-hover:text-[#C9A961] transition-colors">
                      <Link to={`/conteudo-juridico/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h2>

                    {article.excerpt && (
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mb-6 leading-relaxed">
                        {article.excerpt}
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      <Link
                        to={`/conteudo-juridico/${article.slug}`}
                        className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#0D1B30] group-hover:text-[#C9A961] transition-colors"
                      >
                        Ler artigo completo
                        <ArrowRight
                          className="size-4 ml-1.5 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {!loading && totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="border-slate-300 text-slate-700 hover:text-[#0D1B30] disabled:opacity-40"
            >
              <ChevronLeft className="size-4 mr-1" />
              Anterior
            </Button>

            <span className="text-xs font-semibold text-slate-600 px-3">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border-slate-300 text-slate-700 hover:text-[#0D1B30] disabled:opacity-40"
            >
              Próxima
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        )}
      </main>

      {/* Faixa CTA Institucional */}
      <section className="bg-[#C9A961] text-[#0D1B30] py-10 lg:py-12 mt-12">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0D1B30] leading-tight">
                Precisando de orientação jurídica para sua empresa?
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#1E293B] mt-1">
                Fale com o Dr. Edvaldo Rodrigues Ferreira e descubra como podemos ajudar seu negócio.
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto text-center">
              <Button
                asChild
                className="w-full sm:w-auto bg-[#0D1B30] text-white hover:bg-[#081220] font-semibold text-xs uppercase tracking-wider h-12 px-8 rounded-lg shadow-md transition-all duration-200"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  Fale com um advogado
                  <ArrowRight className="size-4 ml-2 text-[#C9A961]" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
