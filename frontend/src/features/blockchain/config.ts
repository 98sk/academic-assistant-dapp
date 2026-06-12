import { apiFetch } from "../../lib/api/client";

export type ChainConfig = {
  chainId: number;
  contracts: {
    roleManager: `0x${string}`;
    announcementLog: `0x${string}`;
    documentRegistry: `0x${string}`;
    acknowledgmentLog: `0x${string}`;
  };
};

let cached: ChainConfig | null = null;

export function clearChainConfigCache(): void {
  cached = null;
}

export async function getChainConfig(): Promise<ChainConfig> {
  if (cached) return cached;
  cached = await apiFetch<ChainConfig>("/api/config");
  return cached;
}
