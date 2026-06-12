import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  getAddress,
  http,
  type Abi,
  type Address,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";

import { hashAnnouncementBody } from "./demo-hash.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(contractsRoot, "..");

const LOCAL_RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

const PROFESSOR = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: 1 });
const STUDENT = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: 2 });
const ADMIN = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: 0 });
/** Portefeuille MetaMask fréquent en démo locale (voir docs/SEED_DEMO.md). */
const EXTRA_PROFESSOR = getAddress("0x7F48fa16c4535Bc00Ce6315E377F93787B95319F");

type DeploymentFile = {
  contracts: {
    RoleManager: Address;
    AnnouncementLog: Address;
    AcknowledgmentLog: Address;
  };
};

type DemoRow = {
  title: string;
  body: string;
  category: string;
  targetGroup: string;
};

type PublishedRow = DemoRow & {
  contentHash: `0x${string}`;
  id: string;
  txHash: `0x${string}`;
};

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

async function loadDeployment(networkName: string): Promise<DeploymentFile> {
  const p = path.join(contractsRoot, "deployments", `${networkName}.json`);
  return JSON.parse(await readFile(p, "utf8")) as DeploymentFile;
}

async function loadDemoRows(): Promise<DemoRow[]> {
  const p = path.join(repoRoot, "scripts", "demo-announcements.json");
  return JSON.parse(await readFile(p, "utf8")) as DemoRow[];
}

async function ensureRoles(
  publicClient: ReturnType<typeof createPublicClient>,
  adminWallet: ReturnType<typeof createWalletClient>,
  roleManager: Address,
  roleManagerAbi: Abi,
) {
  const PROFESSOR_ROLE = (await publicClient.readContract({
    address: roleManager,
    abi: roleManagerAbi,
    functionName: "PROFESSOR_ROLE",
  })) as `0x${string}`;
  const STUDENT_ROLE = (await publicClient.readContract({
    address: roleManager,
    abi: roleManagerAbi,
    functionName: "STUDENT_ROLE",
  })) as `0x${string}`;

  for (const professorAddr of [PROFESSOR.address, EXTRA_PROFESSOR] as Address[]) {
    const professorHas = await publicClient.readContract({
      address: roleManager,
      abi: roleManagerAbi,
      functionName: "hasRole",
      args: [PROFESSOR_ROLE, professorAddr],
    });
    if (!professorHas) {
      console.log(`Granting PROFESSOR_ROLE to ${professorAddr}`);
      await adminWallet.writeContract({
        address: roleManager,
        abi: roleManagerAbi,
        functionName: "grantRole",
        args: [PROFESSOR_ROLE, professorAddr],
      });
    }
  }

  const studentHas = await publicClient.readContract({
    address: roleManager,
    abi: roleManagerAbi,
    functionName: "hasRole",
    args: [STUDENT_ROLE, STUDENT.address],
  });
  if (!studentHas) {
    console.log(`Granting STUDENT_ROLE to ${STUDENT.address} (cohort-a)`);
    await adminWallet.writeContract({
      address: roleManager,
      abi: roleManagerAbi,
      functionName: "grantRole",
      args: [STUDENT_ROLE, STUDENT.address],
    });
    await adminWallet.writeContract({
      address: roleManager,
      abi: roleManagerAbi,
      functionName: "assignGroup",
      args: [STUDENT.address, "cohort-a"],
    });
  } else {
    const group = await publicClient.readContract({
      address: roleManager,
      abi: roleManagerAbi,
      functionName: "getGroup",
      args: [STUDENT.address],
    });
    if (String(group) !== "cohort-a") {
      console.log(`Assigning cohort-a to ${STUDENT.address}`);
      await adminWallet.writeContract({
        address: roleManager,
        abi: roleManagerAbi,
        functionName: "assignGroup",
        args: [STUDENT.address, "cohort-a"],
      });
    }
  }
}

