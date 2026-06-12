import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";
import { getAuthToken } from "../../features/auth/store";
import { apiUrl } from "../../env";
import type { DocumentRecord } from "../../features/documents/documentsApi";
import { getDocumentById } from "../../features/documents/documentsApi";
import { ApiError } from "../../lib/api/client";
import { TxLink } from "../../shared/ui/TxLink";
import { useAuth } from "../../features/auth/useAuth";

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function DocumentDetailsPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const chainId = auth.session?.chainId ?? 31337;
  const { id } = useParams();
  const numericId = Number(id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [verified, setVerified] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!Number.isInteger(numericId)) {
        setError("Invalid document id");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getDocumentById(numericId);
        if (!alive) return;
        setRecord(res.record);
        setVerified(res.verified);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message ?? e));
        setLoading(false);
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [numericId]);

  async function download() {
    if (!record) return;
    const token = getAuthToken();
    if (!token) throw new ApiError("Not authenticated", 401);
    const url = apiUrl(`/api/documents/${record.id}/download`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = record.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document"
        subtitle={loading ? "Loading…" : record ? record.filename : "—"}
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => nav("/documents")} leftIcon={<ArrowLeft size={16} />}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => void download().catch((e) => setError(String((e as any)?.message ?? e)))}
              disabled={!record}
              leftIcon={<Download size={16} />}
            >
              Download
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader
          title="Status"
          subtitle={
            verified
              ? "Verified on-chain via DocumentRegistry."
              : "Not verified on-chain (or registry lookup failed)."
          }
          right={
            verified ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-xs text-success ring-1 ring-success/20">
                <CheckCircle2 size={16} />
                Confirmed
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger ring-1 ring-danger/20">
                <XCircle size={16} />
                Unconfirmed
              </div>
            )
          }
        />
        <CardBody>
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          {loading ? (
            <div className="text-sm text-muted">Loading document metadata…</div>
          ) : !record ? (
            <div className="text-sm text-muted">Document not found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted">Upload date</div>
                <div className="mt-1 text-sm text-primary">{fmtDate(record.uploadDate)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Uploader (from JWT)</div>
                <div className="mt-1 break-all text-sm text-primary">{record.uploaderWallet}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-semibold text-muted">Document hash (SHA-256, bytes32)</div>
                <div className="mt-1 break-all text-sm text-primary">{record.documentHash}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-semibold text-muted">Blockchain tx hash</div>
                <div className="mt-1">
                  <TxLink chainId={chainId} txHash={record.txHash} />
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
