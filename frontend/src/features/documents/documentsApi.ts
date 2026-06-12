import { apiUrl } from "../../env";
import { getAuthToken } from "../auth/store";
import { ApiError, apiFetch } from "../../lib/api/client";

export type DocumentRecord = {
  id: number;
  filename: string;
  storedFilename: string;
  uploaderWallet: `0x${string}`;
  uploadDate: string;
  txHash: `0x${string}`;
  documentHash: `0x${string}`;
  documentType?: string;
  targetGroup?: string;
};

export async function listDocuments() {
  return apiFetch<{ items: DocumentRecord[] }>("/api/documents");
}

export async function getDocumentById(id: number) {
  return apiFetch<{ record: DocumentRecord; verified: boolean }>(`/api/documents/${id}`);
}

export async function verifyDocument(contentHash: `0x${string}`) {
  return apiFetch<{ contentHash: `0x${string}`; verified: boolean }>(
    `/api/documents/verify/${encodeURIComponent(contentHash)}`
  );
}

export function uploadDocument(args: {
  file: File;
  documentType?: string;
  targetGroup?: string;
  onProgress?: (pct: number) => void;
}) {
  const token = getAuthToken();
  if (!token) return Promise.reject(new ApiError("Not authenticated", 401));

  const url = apiUrl("/api/documents/upload");
  const form = new FormData();
  form.append("file", args.file);
  if (args.documentType) form.append("documentType", args.documentType);
  if (args.targetGroup) form.append("targetGroup", args.targetGroup);

  return new Promise<{ record: DocumentRecord; verified: boolean }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      args.onProgress?.(pct);
    };

    xhr.onerror = () => reject(new ApiError("Network error", 0));
    xhr.onload = () => {
      const ct = xhr.getResponseHeader("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const payload = isJson ? JSON.parse(xhr.responseText || "{}") : xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        const message =
          (payload && typeof payload === "object" && "error" in payload && (payload as any).error) ||
          `Request failed (${xhr.status})`;
        reject(new ApiError(String(message), xhr.status, payload));
      }
    };

    xhr.send(form);
  });
}

