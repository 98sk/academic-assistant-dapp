import { apiUrl } from "../../env";
import { getAuthToken } from "../../features/auth/store";

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const url = apiUrl(path);

  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      (typeof payload === "object" &&
        payload &&
        (("error" in (payload as object) && (payload as { error?: string }).error) ||
          ("message" in (payload as object) && (payload as { message?: string }).message))) ||
      `Request failed (${res.status})`;
    throw new ApiError(String(message), res.status, payload);
  }

  return payload as T;
}

