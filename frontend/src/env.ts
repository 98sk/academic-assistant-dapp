type ViteEnv = {
  readonly VITE_API_BASE_URL?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
};

export const env = (() => {
  const raw = import.meta.env as unknown as ViteEnv;
  const configured = raw.VITE_API_BASE_URL?.trim() ?? "";

  return {
    /** Empty string in dev uses Vite proxy to localhost:4000 */
    apiBaseUrl: configured,
    mode: raw.MODE,
    dev: raw.DEV,
    prod: raw.PROD
  } as const;
})();

/** Build absolute or relative API URL (works with Vite proxy when base is empty). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!env.apiBaseUrl) return normalized;
  return `${env.apiBaseUrl.replace(/\/$/, "")}${normalized}`;
}
