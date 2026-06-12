import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeInUp, useReducedMotion } from "../motion/presets";

export function PageHeader({
  title,
  subtitle,
  right
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={fadeInUp(reduced)}
      initial={reduced ? false : "hidden"}
      animate="visible"
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className="truncate font-display text-3xl font-bold tracking-display text-primary sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-muted">{subtitle}</p>
        ) : null}
        <div className="mt-4 h-0.5 w-20 rounded-full bg-gradient-primary opacity-90" />
      </div>
      {right ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduced ? { duration: 0 } : { delay: 0.15, duration: 0.35 }}
          className="flex shrink-0 flex-wrap gap-2"
        >
          {right}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
