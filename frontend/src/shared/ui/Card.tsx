import clsx from "clsx";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "../motion/presets";

type CardProps = Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition"> & {
  delay?: number;
};

export function Card({ className, delay = 0, ...props }: CardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      {...props}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.45, delay, ease: "easeOut" }}
      className={clsx(
        "glass-card transition-all duration-300 hover:shadow-glow-sky",
        className
      )}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  right
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border-subtle/60 px-5 py-4">
      <div className="min-w-0">
        <div className="truncate font-display text-sm font-medium tracking-display text-primary">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs text-muted">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={clsx("px-5 py-4", className)} />;
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  delay = 0
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  delay?: number;
}) {
  return (
    <Card delay={delay} className="group relative overflow-hidden">
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-accent opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.15]" />
      <CardBody>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
          {Icon ? (
            <div className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20 transition-transform duration-300 group-hover:scale-110">
              <Icon className="size-4" />
            </div>
          ) : null}
        </div>
        <div className="mt-2 font-display text-2xl font-bold tracking-display text-primary">
          {value}
        </div>
        {delta ? <div className="mt-1 text-xs text-muted">{delta}</div> : null}
      </CardBody>
    </Card>
  );
}
