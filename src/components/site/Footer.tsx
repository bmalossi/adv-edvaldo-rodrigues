import { Link } from "react-router-dom";
import { site } from "@/config/site";
import { Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";

// Ícone do WhatsApp customizado ou do Lucide
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B1526] text-white border-t border-[#162846]">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Coluna 1: Identidade Institucional */}
          <div className="space-y-4">
            <Link to="/" className="inline-block transition-opacity hover:opacity-90">
              <BrandLogo variant="dark" />
            </Link>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
              Assessoria jurídica estratégica para empresas e pessoas físicas, com atendimento focado em ética, transparência e segurança jurídica.
            </p>
          </div>

          {/* Coluna 2: Links Rápidos */}
          <div>
            <p className="font-serif text-base font-semibold text-white tracking-wide mb-4">
              Links rápidos
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <Link to="/" className="hover:text-[#C9A961] transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <a href="/#empresas" className="hover:text-[#C9A961] transition-colors">
                  Empresas
                </a>
              </li>
              <li>
                <Link to="/areas-de-atuacao" className="hover:text-[#C9A961] transition-colors">
                  Áreas de Atuação
                </Link>
              </li>
              <li>
                <Link to="/conteudo-juridico" className="hover:text-[#C9A961] transition-colors">
                  Conteúdo Jurídico
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="hover:text-[#C9A961] transition-colors">
                  Sobre
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-[#C9A961] transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Áreas de Atuação */}
          <div>
            <p className="font-serif text-base font-semibold text-white tracking-wide mb-4">
              Áreas
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <Link to="/areas-de-atuacao" className="hover:text-[#C9A961] transition-colors">
                  Empresarial
                </Link>
              </li>
              <li>
                <Link to="/areas-de-atuacao" className="hover:text-[#C9A961] transition-colors">
                  Civil
                </Link>
              </li>
              <li>
                <Link to="/areas-de-atuacao" className="hover:text-[#C9A961] transition-colors">
                  Família
                </Link>
              </li>
              <li>
                <Link to="/areas-de-atuacao" className="hover:text-[#C9A961] transition-colors">
                  Trabalhista
                </Link>
              </li>
              <li>
                <Link to="/areas-de-atuacao" className="hover:text-[#C9A961] transition-colors">
                  Criminal
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Contato & Redes */}
          <div>
            <p className="font-serif text-base font-semibold text-white tracking-wide mb-4">
              Contato
            </p>
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-[#C9A961] shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${site.contact.phoneDisplay.replace(/\D/g, "")}`}
                  className="hover:text-[#C9A961] transition-colors"
                >
                  {site.contact.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-[#C9A961] shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${site.contact.email}`}
                  className="hover:text-[#C9A961] transition-colors break-all"
                >
                  {site.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 text-[#C9A961] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{site.contact.addressLine}</span>
              </li>
            </ul>

            {/* Ícones das Redes Sociais */}
            <div className="mt-5 flex items-center gap-3">
              {site.social.instagram && (
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-9 place-items-center rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0D1B30] transition-all duration-200"
                  aria-label="Instagram"
                >
                  <Instagram className="size-4" aria-hidden="true" />
                </a>
              )}
              {site.social.linkedin && (
                <a
                  href={site.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-9 place-items-center rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0D1B30] transition-all duration-200"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-4" aria-hidden="true" />
                </a>
              )}
              <a
                href={`https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
                  "Olá! Gostaria de falar com o escritório Edvaldo Rodrigues Ferreira Advocacia."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-9 place-items-center rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0D1B30] transition-all duration-200"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="size-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Linha Final de Copyright */}
        <div className="mt-14 pt-8 border-t border-[#162846] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {currentYear} Edvaldo Rodrigues Ferreira Sociedade Individual de Advocacia. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/politica-de-privacidade" className="hover:text-[#C9A961] transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/termos-de-uso" className="hover:text-[#C9A961] transition-colors">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
