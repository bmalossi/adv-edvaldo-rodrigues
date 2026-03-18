import { NavLink } from "@/components/NavLink";
import { site } from "@/config/site";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/site/BrandLogo";

const socialLinks = [
  { key: "instagram", label: "Instagram", icon: Instagram, href: site.social.instagram },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, href: site.social.linkedin },
  { key: "facebook", label: "Facebook", icon: Facebook, href: site.social.facebook },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-background">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-card">
                <BrandLogo sizeClassName="h-9" className="max-w-[36px]" />
              </div>
              <div>
                <p className="font-serif text-lg font-semibold leading-tight">{site.brand.name}</p>
                <p className="text-sm text-muted-foreground">{site.brand.subtitle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Advocacia ética e comprometida, oferecendo atendimento personalizado para suas demandas jurídicas.
            </p>

            <div className="mt-5 flex gap-3">
              {socialLinks
                .filter((s) => !!s.href)
                .map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "grid size-10 place-items-center rounded-lg border bg-card text-muted-foreground transition-colors hover:text-foreground",
                      )}
                      aria-label={s.label}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </a>
                  );
                })}
            </div>
          </div>

          <nav aria-label="Links rápidos">
            <p className="font-serif text-base font-semibold">Links rápidos</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <NavLink to="/" className="text-muted-foreground hover:text-foreground">
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/areas-de-atuacao" className="text-muted-foreground hover:text-foreground">
                  Áreas de atuação
                </NavLink>
              </li>
              <li>
                <NavLink to="/calculadora" className="text-muted-foreground hover:text-foreground">
                  Calculadora
                </NavLink>
              </li>
              <li>
                <NavLink to="/sobre" className="text-muted-foreground hover:text-foreground">
                  Sobre
                </NavLink>
              </li>
              <li>
                <NavLink to="/contato" className="text-muted-foreground hover:text-foreground">
                  Contato
                </NavLink>
              </li>
              <li>
                <NavLink to="/termos-de-uso" className="text-muted-foreground hover:text-foreground">
                  Termos de uso
                </NavLink>
              </li>
              <li>
                <NavLink to="/politica-de-privacidade" className="text-muted-foreground hover:text-foreground">
                  Política de privacidade
                </NavLink>
              </li>
            </ul>
          </nav>

          <div>
            <p className="font-serif text-base font-semibold">Contato</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <Phone className="mt-0.5 size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">Telefone</p>
                  <p>{site.contact.phoneDisplay}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="mt-0.5 size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">E-mail</p>
                  <p>{site.contact.email}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">Endereço</p>
                  <p>{site.contact.addressLine}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>Guiado por Deus e desenvolvido por <a href="https://automab.dev" target="_blank" rel="noopener noreferrer">Automab.dev</a> © {new Date().getFullYear()} {site.brand.name} {site.brand.subtitle}. Todos os direitos reservados.</p>
          <p>{site.brand.oab}</p>
        </div>
      </div>
    </footer>
  );
}
