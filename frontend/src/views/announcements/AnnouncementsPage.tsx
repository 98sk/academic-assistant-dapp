import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Plus, RefreshCw } from "lucide-react";

import { useAuth } from "../../features/auth/useAuth";
import { useToast } from "../../shared/ui/Toast";
import {
  listAnnouncements,
  publishAnnouncement,
  confirmAnnouncementPublish,
  type Announcement
} from "../../features/announcements/announcementsApi";
import { formatOnChainError, publishAnnouncementOnChain } from "../../features/blockchain/onChain";
import { useWalletStore } from "../../features/auth/wallet";
import { ApiError } from "../../lib/api/client";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";

function formatTimestamp(ts: string | null) {
  if (!ts) return "Pending";
  return new Date(Number(ts) * 1000).toLocaleString();
}

function AnnouncementRow({ item }: { item: Announcement }) {
  const label = item.title ?? `Announcement #${item.id ?? "?"}`;
  const detailPath = item.id ? `/announcements/${item.id}` : undefined;

  return (
    <div className="rounded-xl border border-border-subtle/60 bg-surface/40 px-4 py-3 transition-all duration-200 hover:border-accent/20 hover:bg-surface-hover/60 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {detailPath ? (
            <Link to={detailPath} className="text-sm font-semibold text-primary hover:text-accent hover:underline">
              {label}
            </Link>
          ) : (
            <div className="text-sm font-semibold text-primary">{label}</div>
          )}
          <div className="mt-1 text-xs text-muted">
            {item.category}
            {item.targetGroup ? ` • ${item.targetGroup}` : " • All groups"}
            {" • "}
            {formatTimestamp(item.timestamp)}
          </div>
          {item.body && !detailPath ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{item.body}</p>
          ) : null}
        </div>
        <Megaphone className="size-4 shrink-0 text-muted" />
      </div>
    </div>
  );
}

export function AnnouncementsPage() {
  const auth = useAuth();
  const toast = useToast();
  const wallet = useWalletStore();
  const canPublish = auth.session?.roles.isProfessor || auth.session?.roles.isAdmin;

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishingWallet, setPublishingWallet] = useState(false);
  const [publishError, setPublishError] = useState<string | undefined>();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [targetGroup, setTargetGroup] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await listAnnouncements();
      setItems(res.items);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublish = async (mode: "relay" | "wallet") => {
    if (mode === "relay") setPublishing(true);
    else setPublishingWallet(true);
    setPublishError(undefined);
    try {
      if (mode === "relay") {
        await publishAnnouncement({ title, body, category, targetGroup, mode: "relay" });
      } else {
        const prep = await publishAnnouncement({ title, body, category, targetGroup, mode: "calldata" });
        const onChain = await publishAnnouncementOnChain({
          contentHash: prep.contentHash,
          category: category.trim(),
          targetGroup: targetGroup.trim()
        });
        await confirmAnnouncementPublish({
          contentHash: prep.contentHash,
          announcementId: onChain.announcementId,
          transactionHash: onChain.transactionHash
        });
      }
      setTitle("");
      setBody("");
      setTargetGroup("");
      setCategory("general");
      setShowForm(false);
      toast.success("Annonce publiée avec succès.");
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : formatOnChainError(e);
      setPublishError(msg);
      toast.error(msg);
    } finally {
      setPublishing(false);
      setPublishingWallet(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="On-chain hashes with off-chain content resolved by the API."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" leftIcon={<RefreshCw className="size-4" />} onClick={load} disabled={loading}>
              Actualiser
            </Button>
            {canPublish ? (
              <Button variant="warning" leftIcon={<Plus className="size-4" />} onClick={() => setShowForm((v) => !v)}>
                Publier
              </Button>
            ) : null}
          </div>
        }
      />

      {showForm && canPublish ? (
        <Card>
          <CardHeader title="New announcement" subtitle="Content is hashed (SHA-256) before on-chain registration." />
          <CardBody className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <Input
                placeholder="Target group (empty = all)"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
              />
            </div>
            <textarea
              className="min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#0f172a] shadow-sm outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-green-600 focus:ring-2 focus:ring-green-600/40 focus:ring-offset-1 focus:ring-offset-white"
              placeholder="Announcement body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {publishError ? <div className="text-sm text-danger">{publishError}</div> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="warning"
                onClick={() => handlePublish("relay")}
                disabled={publishing || publishingWallet || !title.trim() || !body.trim()}
              >
                {publishing ? "Publication relay…" : "Publier via relay backend"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePublish("wallet")}
                disabled={publishing || publishingWallet || !title.trim() || !body.trim()}
              >
                {publishingWallet ? "MetaMask…" : "Publier on-chain avec MetaMask"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
            <p className="text-xs text-muted">
              Le relay utilise la clé backend (rapide pour la démo). MetaMask exige le réseau Hardhat local (31337) et le rôle
              PROFESSOR
              {wallet.address ? ` sur ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : ""}.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Feed" subtitle={loading ? "Loading…" : `${items.length} announcement(s)`} />
        <CardBody className="space-y-3">
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          {!loading && !error && items.length === 0 ? (
            <div className="text-sm text-muted">No announcements yet.</div>
          ) : null}
          {items.map((item) => (
            <AnnouncementRow key={item.id ?? item.contentHash} item={item} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
