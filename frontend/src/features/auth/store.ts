import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession } from "./types";

type AuthState = {
  status: "anonymous" | "authenticated";
  session?: AuthSession;
  setSession: (session: AuthSession) => void;
  patchSession: (patch: Partial<Pick<AuthSession, "roles" | "group">>) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: "anonymous",
      session: undefined,
      setSession: (session) => set({ status: "authenticated", session }),
      patchSession: (patch) =>
        set((s) =>
          s.session ? { session: { ...s.session, ...patch } } : s
        ),
      clearSession: () => set({ status: "anonymous", session: undefined })
    }),
    {
      name: "daa_auth",
      partialize: (s) => ({ status: s.status, session: s.session })
    }
  )
);

export function getAuthToken() {
  const s = useAuthStore.getState().session;
  if (!s) return undefined;
  if (Date.now() > s.expiresAtMs) return undefined;
  return s.token;
}

