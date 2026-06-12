import { apiFetch } from "../../lib/api/client";
import { buildAuthMessage } from "./siweLike";
import type { AuthRoles } from "./types";

export type NonceResponse = {
  nonce: string;
  issuedAt: string;
  chainId: number;
  domain: string;
  uri: string;
  version: "1";
};

export type VerifyResponse = {
  token: string;
  address: `0x${string}`;
  chainId: number;
  roles: AuthRoles;
  group?: string;
  expiresInSeconds: number;
};

export async function fetchNonce(address: string) {
  return apiFetch<NonceResponse>("/api/auth/nonce", { method: "POST", json: { address } });
}

export type MeResponse = {
  address: `0x${string}`;
  chainId: number;
  roles: AuthRoles & { group?: string };
};

export async function fetchMe() {
  return apiFetch<MeResponse>("/api/protected/me");
}

export async function verifySignature(payload: {
  address: string;
  signature: `0x${string}`;
  nonce: string;
  issuedAt: string;
  chainId: number;
  domain: string;
  uri: string;
}) {
  const message = buildAuthMessage({
    domain: payload.domain,
    address: payload.address,
    uri: payload.uri,
    version: "1",
    chainId: payload.chainId,
    nonce: payload.nonce,
    issuedAt: payload.issuedAt
  });

  return apiFetch<VerifyResponse>("/api/auth/verify", {
    method: "POST",
    json: {
      address: payload.address,
      signature: payload.signature,
      nonce: payload.nonce,
      issuedAt: payload.issuedAt,
      chainId: payload.chainId,
      message
    }
  });
}

