import { useEffect } from "react";
import { initWalletListeners, useWalletStore } from "./wallet";
import { useAuthStore } from "./store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clearSession = useAuthStore((s) => s.clearSession);
  const refreshFromProvider = useWalletStore((s) => s.refreshFromProvider);

  useEffect(() => {
    refreshFromProvider().catch(() => {});
    const cleanup = initWalletListeners({ onDisconnect: clearSession });
    return cleanup;
  }, [clearSession, refreshFromProvider]);

  return children;
}

