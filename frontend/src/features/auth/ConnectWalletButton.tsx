import { useCallback } from "react";
import { Wallet } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { formatWalletConnectError, useWalletStore } from "./wallet";
import { useAuth } from "./useAuth";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletButton() {
  const wallet = useWalletStore();
  const auth = useAuth();
  const toast = useToast();

  const handleConnect = useCallback(() => {
    if (wallet.isConnecting) return;

    wallet.connect().catch((e) => {
      toast.error(formatWalletConnectError(e));
    });
  }, [toast, wallet]);

  const handleLogin = () => {
    auth
      .login()
      .then(() => toast.success("Session ouverte avec succès."))
      .catch((e) => {
        const msg = auth.error ?? String(e);
        toast.error(msg);
      });
  };

  const handleDisconnect = () => {
    auth.logout();
    wallet.disconnect();
    toast.success("Portefeuille déconnecté.");
  };

  if (wallet.status === "disconnected") {
    return (
      <Button
        variant="wallet"
        leftIcon={<Wallet className="size-4" />}
        loading={wallet.isConnecting}
        disabled={wallet.isConnecting}
        onClick={handleConnect}
      >
        {wallet.isConnecting ? "Connexion…" : "Connecter le portefeuille"}
      </Button>
    );
  }

  const addr = wallet.address ? truncate(wallet.address) : "Connecté";

  if (!auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden rounded-lg border border-border-subtle bg-surface/60 px-2.5 py-1 font-mono text-xs text-muted backdrop-blur-sm sm:inline">
          {addr}
        </span>
        <Button variant="wallet" loading={auth.busy} disabled={auth.busy} onClick={handleLogin}>
          {auth.busy ? "Signature…" : "Se connecter"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-lg border border-green-600/40 bg-green-900/30 px-2.5 py-1 font-mono text-xs text-green-400 ring-1 ring-green-600/25 backdrop-blur-sm sm:inline">
        {addr}
      </span>
      <Button variant="danger" onClick={handleDisconnect}>
        Déconnexion
      </Button>
    </div>
  );
}
