import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";

import {
  getAcknowledgmentsAnalytics,
  getAnnouncementsAnalytics,
  type AcknowledgmentsAnalytics,
  type AnnouncementsAnalytics
} from "../../features/analytics/analyticsApi";
import { ApiError } from "../../lib/api/client";
import { useToast } from "../../shared/ui/Toast";
import { Skeleton } from "../../shared/ui/Skeleton";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Card, CardBody, CardHeader, StatCard } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { staggerContainer, staggerItem, useReducedMotion } from "../../shared/motion/presets";

function StatGrid({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const reduced = useReducedMotion();

  if (entries.length === 0) {
    return <div className="text-sm text-muted">Aucune donnée pour le moment.</div>;
  }
  return (
    <div className="space-y-2">
      {entries.map(([key, value], i) => (
        <motion.div
          key={key}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduced ? { duration: 0 } : { delay: i * 0.04 }}
          className="rounded-xl border border-border-subtle/60 bg-surface/40 px-3 py-2.5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-medium text-muted">{key}</div>
            <div className="text-lg font-bold text-primary">{value}</div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover">
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${(value / max) * 100}%` }}
              transition={reduced ? { duration: 0 } : { duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-accent"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function BucketChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const reduced = useReducedMotion();

  if (entries.length === 0) {
    return <div className="text-sm text-muted">Aucune donnée temporelle.</div>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-x-0 bottom-6 h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
      <div className="flex h-36 items-end gap-1.5 px-1">
        {entries.map(([label, value], i) => (
          <div key={label} className="group flex flex-1 flex-col items-center gap-2">
            <motion.div
              initial={reduced ? false : { height: 0 }}
              animate={{ height: `${Math.max(8, (value / max) * 100)}%` }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }
              }
              className="relative w-full min-h-[8px] rounded-t-lg bg-gradient-to-t from-accent to-accent-glow shadow-sm transition-shadow group-hover:shadow-glow"
              title={`${label}: ${value}`}
            >
              <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-lg bg-white/15" />
            </motion.div>
            <span className="max-w-full truncate text-[10px] font-medium text-muted">
              {label.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const toast = useToast();
  const reduced = useReducedMotion();
  const [announcements, setAnnouncements] = useState<AnnouncementsAnalytics | null>(null);
  const [acknowledgments, setAcknowledgments] = useState<AcknowledgmentsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [a, ack] = await Promise.all([
        getAnnouncementsAnalytics("day"),
        getAcknowledgmentsAnalytics()
      ]);
      setAnnouncements(a);
      setAcknowledgments(ack);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    {
      label: "Annonces",
      value: announcements?.total ?? "—",
      icon: BarChart3
    },
    {
      label: "Accusés",
      value: acknowledgments?.total ?? "—",
      icon: TrendingUp
    },
    {
      label: "Catégories",
      value: announcements ? Object.keys(announcements.byCategory).length : "—",
      icon: BarChart3
    },
    {
      label: "Groupes cibles",
      value: announcements ? Object.keys(announcements.byGroup).length : "—",
      icon: TrendingUp
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytique"
        subtitle="Métriques on-chain des annonces et accusés de réception."
        right={
          <Button variant="secondary" onClick={load} loading={loading}>
            Actualiser
          </Button>
        }
      />

      {error ? <div className="text-sm text-danger">{error}</div> : null}

      <motion.div
        variants={staggerContainer(reduced)}
        initial={reduced ? false : "hidden"}
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statCards.map((s, i) => (
          <motion.div key={s.label} variants={staggerItem(reduced)}>
            <StatCard
              label={s.label}
              value={loading ? <Skeleton className="mt-1 h-8 w-12" /> : s.value}
              icon={s.icon}
              delay={i * 0.05}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card delay={0.15}>
          <CardHeader title="Annonces dans le temps" subtitle="Regroupement journalier" />
          <CardBody>
            {loading ? (
              <Skeleton className="h-36 w-full" />
            ) : (
              <BucketChart data={announcements?.byBucket ?? {}} />
            )}
          </CardBody>
        </Card>

        <Card delay={0.2}>
          <CardHeader title="Par catégorie" subtitle="Nombre d'annonces" />
          <CardBody>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <StatGrid data={announcements?.byCategory ?? {}} />
            )}
          </CardBody>
        </Card>

        <Card delay={0.25}>
          <CardHeader title="Par groupe cible" subtitle="Nombre d'annonces" />
          <CardBody>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <StatGrid data={announcements?.byGroup ?? {}} />
            )}
          </CardBody>
        </Card>

        <Card delay={0.3}>
          <CardHeader title="Accusés par annonce" subtitle="Événements on-chain" />
          <CardBody>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <StatGrid data={acknowledgments?.byAnnouncement ?? {}} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
