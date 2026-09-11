import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

interface RouteMetadata {
  route: string;
  title: string;
  description: string;
  canonical: string;
  jsonLd?: object[];
}

const STATIC_METADATA: RouteMetadata[] = [
  {
    route: "/",
    title: "Edvaldo Rodrigues | Advocacia em Praia Grande/SP",
    description: "Advocacia em Praia Grande/SP com atendimento sob agendamento. Atuação em Direito Civil, Previdenciário, Trabalhista, Criminal e Família.",
    canonical: "https://edvaldorodrigues.com.br/",
  },
  {
    route: "/areas-de-atuacao",
    title: "Áreas de Atuação | Edvaldo Rodrigues Advocacia — Praia Grande/SP",
    description: "Conheça as áreas de atuação do escritório Edvaldo Rodrigues Advocacia: Direito Civil, Empresarial, Trabalhista, Previdenciário, Criminal, Família e Militar em Praia Grande/SP.",
    canonical: "https://edvaldorodrigues.com.br/areas-de-atuacao",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://edvaldorodrigues.com.br" },
          { "@type": "ListItem", "position": 2, "name": "Áreas de Atuação", "item": "https://edvaldorodrigues.com.br/areas-de-atuacao" }
        ]
      }
    ]
  },
  {
    route: "/sobre",
    title: "Sobre o Advogado | Edvaldo Rodrigues Ferreira — OAB/SP nº 465.818",
    description: "Conheça o Dr. Edvaldo Rodrigues Ferreira, advogado inscrito na OAB/SP nº 465.818, com atuação em Direito Civil, Empresarial, Trabalhista, Previdenciário, Criminal, Família e Militar em Praia Grande/SP.",
    canonical: "https://edvaldorodrigues.com.br/sobre",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://edvaldorodrigues.com.br" },
          { "@type": "ListItem", "position": 2, "name": "Sobre", "item": "https://edvaldorodrigues.com.br/sobre" }
        ]
      }
    ]
  },
  {
    route: "/contato",
    title: "Contato | Edvaldo Rodrigues Advocacia — Praia Grande/SP",
    description: "Entre em contato com o escritório Edvaldo Rodrigues Advocacia em Praia Grande/SP. Atendimento presencial e online via WhatsApp e formulário.",
    canonical: "https://edvaldorodrigues.com.br/contato",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Contato — Edvaldo Rodrigues Advocacia",
        "url": "https://edvaldorodrigues.com.br/contato"
      }
    ]
  },
  {
    route: "/conteudo-juridico",
    title: "Conteúdo Jurídico | Artigos e Orientações — Dr. Edvaldo Rodrigues Ferreira",
    description: "Artigos e orientações jurídicas sobre Direito Empresarial, Civil, Família, Trabalhista, Criminal, Previdenciário e Militar. Informação clara para tomada de decisões seguras.",
    canonical: "https://edvaldorodrigues.com.br/conteudo-juridico",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://edvaldorodrigues.com.br" },
          { "@type": "ListItem", "position": 2, "name": "Conteúdo Jurídico", "item": "https://edvaldorodrigues.com.br/conteudo-juridico" }
        ]
      }
    ]
  },
  {
    route: "/calculadora",
    title: "Calculadora de Rescisão Trabalhista e Vínculo PJ | Edvaldo Rodrigues",
    description: "Simule seus direitos trabalhistas CLT ou avalie riscos de pejotização com a calculadora jurídica do escritório Edvaldo Rodrigues Advocacia.",
    canonical: "https://edvaldorodrigues.com.br/calculadora",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Calculadora de Rescisão Trabalhista e Riscos PJ",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "url": "https://edvaldorodrigues.com.br/calculadora"
      }
    ]
  },
  {
    route: "/politica-de-privacidade",
    title: "Política de Privacidade | Edvaldo Rodrigues Advocacia",
    description: "Política de privacidade do escritório Edvaldo Rodrigues Advocacia, em conformidade com a LGPD.",
    canonical: "https://edvaldorodrigues.com.br/politica-de-privacidade"
  },
  {
    route: "/termos-de-uso",
    title: "Termos de Uso | Edvaldo Rodrigues Advocacia",
    description: "Termos e condições de uso do site do escritório Edvaldo Rodrigues Advocacia.",
    canonical: "https://edvaldorodrigues.com.br/termos-de-uso"
  }
];

