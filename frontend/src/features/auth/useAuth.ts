import { useCallback, useMemo, useState } from "react";
import { useAuthStore } from "./store";
import { useWalletStore } from "./wallet";
import { fetchMe, fetchNonce, verifySignature } from "./authApi";
import { createWalletClient, custom } from "viem";
import { buildAuthMessage } from "./siweLike";

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const patchSession = useAuthStore((s) => s.patchSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const wallet = useWalletStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const login = useCallback(async () => {
    setError(undefined);
    if (!wallet.address) throw new Error("Wallet not connected");
    if (!window.ethereum) throw new Error("MetaMask not found");

    setBusy(true);
    try {
      const nonceRes = await fetchNonce(wallet.address);

      const message = buildAuthMessage({
        domain: nonceRes.domain,
        address: wallet.address,
        uri: nonceRes.uri,
        version: "1",
        chainId: nonceRes.chainId,
        nonce: nonceRes.nonce,
        issuedAt: nonceRes.issuedAt
      });

      const wc = createWalletClient({ transport: custom(window.ethereum) });
      const signature = await wc.signMessage({
        account: wallet.address,
        message
      });

      const verifyRes = await verifySignature({
        address: wallet.address,
        signature,
        nonce: nonceRes.nonce,
        issuedAt: nonceRes.issuedAt,
        chainId: nonceRes.chainId,
        domain: nonceRes.domain,
        uri: nonceRes.uri
      });

      setSession({
        token: verifyRes.token,
        address: verifyRes.address,
        chainId: verifyRes.chainId,
        roles: verifyRes.roles,
        group: verifyRes.group,
        expiresAtMs: Date.now() + verifyRes.expiresInSeconds * 1000
      });
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }, [setSession, wallet.address]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshRoles = useCallback(async () => {
    const current = useAuthStore.getState().session;
    if (!current || Date.now() > current.expiresAtMs) return;
    try {
      const me = await fetchMe();
      const { group, isAdmin, isProfessor, isStudent } = me.roles;
      patchSession({
        roles: { isAdmin, isProfessor, isStudent },
        group: group || undefined
      });
    } catch (e) {
      setError(String(e));
    }
  }, [patchSession]);

  const isAuthenticated = status === "authenticated" && !!session && Date.now() < session.expiresAtMs;

  return useMemo(
    () => ({
      status,
      session,
      isAuthenticated,
      busy,
      error,
      login,
      logout,
      refreshRoles
    }),
    [busy, error, isAuthenticated, login, logout, refreshRoles, session, status]
  );
}

