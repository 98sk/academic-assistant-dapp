import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

import {
  getAcknowledgmentStatus,
  getAnnouncement,
  listAnnouncementAcknowledgments,
  verifyAnnouncement,
  type AcknowledgmentRecord,
  type Announcement
} from "../../features/announcements/announcementsApi";
import { acknowledgeAnnouncementOnChain } from "../../features/blockchain/onChain";
import { useAuth } from "../../features/auth/useAuth";
import { ApiError } from "../../lib/api/client";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { ButtonLink } from "../../shared/ui/ButtonLink";
import { TxLink } from "../../shared/ui/TxLink";
import { useToast } from "../../shared/ui/Toast";
import { Skeleton } from "../../shared/ui/Skeleton";

export function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const toast = useToast();
  const isStudent = auth.session?.roles.isStudent ?? false;
  const canTrackAcks = auth.session?.roles.isProfessor || auth.session?.roles.isAdmin;

  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackTxHash, setAckTxHash] = useState<`0x${string}` | undefined>();
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState<string | undefined>();
  const [ackRecords, setAckRecords] = useState<AcknowledgmentRecord[]>([]);
  const [acksLoading, setAcksLoading] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState<string | undefined>();

  const chainId = auth.session?.chainId ?? 31337;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    try {
      const a = await getAnnouncement(id);
      setItem(a);
      if (auth.isAuthenticated && isStudent) {
        const status = await getAcknowledgmentStatus(id);
        setAcknowledged(status.acknowledged);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated, id, isStudent]);

  const loadAcks = useCallback(async () => {
    if (!id || !canTrackAcks || !auth.isAuthenticated) return;
    setAcksLoading(true);
    try {
      const res = await listAnnouncementAcknowledgments(id);
      setAckRecords(res.items);
    } catch {
      setAckRecords([]);
    } finally {
      setAcksLoading(false);
    }
  }, [auth.isAuthenticated, canTrackAcks, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadAcks();
  }, [loadAcks]);

  const handleVerify = async () => {
    if (!id || !item?.body) return;
    setVerifyBusy(true);
    setVerifyError(undefined);
    setVerifyResult(null);
    try {
      const res = await verifyAnnouncement({ announcementId: id, body: item.body });
      setVerifyResult(res.verified === true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setVerifyError(msg);
      toast.error(msg);
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!id) return;
    setAckBusy(true);
    setAckError(undefined);
    try {
      const txHash = await acknowledgeAnnouncementOnChain(id);
      setAckTxHash(txHash);
      setAcknowledged(true);
      toast.success("Accusé de réception enregistré on-chain.");
      void loadAcks();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setAckError(msg);
      toast.error(msg);
    } finally {
      setAckBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Link to="/announcements" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
          <ArrowLeft className="size-4" /> Back to announcements
        </Link>
        <div className="text-sm text-danger">{error ?? "Not found"}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.title ?? `Announcement #${item.id}`}
        subtitle={`${item.category}${item.targetGroup ? ` • ${item.targetGroup}` : ""}`}
        right={
          <ButtonLink to="/announcements" variant="secondary" leftIcon={<ArrowLeft className="size-4" />}>
            Retour
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader
          title="Content"
          subtitle={
            item.timestamp
              ? `Published ${new Date(Number(item.timestamp) * 1000).toLocaleString()}`
              : "Pending on-chain confirmation"
          }
        />
        <CardBody className="space-y-4">
          {item.body ? (
            <p className="whitespace-pre-wrap text-sm text-primary">{item.body}</p>
          ) : (
            <p className="text-sm text-muted">
              Body not stored off-chain. On-chain hash: <code className="text-xs">{item.contentHash}</code>
            </p>
          )}

          <dl className="grid gap-2 text-xs text-muted sm:grid-cols-2">
            <div>
              <dt className="font-medium text-primary">Publisher</dt>
              <dd className="break-all">{item.publisher ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-primary">Content hash</dt>
              <dd className="break-all">{item.contentHash}</dd>
            </div>
            {item.transactionHash ? (
              <div className="sm:col-span-2">
                <dt className="font-medium text-primary">Publication tx</dt>
                <dd>
                  <TxLink chainId={chainId} txHash={item.transactionHash} />
                </dd>
              </div>
            ) : null}
          </dl>

          {item.body && item.id ? (
            <div className="border-t border-border-subtle pt-4 space-y-2">
              <p className="text-xs font-medium text-primary">Vérifier l’intégrité du contenu</p>
              <p className="text-xs text-muted">
                Compare le hash SHA-256 du corps affiché avec le hash enregistré on-chain (GET /api/verify).
              </p>
              <Button
                variant="secondary"
                leftIcon={<ShieldCheck className="size-4" />}
                onClick={handleVerify}
                disabled={verifyBusy}
              >
                {verifyBusy ? "Vérification…" : "Vérifier l’annonce"}
              </Button>
              {verifyResult === true ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" />
                  Contenu conforme au hash on-chain.
                </div>
              ) : null}
              {verifyResult === false ? (
                <div className="text-sm text-danger">Le corps ne correspond pas au hash on-chain.</div>
              ) : null}
              {verifyError ? <div className="text-sm text-danger">{verifyError}</div> : null}
            </div>
          ) : null}

          {isStudent && auth.isAuthenticated ? (
            <div className="border-t border-border-subtle pt-4">
              {acknowledged ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="size-4" />
                    Vous avez accusé réception (transaction signée via MetaMask).
                  </div>
                  {ackTxHash ? (
                    <div className="text-xs text-muted">
                      Tx : <TxLink chainId={chainId} txHash={ackTxHash} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    Le bouton envoie une transaction MetaMask vers AcknowledgmentLog.acknowledge — votre portefeuille doit avoir le rôle STUDENT.
                  </p>
                  <Button variant="success" onClick={handleAcknowledge} disabled={ackBusy || !auth.session?.roles.isStudent}>
                    {ackBusy ? "Signature MetaMask…" : "J’ai lu — signer avec MetaMask"}
                  </Button>
                  {ackError ? <div className="text-sm text-danger">{ackError}</div> : null}
                </div>
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {canTrackAcks && auth.isAuthenticated ? (
        <Card>
          <CardHeader
            title="Suivi des accusés de réception"
            subtitle="Qui a lu quoi, quand — événements Acknowledged on-chain"
          />
          <CardBody>
            {acksLoading ? (
              <p className="text-sm text-muted">Chargement…</p>
            ) : ackRecords.length === 0 ? (
              <p className="text-sm text-muted">Aucun accusé de réception pour cette annonce.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-xs text-muted">
                      <th className="py-2 pr-4 font-medium">Étudiant</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 font-medium">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ackRecords.map((row, i) => (
                      <tr key={`${row.student}-${row.timestamp}-${i}`} className="border-b border-border-subtle/50">
                        <td className="py-2 pr-4 font-mono text-xs break-all">{row.student ?? "—"}</td>
                        <td className="py-2 pr-4 text-muted">
                          {row.timestamp
                            ? new Date(Number(row.timestamp) * 1000).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2">
                          {row.transactionHash ? (
                            <TxLink chainId={chainId} txHash={row.transactionHash} />
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
