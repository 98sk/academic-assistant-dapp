import { apiFetch } from "../../lib/api/client";

export type Announcement = {
  id: string | null;
  contentHash: `0x${string}`;
  category: string;
  targetGroup: string;
  timestamp: string | null;
  publisher: `0x${string}` | null;
  blockNumber?: string | null;
  transactionHash?: string | null;
  title?: string;
  body?: string;
  createdAt?: string;
  hasContent: boolean;
};

export type AcknowledgmentStatus = {
  announcementId: string;
  student: `0x${string}`;
  acknowledged: boolean;
  timestamp: string;
};

export async function listAnnouncements() {
  return apiFetch<{ items: Announcement[] }>("/api/announcements");
}

export async function getAnnouncement(id: string) {
  return apiFetch<Announcement>(`/api/announcements/${id}`);
}

export async function publishAnnouncement(args: {
  title: string;
  body: string;
  category: string;
  targetGroup: string;
  mode?: "relay" | "calldata";
}) {
  return apiFetch<{
    mode: "relay" | "calldata";
    transactionHash?: `0x${string}`;
    announcementId?: string | null;
    contentHash: `0x${string}`;
    to?: `0x${string}`;
    data?: `0x${string}`;
  }>("/api/announcements/publish", {
    method: "POST",
    json: { ...args, mode: args.mode ?? "relay" }
  });
}

export async function confirmAnnouncementPublish(args: {
  contentHash: `0x${string}`;
  announcementId: string;
  transactionHash: `0x${string}`;
}) {
  return apiFetch<{ linked: boolean }>("/api/announcements/confirm", {
    method: "POST",
    json: args
  });
}

export type AnnouncementVerifyResult = {
  announcementId: string;
  onChainContentHash: `0x${string}`;
  providedContentHash: `0x${string}` | null;
  verified: boolean | undefined;
  publisher: `0x${string}`;
  category: string;
  targetGroup: string;
  timestamp: string;
};

export async function verifyAnnouncement(args: { announcementId: string; body: string }) {
  const params = new URLSearchParams({
    announcementId: args.announcementId,
    body: args.body
  });
  return apiFetch<AnnouncementVerifyResult>(`/api/verify?${params.toString()}`);
}

export async function getAcknowledgmentStatus(announcementId: string) {
  return apiFetch<AcknowledgmentStatus>(`/api/announcements/${announcementId}/acknowledgment`);
}

export type AcknowledgmentRecord = {
  student: `0x${string}` | null;
  announcementId: string | null;
  timestamp: string | null;
  blockNumber: string | null;
  transactionHash: `0x${string}` | null;
};

export async function listAnnouncementAcknowledgments(announcementId: string) {
  return apiFetch<{ announcementId: string; items: AcknowledgmentRecord[] }>(
    `/api/announcements/${announcementId}/acknowledgments`
  );
}

export async function acknowledgeAnnouncement(announcementId: string, mode: "relay" | "calldata" = "calldata") {
  return apiFetch<{ mode: string; transactionHash?: `0x${string}`; to?: string; data?: `0x${string}` }>(
    "/api/acknowledgments",
    {
      method: "POST",
      json: { announcementId, mode }
    }
  );
}
