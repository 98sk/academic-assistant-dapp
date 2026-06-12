import { create } from "zustand";

type AuthState = {
  status: "anonymous" | "authenticated";
  user?: { id: string; name: string };
  login: (name: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "anonymous",
  user: undefined,
  login: (name) => set({ status: "authenticated", user: { id: "u_1", name } }),
  logout: () => set({ status: "anonymous", user: undefined })
}));

