import { useEffect, useState } from "react";
import type { Transition, Variants } from "framer-motion";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

const instant: Transition = { duration: 0 };

export function pageTransition(reduced: boolean): Transition {
  return reduced ? instant : { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] };
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
};

export const staggerContainer = (reduced: boolean): Variants => ({
  hidden: {},
  show: {
    transition: reduced ? {} : { staggerChildren: 0.07, delayChildren: 0.05 }
  }
});

export const staggerItem = (reduced: boolean): Variants => ({
  hidden: reduced ? {} : { opacity: 0, y: 16 },
  show: reduced ? {} : { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
});

export const fadeInUp = (reduced: boolean): Variants => ({
  hidden: reduced ? {} : { opacity: 0, y: 20 },
  visible: reduced ? {} : { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
});

export const scaleIn = (reduced: boolean): Variants => ({
  hidden: reduced ? {} : { opacity: 0, scale: 0.92 },
  visible: reduced ? {} : { opacity: 1, scale: 1, transition: { duration: 0.35, ease: "easeOut" } }
});
