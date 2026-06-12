import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function backendRootDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..');
}

export function uploadsDirPath() {
  // Keep uploads under backend/.data/uploads for dev.
  return path.resolve(backendRootDir(), '.data', 'uploads');
}

export async function ensureUploadsDir() {
  await mkdir(uploadsDirPath(), { recursive: true });
}

export function safeFilename(name: string) {
  const base = path.basename(name);
  return base.replace(/[^\w.\-() ]+/g, '_');
}

export function buildStoredFilename(args: { id: number; originalName: string }) {
  const safe = safeFilename(args.originalName);
  return `${args.id}-${safe}`;
}

