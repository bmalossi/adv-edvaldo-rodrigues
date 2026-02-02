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
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Sobre {site.brand.name}</h1>
          <p className="mt-3 text-muted-foreground">
            {site.brand.fullName} — {site.brand.oab}. Atendimento responsável, com foco em clareza e estratégia.
          </p>
        </header>
      </AnimateInView>

      <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-start">
        <AnimateInView delay={0.05}>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Somos uma equipe de assessoria jurídica que tem como objetivo principal prestar serviços especializados nas áreas em que a empresa necessitar com o objetivo de prevenir gastos e danos, diminuir erros e falhas por falta de conhecimento jurídico bem como procurar formas de tornar a área jurídica da empresa benéfica e satisfatória.
            </p>
            <p>
              Atuamos de forma consultiva e preventiva, auxiliando empresas a se adequarem à legislação vigente e a evitarem litígios. Além disso, oferecemos assessoria em processos judiciais, sempre buscando as melhores soluções para nossos clientes.
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

        <AnimateInView delay={0.1}>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="font-serif text-xl font-semibold">Credenciais (placeholder)</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Formação e especializações</li>
              <li>Experiência profissional</li>
              <li>Participações e certificações</li>
            </ul>
          </div>
        </AnimateInView>
      </div>
    </div>
  );
}
