import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { scaleIn, useReducedMotion } from "../motion/presets";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={scaleIn(reduced)}
      initial={reduced ? false : "hidden"}
      animate="visible"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-12 text-center backdrop-blur-sm"
    >
      <motion.div
        animate={reduced ? {} : { y: [0, -6, 0] }}
        transition={reduced ? {} : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative grid size-16 place-items-center rounded-2xl icon-gradient ring-1 ring-white/10"
      >
        <Icon className="size-7" />
        <div className="absolute inset-0 rounded-2xl bg-shimmer opacity-0 transition-opacity hover:opacity-100" />
      </motion.div>
      <h3 className="mt-5 font-display text-base font-medium tracking-display text-primary">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { delay: 0.2 }}
          className="mt-5"
        >
          {action}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
