import { useState } from "react";
import { site } from "@/config/site";
import { ArrowLeft, ChevronDown, Info, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculadoraCLT } from "@/components/calculadora/CalculadoraCLT";
import { CalculadoraPJ } from "@/components/calculadora/CalculadoraPJ";
import { AnimateInView } from "@/components/site/AnimateInView";
import { SEOHead } from "@/components/site/SEOHead";
import { SEO, buildBreadcrumb } from "@/lib/seo";

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 + i * 0.08 } }),
};

export default function Calculadora() {
    const reduce = useReducedMotion();
    const [activeTab, setActiveTab] = useState("clt");

    return (
        <div className="min-h-screen bg-surface pb-24">
            <SEOHead
                title="Calculadora de Rescisão Trabalhista e Vínculo PJ | Edvaldo Rodrigues"
                description="Simule seus direitos trabalhistas CLT ou avalie riscos de pejotização com a calculadora jurídica do escritório Edvaldo Rodrigues Advocacia."
                canonical="/calculadora"
                jsonLd={[
                    buildBreadcrumb([
                        { name: "Início", url: SEO.siteUrl },
                        { name: "Calculadora de Rescisão", url: `${SEO.siteUrl}/calculadora` },
                    ]),
                    {
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        name: "Calculadora de Rescisão Trabalhista e Riscos PJ",
                        applicationCategory: "BusinessApplication",
                        operatingSystem: "All",
                        url: `${SEO.siteUrl}/calculadora`,
                        description: "Ferramenta online de simulação de rescisão contratual trabalhista e diagnóstico de pejotização.",
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "BRL",
                        },
                    },
                ]}
            />
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-[#0D1B30]">
                <div className="relative">
                    <div className="absolute inset-0 bg-calculadora-photo opacity-60" aria-hidden="true" />
                    <div className="absolute inset-0 bg-hero" aria-hidden="true" />
                    <div className="container relative flex min-h-[60svh] items-center pb-20 pt-28 sm:pb-24 sm:pt-32">
                        <div className="max-w-3xl">
                            <motion.div
                                className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary-foreground/70"
                                variants={fadeUp}
                                initial={reduce ? false : "hidden"}
                                animate={reduce ? false : "visible"}
                                custom={0}
                            >
                                <span className="rounded-full border border-primary-foreground/15 bg-background/10 px-3 py-1">
                                    {site.brand.oab}
                                </span>
                                <span className="text-primary-foreground/40">•</span>
                                <span>{site.contact.city}</span>
                            </motion.div>

                            <motion.h1
                                className="mt-5 font-serif text-3xl font-semibold leading-tight tracking-tight text-primary-foreground sm:text-4xl md:text-5xl"
                                variants={fadeUp}
                                initial={reduce ? false : "hidden"}
                                animate={reduce ? false : "visible"}
                                custom={1}
                            >
                                Calculadora de
                                <span className="block text-hero">Rescisão</span>
                            </motion.h1>

                            <motion.p
                                className="mt-6 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base"
                                variants={fadeUp}
                                initial={reduce ? false : "hidden"}
                                animate={reduce ? false : "visible"}
                                custom={2}
                            >
                                Faça a simulação dos seus direitos trabalhistas ou avalie os riscos de contratação PJ baseados na legislação vigente.
                            </motion.p>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-primary-foreground/60">
                    <ChevronDown className="size-6 animate-bounce" aria-hidden="true" />
                </div>
            </section>

            {/* Main Content Area */}
            <section className="container mt-8 sm:-mt-10 relative z-10">
                <AnimateInView delay={0.2}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto flex flex-col items-center">

                        <TabsList className="mb-8 grid w-full max-w-[400px] grid-cols-2 bg-background border shadow-sm">
                            <TabsTrigger value="clt" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Trabalhador CLT
                            </TabsTrigger>
                            <TabsTrigger value="pj" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Sou PJ / Vínculo
                            </TabsTrigger>
                        </TabsList>

                        <div className="w-full">
                            <TabsContent value="clt" className="mt-0 outline-none">
                                <CalculadoraCLT />
                            </TabsContent>

                            <TabsContent value="pj" className="mt-0 outline-none">
                                <CalculadoraPJ />
                            </TabsContent>
                        </div>

                    </Tabs>
                </AnimateInView>
            </section>

            {/* Trust CTA Section */}
            {activeTab === 'pj' && (
                <section className="container mt-16 max-w-4xl">
                    <AnimateInView>
                        <div className="rounded-2xl border-premium bg-card px-6 py-8 sm:px-12 sm:py-10 text-center shadow-card-hover">
                            <h3 className="font-serif text-xl sm:text-2xl font-semibold">Teve seus direitos negados por um falso contrato PJ?</h3>
                            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                                A "Pejotização" fraudulenta é muito comum. Os tribunais trabalhistas reconhecem o vínculo quando há subordinação, habitualidade e pessoalidade.
                            </p>
                            <div className="mt-6">
                                <a href="/contato" className="inline-flex h-10 items-center justify-center rounded-md bg-cta-gold px-8 text-sm font-medium text-foreground transition-colors hover:bg-cta-gold/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    Falar com um Advogado
                                </a>
                            </div>
                        </div>
                    </AnimateInView>
                </section>
            )}

        </div>
    );
}
