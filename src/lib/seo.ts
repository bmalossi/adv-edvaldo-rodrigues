/** Constantes SEO centralizadas — não exibidas ao usuário */
export const SEO = {
  siteName: "Edvaldo Rodrigues Advocacia",
  siteUrl: "https://edvaldorodrigues.com.br",
  defaultTitle: "Edvaldo Rodrigues | Advocacia em Praia Grande/SP",
  defaultDescription:
    "Advocacia em Praia Grande/SP com atendimento sob agendamento. Atuação em Direito Civil, Previdenciário, Trabalhista, Criminal e Família.",
  defaultImage: "https://edvaldorodrigues.com.br/og-image.png",
  phone: "+5513996824364",
  phoneDisplay: "(13) 99682-4364",
  email: "edvaldorodrigues.advocacia@gmail.com",
  address: {
    street: "Av. Pres. Costa e Silva, 733 - Sl 21",
    neighborhood: "Boqueirão",
    city: "Praia Grande",
    state: "SP",
    zip: "11701-005",
    country: "BR",
  },
  geo: {
    latitude: -24.0118,
    longitude: -46.4019,
  },
  oab: "OAB/SP nº 465.818",
  openingHours: ["Mo-Fr 09:00-18:00"],
  /** @id raiz da entidade principal */
  entityId: "https://edvaldorodrigues.com.br/#legalservice",
  personId: "https://edvaldorodrigues.com.br/#attorney",
  websiteId: "https://edvaldorodrigues.com.br/#website",
} as const;

/** Retorna JSON-LD LegalService raiz — reutilizável em qualquer página */
export function buildLegalServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": SEO.entityId,
    name: SEO.siteName,
    alternateName: "Edvaldo Rodrigues Ferreira Advocacia",
    description:
      "Escritório de advocacia em Praia Grande/SP especializado em Direito Civil, Empresarial, Trabalhista, Previdenciário, Criminal, Família e Militar. Atendimento presencial e online.",
    url: SEO.siteUrl,
    telephone: SEO.phone,
    email: SEO.email,
    priceRange: "$$",
    image: SEO.defaultImage,
    logo: "https://edvaldorodrigues.com.br/logo.png",
    address: {
      "@type": "PostalAddress",
      streetAddress: SEO.address.street,
      addressLocality: SEO.address.city,
      addressRegion: SEO.address.state,
      postalCode: SEO.address.zip,
      addressCountry: SEO.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SEO.geo.latitude,
      longitude: SEO.geo.longitude,
    },
    areaServed: [
      { "@type": "City", name: "Praia Grande", containedInPlace: { "@type": "State", name: "São Paulo" } },
      { "@type": "City", name: "Santos" },
      { "@type": "City", name: "São Vicente" },
      { "@type": "City", name: "Guarujá" },
      { "@type": "City", name: "Cubatão" },
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Serviços Jurídicos",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito Civil" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito Empresarial" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito Trabalhista" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito de Família" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito Criminal" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito Previdenciário" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Direito Militar" } },
      ],
    },
    knowsAbout: [
      "Direito Civil",
      "Direito Empresarial",
      "Direito Trabalhista",
      "Direito Previdenciário",
      "Direito de Família",
      "Direito Criminal",
      "Direito Militar",
      "Assessoria Jurídica Empresarial",
      "Rescisão Contratual",
      "LGPD",
    ],
    sameAs: [
      "https://www.oab.org.br",
    ],
    founder: { "@id": SEO.personId },
  };
}

/** JSON-LD WebSite com SearchAction */
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SEO.websiteId,
    name: SEO.siteName,
    url: SEO.siteUrl,
    inLanguage: "pt-BR",
    publisher: { "@id": SEO.entityId },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SEO.siteUrl}/areas-de-atuacao?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** JSON-LD Person/Attorney */
export function buildAttorneySchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Person", "LegalService"],
    "@id": SEO.personId,
    name: "Edvaldo Rodrigues Ferreira",
    givenName: "Edvaldo",
    familyName: "Rodrigues Ferreira",
    jobTitle: "Advogado",
    description:
      "Edvaldo Rodrigues Ferreira é advogado inscrito na OAB/SP nº 465.818, com atuação em Direito Civil, Empresarial, Trabalhista, Previdenciário, Criminal, Família e Militar. Atende em Praia Grande/SP e região.",
    telephone: SEO.phone,
    email: SEO.email,
    url: `${SEO.siteUrl}/sobre`,
    image: SEO.defaultImage,
    knowsAbout: [
      "Direito Civil",
      "Direito Empresarial",
      "Direito Trabalhista",
      "Direito Previdenciário",
      "Direito de Família",
      "Direito Criminal",
      "Direito Militar",
    ],
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Inscrição OAB",
      recognizedBy: { "@type": "Organization", name: "Ordem dos Advogados do Brasil — Seção São Paulo" },
      identifier: "OAB/SP nº 465.818",
    },
    worksFor: { "@id": SEO.entityId },
    address: {
      "@type": "PostalAddress",
      addressLocality: SEO.address.city,
      addressRegion: SEO.address.state,
      addressCountry: SEO.address.country,
    },
  };
}

/** BreadcrumbList helper */
export function buildBreadcrumb(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Schema Article para publicações de Conteúdo Jurídico */
export function buildArticleSchema(params: {
  title: string;
  description: string;
  slug: string;
  datePublished?: string | null;
  dateModified?: string | null;
  imageUrl?: string | null;
  authorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SEO.siteUrl}/conteudo-juridico/${params.slug}`,
    },
    url: `${SEO.siteUrl}/conteudo-juridico/${params.slug}`,
    datePublished: params.datePublished || new Date().toISOString(),
    dateModified: params.dateModified || params.datePublished || new Date().toISOString(),
    image: params.imageUrl || SEO.defaultImage,
    author: {
      "@type": "Person",
      name: params.authorName || "Dr. Edvaldo Rodrigues Ferreira",
      url: `${SEO.siteUrl}/sobre`,
    },
    publisher: {
      "@type": "Organization",
      name: SEO.siteName,
      logo: {
        "@type": "ImageObject",
        url: "https://edvaldorodrigues.com.br/logo.png",
      },
    },
  };
}

