import { pipeline } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

import type { RagConfig } from './types.js';

let localPipeline: FeatureExtractionPipeline | null = null;
let localModelId: string | null = null;

async function getLocalEmbedder(modelId: string): Promise<FeatureExtractionPipeline> {
  if (localPipeline && localModelId === modelId) return localPipeline;
  localPipeline = await pipeline('feature-extraction', modelId, { quantized: true });
  localModelId = modelId;
  return localPipeline;
}

/**
 * Xenova with `{ pooling: 'mean', normalize: true }` often returns [1, hidden] — already pooled.
 * Older logic treated dims[1] as seqLen, producing undefined → null in index.json → similarity 0.
 */
function tensorToVector(tensor: { data: Float32Array | number[]; dims: number[] }): number[] {
  const data = tensor.data;
  const dims = tensor.dims;
  if (dims.length === 1) return Array.from(data as ArrayLike<number>);
  if (dims.length === 2) {
    if (dims[0] === 1) return Array.from(data as ArrayLike<number>);
    const seqLen = dims[0]!;
    const hidden = dims[1]!;
    const out = new Array<number>(hidden).fill(0);
    for (let t = 0; t < seqLen; t++) {
      for (let h = 0; h < hidden; h++) {
        out[h]! += Number(data[t * hidden + h]);
      }
    }
    for (let h = 0; h < hidden; h++) out[h]! /= seqLen;
    return out;
  }
  const seqLen = dims[1] ?? 1;
  const hidden = dims[2] ?? data.length;
  const out = new Array<number>(hidden).fill(0);
  for (let t = 0; t < seqLen; t++) {
    for (let h = 0; h < hidden; h++) {
      out[h]! += Number(data[t * hidden + h]);
    }
  }
  for (let h = 0; h < hidden; h++) out[h]! /= seqLen;
  return out;
}

/** Local embeddings via @xenova/transformers (pipeline step 3 — preferred, no API key). */
export async function embedTextsLocal(texts: string[], config: RagConfig): Promise<number[][]> {
  const modelId = config.embeddingModel;
  const extractor = await getLocalEmbedder(modelId);
  const vectors: number[][] = [];
  for (const text of texts) {
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    vectors.push(tensorToVector(out as { data: Float32Array; dims: number[] }));
  }
  return vectors;
}

/** OpenAI embeddings fallback when OPENAI_API_KEY is set. */
export async function embedTextsOpenAI(texts: string[], config: RagConfig): Promise<number[][]> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const model = config.openaiEmbeddingModel ?? 'text-embedding-3-small';

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return sorted.map((row) => row.embedding);
}

/** Embed batch: OpenAI if key present, otherwise local Xenova model. */
export async function embedTexts(texts: string[], config: RagConfig): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (config.openaiApiKey) {
    try {
      return await embedTextsOpenAI(texts, config);
    } catch {
      // Fall back to local if OpenAI fails (e.g. quota) — still real embeddings.
    }
  }
  return embedTextsLocal(texts, config);
}
