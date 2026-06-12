import { Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { SidebarNav, type NavItem } from "./SidebarNav";
import { Topbar } from "./Topbar";
import { PageTransition } from "../motion/PageTransition";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings
} from "lucide-react";

const navItems: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/announcements", label: "Annonces", icon: Megaphone },
  { to: "/assistant", label: "Assistant IA", icon: MessageSquare },
  { to: "/analytics", label: "Analytique", icon: BarChart3 },
  { to: "/settings", label: "Paramètres", icon: Settings }
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const activeLabel = useMemo(() => {
    const match =
      navItems.find((i) => i.to !== "/" && location.pathname.startsWith(i.to)) ??
      navItems.find((i) => i.to === "/");
    return match?.label ?? "Tableau de bord";
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <SidebarNav
        items={navItems}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="lg:pl-72">
        <Topbar
          title={activeLabel}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="page-shell px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
