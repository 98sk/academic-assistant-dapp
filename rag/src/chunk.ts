/** Split plain text into overlapping fixed-size chunks (pipeline step 2). */
export function chunkText(
  text: string,
  opts: { chunkSize?: number; chunkOverlap?: number } = {},
): string[] {
  const chunkSize = opts.chunkSize ?? 900;
  const overlap = opts.chunkOverlap ?? 120;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  const flush = () => {
    const piece = buffer.trim();
    if (piece.length > 0) chunks.push(piece);
    buffer = '';
  };

  for (const para of paragraphs) {
    if (buffer.length + para.length + 2 <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
      continue;
    }
    if (buffer) flush();
    if (para.length <= chunkSize) {
      buffer = para;
      continue;
    }
    for (let i = 0; i < para.length; i += chunkSize - overlap) {
      chunks.push(para.slice(i, i + chunkSize));
    }
  }
  flush();

  if (chunks.length === 0 && normalized.length > 0) {
    for (let i = 0; i < normalized.length; i += chunkSize - overlap) {
      chunks.push(normalized.slice(i, i + chunkSize));
    }
  }

  return chunks;
}
