import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { DocumentIndexMeta, IndexedChunk, VectorIndex } from './types.js';

async function ensureParent(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadIndex(indexPath: string): Promise<VectorIndex> {
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as VectorIndex;
    if (parsed?.version !== 1 || !Array.isArray(parsed.chunks)) {
      throw new Error('Invalid index format');
    }
    parsed.documents ??= {};
    return parsed;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') {
      return { version: 1, embeddingModel: '', chunks: [], documents: {} };
    }
    throw e;
  }
}

export async function saveIndex(indexPath: string, index: VectorIndex): Promise<void> {
  await ensureParent(indexPath);
  const tmp = `${indexPath}.tmp`;
  await writeFile(tmp, JSON.stringify(index, null, 2), 'utf8');
  await rename(tmp, indexPath);
}

export function removeDocumentChunks(index: VectorIndex, documentId: number): void {
  index.chunks = index.chunks.filter((c) => c.documentId !== documentId);
  delete index.documents[String(documentId)];
}

export function appendDocumentChunks(args: {
  index: VectorIndex;
  documentId: number;
  filename: string;
  embeddingModel: string;
  chunks: Array<{ text: string; embedding: number[] }>;
}): void {
  removeDocumentChunks(args.index, args.documentId);
  args.index.embeddingModel = args.embeddingModel;

  args.chunks.forEach((c, i) => {
    args.index.chunks.push({
      id: `doc${args.documentId}-chunk${i}`,
      documentId: args.documentId,
      filename: args.filename,
      text: c.text,
      embedding: c.embedding,
    });
  });

  const meta: DocumentIndexMeta = {
    indexedAt: new Date().toISOString(),
    chunkCount: args.chunks.length,
    filename: args.filename,
  };
  args.index.documents[String(args.documentId)] = meta;
}

export function filterChunksByDocuments(
  chunks: IndexedChunk[],
  documentIds?: number[],
): IndexedChunk[] {
  if (!documentIds || documentIds.length === 0) return chunks;
  const allowed = new Set(documentIds);
  return chunks.filter((c) => allowed.has(c.documentId));
}
