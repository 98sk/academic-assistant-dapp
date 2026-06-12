import { apiFetch } from "../../lib/api/client";

export type AnnouncementsAnalytics = {
  bucket: string;
  total: number;
  byBucket: Record<string, number>;
  byCategory: Record<string, number>;
  byGroup: Record<string, number>;
};

export type AcknowledgmentsAnalytics = {
  total: number;
  byAnnouncement: Record<string, number>;
};

export async function getAnnouncementsAnalytics(bucket: "day" | "hour" = "day") {
  return apiFetch<AnnouncementsAnalytics>(`/api/analytics/announcements?bucket=${bucket}`);
}

export async function getAcknowledgmentsAnalytics() {
  return apiFetch<AcknowledgmentsAnalytics>("/api/analytics/acknowledgments");
}

export type DashboardSummary = {
  documents: number;
  announcements: number;
  recent: Array<{
    type: "announcement" | "document";
    id: string | null;
    title: string;
    meta: string;
  }>;
};

export async function getDashboardSummary() {
  return apiFetch<DashboardSummary>("/api/dashboard");
}
