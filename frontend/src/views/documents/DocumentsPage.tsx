import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, RefreshCcw } from "lucide-react";

import { PageHeader } from "../../shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { EmptyState } from "../../shared/ui/EmptyState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";
import { useDocumentsStore } from "../../state/documents";
import { uploadDocument } from "../../features/documents/documentsApi";
import { DocumentVerifier } from "../../features/documents/DocumentVerifier";
import { TxLink } from "../../shared/ui/TxLink";
import { useAuth } from "../../features/auth/useAuth";

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR");
}

export function DocumentsPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chainId = auth.session?.chainId ?? 31337;
  const { items, loading, error, refresh } = useDocumentsStore();

  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error, toast]);

  const sorted = useMemo(() => items.slice().sort((a, b) => b.id - a.id), [items]);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploadPct(0);
    try {
      await uploadDocument({
        file,
        onProgress: (pct) => setUploadPct(pct)
      });
      setUploadPct(null);
      toast.success(`« ${file.name} » téléversé et enregistré.`);
      await refresh();
    } catch (e: unknown) {
      setUploadPct(null);
      const msg = e instanceof Error ? e.message : String(e);
      setUploadError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Téléversez des PDF, enregistrez leur hash on-chain et gérez les métadonnées."
        right={
          <Button
            variant="ghost"
            onClick={() => refresh()}
            disabled={loading}
            leftIcon={<RefreshCcw size={16} />}
          >
            Actualiser
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Téléversement"
          subtitle="Glissez-déposez un PDF ou choisissez un fichier. Authentification requise."
        />
        <CardBody>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.currentTarget.value = "";
            }}
          />
          <div
            className={[
              "rounded-2xl border border-dashed px-4 py-10 transition-all duration-300",
              dragOver
                ? "scale-[1.01] border-accent bg-accent/10 shadow-glow"
                : "border-border-subtle/60 bg-surface/30 hover:border-accent/30"
            ].join(" ")}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div className="inline-grid h-14 w-14 place-items-center rounded-2xl icon-gradient ring-1 ring-white/10">
                <Upload size={22} />
              </div>
              <div className="text-sm font-semibold text-primary">Déposer un PDF</div>
              <div className="max-w-md text-xs text-muted">
                Le SHA-256 est calculé côté serveur et enregistré dans le registre blockchain.
              </div>
              <Button
                type="button"
                variant="success"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Choisir un fichier
              </Button>
              {uploadPct !== null ? (
                <div className="mt-3 w-full max-w-md">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Téléversement…</span>
                    <span>{uploadPct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-2 rounded-full bg-gradient-accent transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, uploadPct))}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {uploadError ? <div className="mt-2 text-xs text-danger">{uploadError}</div> : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <DocumentVerifier />

      <Card>
        <CardHeader
          title="Bibliothèque"
          subtitle={
            loading
              ? "Chargement…"
              : `${sorted.length} document${sorted.length === 1 ? "" : "s"}`
          }
        />
        <CardBody>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun document"
              description="Téléversez votre premier PDF pour commencer."
              action={
                <Button type="button" variant="success" onClick={() => fileInputRef.current?.click()}>
                  Choisir un fichier
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {sorted.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border-subtle/60 bg-surface/40 px-4 py-3 text-left transition-all duration-200 hover:scale-[1.005] hover:border-accent/20 hover:bg-surface-hover/60 hover:shadow-soft"
                  onClick={() => nav(`/documents/${d.id}`)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="shrink-0 text-accent" />
                      <div className="truncate text-sm font-semibold text-primary">{d.filename}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      <span>Téléversé : {fmtDate(d.uploadDate)}</span>
                      <span className="truncate">Par : {d.uploaderWallet}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-muted">
                    <div className="text-right font-medium">#{d.id}</div>
                    <div className="mt-1 text-right">
                      <TxLink chainId={chainId} txHash={d.txHash} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
