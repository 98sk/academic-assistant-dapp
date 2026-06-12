import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  type Abi,
  type Address,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsRoot = path.resolve(__dirname, "..");

const LOCAL_RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

/** Comptes de démo toujours accordés en local (Hardhat #0 relay, #1, MetaMask courant). */
const DEFAULT_PROFESSORS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x7F48fa16c4535Bc00Ce6315E377F93787B95319F",
] as const;
const DEFAULT_STUDENTS = ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"] as const;
const DEFAULT_STUDENT_GROUPS = ["cohort-a"] as const;

type DeploymentFile = {
  contracts: { RoleManager: `0x${string}` };
};

function parseAddresses(raw?: string): Address[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (!isAddress(s)) throw new Error(`Invalid address: ${s}`);
      return getAddress(s);
    });
}

function uniqueAddresses(...lists: Address[][]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const list of lists) {
    for (const addr of list) {
      const key = addr.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(addr);
    }
  }
  return out;
}

async function loadRoleManagerAbi(): Promise<Abi> {
  const artifactPath = path.join(
    contractsRoot,
    "artifacts",
    "contracts",
    "core",
    "RoleManager.sol",
    "RoleManager.json",
  );
  const raw = JSON.parse(await readFile(artifactPath, "utf8")) as { abi: Abi };
  return raw.abi;
}

async function loadRoleManagerAddress(networkName: string): Promise<Address> {
  const deploymentPath = path.join(contractsRoot, "deployments", `${networkName}.json`);
  const raw = await readFile(deploymentPath, "utf8");
  const parsed = JSON.parse(raw) as DeploymentFile;
  return parsed.contracts.RoleManager;
}

async function main() {
  const networkName = process.env.HARDHAT_NETWORK ?? "localhost";
  const admin = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: 0 });
  const roleManagerAddress = await loadRoleManagerAddress(networkName);
  const abi = await loadRoleManagerAbi();

  const chain = defineChain({
    id: 31337,
    name: "Hardhat Local",
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [LOCAL_RPC] } },
  });

  const publicClient = createPublicClient({ chain, transport: http(LOCAL_RPC) });
  const walletClient = createWalletClient({
    account: admin,
    chain,
    transport: http(LOCAL_RPC),
  });

  const professors = uniqueAddresses(
    DEFAULT_PROFESSORS.map((a) => getAddress(a)),
    parseAddresses(process.env.PROFESSOR_ADDRESSES),
  );
  const students = uniqueAddresses(
    DEFAULT_STUDENTS.map((a) => getAddress(a)),
    parseAddresses(process.env.STUDENT_ADDRESSES),
  );
  const admins = parseAddresses(process.env.ADMIN_ADDRESSES);
  const backendKey = process.env.BACKEND_ADDRESS;

  if (backendKey && isAddress(backendKey)) {
    professors.push(getAddress(backendKey));
  }

  const envGroups = process.env.STUDENT_GROUPS?.split(",").map((g) => g.trim());
  const studentGroups =
    envGroups && envGroups.length > 0
      ? envGroups
      : [...DEFAULT_STUDENT_GROUPS];

  console.log("Professors:", professors.join(", "));
  console.log("Students:", students.join(", "));

  const PROFESSOR_ROLE = (await publicClient.readContract({
    address: roleManagerAddress,
    abi,
    functionName: "PROFESSOR_ROLE",
  })) as `0x${string}`;
  const STUDENT_ROLE = (await publicClient.readContract({
    address: roleManagerAddress,
    abi,
    functionName: "STUDENT_ROLE",
  })) as `0x${string}`;
  const ADMIN_ROLE = (await publicClient.readContract({
    address: roleManagerAddress,
    abi,
    functionName: "ADMIN_ROLE",
  })) as `0x${string}`;

  for (const addr of admins) {
    console.log(`Granting ADMIN_ROLE to ${addr}`);
    await walletClient.writeContract({
      address: roleManagerAddress,
      abi,
      functionName: "grantRole",
      args: [ADMIN_ROLE, addr],
      chain,
    });
  }

  for (const addr of professors) {
    console.log(`Granting PROFESSOR_ROLE to ${addr}`);
    await walletClient.writeContract({
      address: roleManagerAddress,
      abi,
      functionName: "grantRole",
      args: [PROFESSOR_ROLE, addr],
      chain,
    });
  }

  for (const [idx, addr] of students.entries()) {
    const group = studentGroups[idx]?.trim() || studentGroups[0] || "cohort-a";
    console.log(`Granting STUDENT_ROLE to ${addr} (group: ${group})`);
    await walletClient.writeContract({
      address: roleManagerAddress,
      abi,
      functionName: "grantRole",
      args: [STUDENT_ROLE, addr],
      chain,
    });
    await walletClient.writeContract({
      address: roleManagerAddress,
      abi,
      functionName: "assignGroup",
      args: [addr, group],
      chain,
    });
  }

  console.log("Role grants complete.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
