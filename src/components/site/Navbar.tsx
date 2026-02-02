import { NavLink } from "@/components/NavLink";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Phone } from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/areas-de-atuacao", label: "Áreas" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function Navbar() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full bg-transparent">
      <div
        className={
          isHome
            ? isScrolled
              ? "border-b border-primary-foreground/10 bg-foreground/45 backdrop-blur-md supports-[backdrop-filter]:bg-foreground/35"
              : "border-b border-transparent bg-gradient-to-b from-foreground/55 to-transparent backdrop-blur-sm"
            : "border-b border-border/60 bg-background/75 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/55"
        }
      >
        <div className="container flex h-20 items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div
              className={
                isHome
                  ? "grid size-10 place-items-center rounded-xl border border-primary-foreground/10 bg-background/5"
                  : "grid size-10 place-items-center rounded-xl border border-border/60 bg-card/60 backdrop-blur"
              }
            >
              <BrandLogo sizeClassName="h-9" className="max-w-[36px]" />
            </div>
          </NavLink>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={
                  isHome
                    ? "text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                    : "text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                }
                activeClassName={isHome ? "text-primary-foreground" : "text-foreground"}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              className="hidden md:inline-flex"
            >
              <NavLink to="/contato">
                <Phone className="size-4" aria-hidden="true" />
                Consulta Agora
              </NavLink>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant={isHome ? "ghost" : "outline"}
                  size="icon"
                  className={isHome ? "md:hidden text-primary-foreground hover:bg-background/10" : "md:hidden"}
                  aria-label="Abrir menu"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px]">
                <SheetHeader>
                  <SheetTitle className="font-serif">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-3">
                  {links.map((l) => (
                    <Button key={l.to} variant="ghost" asChild className="justify-start">
                      <NavLink to={l.to}>{l.label}</NavLink>
                    </Button>
                  ))}
                  <Button asChild className="mt-2">
                    <NavLink to="/contato">
                      <Phone className="size-4" aria-hidden="true" />
                      Consulta
                    </NavLink>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
