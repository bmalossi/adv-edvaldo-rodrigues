import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Testimonial } from "@/content/testimonials";
import { Quote } from "lucide-react";
import { ParallaxCard } from "@/components/site/ParallaxCard";

type Props = {
  items: Testimonial[];
};

export function TestimonialsSection({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section className="bg-surface" aria-label="Depoimentos">
      <div className="container py-16">
        <header className="max-w-2xl">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Depoimentos</h2>
          <p className="mt-3 text-muted-foreground">Relatos de clientes sobre a condução do atendimento e a comunicação.</p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, idx) => (
            <ParallaxCard key={`${t.name}-${idx}`} amplitude={8} className="h-full">
              <Card className="h-full rounded-xl border-premium shadow-card transition-shadow duration-300 hover:shadow-card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-serif text-lg">
                    <span className="grid size-8 place-items-center rounded-lg bg-muted/60">
                      <Quote className="size-4 text-accent" aria-hidden="true" />
                    </span>
                    <span>{t.name}</span>
                  </CardTitle>
                  {(t.role || t.city) && (
                    <p className="text-sm text-muted-foreground">{[t.role, t.city].filter(Boolean).join(" • ")}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">“{t.content}”</p>
                </CardContent>
              </Card>
            </ParallaxCard>
          ))}
        </div>
      </div>
    </section>
  );
}
