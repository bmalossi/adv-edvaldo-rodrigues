import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

interface StaticRoute {
  loc: string;
  priority: string;
  changefreq: string;
}

const BASE_URL = 'https://edvaldorodrigues.com.br';

const STATIC_ROUTES: StaticRoute[] = [
  { loc: '/', priority: '1.0', changefreq: 'monthly' },
  { loc: '/areas-de-atuacao', priority: '0.9', changefreq: 'monthly' },
  { loc: '/sobre', priority: '0.8', changefreq: 'yearly' },
  { loc: '/contato', priority: '0.8', changefreq: 'yearly' },
  { loc: '/conteudo-juridico', priority: '0.9', changefreq: 'weekly' },
  { loc: '/calculadora', priority: '0.7', changefreq: 'monthly' },
  { loc: '/politica-de-privacidade', priority: '0.2', changefreq: 'yearly' },
  { loc: '/termos-de-uso', priority: '0.2', changefreq: 'yearly' },
];

export default async function handler(req: Request): Promise<Response> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  let articleUrls = '';
  const today = new Date().toISOString().split('T')[0];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const nowIso = new Date().toISOString();
      const { data: articles, error } = await supabase
        .from('articles')
        .select('slug, published_at, updated_at')
        .not('published_at', 'is', null)
        .lte('published_at', nowIso)
        .order('published_at', { ascending: false });

      if (!error && articles && Array.isArray(articles)) {
        articleUrls = articles
          .map((article) => {
            const rawDate = article.updated_at || article.published_at || today;
            const lastmod = rawDate ? rawDate.split('T')[0] : today;
            return `  <url>
    <loc>${BASE_URL}/conteudo-juridico/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
          })
          .join('\n');
      }
    } catch (err) {
      console.error('[sitemap] Error fetching articles from Supabase:', err);
    }
  }

  const staticUrls = STATIC_ROUTES.map((route) => {
    return `  <url>
    <loc>${BASE_URL}${route.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}${articleUrls ? '\n' + articleUrls : ''}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
