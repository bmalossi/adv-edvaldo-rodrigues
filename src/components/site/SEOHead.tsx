import { Helmet } from "react-helmet-async";
import { SEO } from "@/lib/seo";

export interface ArticleMeta {
  publishedTime?: string | null;
  modifiedTime?: string | null;
  author?: string | null;
  section?: string | null;
  tags?: string[] | null;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
  articleMeta?: ArticleMeta;
}

/**
 * SEOHead — injeta metadados no <head> via react-helmet-async.
 * Invisível ao usuário; não altera conteúdo visível.
 */
export function SEOHead({
  title = SEO.defaultTitle,
  description = SEO.defaultDescription,
  canonical,
  image = SEO.defaultImage,
  noIndex = false,
  jsonLd,
  articleMeta,
}: SEOHeadProps) {
  const canonicalUrl = canonical
    ? `${SEO.siteUrl}${canonical}`
    : SEO.siteUrl;

  // Normaliza para array de schemas
  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content={articleMeta ? "article" : "website"} />
      <meta property="og:site_name" content={SEO.siteName} />
      <meta property="og:locale" content="pt_BR" />

      {/* Article Open Graph tags */}
      {articleMeta?.publishedTime && (
        <meta property="article:published_time" content={articleMeta.publishedTime} />
      )}
      {articleMeta?.modifiedTime && (
        <meta property="article:modified_time" content={articleMeta.modifiedTime} />
      )}
      {articleMeta?.author && (
        <meta property="article:author" content={articleMeta.author} />
      )}
      {articleMeta?.section && (
        <meta property="article:section" content={articleMeta.section} />
      )}
      {articleMeta?.tags?.map((tag, idx) => (
        <meta key={idx} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD schemas */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
