export type RagConfig = {
  /** Path to JSON vector index (e.g. rag/data/index.json) */
  indexPath: string;
  /** Hugging Face / Xenova model id for local embeddings */
  embeddingModel: string;
  openaiApiKey?: string;
  openaiEmbeddingModel?: string;
  openaiChatModel?: string;
  topK?: number;
  chunkSize?: number;
  chunkOverlap?: number;
};

export type IndexedChunk = {
  id: string;
  documentId: number;
  filename: string;
  text: string;
  embedding: number[];
};

export type DocumentIndexMeta = {
  indexedAt: string;
  chunkCount: number;
  filename: string;
};

export type VectorIndex = {
  version: 1;
  embeddingModel: string;
  chunks: IndexedChunk[];
  documents: Record<string, DocumentIndexMeta>;
};

export type RetrievedSource = {
  documentId: number;
  filename: string;
  chunkId: string;
  snippet: string;
  score: number;
};

export type QueryResult = {
  answer: string;
  mode: 'openai' | 'context-only';
  sources: RetrievedSource[];
  needsIndex?: boolean;
};