async function main() {
  const networkName = process.env.HARDHAT_NETWORK ?? "localhost";
  const deployment = await loadDeployment(networkName);
  const demoRows = await loadDemoRows();

  const chain = defineChain({
    id: 31337,
    name: "Hardhat Local",
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [LOCAL_RPC] } },
  });

  let blockNumber: bigint;
  try {
    const publicClient = createPublicClient({ chain, transport: http(LOCAL_RPC) });
    blockNumber = await publicClient.getBlockNumber();
  } catch (e) {
    console.error(
      `Cannot reach Hardhat node at ${LOCAL_RPC}. Start it with: npx hardhat node`,
    );
    throw e;
  }

  const publicClient = createPublicClient({ chain, transport: http(LOCAL_RPC) });
  const adminWallet = createWalletClient({
    account: ADMIN,
    chain,
    transport: http(LOCAL_RPC),
  });
  const professorWallet = createWalletClient({
    account: PROFESSOR,
    chain,
    transport: http(LOCAL_RPC),
  });
  const studentWallet = createWalletClient({
    account: STUDENT,
    chain,
    transport: http(LOCAL_RPC),
  });

  console.log(`Connected (block ${blockNumber})`);
  console.log(`Professor: ${PROFESSOR.address}`);
  console.log(`Student:   ${STUDENT.address} (cohort-a)`);

  const [roleManagerAbi, announcementAbi, acknowledgmentAbi] = await Promise.all([
    loadArtifact("RoleManager"),
    loadArtifact("AnnouncementLog"),
    loadArtifact("AcknowledgmentLog"),
  ]);

  const { RoleManager, AnnouncementLog, AcknowledgmentLog } = deployment.contracts;

  await ensureRoles(publicClient, adminWallet, RoleManager, roleManagerAbi);

  const existingEvents = await publicClient.getContractEvents({
    address: AnnouncementLog,
    abi: announcementAbi,
    eventName: "AnnouncementPublished",
    fromBlock: 0n,
    toBlock: "latest",
  });

  const hashOnChain = new Set(
    existingEvents.map((e) =>
      String((e.args as { contentHash?: string }).contentHash ?? "").toLowerCase(),
    ),
  );

  const published: PublishedRow[] = [];

  for (const row of demoRows) {
    const contentHash = hashAnnouncementBody(row.body);
    const hashKey = contentHash.toLowerCase();

    if (hashOnChain.has(hashKey)) {
      const match = existingEvents.find(
        (e) =>
          String((e.args as { contentHash?: string }).contentHash ?? "").toLowerCase() ===
          hashKey,
      );
      const id = (match?.args as { id?: bigint })?.id?.toString() ?? "?";
      console.log(`Skip publish (already on-chain): #${id} ${row.title}`);
      published.push({
        ...row,
        contentHash,
        id,
        txHash: (match?.transactionHash ?? "0x") as `0x${string}`,
      });
      continue;
    }

    console.log(`Publishing: ${row.title} [${row.category} / ${row.targetGroup || "public"}]`);
    const txHash = await professorWallet.writeContract({
      address: AnnouncementLog,
      abi: announcementAbi,
      functionName: "publishAnnouncement",
      args: [contentHash, row.category, row.targetGroup],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    let announcementId = "?";
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: announcementAbi,
          eventName: "AnnouncementPublished",
          data: log.data,
          topics: log.topics,
        });
        announcementId = (decoded.args as { id: bigint }).id.toString();
        break;
      } catch {
        // not our event
      }
    }

    console.log(`  → id #${announcementId} tx ${txHash}`);
    published.push({ ...row, contentHash, id: announcementId, txHash });
    hashOnChain.add(hashKey);
  }

  const ackTargets = published.filter((p) => p.targetGroup === "cohort-a" && p.id !== "?");

  for (const row of ackTargets.slice(0, 2)) {
    const id = BigInt(row.id);
    const already = await publicClient.readContract({
      address: AcknowledgmentLog,
      abi: acknowledgmentAbi,
      functionName: "hasAcknowledged",
      args: [id, STUDENT.address],
    });
    if (already) {
      console.log(`Skip ack: student already acknowledged #${row.id}`);
      continue;
    }

    console.log(`Student acknowledging #${row.id} (${row.title})`);
    const ackTx = await studentWallet.writeContract({
      address: AcknowledgmentLog,
      abi: acknowledgmentAbi,
      functionName: "acknowledge",
      args: [id],
    });
    console.log(`  → ack tx ${ackTx}`);
  }

  const store = {
    items: {} as Record<string, unknown>,
    idIndex: {} as Record<string, string>,
  };

  const now = new Date().toISOString();
  for (const row of published) {
    const key = row.contentHash.toLowerCase();
    store.items[key] = {
      id: row.id,
      contentHash: row.contentHash,
      title: row.title,
      body: row.body,
      category: row.category,
      targetGroup: row.targetGroup,
      publisher: getAddress(PROFESSOR.address),
      createdAt: now,
      txHash: row.txHash,
    };
    if (row.id !== "?") store.idIndex[row.id] = key;
  }

  const dataDir = path.join(repoRoot, "backend", "data");
  await mkdir(dataDir, { recursive: true });
  const outPath = path.join(dataDir, "announcements.json");
  await writeFile(outPath, JSON.stringify(store, null, 2), "utf8");
  console.log(`Wrote off-chain store: ${outPath}`);

  const totalAnn = await publicClient.getContractEvents({
    address: AnnouncementLog,
    abi: announcementAbi,
    eventName: "AnnouncementPublished",
    fromBlock: 0n,
    toBlock: "latest",
  });
  const totalAck = await publicClient.getContractEvents({
    address: AcknowledgmentLog,
    abi: acknowledgmentAbi,
    eventName: "Acknowledged",
    fromBlock: 0n,
    toBlock: "latest",
  });

  console.log("\n--- Résumé ---");
  console.log(`Annonces on-chain: ${totalAnn.length}`);
  console.log(`Accusés on-chain:  ${totalAck.length}`);
  console.log("IDs publiés:", published.map((p) => `#${p.id} ${p.category}`).join(", "));
  console.log("\nOuvrez http://localhost:5173/announcements puis /analytics (Actualiser).");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
