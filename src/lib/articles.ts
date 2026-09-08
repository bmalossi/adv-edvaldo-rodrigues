import { supabase } from './supabase'

export type Category = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type Tag = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type ArticleStatus = 'draft' | 'scheduled' | 'published'

export type Article = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: Record<string, unknown>
  content_html: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
  category_id: string | null
  category?: Category | null
  author_name: string
  author_oab: string | null
  author_avatar_url: string | null
  advogado_id: string | null
  seo_title: string | null
  seo_description: string | null
  reading_time_minutes: number
  view_count: number
  published_at: string | null
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export function getArticleStatus(publishedAt: string | null): ArticleStatus {
  if (!publishedAt) return 'draft'
  const pubDate = new Date(publishedAt).getTime()
  const now = Date.now()
  if (pubDate > now) return 'scheduled'
  return 'published'
}

/**
 * Busca os artigos publicados mais recentes para a vitrine pública da Home
 */
export async function getRecentArticles(limit = 3): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*, category:categories(*)')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[articles] Erro ao buscar artigos recentes:', error.message)
      return []
    }
    return (data as Article[]) || []
  } catch (err) {
    console.warn('[articles] Falha na requisição de artigos recentes:', err)
    return []
  }
}

/**
 * Busca artigos publicados com filtro por categoria e paginação
 */
export async function getPublishedArticles({
  categorySlug,
  page = 1,
  limit = 9,
}: {
  categorySlug?: string
  page?: number
  limit?: number
} = {}): Promise<{ articles: Article[]; total: number }> {
  try {
    let query = supabase
      .from('articles')
      .select('*, category:categories(*)', { count: 'exact' })
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())

    if (categorySlug && categorySlug !== 'todos') {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (cat) {
        query = query.eq('category_id', cat.id)
      }
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await query
      .order('published_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[articles] Erro ao listar artigos:', error.message)
      return { articles: [], total: 0 }
    }

    return { articles: (data as Article[]) || [], total: count || 0 }
  } catch (err) {
    console.error('[articles] Exceção em getPublishedArticles:', err)
    return { articles: [], total: 0 }
  }
}

/**
 * Busca um artigo pelo slug com sua categoria e tags associadas
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*, category:categories(*), article_tags(tag:tags(*))')
      .eq('slug', slug)
      .single()

    if (error || !data) return null

    const tags: Tag[] = (data.article_tags || [])
      .map((at: { tag: Tag }) => at.tag)
      .filter(Boolean)

    return {
      ...(data as Article),
      tags,
    }
  } catch (err) {
    console.error('[articles] Erro ao buscar artigo por slug:', err)
    return null
  }
}

/**
 * Busca artigos relacionados na mesma categoria (excluindo o atual)
 */
export async function getRelatedArticles(
  categoryId: string,
  currentArticleId: string,
  limit = 3
): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*, category:categories(*)')
      .eq('category_id', categoryId)
      .neq('id', currentArticleId)
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return (data as Article[]) || []
  } catch {
    return []
  }
}

/**
 * Lista todas as categorias cadastradas
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) return []
    return (data as Category[]) || []
  } catch {
    return []
  }
}

/**
 * Incrementa as visualizações de um artigo via RPC atômica
 */
export async function incrementArticleViews(articleId: string): Promise<void> {
  if (typeof window === 'undefined') return

  const storageKey = `art_viewed_${articleId}`
  if (sessionStorage.getItem(storageKey)) return

  try {
    sessionStorage.setItem(storageKey, 'true')
    await supabase.rpc('increment_article_views', { article_id: articleId })
  } catch (err) {
    console.warn('[articles] Erro não bloqueante ao incrementar views:', err)
  }
}

/**
 * Lista todos os artigos para o painel administrativo (incluindo rascunhos e agendados)
 */
export async function getAdminArticles(): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[articles] Erro ao listar artigos admin:', error.message)
      return []
    }
    return (data as Article[]) || []
  } catch (err) {
    console.error('[articles] Exceção em getAdminArticles:', err)
    return []
  }
}

/**
 * Busca um artigo pelo ID para edição no painel administrativo
 */
export async function getArticleById(id: string): Promise<Article | null> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*, category:categories(*), article_tags(tag:tags(*))')
      .eq('id', id)
      .single()

    if (error || !data) return null

    const tags: Tag[] = (data.article_tags || [])
      .map((at: { tag: Tag }) => at.tag)
      .filter(Boolean)

    return {
      ...(data as Article),
      tags,
    }
  } catch (err) {
    console.error('[articles] Erro ao buscar artigo por ID:', err)
    return null
  }
}

/**
 * Exclui um artigo pelo ID
 */
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) {
      console.error('[articles] Erro ao excluir artigo:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[articles] Exceção ao excluir artigo:', err)
    return false
  }
}

/**
 * Duplica um artigo existente gerando um novo rascunho
 */
