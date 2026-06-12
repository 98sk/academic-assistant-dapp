import { create } from "zustand";
import {
  createWalletClient,
  custom,
  ResourceUnavailableRpcError,
  type WalletClient
} from "viem";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const METAMASK_PENDING_MSG =
  "Une fenêtre MetaMask est déjà ouverte. Validez-la ou fermez-la puis réessayez.";

const CONNECT_DEBOUNCE_MS = 300;

let walletClient: WalletClient | null = null;
let connectInFlight: Promise<void> | null = null;
let lastConnectAt = 0;

function getWalletClient() {
  if (!window.ethereum) throw new Error("MetaMask not found. Install the MetaMask extension.");
  if (!walletClient) walletClient = createWalletClient({ transport: custom(window.ethereum) });
  return walletClient;
}

export function isResourceUnavailablePendingError(e: unknown): boolean {
  if (e instanceof ResourceUnavailableRpcError) return true;
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; message?: string; code?: number };
  return (
    err.name === "ResourceUnavailableRpcError" ||
    err.code === -32002 ||
    /already pending/i.test(String(err.message ?? ""))
  );
}

export function formatWalletConnectError(e: unknown): string {
  if (isResourceUnavailablePendingError(e)) return METAMASK_PENDING_MSG;
  if (e instanceof Error) return e.message;
  return String(e);
}

type WalletState = {
  status: "disconnected" | "connected";
  address?: `0x${string}`;
  chainId?: number;
  error?: string;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshFromProvider: () => Promise<void>;
};

export const useWalletStore = create<WalletState>((set, get) => ({
  status: "disconnected",
  address: undefined,
  chainId: undefined,
  error: undefined,
  isConnecting: false,

  connect: async () => {
    if (connectInFlight) return connectInFlight;

    const now = Date.now();
    if (now - lastConnectAt < CONNECT_DEBOUNCE_MS) return;
    lastConnectAt = now;

    set({ isConnecting: true, error: undefined });

    connectInFlight = (async () => {
      try {
        const wc = getWalletClient();
        const [address] = await wc.requestAddresses();
        const chainId = await wc.getChainId();
        set({ status: "connected", address, chainId, error: undefined });
      } catch (e) {
        const msg = formatWalletConnectError(e);
        set({
          status: "disconnected",
          address: undefined,
          chainId: undefined,
          error: msg
        });
        throw new Error(msg);
      } finally {
        connectInFlight = null;
        set({ isConnecting: false });
      }
    })();

    return connectInFlight;
  },

  disconnect: () => {
    set({ status: "disconnected", address: undefined, chainId: undefined, error: undefined });
  },

  refreshFromProvider: async () => {
    if (get().isConnecting) return;

    if (!window.ethereum) {
      set({ status: "disconnected", address: undefined, chainId: undefined, error: undefined });
      return;
    }
    try {
      const wc = getWalletClient();
      const addrs = await wc.getAddresses();
      const chainId = await wc.getChainId();
      const address = addrs[0];
      if (!address) {
        set({ status: "disconnected", address: undefined, chainId, error: undefined });
      } else {
        set({ status: "connected", address, chainId, error: undefined });
      }
    } catch {
      set({ status: "disconnected", address: undefined, chainId: undefined, error: undefined });
    }
  }
}));

export function initWalletListeners(opts: { onDisconnect: () => void }) {
  if (!window.ethereum?.on) return () => {};

  const handleAccountsChanged = async (accounts: string[]) => {
    if (!accounts?.length) {
      useWalletStore.getState().disconnect();
      opts.onDisconnect();
      return;
    }
    await useWalletStore.getState().refreshFromProvider();
    opts.onDisconnect();
  };

  const handleChainChanged = async () => {
    await useWalletStore.getState().refreshFromProvider();
    opts.onDisconnect();
  };

  const eth = window.ethereum;
  eth.on("accountsChanged", handleAccountsChanged);
  eth.on("chainChanged", handleChainChanged);

  return () => {
    eth.removeListener?.("accountsChanged", handleAccountsChanged);
    eth.removeListener?.("chainChanged", handleChainChanged);
  };
}
