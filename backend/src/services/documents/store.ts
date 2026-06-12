import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DocumentRecord = {
  id: number;
  filename: string; // original filename
  storedFilename: string;
  uploaderWallet: `0x${string}`;
  uploadDate: string; // ISO
  txHash: `0x${string}`;
  documentHash: `0x${string}`; // bytes32
  documentType?: string;
  targetGroup?: string;
};

type StoreShape = {
  nextId: number;
  items: Record<string, DocumentRecord>;
};

function backendRootDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..');
}

function dataDir() {
  return path.resolve(backendRootDir(), 'data');
}

export function documentsStorePath() {
  return path.resolve(dataDir(), 'documents.json');
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
}

async function loadStore(): Promise<StoreShape> {
  await ensureDataDir();
  try {
    const raw = await readFile(documentsStorePath(), 'utf8');
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed?.items || typeof parsed.nextId !== 'number') throw new Error('Invalid store format');
    return parsed;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return { nextId: 1, items: {} };
    return { nextId: 1, items: {} };
  }
}

async function atomicWrite(store: StoreShape) {
  await ensureDataDir();
  const target = documentsStorePath();
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await rename(tmp, target);
}

export const documentsStore = {
  async list(): Promise<DocumentRecord[]> {
    const s = await loadStore();
    return Object.values(s.items).sort((a, b) => b.id - a.id);
  },

  async get(id: number): Promise<DocumentRecord | null> {
    const s = await loadStore();
    return s.items[String(id)] ?? null;
  },

  async create(input: Omit<DocumentRecord, 'id'>): Promise<DocumentRecord> {
    const s = await loadStore();
    const id = s.nextId++;
    const record: DocumentRecord = { id, ...input };
    s.items[String(id)] = record;
    await atomicWrite(s);
    return record;
  },

  async update(id: number, patch: Partial<Omit<DocumentRecord, 'id'>>): Promise<DocumentRecord | null> {
    const s = await loadStore();
    const prev = s.items[String(id)];
    if (!prev) return null;
    const next = { ...prev, ...patch, id };
    s.items[String(id)] = next;
    await atomicWrite(s);
    return next;
  },
};

