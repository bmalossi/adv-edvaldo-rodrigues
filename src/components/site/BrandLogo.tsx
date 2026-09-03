import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  iconClassName?: string;
  variant?: "dark" | "light";
};

export function BrandLogo({
  className,
  showText = true,
  textClassName,
  iconClassName,
  variant = "dark",
}: BrandLogoProps) {
  const isDark = variant === "dark";

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      {/* Emblema fiel sem fundo branco, perfeitamente integrado ao design */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center",
          iconClassName || "h-11 w-auto"
        )}
      >
        <img
          src={isDark ? "/logo-emblem-header.png" : "/logo-emblem.png"}
          alt="Logo Edvaldo Rodrigues Ferreira"
          className="h-10 sm:h-11 w-auto object-contain"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Tipografia Institucional */}
      {showText && (
        <div className={cn("flex flex-col", textClassName)}>
          <span
            className={cn(
              "font-serif text-sm sm:text-base font-semibold tracking-wider leading-tight uppercase",
              isDark ? "text-white" : "text-[#0D1B30]"
            )}
          >
            Edvaldo Rodrigues Ferreira
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#C9A961] font-semibold leading-tight mt-0.5">
            Sociedade Individual de Advocacia
          </span>
          <span
            className={cn(
              "text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-medium leading-tight mt-0.5",
              isDark ? "text-slate-300" : "text-slate-500"
            )}
          >
            OAB/SP 465.818
          </span>
        </div>
      )}
    </div>
  );
}