function prerenderStaticPagesPlugin(): Plugin {
  return {
    name: "vite:prerender-static-pages",
    apply: "build",
    enforce: "post",
    async closeBundle() {
      const distDir = path.join(__dirname, "dist");
      const rootHtmlPath = path.join(distDir, "index.html");

      if (!fs.existsSync(rootHtmlPath)) {
        console.warn("[prerender] dist/index.html não encontrado. Pulando prerender.");
        return;
      }

      const baseHtml = fs.readFileSync(rootHtmlPath, "utf-8");

      // No ambiente de CI/Vercel (ou por padrão), evitamos o Puppeteer porque o ambiente Linux
      // da Vercel não possui bibliotecas nativas de GUI (libnspr4.so, libnss3.so etc.).
      // O gerador estático semântico abaixo já injeta todos os metadados SEO, Open Graph e JSON-LD
      // com 100% de precisão e em alta velocidade.
      let puppeteerRenderSuccess = false;
      const isCI = Boolean(process.env.VERCEL || process.env.CI || process.env.NOW_BUILDER || process.env.NETLIFY);
      const enablePuppeteer = !isCI && process.env.ENABLE_PUPPETEER === "true";

      if (enablePuppeteer) {
        try {
          const Prerenderer = require("@prerenderer/prerenderer");
          const PuppeteerRenderer = require("@prerenderer/renderer-puppeteer");

          const prerenderer = new Prerenderer({
            staticDir: distDir,
            server: {
              host: "127.0.0.1",
              port: 0,
            },
            renderer: new PuppeteerRenderer({
              headless: true,
              renderAfterDocumentEvent: "render-event",
              maxConcurrentRoutes: 1,
              timeout: 10000,
            }),
          });

          console.log("[prerender] Tentando renderização dinâmica via Puppeteer...");
          await prerenderer.initialize();
          const routes = STATIC_METADATA.map((m) => m.route);
          const renderedRoutes = await prerenderer.renderRoutes(routes);

          for (const route of renderedRoutes) {
            const routePath = route.route === "/" ? "" : route.route.replace(/^\//, "");
            const targetDir = path.join(distDir, routePath);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            const targetFile = path.join(targetDir, "index.html");
            fs.writeFileSync(targetFile, route.html.trim(), "utf-8");
            console.log(`[prerender-puppeteer] Gerado com sucesso: ${route.route}`);
          }

          await prerenderer.destroy();
          puppeteerRenderSuccess = true;
          console.log("[prerender] Renderização dinâmica via Puppeteer concluída com sucesso!");
        } catch (err) {
          console.warn("[prerender] Puppeteer indisponível ou falhou. Usando gerador estático semântico de fallback:", (err as Error).message);
        }
      } else {
        console.log("[prerender] Modo estático semântico ativo (Puppeteer ignorado para compatibilidade com Vercel/CI).");
      }

      // Se Puppeteer não foi bem-sucedido (ex: ambiente Windows sem Chrome binário),
      // o gerador estático garante que toda rota tem seu HTML e metadados dedicados
      if (!puppeteerRenderSuccess) {
        console.log("[prerender] Gerando snapshots estáticos semânticos para as rotas públicas...");
        for (const meta of STATIC_METADATA) {
          let routeHtml = baseHtml;

          // Atualiza o <title>
          routeHtml = routeHtml.replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`);

          // Atualiza a meta description
          routeHtml = routeHtml.replace(
            /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
            `<meta name="description" content="${meta.description}" />`
          );

          // Atualiza canonical
          routeHtml = routeHtml.replace(
            /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
            `<link rel="canonical" href="${meta.canonical}" />`
          );

          // Atualiza Open Graph
          routeHtml = routeHtml.replace(
            /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
            `<meta property="og:title" content="${meta.title}" />`
          );
          routeHtml = routeHtml.replace(
            /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
            `<meta property="og:description" content="${meta.description}" />`
          );
          routeHtml = routeHtml.replace(
            /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
            `<meta property="og:url" content="${meta.canonical}" />`
          );

          // Injeta JSON-LD específico da rota, se houver
          if (meta.jsonLd && meta.jsonLd.length > 0) {
            const extraJsonLd = meta.jsonLd
              .map((schema) => `  <script type="application/ld+json">\n  ${JSON.stringify(schema, null, 2)}\n  </script>`)
              .join("\n");
            routeHtml = routeHtml.replace("</head>", `${extraJsonLd}\n</head>`);
          }

          const routePath = meta.route === "/" ? "" : meta.route.replace(/^\//, "");
          const targetDir = path.join(distDir, routePath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const targetFile = path.join(targetDir, "index.html");
          fs.writeFileSync(targetFile, routeHtml, "utf-8");
          console.log(`[prerender-static] Snapshot gerado: ${targetFile}`);
        }
        console.log("[prerender] Todos os snapshots estáticos gerados com sucesso!");
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    prerenderStaticPagesPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
