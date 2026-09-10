import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Calendar, ShieldCheck, ArrowRight, BookOpen, Edit3, Share2, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DOMPurify from 'dompurify'
import {
  getArticleBySlug,
  getRelatedArticles,
  incrementArticleViews,
  getArticleStatus,
  type Article,
} from '@/lib/articles'
import { useAuth } from '@/hooks/useAuth'
import { SEOHead } from '@/components/site/SEOHead'
import { SEO, buildBreadcrumb, buildArticleSchema } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import { toast } from 'sonner'

export default function ArtigoDetalhe() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) return
    let isMounted = true
    setLoading(true)

    getArticleBySlug(slug)
      .then((data) => {
        if (!isMounted) return
        setArticle(data)
        setLoading(false)

        if (data) {
          // Incrementa visualização se publicado
          const status = getArticleStatus(data.published_at)
          if (status === 'published') {
            incrementArticleViews(data.id)
          }

          // Carrega artigos relacionados da mesma categoria
          if (data.category_id) {
            getRelatedArticles(data.category_id, data.id, 3).then((related) => {
              if (isMounted) setRelatedArticles(related)
            })
          }
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [slug])

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: article?.title,
          text: article?.excerpt || undefined,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Link copiado para a área de transferência!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Estado de carregamento
  if (loading) {
    return (
      <div className="w-full bg-[#FAF9F6] min-h-screen pt-32 pb-20">
        <div className="container max-w-4xl space-y-8 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-200 rounded" />
          <div className="h-6 w-2/3 bg-slate-200 rounded" />
          <div className="aspect-[21/9] w-full bg-slate-200 rounded-2xl" />
          <div className="space-y-4 pt-6">
            <div className="h-4 w-full bg-slate-200 rounded" />
            <div className="h-4 w-5/6 bg-slate-200 rounded" />
            <div className="h-4 w-4/6 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Se não encontrou artigo
  if (!article) {
    return (
      <div className="w-full bg-[#FAF9F6] min-h-screen pt-36 pb-20 flex items-center justify-center">
        <div className="container max-w-md text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <BookOpen className="size-12 text-[#C9A961] mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold text-[#0D1B30] mb-2">Artigo não encontrado</h1>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            O conteúdo que você tentou acessar não existe ou foi removido.
          </p>
          <Button asChild className="bg-[#0D1B30] text-white hover:bg-[#162846] text-xs font-semibold uppercase tracking-wider">
            <Link to="/conteudo-juridico">Voltar para Conteúdo Jurídico</Link>
          </Button>
        </div>
      </div>
    )
  }

  const articleStatus = getArticleStatus(article.published_at)

  // Proteção de Rascunho / Agendado: se o usuário não for admin, responde como 404
  if (articleStatus !== 'published' && !user) {
    return (
      <div className="w-full bg-[#FAF9F6] min-h-screen pt-36 pb-20 flex items-center justify-center">
        <div className="container max-w-md text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <BookOpen className="size-12 text-[#C9A961] mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold text-[#0D1B30] mb-2">Artigo indisponível</h1>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            Esta publicação não está acessível publicamente no momento.
          </p>
          <Button asChild className="bg-[#0D1B30] text-white hover:bg-[#162846] text-xs font-semibold uppercase tracking-wider">
            <Link to="/conteudo-juridico">Ver artigos disponíveis</Link>
          </Button>
        </div>
      </div>
    )
  }

  const formattedDate = article.published_at
    ? format(parseISO(article.published_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Rascunho não publicado'

  const sanitizedContent = DOMPurify.sanitize(article.content_html || '', {
    ADD_ATTR: ['style', 'width', 'loading'],
  })

  const whatsappUrl = `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
    `Olá, Dr. Edvaldo! Gostaria de tirar dúvidas sobre o artigo "${article.title}".`
  )}`

  return (
    <div className="w-full bg-[#FAF9F6] text-[#0D1B30] min-h-screen flex flex-col">
      <SEOHead
        title={`${article.seo_title || article.title} | Dr. Edvaldo Rodrigues Ferreira`}
        description={article.seo_description || article.excerpt || ''}
        canonical={`/conteudo-juridico/${article.slug}`}
        image={article.cover_image_url || undefined}
        articleMeta={{
          publishedTime: article.published_at,
          modifiedTime: article.updated_at || article.published_at,
          author: article.author_name,
          section: article.category?.name || 'Direito',
          tags: article.tags?.map((t) => t.name) || [],
        }}
        jsonLd={[
          buildArticleSchema({
            title: article.title,
            description: article.excerpt || article.seo_description || '',
            slug: article.slug,
            datePublished: article.published_at,
            dateModified: article.updated_at,
            imageUrl: article.cover_image_url,
            authorName: article.author_name,
            categoryName: article.category?.name,
            tags: article.tags?.map((t) => t.name),
          }),
          buildBreadcrumb([
            { name: 'Início', url: SEO.siteUrl },
            { name: 'Conteúdo Jurídico', url: `${SEO.siteUrl}/conteudo-juridico` },
            { name: article.title, url: `${SEO.siteUrl}/conteudo-juridico/${article.slug}` },
          ]),
        ]}
      />

      {/* Fallback semântico para motores de busca e crawlers de IA sem suporte a JavaScript */}
      <noscript>
        <div className="container max-w-4xl py-6 my-4 bg-amber-50 border border-amber-200 rounded-lg text-slate-800">
          <h1 className="font-serif text-2xl font-bold mb-2">{article.title}</h1>
          {article.excerpt && <p className="text-slate-600 mb-4">{article.excerpt}</p>}
          <p className="text-xs text-slate-500">
            Publicação jurídica por {article.author_name} ({article.author_oab || 'OAB/SP nº 465.818'}).
          </p>
        </div>
      </noscript>

      {/* Banner de Pré-visualização para Admin */}
      {articleStatus !== 'published' && user && (
        <aside
          aria-label="Aviso de pré-visualização"
          className="bg-amber-500 text-slate-950 px-4 py-3 sticky top-20 z-40 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold"
        >
          <div className="container flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-slate-950 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {articleStatus === 'draft' ? 'Rascunho' : 'Agendado'}
              </span>
              <span>
                {articleStatus === 'draft'
                  ? 'Modo de Pré-visualização: Este artigo é um rascunho e NÃO está visível para o público externo.'
                  : `Modo de Pré-visualização: Publicação agendada para ${formattedDate}.`}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              asChild
              className="bg-slate-950 text-white hover:bg-slate-900 border-none text-xs font-bold h-8"
            >
              <Link to={`/admin/artigos/${article.id}/editar`}>
                <Edit3 className="size-3.5 mr-1.5" />
                Voltar ao Editor
              </Link>
            </Button>
          </div>
        </aside>
      )}

      {/* Cabeçalho do Artigo */}
      <header className="bg-[#0D1B30] text-white pt-24 pb-10 lg:pt-28 lg:pb-12 border-b border-[#162846]">
        <div className="container max-w-4xl space-y-4">
          <Link
            to="/conteudo-juridico"
            className="inline-flex items-center text-xs text-slate-300 hover:text-[#C9A961] transition-colors"
          >
            <ArrowLeft className="size-3.5 mr-1.5" />
            Voltar para Conteúdo Jurídico
          </Link>

          {/* Categoria Badge */}
          {article.category && (
            <div>
              <span className="inline-flex items-center bg-[#C9A961] text-[#0D1B30] text-[11px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider shadow-sm">
                {article.category.name}
              </span>
            </div>
          )}

          {/* Título Principal H1 */}
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-[1.2]">
            {article.title}
          </h1>

          {/* Metadados: Autor, OAB, Data, Tempo de Leitura */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-[#C9A961] text-[#0D1B30] font-bold flex items-center justify-center text-xs">
                  {article.author_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm leading-tight">
                    {article.author_name}
                  </p>
                  <p className="text-[11px] text-[#C9A961] leading-tight font-medium">
                    {article.author_oab || 'OAB/SP nº 465.818'}
                  </p>
                </div>
              </div>

              <span className="text-white/20 hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                <Calendar className="size-3.5 text-[#C9A961]" />
                <time dateTime={article.published_at || undefined}>{formattedDate}</time>
              </div>

              <span className="text-white/20 hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                <Clock className="size-3.5 text-[#C9A961]" />
                <span>{article.reading_time_minutes || 4} min de leitura</span>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
              <span>{copied ? 'Copiado' : 'Compartilhar'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo do Artigo */}
      <main className="container max-w-4xl py-8 lg:py-12 flex-1">
        {/* Imagem de Capa em Destaque */}
        {article.cover_image_url && (
          <div className="mb-10 rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 aspect-[16/9] sm:aspect-[21/9] max-h-[460px]">
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt || article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Resumo/Excerpt em destaque */}
        {article.excerpt && (
          <div className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed mb-8 pb-6 border-b border-slate-200 italic">
            {article.excerpt}
          </div>
        )}

        {/* Renderização do Corpo do Artigo Sanitizado com Tipografia Rica */}
        <article
          className="prose prose-slate lg:prose-lg max-w-none text-slate-700 leading-relaxed
            [&_p]:min-h-[1.5em] [&_p:empty]:min-h-[1.5em] [&_p]:my-4 [&_p]:leading-relaxed
            prose-headings:font-serif prose-headings:text-[#0D1B30] prose-headings:tracking-tight prose-headings:font-bold
            prose-h2:text-2xl prose-h2:sm:text-3xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:sm:text-2xl prose-h3:mt-6 prose-h3:mb-3
            prose-a:text-[#C9A961] prose-a:font-semibold prose-a:underline hover:prose-a:text-[#B8935A]
            prose-blockquote:border-l-4 prose-blockquote:border-[#C9A961] prose-blockquote:bg-amber-50/60 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:my-6
            prose-ul:list-disc prose-ol:list-decimal prose-li:my-1
            prose-img:rounded-xl prose-img:shadow-md prose-img:my-8"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Tags do Artigo */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
              Tags relacionadas:
            </span>
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-md border border-slate-200"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Caixa de Autoria ao Final */}
        <div className="mt-14 p-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="size-16 rounded-full bg-[#0D1B30] text-[#C9A961] border-2 border-[#C9A961] flex items-center justify-center font-serif text-2xl font-bold shrink-0">
            {article.author_name.charAt(0)}
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="font-serif text-lg font-bold text-[#0D1B30]">
                {article.author_name}
              </h3>
              <span className="text-xs text-[#C9A961] font-semibold bg-[#0D1B30] px-2.5 py-0.5 rounded">
                {article.author_oab || 'OAB/SP nº 465.818'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Advogado atuante com atendimento consultivo e contencioso em Praia Grande/SP e região. Especialista em estratégias jurídicas personalizadas com foco em resultados concretos e segurança para empresas e pessoas.
            </p>
          </div>
        </div>

        {/* Artigos Relacionados */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl font-bold text-[#0D1B30]">
                Artigos relacionados
              </h2>
              <Link
                to={`/conteudo-juridico?categoria=${article.category?.slug}`}
                className="text-xs sm:text-sm font-semibold text-[#C9A961] hover:underline"
              >
                Ver mais em {article.category?.name} →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/conteudo-juridico/${rel.slug}`}
                  className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-[#C9A961]/70 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-[16/10] w-full rounded-lg overflow-hidden mb-3 bg-slate-100">
                    <img
                      src={
                        rel.cover_image_url ||
                        'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80'
                      }
                      alt={rel.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="font-serif text-sm font-bold text-[#0D1B30] group-hover:text-[#C9A961] transition-colors line-clamp-2 mb-2">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 mt-auto">
                    {rel.reading_time_minutes || 4} min de leitura
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Faixa CTA Institucional Final */}
      <section className="bg-[#C9A961] text-[#0D1B30] py-10 lg:py-12 mt-8">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0D1B30] leading-tight">
                Precisando de orientação jurídica para sua empresa?
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#1E293B] mt-1">
                Fale com o escritório e descubra como podemos ajudar.
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
