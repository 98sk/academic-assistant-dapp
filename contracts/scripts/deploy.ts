import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Abi,
  type Address,
  type Hash,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";

type DeploymentFile = {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: `0x${string}`;
  contracts: {
    RoleManager: `0x${string}`;
    AnnouncementLog: `0x${string}`;
    DocumentRegistry: `0x${string}`;
    AcknowledgmentLog: `0x${string}`;
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(contractsRoot, "..");

const LOCAL_RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

async function loadArtifact(contractName: string) {
  const artifactPath = path.join(
    contractsRoot,
    "artifacts",
    "contracts",
    "core",
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  const raw = JSON.parse(await readFile(artifactPath, "utf8")) as {
    abi: Abi;
    bytecode: string;
  };
  return { abi: raw.abi, bytecode: raw.bytecode as `0x${string}` };
}

async function deployContract(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  chain: ReturnType<typeof defineChain>,
  contractName: string,
  args: readonly unknown[],
): Promise<Address> {
  const { abi, bytecode } = await loadArtifact(contractName);
  const hash = (await walletClient.deployContract({
    abi,
    bytecode,
    args,
    chain,
  })) as Hash;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error(`${contractName}: missing contractAddress in receipt`);
  }
  return receipt.contractAddress;
}

async function main() {
  const networkName = process.env.HARDHAT_NETWORK ?? "localhost";
  const account = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: 0 });

  const chain = defineChain({
    id: 31337,
    name: "Hardhat Local",
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [LOCAL_RPC] } },
  });

  const publicClient = createPublicClient({ chain, transport: http(LOCAL_RPC) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(LOCAL_RPC),
  });

  const chainId = await publicClient.getChainId();

  console.log(`Deploying to ${networkName} (chainId ${chainId}) via ${LOCAL_RPC}`);
  console.log(`Deployer: ${account.address}`);

  const roleManagerAddress = await deployContract(walletClient, publicClient, chain, "RoleManager", [
    account.address,
  ]);
  console.log(`RoleManager: ${roleManagerAddress}`);

  const announcementLogAddress = await deployContract(
    walletClient,
    publicClient,
    chain,
    "AnnouncementLog",
    [roleManagerAddress],
  );
  console.log(`AnnouncementLog: ${announcementLogAddress}`);

  const documentRegistryAddress = await deployContract(
    walletClient,
    publicClient,
    chain,
    "DocumentRegistry",
    [roleManagerAddress],
  );
  console.log(`DocumentRegistry: ${documentRegistryAddress}`);

  const acknowledgmentLogAddress = await deployContract(
    walletClient,
    publicClient,
    chain,
    "AcknowledgmentLog",
    [roleManagerAddress, announcementLogAddress],
  );
  console.log(`AcknowledgmentLog: ${acknowledgmentLogAddress}`);

  const deployment: DeploymentFile = {
    network: networkName,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      RoleManager: roleManagerAddress,
      AnnouncementLog: announcementLogAddress,
      DocumentRegistry: documentRegistryAddress,
      AcknowledgmentLog: acknowledgmentLogAddress,
    },
  };

  const deploymentsDir = path.join(contractsRoot, "deployments");
  await mkdir(deploymentsDir, { recursive: true });

  const deploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  await writeFile(deploymentPath, JSON.stringify(deployment, null, 2), "utf8");
  console.log(`Saved deployment to ${deploymentPath}`);

  const defaultRpc =
    networkName === "sepolia"
      ? (process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com")
      : LOCAL_RPC;

  const backendEnvTemplate = `# Generated from contracts/deployments/${networkName}.json
PORT=4000
NODE_ENV=development

CHAIN_ID=${chainId}
RPC_URL=${defaultRpc}

ROLE_MANAGER_ADDRESS=${roleManagerAddress}
ANNOUNCEMENT_LOG_ADDRESS=${announcementLogAddress}
DOCUMENT_REGISTRY_ADDRESS=${documentRegistryAddress}
ACK_LOG_ADDRESS=${acknowledgmentLogAddress}

JWT_SECRET=daa-local-dev-jwt-secret-change-in-production
APP_DOMAIN=localhost
BACKEND_DOMAIN=localhost
FRONTEND_ORIGIN=http://localhost:5173
ALLOWED_CHAIN_IDS=${chainId}

# Hardhat account #0 — grant PROFESSOR_ROLE before relaying publishes/registrations
BACKEND_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
`;

  const backendTemplatePath = path.join(repoRoot, "backend", `.env.${networkName}.template`);
  await writeFile(backendTemplatePath, backendEnvTemplate, "utf8");
  console.log(`Saved backend env template to ${backendTemplatePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
