import clsx from "clsx";

export type ButtonVariant =
  | "primary"
  | "wallet"
  | "accent"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "ghost";

const base =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-emerald-800 to-green-700 text-white shadow-md shadow-green-900/50 hover:from-emerald-700 hover:to-green-600 hover:scale-[1.02] active:scale-[0.98]",
  wallet:
    "min-h-11 px-5 py-3 bg-gradient-to-br from-emerald-800 to-green-700 text-white shadow-lg shadow-green-900/50 hover:from-emerald-700 hover:to-green-600 hover:scale-[1.02] active:scale-[0.98]",
  accent:
    "bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-900/30 hover:from-sky-400 hover:to-cyan-500 hover:scale-[1.02] active:scale-[0.98]",
  secondary:
    "border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm hover:border-white/50 hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]",
  success:
    "bg-emerald-600 text-white shadow-md shadow-emerald-900/40 hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98]",
  warning:
    "bg-amber-600 text-white shadow-md shadow-amber-900/30 hover:bg-amber-500 hover:scale-[1.02] active:scale-[0.98]",
  danger:
    "border border-red-800 bg-red-900 text-red-50 shadow-md hover:bg-red-800 hover:scale-[1.02] active:scale-[0.98]",
  ghost:
    "border border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 active:scale-[0.98]"
};

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return clsx(base, variants[variant], className);
}
