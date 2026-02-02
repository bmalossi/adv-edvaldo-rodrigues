import * as React from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Pixels (para cima/baixo) no pico do movimento. Recomendado: 6–16. */
  amplitude?: number;
  disabled?: boolean;
};

export function ParallaxCard({ children, className, amplitude = 12, disabled }: Props) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const yRaw = useTransform(scrollYProgress, [0, 1], [amplitude, -amplitude]);
  const y = useSpring(yRaw, { stiffness: 120, damping: 22, mass: 0.7 });

  if (reduce || disabled) {
    return (
      <div ref={ref} className={cn("will-change-transform", className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ y }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
}
