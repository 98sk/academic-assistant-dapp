import { Menu, FilePlus2 } from "lucide-react";
import { motion } from "framer-motion";
import { ConnectWalletButton } from "../../features/auth/ConnectWalletButton";
import { useAuth } from "../../features/auth/useAuth";
import { ButtonLink } from "../ui/ButtonLink";
import { useReducedMotion } from "../motion/presets";

function RoleBadges() {
  const auth = useAuth();
  if (!auth.isAuthenticated || !auth.session) return null;

  const { roles, group } = auth.session;
  const badges: Array<{ label: string; className: string }> = [];

  if (roles.isAdmin)
    badges.push({
      label: "Admin",
      className: "bg-green-glow/15 text-green-400 ring-green-glow/25"
    });
  if (roles.isProfessor)
    badges.push({
      label: "Professeur",
      className: "bg-green-700/15 text-green-400 ring-green-600/25"
    });
  if (roles.isStudent)
    badges.push({
      label: "Étudiant",
      className: "bg-success/15 text-success ring-success/25"
    });
  if (group)
    badges.push({
      label: group,
      className: "bg-surface text-muted ring-border-subtle"
    });

  if (badges.length === 0) return null;

  return (
    <div className="hidden items-center gap-1.5 md:flex">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm ${b.className}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function Topbar({
  title,
  onOpenMobileNav
}: {
  title: string;
  onOpenMobileNav: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <header className="glass-topbar sticky top-0 z-20">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-xl p-2 text-muted transition-all duration-200 hover:bg-surface/60 hover:text-primary lg:hidden"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <motion.div
            key={title}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.25 }}
            className="truncate font-display text-sm font-medium tracking-display text-primary"
          >
            {title}
          </motion.div>
          <div className="hidden text-xs text-muted sm:block">
            Espace académique décentralisé
          </div>
        </div>

        <RoleBadges />

        <div className="flex items-center gap-2">
          <ButtonLink
            to="/documents"
            variant="success"
            className="hidden sm:inline-flex"
            leftIcon={<FilePlus2 className="size-4" />}
          >
            Document
          </ButtonLink>
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
