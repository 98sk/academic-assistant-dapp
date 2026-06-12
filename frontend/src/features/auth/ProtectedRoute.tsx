import { Outlet } from "react-router-dom";
import { useAuthStore } from "./store";
import { AuthGate } from "./AuthGate";

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);

  const ok = status === "authenticated" && !!session && Date.now() < session.expiresAtMs;
  if (!ok) return <AuthGate />;
  return <Outlet />;
}
