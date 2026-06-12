import { apiFetch } from "../../lib/api/client";

export type AssistantSource = {
  documentId: number;
  filename: string;
  chunkId: string;
  snippet: string;
  score: number;
};

export type AssistantQueryResponse = {
  answer: string;
  mode: "openai" | "context-only";
  sources: AssistantSource[];
  needsIndex?: boolean;
};

export type AssistantIndexStatus = {
  chunkCount: number;
  pdfCount: number;
  needsIndex: boolean;
};

export async function queryAssistant(args: {
  question: string;
  documentIds?: number[];
}) {
  return apiFetch<AssistantQueryResponse>("/api/assistant/query", {
    method: "POST",
    json: args
  });
}

export async function fetchAssistantIndexStatus() {
  return apiFetch<AssistantIndexStatus>("/api/assistant/status");
}

export async function indexAssistantDocuments(documentId?: number) {
  return apiFetch<{ documentId?: number; chunksIndexed?: number; indexed?: unknown }>(
    "/api/assistant/index",
    {
      method: "POST",
      json: documentId !== undefined ? { documentId } : {}
    }
  );
}
