import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalculadoraCLT } from "@/components/calculadora/CalculadoraCLT";
import { CalculadoraPJ } from "@/components/calculadora/CalculadoraPJ";
import { AnimateInView } from "@/components/site/AnimateInView";

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 + i * 0.08 } }),
};

export default function Calculadora() {
    const reduce = useReducedMotion();
    const [activeTab, setActiveTab] = useState("clt");

    return (
        <div className="min-h-screen bg-surface pb-24">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-muted/40 border-b border-border">
                {/* Subtle background decoration */}
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div
                        className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/10 to-cta-gold/10 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                        }}
                    />
                </div>

                <div className="container relative pt-12 pb-16 sm:pt-20 sm:pb-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <motion.h1
                            className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl"
                            variants={fadeUp}
                            initial={reduce ? false : "hidden"}
                            animate={reduce ? false : "visible"}
                            custom={0}
                        >
                            Calculadora de <span className="text-cta-gold">Rescisão</span>
                        </motion.h1>

                        <motion.p
                            className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base"
                            variants={fadeUp}
                            initial={reduce ? false : "hidden"}
                            animate={reduce ? false : "visible"}
                            custom={1}
                        >
                            Faça a simulação dos seus direitos trabalhistas ou avalie os riscos de contratação PJ baseados na legislação vigente.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Main Content Area */}
            <section className="container mt-8 sm:-mt-10 relative z-10">
                <AnimateInView delay={0.2} threshold={0}>
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