export async function duplicateArticle(id: string): Promise<Article | null> {
  try {
    const original = await getArticleById(id)
    if (!original) return null

    const timestamp = Date.now().toString().slice(-4)
    const newSlug = `${original.slug}-copia-${timestamp}`
    const newTitle = `${original.title} (Cópia)`

    const { data, error } = await supabase
      .from('articles')
      .insert({
        slug: newSlug,
        title: newTitle,
        excerpt: original.excerpt,
        content: original.content,
        content_html: original.content_html,
        cover_image_url: original.cover_image_url,
        cover_image_alt: original.cover_image_alt,
        category_id: original.category_id,
        author_name: original.author_name,
        author_oab: original.author_oab,
        reading_time_minutes: original.reading_time_minutes,
        seo_title: original.seo_title ? `${original.seo_title} (Cópia)` : null,
        seo_description: original.seo_description,
        published_at: null, // Novo rascunho
        view_count: 0,
      })
      .select('*, category:categories(*)')
      .single()

    if (error || !data) {
      console.error('[articles] Erro ao duplicar artigo:', error?.message)
      return null
    }

    // Copia tags associadas
    if (original.tags && original.tags.length > 0) {
      const tagLinks = original.tags.map((t) => ({
        article_id: data.id,
        tag_id: t.id,
      }))
      await supabase.from('article_tags').insert(tagLinks)
    }

    return data as Article
  } catch (err) {
    console.error('[articles] Exceção ao duplicar artigo:', err)
    return null
  }
}

/**
 * Lista todas as tags cadastradas
 */
export async function getAllTags(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) return []
    return (data as Tag[]) || []
  } catch {
    return []
  }
}

/**
 * Cria uma nova tag caso não exista
 */
export async function createTag(name: string): Promise<Tag | null> {
  try {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const { data, error } = await supabase
      .from('tags')
      .insert({ name, slug })
      .select()
      .single()

    if (error) {
      const { data: existing } = await supabase
        .from('tags')
        .select('*')
        .eq('slug', slug)
        .single()
      return (existing as Tag) || null
    }
    return data as Tag
  } catch {
    return null
  }
}

/**
 * Salva ou atualiza um artigo e suas tags associadas
 */
export async function saveArticle(
  articleData: Partial<Article>,
  tagIds?: string[]
): Promise<Article | null> {
  try {
    const payload = { ...articleData }
    delete payload.category
    delete payload.tags

    let savedArticle: Article | null = null

    if (payload.id) {
      // Update
      const { data, error } = await supabase
        .from('articles')
        .update(payload)
        .eq('id', payload.id)
        .select('*, category:categories(*)')
        .single()

      if (error || !data) {
        console.error('[articles] Erro ao atualizar artigo:', error?.message)
        return null
      }
      savedArticle = data as Article
    } else {
      // Insert
      const { data, error } = await supabase
        .from('articles')
        .insert(payload)
        .select('*, category:categories(*)')
        .single()

      if (error || !data) {
        console.error('[articles] Erro ao criar artigo:', error?.message)
        return null
      }
      savedArticle = data as Article
    }

    // Sincroniza tags
    if (savedArticle && tagIds) {
      await supabase.from('article_tags').delete().eq('article_id', savedArticle.id)
      if (tagIds.length > 0) {
        const links = tagIds.map((tid) => ({
          article_id: savedArticle!.id,
          tag_id: tid,
        }))
        await supabase.from('article_tags').insert(links)
      }
    }

    return savedArticle
  } catch (err) {
    console.error('[articles] Exceção em saveArticle:', err)
    return null
  }
}

export type ArticleImage = {
  id: string
  url: string
  file_name: string | null
  content_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  created_at: string
}

/**
 * Busca todas as imagens salvas no banco de mídia
 */
export async function getArticleImages(): Promise<ArticleImage[]> {
  try {
    const { data, error } = await supabase
      .from('article_images')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[articles] Erro ao buscar imagens salvas:', error.message)
      return []
    }
    return (data as ArticleImage[]) || []
  } catch (err) {
    console.error('[articles] Exceção em getArticleImages:', err)
    return []
  }
}

/**
 * Registra uma nova imagem no banco de mídia
 */
export async function registerArticleImage(image: {
  url: string
  file_name?: string
  content_type?: string
  file_size?: number
  width?: number
  height?: number
}): Promise<ArticleImage | null> {
  try {
    const { data, error } = await supabase
      .from('article_images')
      .upsert(
        {
          url: image.url,
          file_name: image.file_name || null,
          content_type: image.content_type || null,
          file_size: image.file_size || null,
          width: image.width || null,
          height: image.height || null,
        },
        { onConflict: 'url' }
      )
      .select()
      .single()

    if (error) {
      console.warn('[articles] Erro ao registrar imagem no banco:', error.message)
      return null
    }
    return data as ArticleImage
  } catch (err) {
    console.error('[articles] Exceção em registerArticleImage:', err)
    return null
  }
}

/**
 * Exclui o registro da imagem do banco de mídia
 */
export async function deleteArticleImage(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('article_images')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[articles] Erro ao excluir imagem:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[articles] Exceção em deleteArticleImage:', err)
    return false
  }
}
