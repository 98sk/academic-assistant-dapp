import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, FilePlus2, FileText, Megaphone, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { getDashboardSummary, type DashboardSummary } from "../../features/analytics/analyticsApi";
import { useAuth } from "../../features/auth/useAuth";
import { ApiError } from "../../lib/api/client";
import { Card, CardBody, CardHeader, StatCard } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ButtonLink } from "../../shared/ui/ButtonLink";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { staggerContainer, staggerItem, useReducedMotion } from "../../shared/motion/presets";

export function DashboardPage() {
  const auth = useAuth();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (auth.isAuthenticated) void auth.refreshRoles();
  }, [auth.isAuthenticated, auth.session?.address, auth.refreshRoles]);

  const stats = [
    {
      label: "Documents",
      value: summary ? String(summary.documents) : "—",
      delta: "Enregistrés on-chain",
      icon: FileText
    },
    {
      label: "Annonces",
      value: summary ? String(summary.announcements) : "—",
      delta: "Publiées",
      icon: Megaphone
    },
    {
      label: "Session",
      value: auth.isAuthenticated ? "Active" : "Invité",
      delta: auth.session?.address
        ? auth.session.address.slice(0, 10) + "…"
        : "Connectez-vous via Paramètres",
      icon: Shield
    },
    {
      label: "Rôle",
      value: roleLabel(auth.session?.roles),
      delta: auth.session?.group ?? "Aucun groupe",
      icon: Users
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble des documents, annonces et activité récente."
        right={
          <div className="flex gap-2">
            <ButtonLink to="/documents" variant="success" leftIcon={<FilePlus2 className="size-4" />}>
              Documents
            </ButtonLink>
            <ButtonLink to="/assistant" variant="accent" leftIcon={<ArrowUpRight className="size-4" />}>
              Assistant IA
            </ButtonLink>
          </div>
        }
      />

      {!auth.isAuthenticated ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-accent/20 bg-surface/40 px-5 py-4 text-sm text-muted backdrop-blur-sm"
        >
          Connectez votre portefeuille et authentifiez-vous via{" "}
          <Link to="/settings" className="font-semibold text-accent hover:underline">
            Paramètres
          </Link>{" "}
          pour voir les statistiques en direct.
        </motion.div>
      ) : null}

      {error ? <div className="text-sm text-danger">{error}</div> : null}

      <motion.div
        variants={staggerContainer(reduced)}
        initial={reduced ? false : "hidden"}
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((s, i) => (
          <motion.div key={s.label} variants={staggerItem(reduced)}>
            <StatCard
              label={s.label}
              value={
                loading && auth.isAuthenticated ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  s.value
                )
              }
              delta={s.delta}
              icon={s.icon}
              delay={i * 0.05}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" delay={0.2}>
          <CardHeader
            title="Activité récente"
            subtitle={auth.isAuthenticated ? "Derniers documents et annonces" : "Authentification requise"}
            right={
              auth.isAuthenticated ? (
                <Button variant="ghost" onClick={load} loading={loading}>
                  Actualiser
                </Button>
              ) : null
            }
          />
          <CardBody className="space-y-3">
            {!auth.isAuthenticated ? (
              <div className="text-sm text-muted">Connectez-vous pour charger l'activité.</div>
            ) : loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : summary?.recent.length === 0 ? (
              <div className="text-sm text-muted">Aucune activité pour le moment.</div>
            ) : (
              summary?.recent.map((item, i) => (
                <motion.div
                  key={`${item.type}-${item.id}-${item.title}`}
                  initial={reduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: i * 0.05 }}
                  className="rounded-xl border border-border-subtle/60 bg-surface/40 px-4 py-3 transition-all duration-200 hover:border-accent/20 hover:bg-surface-hover/60 hover:shadow-soft"
                >
                  <div className="text-sm font-semibold text-primary">{item.title}</div>
                  <div className="mt-1 text-xs text-muted">{item.meta}</div>
                </motion.div>
              ))
            )}
          </CardBody>
        </Card>

        <Card delay={0.25}>
          <CardHeader title="Actions rapides" subtitle="Accès direct" />
          <CardBody className="space-y-2">
            <ButtonLink to="/documents" variant="wallet" className="w-full">
              Voir les documents
            </ButtonLink>
            <ButtonLink to="/announcements" variant="success" className="w-full">
              Voir les annonces
            </ButtonLink>
            <ButtonLink to="/settings" variant="wallet" className="w-full">
              Portefeuille &amp; session
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function roleLabel(roles?: { isAdmin: boolean; isProfessor: boolean; isStudent: boolean }) {
  if (!roles) return "—";
  const labels: string[] = [];
  if (roles.isAdmin) labels.push("Administrateur");
  if (roles.isProfessor) labels.push("Professeur");
  if (roles.isStudent) labels.push("Étudiant");
  return labels.length > 0 ? labels.join(", ") : "Aucun";
}
