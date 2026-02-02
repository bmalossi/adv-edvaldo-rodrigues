import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

type Props = {
  className?: string;
};

export function MapCard({ className }: Props) {
  return (
    <div className={className ?? ""}>
      <div className="overflow-hidden rounded-xl border-premium bg-card shadow-card transition-shadow duration-300 hover:shadow-card-hover">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-accent" aria-hidden="true" />
            <p className="font-medium">Mapa / Localização</p>
          </div>
          {site.contact.googleMapsLink ? (
            <Button asChild variant="outline" size="sm">
              <a href={site.contact.googleMapsLink} target="_blank" rel="noreferrer">
                Abrir no Maps
              </a>
            </Button>
          ) : null}
        </div>

        {site.contact.googleMapsEmbedUrl ? (
          <iframe
            title="Localização no Google Maps"
            src={site.contact.googleMapsEmbedUrl}
            className="h-64 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Configure o mapa em <code>src/config/site.ts</code> (googleMapsEmbedUrl ou googleMapsLink).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
