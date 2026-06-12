import type { NextFunction, Request, RequestHandler, Response } from 'express';

import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { getAddress, verifyMessage } from 'viem';

import { env } from '../config/env.js';
import { HttpError } from './error.js';
import { roleService } from '../services/blockchain/roleService.js';

const NONCE_TTL_MS = 5 * 60_000;
const nonces = new Map<string, { nonce: string; expiresAtMs: number }>();

function randomNonce(): string {
  return randomBytes(16).toString('hex');
}

function pruneExpiredNonces() {
  const now = Date.now();
  for (const [k, v] of nonces.entries()) {
    if (now > v.expiresAtMs) nonces.delete(k);
  }
}

export function issueNonce(address: string) {
  pruneExpiredNonces();
  const nonce = randomNonce();
  const key = getAddress(address);
  nonces.set(key, { nonce, expiresAtMs: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function consumeNonce(address: string, nonce: string) {
  pruneExpiredNonces();
  const key = getAddress(address);
  const entry = nonces.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAtMs) return false;
  if (entry.nonce !== nonce) return false;
  nonces.delete(key);
  return true;
}

export type AuthMessageFields = {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: '1';
  chainId: number;
  nonce: string;
  issuedAt: string;
};

export function buildAuthMessage(fields: AuthMessageFields) {
  const { domain, address, statement, uri, version, chainId, nonce, issuedAt } = fields;
  const header = `${domain} wants you to sign in with your Ethereum account:`;
  const addr = getAddress(address);
  const lines: string[] = [header, addr, '', statement ?? 'Sign in to the academic assistant backend.', ''];
  lines.push(`URI: ${uri}`);
  lines.push(`Version: ${version}`);
  lines.push(`Chain ID: ${chainId}`);
  lines.push(`Nonce: ${nonce}`);
  lines.push(`Issued At: ${issuedAt}`);
  return lines.join('\n');
}

export type AuthRoles = {
  isAdmin: boolean;
  isProfessor: boolean;
  isStudent: boolean;
};

export type SessionTokenPayload = {
  sub: `0x${string}`;
  chainId: number;
  roles: AuthRoles;
  group?: string;
  iat: number;
  exp: number;
};

export function signSessionToken(args: {
  address: string;
  chainId: number;
  roles: AuthRoles;
  group?: string;
  expiresIn?: string;
}) {
  const payload = {
    sub: getAddress(args.address),
    chainId: args.chainId,
    roles: args.roles,
    group: args.group,
  };
  return jwt.sign(
    payload,
    env.JWT_SECRET as string,
    { expiresIn: (args.expiresIn ?? '1h') as jwt.SignOptions['expiresIn'] }
  );
}

export function verifySessionToken(token: string): {
  address: `0x${string}`;
  chainId: number;
  roles: AuthRoles;
  group?: string;
} {
  const decoded = jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload;
  return { address: getAddress(decoded.sub), chainId: decoded.chainId, roles: decoded.roles, group: decoded.group };
}

function authenticateServiceToken(token: string): boolean {
  if (!env.BACKEND_SERVICE_TOKEN || token !== env.BACKEND_SERVICE_TOKEN) return false;
  if (!env.BOT_SERVICE_WALLET_ADDRESS) {
    throw new HttpError(
      500,
      'BACKEND_SERVICE_TOKEN is set but BOT_SERVICE_WALLET_ADDRESS is missing in backend .env',
    );
  }
  return true;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const auth = req.header('authorization');
  if (!auth?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing bearer token'));
  const token = auth.slice('Bearer '.length);
  try {
    if (authenticateServiceToken(token)) {
      req.user = {
        address: getAddress(env.BOT_SERVICE_WALLET_ADDRESS!),
        chainId: env.CHAIN_ID,
        roles: { isAdmin: false, isProfessor: false, isStudent: true },
      };
      return next();
    }
    const { address, chainId, roles, group } = verifySessionToken(token);
    req.user = { address, chainId, roles: { ...roles, group } };
    return next();
  } catch (e) {
    if (e instanceof HttpError) return next(e);
    return next(new HttpError(401, 'Invalid session token'));
  }
};

export const attachRoles: RequestHandler = async (req, _res, next) => {
  if (!req.user) return next();
  try {
    const roles = await roleService.getRolesFor(req.user.address);
    const group = await roleService.getGroup(req.user.address);
    req.user.roles = { ...roles, group };
    return next();
  } catch (e) {
    return next(e);
  }
};

export function requireRole(
  check: (roles: NonNullable<NonNullable<Request['user']>['roles']>) => boolean,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roles = req.user?.roles;
    if (!roles) return next(new HttpError(403, 'Missing roles context'));
    if (!check(roles)) return next(new HttpError(403, 'Insufficient role'));
    return next();
  };
}

export async function verifySignedAuthMessage(args: {
  message: string;
  signature: `0x${string}`;
  address: string;
}) {
  const ok = await verifyMessage({
    address: getAddress(args.address),
    message: args.message,
    signature: args.signature,
  });
  return ok;
}

export function parseAuthMessage(message: string): Partial<AuthMessageFields> {
  const lines = message.split('\n').map((l) => l.trimEnd());
  const out: Partial<AuthMessageFields> = {};

  // Expected header:
  // "<domain> wants you to sign in with your Ethereum account:"
  const header = lines[0] ?? '';
  const m = header.match(/^(.*) wants you to sign in with your Ethereum account:$/);
  if (m?.[1]) out.domain = m[1];

  // Address is line 1
  if (lines[1]) out.address = lines[1];

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === 'URI') out.uri = value;
    if (key === 'Version') out.version = value as '1';
    if (key === 'Chain ID') out.chainId = Number(value);
    if (key === 'Nonce') out.nonce = value;
    if (key === 'Issued At') out.issuedAt = value;
  }

  return out;
}

export function assertAuthMessageValid(args: {
  message: string;
  expected: { domain: string; uri: string; chainId: number; address: string; nonce: string };
}) {
  const parsed = parseAuthMessage(args.message);
  const addr = parsed.address ? getAddress(parsed.address) : undefined;

  if (!parsed.domain || parsed.domain !== args.expected.domain) throw new HttpError(400, 'Invalid message domain');
  if (!addr || addr !== getAddress(args.expected.address)) throw new HttpError(400, 'Invalid message address');
  if (!parsed.uri || parsed.uri !== args.expected.uri) throw new HttpError(400, 'Invalid message uri');
  if (parsed.version !== '1') throw new HttpError(400, 'Invalid message version');
  if (!Number.isInteger(parsed.chainId) || parsed.chainId !== args.expected.chainId)
    throw new HttpError(400, 'Invalid message chainId');
  if (!parsed.nonce || parsed.nonce !== args.expected.nonce) throw new HttpError(400, 'Invalid message nonce');
}

