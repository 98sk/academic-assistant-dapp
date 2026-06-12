import { rename } from 'node:fs/promises';
import path from 'node:path';

import { HttpError } from '../../middleware/error.js';
import { documentService } from '../blockchain/documentService.js';
import { canRelayTransactions } from '../blockchain/client.js';
import { sha256FileHex, sha256HexToBytes32 } from './hash.js';
import { buildStoredFilename, ensureUploadsDir, uploadsDirPath } from './uploads.js';
import { documentsStore } from './store.js';
import { ragService } from '../rag/rag.service.js';

export const documentsService = {
  async list() {
    const items = await documentsStore.list();
    return { items };
  },

  async getById(id: number) {
    const record = await documentsStore.get(id);
    if (!record) throw new HttpError(404, 'Document not found');

    const verified = await documentService.verifyDocument(record.documentHash);
    return { record, verified };
  },

  async uploadAndRegister(args: {
    uploaderWallet: `0x${string}`;
    tempFilePath: string;
    originalFilename: string;
    documentType?: string;
    targetGroup?: string;
  }) {
    if (!args.originalFilename.toLowerCase().endsWith('.pdf')) {
      throw new HttpError(400, 'Only PDF uploads are supported');
    }

    await ensureUploadsDir();
    const shaHex = await sha256FileHex(args.tempFilePath);
    const documentHash = sha256HexToBytes32(shaHex);

    const documentType = args.documentType ?? 'PDF';
    const targetGroup = args.targetGroup ?? '';

    if (!canRelayTransactions) {
      throw new HttpError(500, 'Backend tx relaying is disabled (BACKEND_PRIVATE_KEY not set).');
    }

    let tx: { transactionHash: `0x${string}` };
    try {
      tx = await documentService.relayRegister({ contentHash: documentHash, documentType, targetGroup });
    } catch (e: any) {
      const msg = String(e?.shortMessage ?? e?.message ?? e);
      if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('revert')) {
        throw new HttpError(
          403,
          'Backend wallet is not authorized to register documents on-chain (missing role).',
        );
      }
      throw e;
    }

    // Create metadata record (id assignment) then finalize stored filename.
    const uploadDate = new Date().toISOString();
    const placeholder = await documentsStore.create({
      filename: args.originalFilename,
      storedFilename: '__pending__',
      uploaderWallet: args.uploaderWallet,
      uploadDate,
      txHash: tx.transactionHash,
      documentHash,
      documentType,
      targetGroup,
    });

    const storedFilename = buildStoredFilename({ id: placeholder.id, originalName: args.originalFilename });
    const finalPath = path.join(uploadsDirPath(), storedFilename);

    // Move from temp path to final destination (same filesystem).
    await rename(args.tempFilePath, finalPath);
    const record = await documentsStore.update(placeholder.id, { storedFilename });
    if (!record) throw new HttpError(500, 'Failed to finalize document metadata');

    const indexing = await ragService.indexAfterUpload(record.id);

    return {
      record,
      verified: true,
      indexing,
      indexWarning:
        'error' in indexing
          ? `Indexation RAG échouée : ${indexing.error}. Réessayez via POST /api/assistant/index.`
          : undefined,
    };
  },

  filePathFor(record: { storedFilename: string }) {
    return path.join(uploadsDirPath(), record.storedFilename);
  },
};

