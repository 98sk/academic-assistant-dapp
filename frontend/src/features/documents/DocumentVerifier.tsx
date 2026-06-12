import { useRef, useState } from "react";
import { ShieldCheck, Upload } from "lucide-react";

import { verifyDocument } from "./documentsApi";
import { sha256FileToBytes32 } from "./hash";
import { Button } from "../../shared/ui/Button";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { useToast } from "../../shared/ui/Toast";

export function DocumentVerifier() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function verifyFile(file: File) {
    setBusy(true);
    setError(undefined);
    setVerified(null);
    try {
      const contentHash = await sha256FileToBytes32(file);
      setHash(contentHash);
      const res = await verifyDocument(contentHash);
      setVerified(res.verified);
      if (res.verified) {
        toast.success("Document trouvé dans le registre on-chain.");
      } else {
        toast.error("Hash non trouvé dans le registre on-chain.");
      }
    } catch (e) {
      const msg = String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Vérifier l'intégrité d'un document"
        subtitle="Le SHA-256 est calculé dans le navigateur, puis comparé au registre on-chain. Aucun envoi au serveur."
      />
      <CardBody>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void verifyFile(f);
            e.currentTarget.value = "";
          }}
        />
        <div
          className={[
            "rounded-xl border border-dashed px-4 py-6 transition",
            dragOver ? "border-accent bg-accent/10" : "border-border-subtle/60 bg-surface/30"
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
            if (f) void verifyFile(f);
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="inline-grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
              <ShieldCheck size={18} />
            </div>
            <div className="text-sm font-semibold text-primary">Déposer un fichier à vérifier</div>
            <Button
              type="button"
              variant="success"
              className="mt-1"
              leftIcon={<Upload size={16} />}
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Choisir un fichier
            </Button>
          </div>
        </div>

        {busy ? <p className="mt-3 text-sm text-muted">Calcul du hash et lecture on-chain…</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {hash ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">Hash SHA-256 (bytes32)</dt>
              <dd className="break-all font-mono text-xs text-primary">{hash}</dd>
            </div>
            {verified !== null ? (
              <div>
                <dt className="text-xs font-medium text-muted">Résultat</dt>
                <dd className={verified ? "font-medium text-success" : "font-medium text-accent-glow"}>
                  {verified
                    ? "Document enregistré on-chain (DocumentRegistry.verifyDocument = true)."
                    : "Hash non trouvé dans le registre (document non enregistré ou hash différent)."}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </CardBody>
    </Card>
  );
}
