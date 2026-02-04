import { site } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { practiceAreas } from "@/content/areas";
import { AnimateInView } from "@/components/site/AnimateInView";

export default function Sobre() {
  return (
    <div className="container py-12">
      <AnimateInView>
        <header className="max-w-3xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Sobre o Advogado</h1>
          <p className="mt-3 text-muted-foreground">
            {site.brand.fullName}, advogado regularmente inscrito na {site.brand.oab}, com atuação abrangente e estratégica nas principais áreas do Direito, sempre pautado pela ética, responsabilidade e compromisso com o resultado.
          </p>
        </header>
      </AnimateInView>

      <div className="mt-10 max-w-3xl">
        <AnimateInView delay={0.05}>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Minha atuação é marcada por uma visão técnica, analítica e prática do Direito, construída a partir da vivência diária em processos judiciais e extrajudiciais, acompanhando de perto cada etapa das demandas confiadas ao escritório.
            </p>
            <p>
              Atuo de forma personalizada, entendendo que cada caso possui suas particularidades e exige uma estratégia jurídica própria.
            </p>
            <p>
              Possuo experiência nas áreas Trabalhista, Cível, Família e Sucessões, Previdenciária, Criminal, Empresarial, Tributária, Imobiliária e Direito Militar, o que me permite oferecer uma assessoria jurídica completa, integrada e segura, tanto para pessoas físicas quanto jurídicas.
            </p>
            <p>
              Acredito que advocacia vai muito além de petições e processos: trata-se de orientar, proteger direitos e oferecer soluções jurídicas claras, com transparência e responsabilidade.
            </p>
            <p>
              Meu compromisso é atuar com seriedade, técnica e dedicação, mantendo o cliente sempre informado, seguro e amparado juridicamente, buscando não apenas resolver conflitos, mas evitar que eles aconteçam.
            </p>

            <div className="pt-2">
              <p className="font-serif text-xl font-semibold text-foreground">Áreas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {practiceAreas.map((a) => (
                  <Badge key={a.key} variant="secondary" className="rounded-full">
                    {a.title}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button asChild>
                <Link to="/contato">Entre em contato</Link>
              </Button>
            </div>
          </div>
        </AnimateInView>
      </div>
    </div>
  );
}
