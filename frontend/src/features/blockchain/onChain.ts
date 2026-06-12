import {
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  defineChain,
  getAddress,
  http,
  parseEventLogs,
  type Hash,
} from "viem";

import { acknowledgmentAbi, announcementAbi } from "./abis";
import { clearChainConfigCache, getChainConfig } from "./config";
import { formatWalletConnectError, useWalletStore } from "../auth/wallet";

const KNOWN_NETWORKS: Record<number, string> = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia",
  31337: "Hardhat local",
};

function buildChain(chainId: number) {
  return defineChain({
    id: chainId,
    name: KNOWN_NETWORKS[chainId] ?? `Chain ${chainId}`,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  });
}

function formatWrongNetworkError(expected: number, actual: number): string {
  const actualName = KNOWN_NETWORKS[actual] ?? `chainId ${actual}`;
  if (actual === 11155111) {
    return (
      "MetaMask est sur Sepolia, pas sur Hardhat local. " +
      "Basculez sur le réseau « Localhost 8545 » (chainId 31337) : " +
      "MetaMask → Réseaux → Localhost 8545 (RPC http://127.0.0.1:8545, ID de chaîne 31337), puis réessayez."
    );
  }
  return (
    `Mauvais réseau MetaMask : attendu ${KNOWN_NETWORKS[expected] ?? "Hardhat"} (${expected}), ` +
    `actuel ${actualName} (${actual}). Basculez sur Hardhat local (31337) puis réessayez.`
  );
}

export function formatOnChainError(e: unknown): string {
  if (e instanceof UserRejectedRequestError) {
    return "Transaction refusée dans MetaMask.";
  }
  if (e instanceof ContractFunctionRevertedError) {
    const reason = e.shortMessage ?? e.message;
    if (/professor/i.test(reason)) {
      return (
        "Votre portefeuille n'a pas le rôle PROFESSOR on-chain. " +
        "Depuis le dossier contracts : npm run grant-roles:local, puis réessayez."
      );
    }
    return `Transaction annulée (revert) : ${reason}`;
  }
  const pending = formatWalletConnectError(e);
  if (pending.includes("fenêtre MetaMask")) return pending;
  if (e instanceof Error) return e.message;
  return String(e);
}

function getWalletClientFromStore() {
  if (!window.ethereum) throw new Error("MetaMask introuvable. Installez l'extension MetaMask.");
  const { address } = useWalletStore.getState();
  if (!address) throw new Error("Connectez votre portefeuille avant de signer une transaction.");
  return createWalletClient({
    transport: custom(window.ethereum),
    account: getAddress(address),
  });
}

async function extractAnnouncementIdFromReceipt(
  receipt: Awaited<ReturnType<ReturnType<typeof createPublicClient>["waitForTransactionReceipt"]>>,
  contractAddress: `0x${string}`,
  transactionHash: Hash,
  publicClient: ReturnType<typeof createPublicClient>
): Promise<string | undefined> {
  const contract = getAddress(contractAddress);
  const relevantLogs = receipt.logs.filter((log) => getAddress(log.address) === contract);

  const parsed = parseEventLogs({
    abi: announcementAbi,
    logs: relevantLogs,
    eventName: "AnnouncementPublished",
  });
  if (parsed.length > 0) {
    return (parsed[0]!.args as { id: bigint }).id.toString();
  }

  for (const log of relevantLogs) {
    try {
      const decoded = decodeEventLog({
        abi: announcementAbi,
        eventName: "AnnouncementPublished",
        data: log.data,
        topics: log.topics,
      });
      return (decoded.args as { id: bigint }).id.toString();
    } catch {
      // not AnnouncementPublished
    }
  }

  const events = await publicClient.getContractEvents({
    address: contract,
    abi: announcementAbi,
    eventName: "AnnouncementPublished",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });
  const match = events.find((e) => e.transactionHash === transactionHash);
  const id = (match?.args as { id?: bigint } | undefined)?.id;
  return id !== undefined ? id.toString() : undefined;
}

/** Professor signs AnnouncementLog.publishAnnouncement via MetaMask. */
export async function publishAnnouncementOnChain(args: {
  contentHash: `0x${string}`;
  category: string;
  targetGroup: string;
}): Promise<{ transactionHash: Hash; announcementId: string }> {
  try {
    clearChainConfigCache();
    const config = await getChainConfig();
    const chain = buildChain(config.chainId);

    await useWalletStore.getState().refreshFromProvider();
    const wc = getWalletClientFromStore();
    const account = getAddress(useWalletStore.getState().address!);

    const walletChainId = await wc.getChainId();
    if (walletChainId !== config.chainId) {
      throw new Error(formatWrongNetworkError(config.chainId, walletChainId));
    }

    const hash = await wc.writeContract({
      address: getAddress(config.contracts.announcementLog),
      abi: announcementAbi,
      functionName: "publishAnnouncement",
      args: [args.contentHash, args.category, args.targetGroup || ""],
      chain,
      account,
    });

    const publicClient = createPublicClient({
      chain,
      transport: window.ethereum ? custom(window.ethereum) : http(config.chainId === 31337 ? "http://127.0.0.1:8545" : undefined),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      throw new Error(
        "La transaction a été annulée (revert). Vérifiez le rôle PROFESSOR sur votre portefeuille (npm run grant-roles:local) et le réseau Hardhat 31337."
      );
    }

    const announcementId = await extractAnnouncementIdFromReceipt(
      receipt,
      config.contracts.announcementLog,
      hash,
      publicClient
    );
    if (!announcementId) {
      throw new Error(
        "Transaction confirmée mais événement AnnouncementPublished introuvable. Rechargez la page (adresses contrats) et vérifiez ANNOUNCEMENT_LOG_ADDRESS / Hardhat."
      );
    }

    return { transactionHash: hash, announcementId };
  } catch (e) {
    throw new Error(formatOnChainError(e));
  }
}

/** Student signs AcknowledgmentLog.acknowledge(announcementId) via MetaMask. */
export async function acknowledgeAnnouncementOnChain(announcementId: string): Promise<Hash> {
  try {
    clearChainConfigCache();
    const config = await getChainConfig();
    const chain = buildChain(config.chainId);

    await useWalletStore.getState().refreshFromProvider();
    const wc = getWalletClientFromStore();
    const account = getAddress(useWalletStore.getState().address!);

    const walletChainId = await wc.getChainId();
    if (walletChainId !== config.chainId) {
      throw new Error(formatWrongNetworkError(config.chainId, walletChainId));
    }

    const hash = await wc.writeContract({
      address: getAddress(config.contracts.acknowledgmentLog),
      abi: acknowledgmentAbi,
      functionName: "acknowledge",
      args: [BigInt(announcementId)],
      chain,
      account,
    });

    const publicClient = createPublicClient({
      chain,
      transport: window.ethereum ? custom(window.ethereum) : http(config.chainId === 31337 ? "http://127.0.0.1:8545" : undefined),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error("La transaction d'accusé de réception a été annulée (revert).");
    }
    return hash;
  } catch (e) {
    throw new Error(formatOnChainError(e));
  }
}
