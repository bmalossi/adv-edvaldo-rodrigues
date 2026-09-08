import { useState } from "react";
import { practiceAreas, type PracticeArea } from "@/content/areas";
import { AreaCard } from "@/components/site/AreaCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AnimateInView } from "@/components/site/AnimateInView";
import { AreaDetailDialog } from "@/components/site/AreaDetailDialog";
import { SEOHead } from "@/components/site/SEOHead";
import { SEO, buildBreadcrumb } from "@/lib/seo";


export default function AreasAtuacao() {
  const [selectedArea, setSelectedArea] = useState<PracticeArea | null>(null);

  return (
    <div className="container py-12">
      <SEOHead
        title="Áreas de Atuação | Edvaldo Rodrigues Advocacia — Praia Grande/SP"
        description="Conheça as áreas de atuação do escritório Edvaldo Rodrigues Advocacia: Direito Civil, Empresarial, Trabalhista, Previdenciário, Criminal, Família e Militar em Praia Grande/SP."
        canonical="/areas-de-atuacao"
        jsonLd={[
          buildBreadcrumb([
            { name: "Início", url: SEO.siteUrl },
            { name: "Áreas de Atuação", url: `${SEO.siteUrl}/areas-de-atuacao` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Áreas de Atuação — Edvaldo Rodrigues Advocacia",
            description: "Serviços jurídicos oferecidos pelo escritório Edvaldo Rodrigues Advocacia em Praia Grande/SP",
            itemListElement: practiceAreas.map((area, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: area.title,
              description: area.description,
              url: `${SEO.siteUrl}/areas-de-atuacao`,
            })),
          },
        ]}
      />

      <AnimateInView>
        <header className="max-w-3xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Áreas de atuação</h1>
          <p className="mt-3 text-muted-foreground">
            Conheça as principais frentes de atendimento. Se não encontrar seu tema, entre em contato, avaliaremos o caso.
          </p>
        </header>
      </AnimateInView>

      <AnimateInView delay={0.05}>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {practiceAreas.map((a) => (
            <AreaCard
              key={a.key}
              area={a}
              ctaLabel="Ver detalhes"
              onClick={() => setSelectedArea(a)}
            />
          ))}
        </div>
      </AnimateInView>

      <section className="mt-14">
        <AnimateInView>
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Como posso te ajudar</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Clique no serviço de sua necessidade para saber mais detalhes.
            </p>
          </div>
        </AnimateInView>

        <AnimateInView delay={0.05}>
          <Accordion type="single" collapsible className="mt-6">
            {practiceAreas.map((a) => (
              <AccordionItem key={a.key} value={a.key}>
                <AccordionTrigger className="font-medium">{a.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <p className="whitespace-pre-wrap">{a.content}</p>
                    <div className="pt-2">
                      <p className="font-semibold text-foreground mb-2">Principais serviços:</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {a.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-4">
                      <Button onClick={() => setSelectedArea(a)} size="sm" variant="outline">
                        Ver detalhes completos
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimateInView>

        <AnimateInView delay={0.1}>
          <div className="mt-8">
            <Button asChild>
              <Link to="/contato">Falar com o advogado</Link>
            </Button>
          </div>
        </AnimateInView>
      </section>

      <AreaDetailDialog
        area={selectedArea}
        open={!!selectedArea}
        onOpenChange={(open) => !open && setSelectedArea(null)}
      />
    </div>
  );
}
