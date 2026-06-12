import { createHash } from 'node:crypto';

export function sha256Utf8(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

export function sha256HexToBytes32(hex: string): `0x${string}` {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('sha256 must be 32 bytes (64 hex chars)');
  }
  return (`0x${hex.toLowerCase()}`) as `0x${string}`;
}

export function hashAnnouncementBody(body: string): `0x${string}` {
  return sha256HexToBytes32(sha256Utf8(body));
}
