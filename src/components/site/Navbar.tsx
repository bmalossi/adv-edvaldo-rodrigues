import { NavLink } from "@/components/NavLink";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Phone, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Início" },
  { to: "/#empresas", label: "Empresas" },
  { to: "/areas-de-atuacao", label: "Áreas de Atuação" },
  { to: "/conteudo-juridico", label: "Conteúdo Jurídico" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function Navbar() {
  const { pathname, hash } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rolagem suave para links com hash (ex: /#empresas)
  const handleNavClick = (to: string) => {
    if (to.startsWith("/#")) {
      const id = to.replace("/#", "");
      const elem = document.getElementById(id);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full transition-all duration-300">
      <div
        className={cn(
          "w-full transition-all duration-300 border-b",
          isScrolled
            ? "bg-[#0D1B30]/95 backdrop-blur-md border-[#162846] shadow-lg shadow-black/20"
            : "bg-[#0D1B30] border-[#162846]/60"
        )}
      >
        <div className="container flex h-20 items-center justify-between">
          {/* Logo institucional */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-90 min-w-0 shrink">
            <BrandLogo variant="dark" />
          </Link>

          {/* Menu central desktop */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
            {links.map((l) => {
              const isEmpresas = l.to === "/#empresas";
              const isActive = isEmpresas
                ? hash === "#empresas"
                : pathname === l.to;

              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => handleNavClick(l.to)}
                  className={cn(
                    "text-xs uppercase tracking-wider font-medium transition-colors py-2 relative",
                    isActive
                      ? "text-[#C9A961] font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#C9A961]"
                      : "text-slate-200 hover:text-[#C9A961]"
                  )}
                >
                  {l.label}
                </NavLink>
              );
            })}
          </nav>

          {/* CTA e Ações da Direita */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button
              asChild
              className="hidden sm:inline-flex bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-semibold text-xs uppercase tracking-wider h-10 px-5 rounded-md shadow-sm transition-all duration-200"
            >
              <a
                href={`https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
                  "Olá! Gostaria de falar com o escritório Edvaldo Rodrigues Ferreira Advocacia."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="size-3.5 fill-current" aria-hidden="true" />
                Fale com o escritório
              </a>
            </Button>

            <Link
              to="/admin"
              className="hidden sm:inline-flex text-slate-400/40 hover:text-[#C9A961] transition-colors p-1"
              title="Acesso Administrativo"
            >
              <Settings className="size-4" />
            </Link>

            {/* Menu Mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-white hover:bg-white/10"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="size-6" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-[#0D1B30] border-l border-[#162846] text-white">
                <SheetHeader className="border-b border-[#162846] pb-4">
                  <SheetTitle className="text-left font-serif text-white">
                    <BrandLogo variant="dark" />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {links.map((l) => (
                    <Button
                      key={l.to}
                      variant="ghost"
                      asChild
                      className="justify-start text-sm uppercase tracking-wider text-slate-200 hover:text-[#C9A961] hover:bg-white/5"
                    >
                      <NavLink to={l.to} onClick={() => handleNavClick(l.to)}>
                        {l.label}
                      </NavLink>
                    </Button>
                  ))}
                  <div className="pt-4 mt-2 border-t border-[#162846]">
                    <Button asChild className="w-full bg-[#C9A961] text-[#0D1B30] hover:bg-[#B8935A] font-semibold text-xs uppercase tracking-wider">
                      <a
                        href={`https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(
                          "Olá! Gostaria de falar com o escritório Edvaldo Rodrigues Ferreira Advocacia."
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Phone className="size-4 fill-current mr-2" aria-hidden="true" />
                        Fale com o escritório
                      </a>
                    </Button>
                    <div className="pt-2 text-center">
                      <Link
                        to="/admin"
                        className="text-[11px] text-slate-400 hover:text-[#C9A961] transition-colors inline-flex items-center gap-1.5"
                      >
                        <Settings className="size-3.5" />
                        Painel Administrativo
                      </Link>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
