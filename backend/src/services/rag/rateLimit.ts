const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export function assertWithinRateLimit(key: string): void {
  const now = Date.now();
  const prev = hits.get(key) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    const err = new Error('Too many assistant requests. Please wait a minute.');
    (err as Error & { status: number }).status = 429;
    throw err;
  }
  recent.push(now);
  hits.set(key, recent);
}
