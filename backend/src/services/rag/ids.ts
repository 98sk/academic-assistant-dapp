/** Synthetic document ids for announcement text in the vector index (avoids collision with PDF ids). */
export const ANNOUNCEMENT_DOC_ID_BASE = 10_000_000;

export function announcementDocumentId(id: string | null, contentHash: string): number {
  if (id && /^\d+$/.test(id)) {
    return ANNOUNCEMENT_DOC_ID_BASE + parseInt(id, 10);
  }
  let h = 0;
  for (let i = 0; i < contentHash.length; i++) {
    h = (Math.imul(31, h) + contentHash.charCodeAt(i)) | 0;
  }
  return ANNOUNCEMENT_DOC_ID_BASE + 500_000 + (Math.abs(h) % 400_000);
}
