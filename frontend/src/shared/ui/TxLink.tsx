import { ExternalLink } from "lucide-react";

import { getExplorerTxUrl } from "../../lib/explorer";

type Props = {
  chainId: number;
  txHash: string;
  className?: string;
};

export function TxLink({ chainId, txHash, className }: Props) {
  const url = getExplorerTxUrl(chainId, txHash);
  const short = `${txHash.slice(0, 10)}…${txHash.slice(-6)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={["inline-flex items-center gap-1 text-accent hover:underline", className].filter(Boolean).join(" ")}
    >
      <span className="font-mono text-xs">{short}</span>
      <ExternalLink className="size-3" />
    </a>
  );
}
