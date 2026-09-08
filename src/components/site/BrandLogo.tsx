import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  iconClassName?: string;
  sizeClassName?: string;
  variant?: "dark" | "light";
  compact?: boolean;
};

export function BrandLogo({
  className,
  showText = true,
  textClassName,
  iconClassName,
  sizeClassName,
  variant = "dark",
  compact = false,
}: BrandLogoProps) {
  const isDark = variant === "dark";

  return (
    <div className={cn("inline-flex items-center gap-2.5 sm:gap-3 select-none min-w-0 max-w-full", className)}>
      {/* Emblema fiel sem fundo branco, perfeitamente integrado ao design */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center",
          sizeClassName || iconClassName || (compact ? "h-9 w-auto" : "h-9 sm:h-11 w-auto")
        )}
      >
        <img
          src={isDark ? "/logo-emblem-header.png" : "/logo-emblem.png"}
          alt="Logo Edvaldo Rodrigues Ferreira"
          className={cn(
            "w-auto object-contain",
            compact ? "h-8 lg:h-9" : "h-8 sm:h-10 lg:h-11"
          )}
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Tipografia Institucional */}
      {showText && (
        compact ? (
          /* Modo Compacto (ex: Sidebar e Topbar do Admin) */
          <div className={cn("flex flex-col min-w-0 justify-center overflow-hidden", textClassName)}>
            <span
              className={cn(
                "font-serif text-xs lg:text-[13px] font-semibold tracking-wide leading-tight uppercase truncate",
                isDark ? "text-white" : "text-[#0D1B30]"
              )}
              title="Edvaldo Rodrigues Ferreira"
            >
              Edvaldo Rodrigues Ferreira
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#C9A961] font-semibold leading-tight mt-0.5 truncate">
              Advocacia
            </span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wider font-medium leading-tight mt-0.5 truncate",
                isDark ? "text-slate-400" : "text-slate-500"
              )}
            >
              OAB/SP 465.818
            </span>
          </div>
        ) : (
          /* Modo Padrão (Navbar e Footer do site) */
          <div className={cn("flex flex-col min-w-0 justify-center overflow-hidden", textClassName)}>
            <span
              className={cn(
                "font-serif text-[13px] sm:text-sm lg:text-base font-semibold tracking-wide sm:tracking-wider leading-tight uppercase whitespace-nowrap truncate",
                isDark ? "text-white" : "text-[#0D1B30]"
              )}
            >
              Edvaldo Rodrigues Ferreira
            </span>

            {/* Versão Desktop: Exibe Sociedade Individual de Advocacia + OAB */}
            <span className="hidden sm:block text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#C9A961] font-semibold leading-tight mt-0.5 whitespace-nowrap">
              Sociedade Individual de Advocacia
            </span>
            <span
              className={cn(
                "hidden sm:block text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-medium leading-tight mt-0.5 whitespace-nowrap",
                isDark ? "text-slate-300" : "text-slate-500"
              )}
            >
              OAB/SP 465.818
            </span>

            {/* Versão Mobile: Ajuste refinado em linha única */}
            <span className="sm:hidden text-[9px] uppercase tracking-[0.16em] text-[#C9A961] font-semibold leading-tight mt-0.5 whitespace-nowrap">
              Advocacia · OAB/SP 465.818
            </span>
          </div>
        )
      )}
    </div>
  );
}
