/** SHA-256 of raw file bytes → 0x-prefixed bytes32 (matches backend DocumentRegistry). */
export async function sha256FileToBytes32(file: File): Promise<`0x${string}`> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}` as `0x${string}`;
}
