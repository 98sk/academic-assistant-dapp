import { Link, useLocation } from "react-router-dom";
import { LockKeyhole, Wallet } from "lucide-react";
import { motion } from "framer-motion";

import { ConnectWalletButton } from "./ConnectWalletButton";
import { useAuth } from "./useAuth";
import { useWalletStore } from "./wallet";
import { useToast } from "../../shared/ui/Toast";
import { Button } from "../../shared/ui/Button";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";
import { useReducedMotion } from "../../shared/motion/presets";

const PAGE_LABELS: Record<string, string> = {
  "/documents": "Documents",
  "/announcements": "Annonces",
  "/assistant": "Assistant IA",
  "/analytics": "Analytique"
};

export function AuthGate() {
  const location = useLocation();
  const auth = useAuth();
  const wallet = useWalletStore();
  const toast = useToast();
  const reduced = useReducedMotion();

  const pageLabel =
    Object.entries(PAGE_LABELS).find(([path]) => location.pathname.startsWith(path))?.[1] ??
    "Cette section";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authentification requise"
        subtitle={`Connectez votre portefeuille et signez un message pour accéder à ${pageLabel.toLowerCase()}.`}
      />

      <Card className="max-w-xl" delay={0.1}>
        <CardHeader
          title="Session académique"
          subtitle="MetaMask + signature SIWE-like via le backend"
          right={
            <div className="grid size-10 place-items-center rounded-xl icon-gradient">
              <LockKeyhole className="size-5" />
            </div>
          }
        />
        <CardBody className="space-y-4">
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted">
            <li>Installez MetaMask et connectez-vous au réseau local (Hardhat).</li>
            <li>Cliquez sur « Connecter le portefeuille ».</li>
            <li>Cliquez sur « Se connecter » et signez le message dans MetaMask.</li>
          </ol>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { delay: 0.15 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle/60 bg-surface/40 p-4 backdrop-blur-sm"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-green-900/30 text-green-400 ring-1 ring-green-600/25">
              <Wallet className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">Portefeuille</p>
              <p className="truncate text-xs text-muted">
                {wallet.status === "connected" && wallet.address
                  ? wallet.address
                  : "Non connecté"}
              </p>
            </div>
            <ConnectWalletButton />
          </motion.div>

          {wallet.status === "connected" && !auth.isAuthenticated ? (
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              loading={auth.busy}
              disabled={auth.busy}
              onClick={() =>
                auth.login().catch((e) => toast.error(auth.error ?? String(e)))
              }
            >
              {auth.busy ? "Signature en cours…" : "Se connecter (signer le message)"}
            </Button>
          ) : null}

          {auth.error ? <p className="text-sm text-danger">{auth.error}</p> : null}
          {wallet.error ? <p className="text-sm text-danger">{wallet.error}</p> : null}

          <p className="text-xs text-muted">
            Vous pouvez aussi vous authentifier depuis{" "}
            <Link to="/settings" className="font-semibold text-accent hover:underline">
              Paramètres
            </Link>
            .
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
