import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { practiceAreas } from "@/content/areas";
import { AreaCard } from "@/components/site/AreaCard";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/site/ContactForm";
import { site } from "@/config/site";
import { ArrowRight, ChevronDown } from "lucide-react";
import { testimonials } from "@/content/testimonials";
import { TestimonialsSection } from "@/components/site/TestimonialsSection";
import { MapCard } from "@/components/site/MapCard";
import { ParallaxCard } from "@/components/site/ParallaxCard";
import { AnimateInView } from "@/components/site/AnimateInView";
import fotoSobre from "@/assets/foto-sobre.png";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 + i * 0.08 } }),
};

export default function Home() {
  const reduce = useReducedMotion();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-hero-photo" aria-hidden="true" />
          <div className="absolute inset-0 bg-hero" aria-hidden="true" />
          <div className="container relative flex min-h-[100svh] items-end pb-20 pt-28 sm:items-center sm:pb-16 sm:pt-24">
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
                Advocacia Ética e
                <span className="block text-hero">Comprometida</span>
              </motion.h1>

              <motion.p
                className="mt-6 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? false : "visible"}
                custom={2}
              >
                Serviço personalizado para suas demandas jurídicas, das mais simples às mais complexas, com clareza,
                responsabilidade e estratégia.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? false : "visible"}
                custom={3}
              >
                <Button asChild className="bg-cta-gold text-secondary-foreground hover:opacity-95">
                  <Link to="/contato">Conversar agora</Link>
                </Button>
                <Button asChild variant="outline" className="border-primary-foreground/20 bg-background/10 text-primary-foreground hover:bg-background/15">
                  <Link to="/areas-de-atuacao">Ver áreas de atuação</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-primary-foreground/60">
          <ChevronDown className="size-6 animate-bounce" aria-hidden="true" />
        </div>
      </section>

      <section className="bg-surface">
        <div className="container grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <AnimateInView>
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Sobre</h2>
              <p className="mt-4 text-muted-foreground">
                {site.brand.fullName} atua com postura ética e profissional, buscando soluções responsáveis e alinhadas ao
                seu objetivo.
              </p>
              <p className="mt-4 text-muted-foreground">
                Aqui você encontra um atendimento direto, com foco no que importa: clareza, prazos e estratégia.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Atendimento sob agendamento", "Comunicação clara", "Estratégia e responsabilidade", "Foco em prazos"].map((v) => (
                  <li key={v} className="rounded-lg border-premium bg-card px-4 py-3 text-sm text-muted-foreground shadow-card">
                    {v}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button asChild variant="outline">
                  <Link to="/sobre">Conheça a trajetória</Link>
                </Button>
              </div>
            </div>
          </AnimateInView>

          <AnimateInView delay={0.05}>
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-xl border-premium bg-background shadow-card">
                <img
                  src={fotoSobre}
                  alt="Foto profissional no escritório"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-5 -right-5 rounded-xl border-premium bg-card/95 px-5 py-4 shadow-card backdrop-blur">
                <p className="font-serif text-3xl font-semibold text-foreground">4+</p>
                <p className="text-xs text-muted-foreground">Anos de experiência</p>
              </div>
            </div>
          </AnimateInView>
        </div>
      </section>

      <section className="section-divider-y bg-surface-2">
        <div className="container py-16">
          <AnimateInView>
            <header className="max-w-2xl">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Áreas de atuação</h2>
              <p className="mt-3 text-muted-foreground">
                Atendimento com foco em estratégia e comunicação clara, para você tomar decisões com segurança.
              </p>
            </header>
          </AnimateInView>

          <AnimateInView delay={0.05}>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {practiceAreas.map((a) => (
                <AreaCard key={a.key} area={a} ctaTo="/areas-de-atuacao" ctaLabel="Ver detalhes" />
              ))}
            </div>
          </AnimateInView>

          <AnimateInView delay={0.1}>
            <div className="mt-10">
              <Button asChild>
                <Link to="/areas-de-atuacao">
                  Ver todas as áreas
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </AnimateInView>
        </div>
      </section>

      {site.features.testimonials && <TestimonialsSection items={testimonials} />}

      <section id="contato" className="bg-surface-2">
        <div className="container py-16">
          <AnimateInView>
            <header className="max-w-2xl">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Contato</h2>
              <p className="mt-3 text-muted-foreground">Envie uma mensagem e retornaremos o mais breve possível.</p>
            </header>
          </AnimateInView>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <AnimateInView delay={0.05} className="lg:col-span-2">
              <ContactForm />
            </AnimateInView>
            <aside className="space-y-4">
              <ParallaxCard amplitude={10}>
                <div className="rounded-xl border-premium bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
                  <p className="font-serif text-lg font-semibold">Atendimento</p>
                  <p className="mt-2 text-sm text-muted-foreground">{site.contact.hours}</p>
                  <p className="mt-4 text-sm text-muted-foreground">{site.contact.addressLine}</p>
                </div>
              </ParallaxCard>

              <ParallaxCard amplitude={14}>
                <MapCard />
              </ParallaxCard>

              <ParallaxCard amplitude={8}>
                <div className="rounded-xl border-premium bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
                  <p className="font-serif text-lg font-semibold">E-mail</p>
                  <p className="mt-2 text-sm text-muted-foreground">{site.contact.email}</p>
                </div>
              </ParallaxCard>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
