import { create } from "zustand";

type WalletState = {
  status: "disconnected" | "connected";
  address?: string;
  connect: () => void;
  disconnect: () => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  status: "disconnected",
  address: undefined,
  connect: () => set({ status: "connected", address: "0x0000…0000" }),
  disconnect: () => set({ status: "disconnected", address: undefined })
}));

