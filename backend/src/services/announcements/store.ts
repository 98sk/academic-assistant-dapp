import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type AnnouncementContentRecord = {
  id: string | null;
  contentHash: `0x${string}`;
  title: string;
  body: string;
  category: string;
  targetGroup: string;
  publisher: `0x${string}`;
  createdAt: string;
  txHash?: `0x${string}`;
};

type StoreShape = {
  items: Record<string, AnnouncementContentRecord>;
  idIndex: Record<string, string>;
};

function backendRootDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..');
}

function dataDir() {
  return path.resolve(backendRootDir(), 'data');
}

export function announcementsStorePath() {
  return path.resolve(dataDir(), 'announcements.json');
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
}

async function loadStore(): Promise<StoreShape> {
  await ensureDataDir();
  try {
    const raw = await readFile(announcementsStorePath(), 'utf8');
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed?.items || !parsed?.idIndex) throw new Error('Invalid store format');
    return parsed;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return { items: {}, idIndex: {} };
    return { items: {}, idIndex: {} };
  }
}

async function atomicWrite(store: StoreShape) {
  await ensureDataDir();
  const target = announcementsStorePath();
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await rename(tmp, target);
}

export const announcementsStore = {
  async list(): Promise<AnnouncementContentRecord[]> {
    const s = await loadStore();
    return Object.values(s.items).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getByContentHash(contentHash: `0x${string}`): Promise<AnnouncementContentRecord | null> {
    const s = await loadStore();
    return s.items[contentHash.toLowerCase()] ?? null;
  },

  async getById(id: string): Promise<AnnouncementContentRecord | null> {
    const s = await loadStore();
    const hash = s.idIndex[id];
    if (!hash) return null;
    return s.items[hash] ?? null;
  },

  async create(input: Omit<AnnouncementContentRecord, 'id'>): Promise<AnnouncementContentRecord> {
    const s = await loadStore();
    const key = input.contentHash.toLowerCase();
    const record: AnnouncementContentRecord = { id: null, ...input, contentHash: input.contentHash };
    s.items[key] = record;
    await atomicWrite(s);
    return record;
  },

  async linkId(contentHash: `0x${string}`, id: string, txHash?: `0x${string}`): Promise<AnnouncementContentRecord | null> {
    const s = await loadStore();
    const key = contentHash.toLowerCase();
    const prev = s.items[key];
    if (!prev) return null;
    const next: AnnouncementContentRecord = { ...prev, id, txHash: txHash ?? prev.txHash };
    s.items[key] = next;
    s.idIndex[id] = key;
    await atomicWrite(s);
    return next;
  },
};
