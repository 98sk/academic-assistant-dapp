import { PageHeader } from "../../shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { useWalletStore } from "../../features/auth/wallet";
import { useAuth } from "../../features/auth/useAuth";
import { useToast } from "../../shared/ui/Toast";
import { ConnectWalletButton } from "../../features/auth/ConnectWalletButton";
import { MessageCircle, User, Wallet } from "lucide-react";

function roleLabels(roles?: { isAdmin: boolean; isProfessor: boolean; isStudent: boolean }) {
  if (!roles) return "Aucun";
  const parts: string[] = [];
  if (roles.isAdmin) parts.push("Administrateur");
  if (roles.isProfessor) parts.push("Professeur");
  if (roles.isStudent) parts.push("Étudiant");
  return parts.length > 0 ? parts.join(", ") : "Aucun";
}

export function SettingsPage() {
  const wallet = useWalletStore();
  const auth = useAuth();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Profil, préférences et authentification par portefeuille."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card delay={0.05}>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <User className="size-4 text-accent" />
                Profil
              </span>
            }
            subtitle="Identité locale (démo)"
          />
          <CardBody className="space-y-3">
            <Input placeholder="Nom affiché" defaultValue="Chercheur" />
            <Input placeholder="Courriel" defaultValue="chercheur@exemple.fr" />
            <Button
              variant="success"
              onClick={() => toast.info("Profil enregistré localement (démo).")}
            >
              Enregistrer
            </Button>
          </CardBody>
        </Card>

        <Card delay={0.1}>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Wallet className="size-4 text-accent-glow" />
                Portefeuille &amp; session
              </span>
            }
            subtitle="MetaMask et signature SIWE-like"
          />
          <CardBody>
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium text-primary">Adresse connectée</div>
                <div className="break-all font-mono text-xs text-muted">
                  {wallet.status === "connected" && wallet.address
                    ? wallet.address
                    : "Non connecté"}
                </div>
                {wallet.chainId ? (
                  <div className="mt-1 text-xs text-muted">Chaîne {wallet.chainId}</div>
                ) : null}
              </div>

              <div>
                <div className="font-medium text-primary">Session API</div>
                <div className="break-all font-mono text-xs text-muted">
                  {auth.isAuthenticated && auth.session
                    ? auth.session.address
                    : "Non connecté"}
                </div>
              </div>

              {auth.isAuthenticated && auth.session ? (
                <dl className="grid gap-3 rounded-xl border border-border-subtle/60 bg-surface/40 p-4 text-xs backdrop-blur-sm">
                  <div>
                    <dt className="font-semibold text-primary">Rôles</dt>
                    <dd className="mt-0.5 text-muted">{roleLabels(auth.session.roles)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-primary">Groupe</dt>
                    <dd className="mt-0.5 text-muted">{auth.session.group ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-primary">Expiration du jeton</dt>
                    <dd className="mt-0.5 text-muted">
                      {new Date(auth.session.expiresAtMs).toLocaleString("fr-FR")}
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <ConnectWalletButton />
              </div>

              {auth.error ? <div className="text-xs text-danger">{auth.error}</div> : null}
              {wallet.error ? <div className="text-xs text-danger">{wallet.error}</div> : null}
            </div>
          </CardBody>
        </Card>

        <Card delay={0.15} className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <MessageCircle className="size-4 text-accent" />
                Extension Telegram (bonus)
              </span>
            }
            subtitle="Canal alternatif — même API RAG que l’assistant web"
          />
          <CardBody className="space-y-4 text-sm text-muted">
            <p>
              Le bot Telegram interroge le backend via <code className="text-xs">POST /api/chat</code>{" "}
              (même moteur RAG que la page Assistant). Il ne remplace pas l’UI web : c’est une extension
              optionnelle pour la soutenance.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Créer un bot avec{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  @BotFather
                </a>{" "}
                et coller le jeton dans <code className="text-xs">telegram-bot/.env</code> :{" "}
                <code className="text-xs">TELEGRAM_BOT_TOKEN=…</code>
              </li>
              <li>
                À la racine du dépôt :{" "}
                <code className="text-xs">.\scripts\setup-telegram.ps1</code> — génère{" "}
                <code className="text-xs">BACKEND_SERVICE_TOKEN</code> dans{" "}
                <code className="text-xs">backend/.env</code> et le recopie dans{" "}
                <code className="text-xs">telegram-bot/.env</code> (valeurs identiques obligatoires).
              </li>
              <li>
                Backend déjà démarré, PDF indexé via l’UI, puis :{" "}
                <code className="text-xs">cd telegram-bot &amp;&amp; npm run dev</code>
              </li>
            </ol>
            <p>
              Documentation complète :{" "}
              <code className="text-xs">telegram-bot/README.md</code> (commandes{" "}
              <code className="text-xs">/start</code>, <code className="text-xs">/ask …</code>).
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
