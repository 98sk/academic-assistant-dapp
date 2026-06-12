import { createHash } from "node:crypto";

export function sha256Utf8(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function hashAnnouncementBody(body: string): `0x${string}` {
  const hex = sha256Utf8(body);
  return `0x${hex}` as `0x${string}`;
}
