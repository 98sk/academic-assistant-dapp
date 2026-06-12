function finiteComponent(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Cosine similarity in [0, 1] for L2-normalized embedding vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!finiteComponent(x) || !finiteComponent(y)) continue;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const sim = denom > 0 ? dot / denom : 0;
  return Number.isFinite(sim) ? Math.max(0, Math.min(1, sim)) : 0;
}
