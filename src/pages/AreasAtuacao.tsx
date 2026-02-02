import { practiceAreas } from "@/content/areas";
import { AreaCard } from "@/components/site/AreaCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AnimateInView } from "@/components/site/AnimateInView";

export default function AreasAtuacao() {
  return (
    <div className="container py-12">
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
            <AreaCard key={a.key} area={a} ctaLabel="Agendar consulta" ctaTo="/contato" />
          ))}
        </div>
      </AnimateInView>

      <section className="mt-14">
        <AnimateInView>
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Como ajudamos</h2>
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
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Atendimento com análise inicial, levantamento de documentos e definição de estratégia.</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {a.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
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
    </div>
  );
}
