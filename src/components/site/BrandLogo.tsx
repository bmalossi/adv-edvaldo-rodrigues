import logo from "@/assets/logo.jpg";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Alt adicional; por padrão usa o nome da marca */
  alt?: string;
  /** Tamanho do logo (altura). Use classes Tailwind, ex: "h-10" */
  sizeClassName?: string;
};

export function BrandLogo({ className, alt = "Logo Edvaldo Rodrigues Advocacia", sizeClassName = "h-10" }: BrandLogoProps) {
  return (
    <img
      src={logo}
      alt={alt}
      className={cn(
        "w-auto rounded-lg object-contain",
        // leve destaque para combinar com o brilho do logo
        "shadow-sm",
        sizeClassName,
        className,
      )}
      loading="eager"
      decoding="async"
    />
  );
}
