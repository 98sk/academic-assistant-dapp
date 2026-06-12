import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from '../../config/env.js';
import type { RagConfig } from '@daa/rag';

function repoRootFromHere() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..', '..');
}

export function buildRagConfig(): RagConfig {
  const defaultIndex = path.join(repoRootFromHere(), 'rag', 'data', 'index.json');
  return {
    indexPath: env.RAG_INDEX_PATH ?? defaultIndex,
    embeddingModel: env.RAG_EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2',
    openaiApiKey: env.OPENAI_API_KEY,
    openaiEmbeddingModel: env.RAG_OPENAI_EMBEDDING_MODEL,
    openaiChatModel: env.RAG_OPENAI_CHAT_MODEL,
    topK: env.RAG_TOP_K,
    chunkSize: env.RAG_CHUNK_SIZE,
    chunkOverlap: env.RAG_CHUNK_OVERLAP,
  };
}
