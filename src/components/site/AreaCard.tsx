import { cn } from "@/lib/utils";
import type { PracticeArea } from "@/content/areas";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Props = {
  area: PracticeArea;
  className?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCta?: () => void;
};

export function AreaCard({ area, className, ctaLabel = "Saiba mais", ctaTo, onCta }: Props) {
  const Icon = area.icon;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border-premium bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="p-6">
        <div className={cn("mb-5 grid size-16 place-items-center rounded-xl", area.gradientClass)}>
          <Icon className="size-8 text-primary-foreground" aria-hidden="true" />
        </div>

        <h3 className="font-serif text-xl font-semibold tracking-tight">{area.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{area.description}</p>

        <ul className="mt-5 space-y-2">
          {area.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 text-accent" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Button type="button" variant="link" className="h-auto p-0 font-semibold text-primary" onClick={onCta} asChild={!!ctaTo}>
            {ctaTo ? (
              <Link to={ctaTo}>
                {ctaLabel}
                <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ) : (
              <span>
                {ctaLabel}
                <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            )}
          </Button>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(650px 220px at 20% 0%, hsl(var(--secondary) / 0.10), transparent 60%)",
        }}
      />
    </article>
  );
}
