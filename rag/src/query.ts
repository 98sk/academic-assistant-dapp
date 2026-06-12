import { cosineSimilarity } from './cosine.js';
import { embedTexts } from './embed.js';
import { buildContextOnlyAnswer, generateOpenAIAnswer } from './generate.js';
import { filterChunksByDocuments, loadIndex } from './store.js';
import type { QueryResult, RagConfig, RetrievedSource } from './types.js';

const SNIPPET_MAX = 400;

function hasValidEmbedding(embedding: number[]): boolean {
  return embedding.length > 0 && embedding.some((v) => typeof v === 'number' && Number.isFinite(v));
}

function toSnippet(text: string): string {
  const t = text.trim();
  if (t.length <= SNIPPET_MAX) return t;
  return `${t.slice(0, SNIPPET_MAX)}…`;
}

/** Retrieve top-k chunks by cosine similarity (pipeline step 4). */
export async function retrieveChunks(args: {
  question: string;
  documentIds?: number[];
  config: RagConfig;
}): Promise<RetrievedSource[]> {
  const index = await loadIndex(args.config.indexPath);
  const pool = filterChunksByDocuments(index.chunks, args.documentIds).filter((c) =>
    hasValidEmbedding(c.embedding),
  );
  if (pool.length === 0) return [];

  const [queryVec] = await embedTexts([args.question], args.config);
  if (!queryVec) return [];

  const topK = args.config.topK ?? 5;
  const ranked = pool
    .map((c) => ({
      documentId: c.documentId,
      filename: c.filename,
      chunkId: c.id,
      snippet: toSnippet(c.text),
      score: cosineSimilarity(queryVec, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked;
}

/** Full RAG query: retrieve → generate (OpenAI or context-only). */
export async function queryDocuments(args: {
  question: string;
  documentIds?: number[];
  config: RagConfig;
}): Promise<QueryResult> {
  const sources = await retrieveChunks({
    question: args.question,
    documentIds: args.documentIds,
    config: args.config,
  });

  if (args.config.openaiApiKey) {
    try {
      const answer = await generateOpenAIAnswer({
        question: args.question,
        sources,
        apiKey: args.config.openaiApiKey,
        model: args.config.openaiChatModel,
      });
      return { answer, mode: 'openai', sources };
    } catch {
      // Fall through to context-only if chat API fails.
    }
  }

  const answer = buildContextOnlyAnswer(args.question, sources);
  return { answer, mode: 'context-only', sources };
}
