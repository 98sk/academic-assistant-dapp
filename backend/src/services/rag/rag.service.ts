import { indexPdfDocument, indexTextDocument, queryDocuments, loadIndex } from '@daa/rag';

import { HttpError } from '../../middleware/error.js';
import { announcementsStore } from '../announcements/store.js';
import { documentsService } from '../documents/documents.service.js';
import { documentsStore, type DocumentRecord } from '../documents/store.js';
import {
  canAccessDocument,
  filterAccessibleAnnouncements,
  filterAccessibleDocuments,
} from './access.js';
import { buildRagConfig } from './config.js';
import { announcementDocumentId } from './ids.js';

type UserCtx = {
  address: string;
  roles?: {
    isAdmin: boolean;
    isProfessor: boolean;
    isStudent: boolean;
    group?: string;
  };
};

const NO_INDEX_ANSWER_FR =
  "Je n'ai pas encore de documents indexés. Téléversez un PDF dans Documents, attendez l'indexation, puis reposez votre question.";

export type RagQueryResponse = {
  answer: string;
  mode: 'openai' | 'context-only';
  sources: Awaited<ReturnType<typeof queryDocuments>>['sources'];
  needsIndex?: boolean;
};

async function resolveAllowedDocuments(
  user: UserCtx,
  documentIds?: number[],
): Promise<DocumentRecord[]> {
  const all = await documentsStore.list();
  const accessible = filterAccessibleDocuments(user, all);

  if (!documentIds || documentIds.length === 0) return accessible;

  const allowedIds = new Set(accessible.map((d) => d.id));
  const denied = documentIds.filter((id) => !allowedIds.has(id));
  if (denied.length > 0) {
    throw new HttpError(403, 'Access denied for one or more documents');
  }

  return accessible.filter((d) => documentIds.includes(d.id));
}

async function resolveScopeDocumentIds(user: UserCtx, documentIds?: number[]): Promise<number[]> {
  const allowed = await resolveAllowedDocuments(user, documentIds);
  const announcements = filterAccessibleAnnouncements(user, await announcementsStore.list());
  const annIds = announcements.map((a) => announcementDocumentId(a.id, a.contentHash));

  if (documentIds && documentIds.length > 0) {
    return documentIds;
  }

  return [...allowed.map((d) => d.id), ...annIds];
}

function buildNeedsIndexResponse(): RagQueryResponse {
  return {
    answer: NO_INDEX_ANSWER_FR,
    mode: 'context-only',
    sources: [],
    needsIndex: true,
  };
}

export const ragService = {
  config: buildRagConfig,

  noIndexMessageFr: NO_INDEX_ANSWER_FR,

  async indexStatus(user: UserCtx) {
    const scopeIds = await resolveScopeDocumentIds(user);
    const index = await loadIndex(buildRagConfig().indexPath);
    const chunkCount =
      scopeIds.length === 0
        ? 0
        : index.chunks.filter((c) => scopeIds.includes(c.documentId)).length;
    const pdfCount = (await resolveAllowedDocuments(user)).length;
    return {
      chunkCount,
      pdfCount,
      needsIndex: chunkCount === 0,
    };
  },

  async indexDocumentRecord(record: DocumentRecord) {
    const pdfPath = documentsService.filePathFor(record);
    const config = buildRagConfig();
    const result = await indexPdfDocument({
      documentId: record.id,
      filename: record.filename,
      pdfPath,
      config,
    });
    return { documentId: record.id, filename: record.filename, ...result };
  },

  async indexDocumentForUser(user: UserCtx, documentId: number) {
    const record = await documentsStore.get(documentId);
    if (!record) throw new HttpError(404, 'Document not found');
    if (!canAccessDocument(user, record)) throw new HttpError(403, 'Access denied');

    try {
      return await this.indexDocumentRecord(record);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw new HttpError(404, msg);
      if (msg.includes('no extractable text') || msg.includes('No text chunks')) {
        throw new HttpError(422, msg);
      }
      throw new HttpError(500, `Indexing failed: ${msg}`);
    }
  },

  async indexAnnouncementRecord(record: {
    id: string | null;
    contentHash: `0x${string}`;
    title: string;
    body: string;
  }) {
    const body = record.body.trim();
    if (!body) return { documentId: 0, chunksIndexed: 0, skipped: true as const };

    const docId = announcementDocumentId(record.id, record.contentHash);
    const filename = record.title?.trim()
      ? `annonce-${record.title.trim()}`
      : `annonce-${record.id ?? record.contentHash.slice(0, 10)}`;
    const text = record.title?.trim() ? `${record.title}\n\n${body}` : body;

    const config = buildRagConfig();
    const result = await indexTextDocument({
      documentId: docId,
      filename,
      text,
      config,
    });
    return { documentId: docId, filename, ...result };
  },

  async indexAllAccessible(user: UserCtx) {
    const docs = await resolveAllowedDocuments(user);
    const announcements = filterAccessibleAnnouncements(user, await announcementsStore.list());
    const results: Array<{ documentId: number; chunksIndexed: number; error?: string }> = [];

    for (const doc of docs) {
      try {
        const r = await this.indexDocumentForUser(user, doc.id);
        results.push({ documentId: doc.id, chunksIndexed: r.chunksIndexed });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ documentId: doc.id, chunksIndexed: 0, error: msg });
      }
    }

    for (const ann of announcements) {
      const docId = announcementDocumentId(ann.id, ann.contentHash);
      try {
        const r = await this.indexAnnouncementRecord(ann);
        results.push({ documentId: docId, chunksIndexed: r.chunksIndexed });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ documentId: docId, chunksIndexed: 0, error: msg });
      }
    }

    return { indexed: results };
  },

  async query(user: UserCtx, question: string, documentIds?: number[]): Promise<RagQueryResponse> {
    const scopeIds = await resolveScopeDocumentIds(user, documentIds);

    if (scopeIds.length === 0) {
      return buildNeedsIndexResponse();
    }

    const index = await loadIndex(buildRagConfig().indexPath);
    const hasChunks = index.chunks.some((c) => scopeIds.includes(c.documentId));

    if (!hasChunks) {
      return buildNeedsIndexResponse();
    }

    const config = buildRagConfig();
    const result = await queryDocuments({
      question,
      documentIds: scopeIds,
      config,
    });

    return result;
  },

  /** Index a PDF right after upload (no ACL — uploader just registered the file). */
  async indexAfterUpload(documentId: number): Promise<{ chunksIndexed: number } | { error: string }> {
    const record = await documentsStore.get(documentId);
    if (!record) return { error: 'Document metadata not found after upload' };

    try {
      const r = await this.indexDocumentRecord(record);
      console.info(`[rag] indexed document ${documentId}: ${r.chunksIndexed} chunks`);
      return { chunksIndexed: r.chunksIndexed };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[rag] auto-index failed for document ${documentId}:`, msg);
      return { error: msg };
    }
  },

  scheduleIndexAnnouncement(record: {
    id: string | null;
    contentHash: `0x${string}`;
    title: string;
    body: string;
  }) {
    void (async () => {
      try {
        const r = await this.indexAnnouncementRecord(record);
        if (!('skipped' in r && r.skipped)) {
          console.info(`[rag] indexed announcement ${record.id ?? record.contentHash}: ${r.chunksIndexed} chunks`);
        }
      } catch (e) {
        console.warn('[rag] announcement index failed:', e);
      }
    })();
  },
};
