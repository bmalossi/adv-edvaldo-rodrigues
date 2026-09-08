import { useState } from "react";
import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { AreaDetailDialog } from "@/components/site/AreaDetailDialog";
import { ArticlesSection } from "@/components/site/ArticlesSection";
import { practiceAreas, type PracticeArea } from "@/content/areas";
import fotoSobre from "@/assets/foto-sobre3.webp";
import { SEOHead } from "@/components/site/SEOHead";
import { SEO, buildLegalServiceSchema, buildBreadcrumb } from "@/lib/seo";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  FileText,
  Gavel,
  Handshake,
  Headphones,
  MapPin,
  Phone,
  Scale,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";


export default function Home() {
  const [selectedArea, setSelectedArea] = useState<PracticeArea | null>(null);

  // Soluções Jurídicas para Empresas (6 Cards da Referência)
  const corporateSolutions = [
    {
      id: "contratos",
      title: "CONTRATOS",
      description: "Elaboração, revisão e análise de contratos com segurança e clareza.",
      icon: Handshake,
    },
    {
      id: "trabalhista-empresarial",
      title: "TRABALHISTA EMPRESARIAL",
      description: "Prevenção de passivos e orientação nas relações de trabalho.",
      icon: Users,
    },
    {
      id: "cobrancas",
      title: "COBRANÇAS E CONFLITOS",
      description: "Atuação estratégica em casos de inadimplência e descumprimento de obrigações.",
      icon: Scale,
    },
    {
      id: "prevencao-riscos",
      title: "PREVENÇÃO DE RISCOS",
      description: "Assessoria preventiva para decisões empresariais mais seguras.",
      icon: ShieldCheck,
    },
    {
      id: "societario",
      title: "SOCIETÁRIO E EMPRESARIAL",
      description: "Apoio jurídico em constituição, alteração de empresas e acordos societários.",
      icon: Building2,
    },
    {
      id: "contencioso",
      title: "CONTENCIOSO EMPRESARIAL",
      description: "Defesa técnica e estratégica em ações judiciais e administrativas.",
      icon: Gavel,
    },
  ];

  // Itens de Checklist da Assessoria Preventiva (8 Itens da Referência)
  const checklistItems = [
    "Redução de riscos e passivos",
    "Prevenção de litígios",
    "Contratos mais seguros",
    "Proteção do patrimônio da empresa",
    "Conformidade legal",
    "Mais segurança para crescer",
    "Decisões estratégicas com apoio jurídico",
    "Suporte contínuo e personalizado",
  ];

  // 5 Áreas de Atuação em Destaque (Cards da Referência)
  const mainPracticeAreas = [
    {
      key: "empresarial",
      title: "EMPRESARIAL",
      description: "Assessoria completa para empresas em todas as fases do negócio.",
      icon: Briefcase,
    },
    {
      key: "civil",
      title: "CIVIL",
      description: "Soluções jurídicas em contratos, responsabilidade civil, cobranças e indenizações.",
      icon: FileText,
    },
    {
      key: "familia",
      title: "FAMÍLIA",
      description: "Divórcio, guarda, alimentos, partilha de bens e demais questões familiares.",
      icon: Users,
    },
    {
      key: "trabalhista",
      title: "TRABALHISTA",
      description: "Defesa de empresas e empregados em questões trabalhistas.",
      icon: Briefcase,
    },
    {
      key: "criminal",
      title: "CRIMINAL",
      description: "Defesa técnica em investigações, processos criminais e execução penal.",
      icon: Gavel,
    },
  ];

  const handleOpenAreaModal = (key: string) => {
    const area = practiceAreas.find((a) => a.key === key);
    if (area) {
      setSelectedArea(area);
    }
  };

  const whatsappUrl = `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
    "Olá, Dr. Edvaldo! Gostaria de agendar uma consulta sobre assessoria jurídica para minha empresa."
  )}`;

  return (
    <div className="w-full bg-[#FAF9F6] text-[#0D1B30] overflow-hidden">
      <SEOHead
        title="Edvaldo Rodrigues | Advogado em Praia Grande/SP — Assessoria Jurídica"
        description="Advogado em Praia Grande/SP especializado em Direito Civil, Empresarial, Trabalhista, Previdenciário, Criminal e Família. OAB/SP nº 465.818. Atendimento presencial e online."
        canonical="/"
        jsonLd={[
          buildLegalServiceSchema(),
          buildBreadcrumb([
            { name: "Início", url: SEO.siteUrl },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "O que é assessoria jurídica empresarial?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Assessoria jurídica empresarial é o serviço contínuo de orientação legal para empresas, abrangendo elaboração de contratos, prevenção de litígios, conformidade trabalhista e suporte em decisões estratégicas com segurança jurídica.",
                },
              },
              {
                "@type": "Question",
                name: "Quais áreas do Direito o escritório Edvaldo Rodrigues atende?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "O escritório atua em Direito Civil, Direito Empresarial, Direito Trabalhista, Direito Previdenciário, Direito de Família, Direito Criminal e Direito Militar, com atendimento em Praia Grande/SP e região.",
                },
              },
              {
                "@type": "Question",
                name: "Como agendar uma consulta com o Dr. Edvaldo Rodrigues?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "O atendimento é feito sob agendamento pelo WhatsApp (13) 99682-4364 ou pelo formulário de contato no site. O escritório funciona de segunda a sexta, das 9h às 18h, em Praia Grande/SP.",
                },
              },
              {
                "@type": "Question",
                name: "Prevenir litígios é mais barato do que litigar?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. A assessoria preventiva reduz custos com processos judiciais, protege o patrimônio da empresa e garante conformidade legal. Contratos bem elaborados e orientação contínua evitam a maioria dos conflitos empresariais.",
                },
              },
            ],
          },
        ]}
      />

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (Imagem hero-bg.svg estendida em todo o hero)             */}
      {/* ========================================================================= */}
      <section className="relative min-h-[90vh] lg:min-h-screen flex items-center bg-[#0D1B30] text-white pt-24 pb-16 lg:pt-28 lg:pb-20 overflow-hidden">
        {/* Imagem hero-bg.svg estendida em todo hero como background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/images/hero-bg.svg"
            alt="Dr. Edvaldo Rodrigues Ferreira Advocacia"
            className="w-full h-full object-cover object-[65%_center] sm:object-[70%_center] lg:object-center"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-2xl lg:max-w-3xl space-y-5">
            {/* Título Principal H1 em 3 Linhas */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]">
              <span className="block text-white">ASSESSORIA</span>
              <span className="block text-[#C9A961]">JURÍDICA</span>
              <span className="block text-[#C9A961]">EMPRESARIAL</span>
            </h1>

            {/* 1. Separador Moderno Dourado entre H1 e Subtítulo */}
            <div className="w-20 sm:w-28 h-[2px] bg-[#C9A961] my-4 rounded-full" aria-hidden="true" />

            {/* Subtítulo */}
            <p className="text-base sm:text-lg font-semibold text-white tracking-wide">
              Segurança jurídica para decisões empresariais.
            </p>

            {/* Parágrafo de Apoio (Texto claro para conformidade WCAG AA) */}
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl font-normal">
              Atuação preventiva e contenciosa que protege sua empresa, reduz riscos e garante tranquilidade para você crescer.
            </p>

            {/* Botões de Ação */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Button
                asChild
                className="bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-semibold text-xs sm:text-sm uppercase tracking-wider h-12 px-7 rounded-md shadow-md transition-all duration-200"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Scale className="size-4 mr-2 text-[#0D1B30]" aria-hidden="true" />
                  Fale com um advogado
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border border-white/40 bg-[#0D1B30]/40 backdrop-blur-sm text-white hover:bg-white/10 hover:border-white font-medium text-xs sm:text-sm uppercase tracking-wider h-12 px-6 rounded-md transition-all duration-200"
              >
                <a href="#empresas">
                  Conheça nossa atuação
                  <ArrowRight className="size-4 ml-2" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. "COMO PODEMOS AJUDAR SUA EMPRESA" (Itens Lado a Lado com Separadores)   */}
      {/* ========================================================================= */}
      <section id="empresas" className="py-20 lg:py-28 bg-white border-b border-slate-200/80">
        <div className="container">
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="h-[1px] w-8 bg-[#C9A961]" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#C9A961]">
                SOLUÇÕES JURÍDICAS PARA EMPRESAS
              </p>
              <span className="h-[1px] w-8 bg-[#C9A961]" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0D1B30] tracking-tight">
              Como podemos ajudar sua empresa
            </h2>
          </div>

          {/* 3. Grid de 6 Itens Lado a Lado com Separadores Modernos (Sem Box) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 lg:divide-x divide-slate-200">
            {corporateSolutions.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex flex-col items-center text-center px-4 py-6 sm:py-8 group"
                >
                  <div className="mb-4 text-[#C9A961] group-hover:scale-110 transition-transform duration-300">
                    <Icon className="size-9 stroke-[1.5]" aria-hidden="true" />
                  </div>
                  <h3 className="font-sans text-xs sm:text-[13px] font-bold tracking-wider text-[#0D1B30] uppercase mb-2 min-h-[32px] flex items-center justify-center">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. "POR QUE TER ASSESSORIA JURÍDICA?" (Sem Box + Separador Central)        */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#0D1B30] text-white relative">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Coluna Esquerda: Textos e Botão */}
            <div className="lg:col-span-5 space-y-6 lg:pr-6">
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#C9A961]">
                POR QUE TER ASSESSORIA JURÍDICA?
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white tracking-tight">
                Prevenir é sempre mais estratégico do que remediar.
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
                A assessoria jurídica empresarial permite que você tome decisões com segurança, evite prejuízos e mantenha o foco no que realmente importa: o crescimento do seu negócio.
              </p>

              <div className="pt-2">
                <Button
                  asChild
                  variant="outline"
                  className="border border-white/30 text-white hover:bg-white/10 hover:border-white font-medium text-xs sm:text-sm uppercase tracking-wider h-11 px-6 rounded-md transition-all duration-200"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Saiba mais sobre a assessoria preventiva
                    <ArrowRight className="size-4 ml-2" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>

            {/* 4. Separador Moderno entre a Esquerda e a Direita + Checklist Sem Box */}
            <div className="lg:col-span-7 lg:border-l lg:border-slate-700/80 lg:pl-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                {checklistItems.map((text, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="size-5 rounded-full border border-[#C9A961] bg-[#C9A961]/10 flex items-center justify-center text-[#C9A961] shrink-0">
                      <Check className="size-3 stroke-[2.5]" aria-hidden="true" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-100 leading-snug">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. "ÁREAS DE ATUAÇÃO" (Fundo Off-White #FAF9F6)                           */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#FAF9F6] border-b border-slate-200/80">
        <div className="container">
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="h-[1px] w-8 bg-[#C9A961]" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#C9A961]">
                ATUAÇÃO COMPLETA
              </p>
              <span className="h-[1px] w-8 bg-[#C9A961]" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0D1B30] tracking-tight">
              Áreas de Atuação
            </h2>
          </div>

          {/* Grid de 5 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {mainPracticeAreas.map((area) => {
              const Icon = area.icon;
              return (
                <div
                  key={area.key}
                  onClick={() => handleOpenAreaModal(area.key)}
                  className="group cursor-pointer bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-[#C9A961]/70 transition-all duration-300 flex flex-col items-center text-center"
                >
                  <div className="size-12 rounded-lg bg-[#FAF9F6] border border-[#C9A961]/30 flex items-center justify-center text-[#C9A961] mb-4 group-hover:bg-[#C9A961] group-hover:text-[#0D1B30] transition-colors duration-300">
                    <Icon className="size-6 stroke-[1.75]" aria-hidden="true" />
                  </div>
                  <h3 className="font-sans text-xs font-bold tracking-wider text-[#0D1B30] uppercase mb-2">
                    {area.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {area.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              variant="outline"
              className="border border-[#0D1B30] text-[#0D1B30] hover:bg-[#0D1B30] hover:text-white font-medium text-xs uppercase tracking-wider h-11 px-8 rounded-md transition-all duration-200"
            >
              <Link to="/areas-de-atuacao">
                Ver todas as áreas de atuação
                <ArrowRight className="size-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. "SOBRE O ADVOGADO" (Fundo Azul-Marinho #0D1B30, Layout Dividido)       */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#0D1B30] text-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Foto do Advogado à Esquerda */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[420px] rounded-2xl overflow-hidden shadow-2xl border border-[#162846]">
                <img
                  src={fotoSobre}
                  alt="Dr. Edvaldo Rodrigues Ferreira no escritório"
                  className="w-full h-auto object-cover object-center"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Conteúdo Textual à Direita */}
            <div className="lg:col-span-7 space-y-6">
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-[#C9A961]">
                SOBRE O ADVOGADO
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white tracking-tight">
                Compromisso, estratégia e resultados.
              </h2>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
                O Dr. Edvaldo Rodrigues Ferreira atua com foco em resultados, oferecendo atendimento jurídico personalizado para pessoas e empresas.
              </p>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                Com experiência sólida e atuação multidisciplinar, o escritório entrega soluções jurídicas eficazes, sempre pautadas pela ética, transparência e comprometimento.
              </p>

              {/* Linha de 3 Informações com Ícones Dourados */}
              <div className="pt-4 border-t border-[#162846] grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#162846] border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] shrink-0">
                    <Shield className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white tracking-wide">
                      {site.brand.oab}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#162846] border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] shrink-0">
                    <MapPin className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white tracking-wide">
                      Atuação em Praia Grande e região
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#162846] border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] shrink-0">
                    <Headphones className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white tracking-wide">
                      Atendimento presencial e online
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  className="bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-semibold text-xs uppercase tracking-wider h-11 px-7 rounded-md transition-all duration-200"
                >
                  <Link to="/sobre">Conheça a trajetória completa</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6.5. "ARTIGOS RECENTES" (Conteúdo Jurídico)                              */}
      {/* ========================================================================= */}
      <ArticlesSection />

      {/* ========================================================================= */}
      {/* 7. FAIXA DE CTA FINAL (Fundo Dourado #C9A961)                              */}
      {/* ========================================================================= */}
      <section className="bg-[#C9A961] text-[#0D1B30] py-10 lg:py-12">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Lado Esquerdo: Ícone e Textos */}
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-xl bg-[#0D1B30] text-white flex items-center justify-center shrink-0 shadow-md">
                <Phone className="size-6 fill-current text-[#C9A961]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0D1B30] leading-tight">
                  Precisando de orientação jurídica para sua empresa?
                </h3>
                <p className="text-xs sm:text-sm font-medium text-[#1E293B] mt-1">
                  Fale com o escritório e descubra como podemos ajudar.
                </p>
              </div>
            </div>

            {/* Lado Direito: Botão Escuro */}
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

      {/* Diálogo de Detalhes da Área de Atuação */}
      <AreaDetailDialog
        area={selectedArea}
        open={!!selectedArea}
        onOpenChange={(open) => !open && setSelectedArea(null)}
      />
    </div>
  );
}
