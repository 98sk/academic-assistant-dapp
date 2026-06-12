import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function sha256FileHex(path: string): Promise<string> {
  const buf = await readFile(path);
  return createHash('sha256').update(buf).digest('hex');
}

export function sha256HexToBytes32(hex: string): `0x${string}` {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('sha256 must be 32 bytes (64 hex chars)');
  }
  return (`0x${hex.toLowerCase()}`) as `0x${string}`;
}

