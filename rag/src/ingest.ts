import { access } from 'node:fs/promises';

import { chunkText } from './chunk.js';
import { embedTexts } from './embed.js';
import { extractPdfText } from './pdf.js';
import { appendDocumentChunks, loadIndex, saveIndex } from './store.js';
import type { RagConfig } from './types.js';

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Ingest a PDF: extract → chunk → embed → persist index (full pipeline). */
export async function indexPdfDocument(args: {
  documentId: number;
  filename: string;
  pdfPath: string;
  config: RagConfig;
}): Promise<{ chunksIndexed: number }> {
  const exists = await fileExists(args.pdfPath);
  if (!exists) throw new Error(`PDF not found: ${args.pdfPath}`);

  const text = await extractPdfText(args.pdfPath);
  const pieces = chunkText(text, {
    chunkSize: args.config.chunkSize,
    chunkOverlap: args.config.chunkOverlap,
  });
  if (pieces.length === 0) throw new Error('No text chunks produced from PDF');

  const embeddings = await embedTexts(pieces, args.config);
  const index = await loadIndex(args.config.indexPath);

  appendDocumentChunks({
    index,
    documentId: args.documentId,
    filename: args.filename,
    embeddingModel: args.config.openaiApiKey
      ? (args.config.openaiEmbeddingModel ?? 'text-embedding-3-small')
      : args.config.embeddingModel,
    chunks: pieces.map((t, i) => ({ text: t, embedding: embeddings[i]! })),
  });

  await saveIndex(args.config.indexPath, index);
  return { chunksIndexed: pieces.length };
}

/** Ingest plain text (e.g. announcement body): chunk → embed → persist. */
export async function indexTextDocument(args: {
  documentId: number;
  filename: string;
  text: string;
  config: RagConfig;
}): Promise<{ chunksIndexed: number }> {
  const text = args.text.trim();
  if (!text) throw new Error('No text to index');

  const pieces = chunkText(text, {
    chunkSize: args.config.chunkSize,
    chunkOverlap: args.config.chunkOverlap,
  });
  if (pieces.length === 0) throw new Error('No text chunks produced');

  const embeddings = await embedTexts(pieces, args.config);
  const index = await loadIndex(args.config.indexPath);

  appendDocumentChunks({
    index,
    documentId: args.documentId,
    filename: args.filename,
    embeddingModel: args.config.openaiApiKey
      ? (args.config.openaiEmbeddingModel ?? 'text-embedding-3-small')
      : args.config.embeddingModel,
    chunks: pieces.map((t, i) => ({ text: t, embedding: embeddings[i]! })),
  });

  await saveIndex(args.config.indexPath, index);
  return { chunksIndexed: pieces.length };
}
