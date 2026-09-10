import { describe, it, expect } from 'vitest';
import { buildArticleSchema, SEO } from '@/lib/seo';
import fs from 'fs';
import path from 'path';

describe('SEO e Schema de Artigos', () => {
  it('buildArticleSchema gera @type com Article e LegalScholarlyArticle', () => {
    const schema = buildArticleSchema({
      title: 'Direitos Trabalhistas na Rescisão',
      description: 'Guia completo sobre verbas rescisórias.',
      slug: 'direitos-trabalhistas-rescisao',
      categoryName: 'Direito Trabalhista',
      tags: ['Rescisão', 'CLT', 'Aviso Prévio'],
      authorName: 'Dr. Edvaldo Rodrigues Ferreira',
    });

    expect(schema['@type']).toEqual(['Article', 'LegalScholarlyArticle']);
    expect(schema.headline).toBe('Direitos Trabalhistas na Rescisão');
    expect(schema.url).toBe(`${SEO.siteUrl}/conteudo-juridico/direitos-trabalhistas-rescisao`);
    expect(schema.isPartOf).toEqual({ '@id': SEO.websiteId });
    expect(schema.about).toEqual({ '@type': 'Thing', name: 'Direito Trabalhista' });
    expect(schema.mentions).toEqual([
      { '@type': 'Thing', name: 'Rescisão' },
      { '@type': 'Thing', name: 'CLT' },
      { '@type': 'Thing', name: 'Aviso Prévio' },
    ]);
  });
});

describe('Speculation Rules API', () => {
  it('public/speculationrules.json é um JSON válido e contém prerender e prefetch', () => {
    const filePath = path.join(process.cwd(), 'public', 'speculationrules.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.prerender).toBeDefined();
    expect(Array.isArray(parsed.prerender)).toBe(true);
    expect(parsed.prerender[0].eagerness).toBe('moderate');

    expect(parsed.prefetch).toBeDefined();
    expect(Array.isArray(parsed.prefetch)).toBe(true);
    expect(parsed.prefetch[0].eagerness).toBe('moderate');
  });
});

describe('Vercel Configuração', () => {
  it('vercel.json contém rewrite para sitemap e headers de speculation rules', () => {
    const filePath = path.join(process.cwd(), 'vercel.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Verifica rewrite do sitemap
    const sitemapRewrite = parsed.rewrites.find((r: { source: string }) => r.source === '/sitemap.xml');
    expect(sitemapRewrite).toBeDefined();
    expect(sitemapRewrite.destination).toBe('/api/sitemap');

    // Verifica headers de speculationrules.json
    const specHeader = parsed.headers.find((h: { source: string }) => h.source === '/speculationrules.json');
    expect(specHeader).toBeDefined();

    // Verifica header Speculation-Rules na rota pública
    const catchAllHeader = parsed.headers.find((h: { source: string }) => h.source === '/(.*)');
    expect(catchAllHeader).toBeDefined();
    const hasSpecRule = catchAllHeader.headers.some((h: { key: string }) => h.key === 'Speculation-Rules');
    const hasNoVary = catchAllHeader.headers.some((h: { key: string }) => h.key === 'No-Vary-Search');
    expect(hasSpecRule).toBe(true);
    expect(hasNoVary).toBe(true);
  });
});
