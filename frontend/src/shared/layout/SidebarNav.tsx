import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, Sparkles, X } from "lucide-react";
import { useReducedMotion } from "../motion/presets";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-11 place-items-center rounded-xl icon-gradient">
        <GraduationCap className="size-5" />
        <div className="absolute inset-0 rounded-xl bg-shimmer opacity-30" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm font-bold tracking-display text-primary">
          Assistant Académique
        </div>
        <div className="text-xs text-muted">Tableau de bord</div>
      </div>
    </div>
  );
}

function NavItems({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const reduced = useReducedMotion();

  return (
    <nav className="mt-8 space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "text-primary shadow-sm ring-1 ring-green-600/30"
                : "text-muted hover:bg-white/5 hover:text-primary"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && !reduced ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-700/20 to-green-600/10 ring-1 ring-green-600/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <item.icon
                className={clsx(
                  "relative z-10 size-4 transition-transform duration-200",
                  isActive ? "text-green-400" : "group-hover:scale-110 group-hover:text-green-400"
                )}
              />
              <span className="relative z-10">{item.label}</span>
              {isActive ? (
                <span className="relative z-10 ml-auto size-1.5 rounded-full bg-green-glow shadow-glow" />
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function SidebarNav({
  items,
  mobileOpen,
  onCloseMobile
}: {
  items: NavItem[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
        <div className="glass-sidebar relative flex grow flex-col gap-y-5 overflow-hidden px-6 py-6">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-green-glow/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-accent/8 blur-3xl" />
          <div className="relative">
            <Brand />
          </div>
          <NavItems items={items} />
          <div className="relative mt-auto rounded-2xl border border-white/15 bg-white/10 p-4 text-xs text-muted backdrop-blur-sm">
            <div className="flex items-center gap-2 font-semibold text-green-400">
              <Sparkles className="size-3.5" />
              Blockchain + RAG
            </div>
            <p className="mt-2 leading-relaxed">
              Documents certifiés on-chain et assistant IA sur vos PDF académiques.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" aria-hidden={false}>
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-app/80 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={reduced ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: "-100%" }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 }}
              className="glass-sidebar absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col p-5"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="rounded-xl p-2 text-muted transition hover:bg-white/10 hover:text-primary"
                  aria-label="Fermer la navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              <NavItems items={items} onNavigate={onCloseMobile} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
