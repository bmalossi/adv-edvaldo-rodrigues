import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getRecentArticles, type Article } from '@/lib/articles'
import { Button } from '@/components/ui/button'

export function ArticlesSection() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getRecentArticles(3)
      .then((data) => {
        if (isMounted) {
          setArticles(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Se não houver nenhum artigo publicado e já concluiu o carregamento, oculta a seção inteira
  if (!loading && articles.length === 0) {
    return null
  }

  return (
    <section className="py-20 lg:py-24 bg-[#FAF9F6] border-t border-slate-200/80">
      <div className="container">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#C9A961]">
              CONTEÚDO JURÍDICO
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0D1B30] tracking-tight">
              Artigos recentes
            </h2>
          </div>

          <Button
            asChild
            variant="outline"
            className="border-slate-300 text-slate-700 hover:text-[#0D1B30] hover:border-[#0D1B30] rounded-lg text-xs sm:text-sm font-medium h-10 px-5 transition-all self-start sm:self-auto"
          >
            <Link to="/conteudo-juridico">
              Ver todos os artigos
              <ArrowRight className="size-4 ml-2 text-slate-600" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Grid de Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse flex flex-col h-96"
              >
                <div className="aspect-[16/10] bg-slate-200" />
                <div className="p-6 space-y-4 flex-1">
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-full bg-slate-200 rounded" />
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
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

                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0D1B30] leading-snug mb-5 line-clamp-2 group-hover:text-[#C9A961] transition-colors">
                      <Link to={`/conteudo-juridico/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>

                    <div className="mt-auto pt-2">
                      <Link
                        to={`/conteudo-juridico/${article.slug}`}
                        className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#0D1B30] group-hover:text-[#C9A961] transition-colors"
                      >
                        Ler artigo
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
      </div>
    </section>
  )
}
