import { ContactForm } from "@/components/site/ContactForm";
import { site } from "@/config/site";
import { Mail, MapPin, Phone } from "lucide-react";
import { MapCard } from "@/components/site/MapCard";
import { ParallaxCard } from "@/components/site/ParallaxCard";
import { AnimateInView } from "@/components/site/AnimateInView";

export default function Contato() {
  return (
    <div className="container py-12">
      <AnimateInView>
        <header className="max-w-3xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Contato</h1>
          <p className="mt-3 text-muted-foreground">Envie sua mensagem e retornaremos o mais breve possível.</p>
        </header>
      </AnimateInView>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <AnimateInView delay={0.05} className="lg:col-span-2">
          <ContactForm />
        </AnimateInView>
        <aside className="space-y-4">
          <ParallaxCard amplitude={14}>
            <MapCard />
          </ParallaxCard>

          <ParallaxCard amplitude={10}>
            <div className="rounded-xl border-premium bg-highlight p-6 text-foreground shadow-card">
              <p className="font-serif text-lg font-semibold">Horário de atendimento</p>
              <p className="mt-2 text-sm text-muted-foreground">{site.contact.hours}</p>
            </div>
          </ParallaxCard>

          <ParallaxCard amplitude={9}>
            <div className="rounded-xl border-premium bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium">Telefone/WhatsApp</p>
                  <p className="text-sm text-muted-foreground">{site.contact.phoneDisplay}</p>
                </div>
              </div>
            </div>
          </ParallaxCard>

          <ParallaxCard amplitude={8}>
            <div className="rounded-xl border-premium bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium">E-mail</p>
                  <p className="text-sm text-muted-foreground">{site.contact.email}</p>
                </div>
              </div>
            </div>
          </ParallaxCard>

          <ParallaxCard amplitude={7}>
            <div className="rounded-xl border-premium bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium">Endereço</p>
                  <p className="text-sm text-muted-foreground">{site.contact.addressLine}</p>
                </div>
              </div>
            </div>
          </ParallaxCard>
        </aside>
      </div>
    </div>
  );
}
