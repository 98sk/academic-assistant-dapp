/**
 * Sync backend/data/announcements.json from on-chain AnnouncementPublished events
 * and scripts/demo-announcements.json metadata (no new transactions).
 *
 * Usage: npm run seed:offchain  (Hardhat node + deploy + seed-demo-activity recommended first)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { createPublicClient, defineChain, getAddress, http, type Abi, type Address } from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");
const contractsRoot = path.join(repoRoot, "contracts");

const LOCAL_RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";

type DemoRow = { title: string; body: string; category: string; targetGroup: string };

function hashAnnouncementBody(body: string): `0x${string}` {
  const hex = createHash("sha256").update(body, "utf8").digest("hex");
  return `0x${hex}` as `0x${string}`;
}

async function loadArtifact(name: string): Promise<Abi> {
  const artifactPath = path.join(
    contractsRoot,
    "artifacts",
    "contracts",
    "core",
    `${name}.sol`,
    `${name}.json`,
  );
  const raw = JSON.parse(await readFile(artifactPath, "utf8")) as { abi: Abi };
  return raw.abi;
}

async function main() {
  const networkName = process.env.HARDHAT_NETWORK ?? "localhost";
  const deploymentPath = path.join(contractsRoot, "deployments", `${networkName}.json`);
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8")) as {
    contracts: { AnnouncementLog: Address };
  };

  const demoPath = path.join(repoRoot, "scripts", "demo-announcements.json");
  const demoRows = JSON.parse(await readFile(demoPath, "utf8")) as DemoRow[];
  const metaByHash = new Map(
    demoRows.map((r) => [hashAnnouncementBody(r.body).toLowerCase(), r] as const),
  );

  const chain = defineChain({
    id: 31337,
    name: "Hardhat Local",
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [LOCAL_RPC] } },
  });

  const publicClient = createPublicClient({ chain, transport: http(LOCAL_RPC) });
  const announcementAbi = await loadArtifact("AnnouncementLog");

  const events = await publicClient.getContractEvents({
    address: deployment.contracts.AnnouncementLog,
    abi: announcementAbi,
    eventName: "AnnouncementPublished",
    fromBlock: 0n,
    toBlock: "latest",
  });

  if (events.length === 0) {
    console.error(
      "No AnnouncementPublished events found. Run: cd contracts && npm run seed:demo",
    );
    process.exitCode = 1;
    return;
  }

  const store = { items: {} as Record<string, unknown>, idIndex: {} as Record<string, string> };

  for (const e of events) {
    const args = e.args as {
      id?: bigint;
      contentHash?: `0x${string}`;
      publisher?: Address;
      category?: string;
      targetGroup?: string;
      timestamp?: bigint;
    };
    const id = args.id?.toString() ?? "?";
    const contentHash = args.contentHash;
    if (!contentHash) continue;
    const key = contentHash.toLowerCase();
    const meta = metaByHash.get(key);
    const createdAt = args.timestamp
      ? new Date(Number(args.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    store.items[key] = {
      id,
      contentHash,
      title: meta?.title ?? `Annonce #${id}`,
      body: meta?.body ?? "",
      category: meta?.category ?? String(args.category ?? ""),
      targetGroup: meta?.targetGroup ?? String(args.targetGroup ?? ""),
      publisher: args.publisher ? getAddress(args.publisher) : null,
      createdAt,
      txHash: e.transactionHash ?? null,
    };
    if (id !== "?") store.idIndex[id] = key;
  }

  const dataDir = path.join(backendRoot, "data");
  await mkdir(dataDir, { recursive: true });
  const outPath = path.join(dataDir, "announcements.json");
  await writeFile(outPath, JSON.stringify(store, null, 2), "utf8");
  console.log(`Synced ${events.length} announcement(s) → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
