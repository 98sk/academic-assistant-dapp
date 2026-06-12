export type RetrievedSource = {
  documentId: number;
  filename: string;
  chunkId: string;
  snippet: string;
  score: number;
};

export type ChatApiResponse = {
  answer: string;
  mode: 'openai' | 'context-only';
  sources: RetrievedSource[];
  needsIndex?: boolean;
};

const TELEGRAM_MAX = 4096;
const CHUNK_SAFE = 4080;
const LOW_SIMILARITY = 0.28;
const OFF_TOPIC_MAX_SCORE = 0.14;

const OFF_TOPIC_HINTS = [
  /^(salut|bonjour|hello|hi|coucou)\b/i,
  /^(merci|thanks|ok|d'accord)\s*!?$/i,
  /météo|weather|football|bitcoin|crypto|recette|cuisine/i,
];

export const DEMO_WALLETS = {
  professor: '0x7F48fa16c4535Bc00Ce6315E377F93787B95319F',
  student: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
} as const;

function pct(score: number): string {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}`;
}

function oneLineSnippet(snippet: string, max = 140): string {
  const line = snippet.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

export function maxSourceScore(sources: RetrievedSource[]): number {
  if (sources.length === 0) return 0;
  return Math.max(...sources.map((s) => s.score));
}

export function looksOffTopic(question: string, sources: RetrievedSource[]): boolean {
  const q = question.trim();
  if (OFF_TOPIC_HINTS.some((re) => re.test(q))) return true;
  if (sources.length === 0) return false;
  return maxSourceScore(sources) < OFF_TOPIC_MAX_SCORE;
}

export function hasLowSimilarity(sources: RetrievedSource[]): boolean {
  if (sources.length === 0) return true;
  return maxSourceScore(sources) < LOW_SIMILARITY;
}

export function formatSourcesLine(sources: RetrievedSource[]): string {
  if (sources.length === 0) return '';
  const parts = sources.slice(0, 5).map((s) => `doc #${s.documentId} (pertinence ${pct(s.score)}%)`);
  return `\n\n📎 Sources : ${parts.join(' · ')}`;
}

export function buildBulletSynthèse(sources: RetrievedSource[]): string {
  const top = sources.slice(0, 3);
  if (top.length === 0) return '';
  const bullets = top.map((s, i) => {
    const label = s.filename?.trim() || `document #${s.documentId}`;
    return `• ${i + 1}. ${label} — ${oneLineSnippet(s.snippet)}`;
  });
  return `📌 Synthèse rapide\n${bullets.join('\n')}\n\n`;
}

export function formatBackendError(status: number, body: Record<string, unknown>): string {
  const apiError = typeof body.error === 'string' ? body.error : undefined;
  const detail = typeof body.message === 'string' ? body.message : apiError;

  if (status === 401) {
    return (
      '🔐 Authentification refusée (401).\n' +
      'Vérifiez que BACKEND_SERVICE_TOKEN est identique dans backend/.env et telegram-bot/.env, ' +
      'et que BOT_SERVICE_WALLET_ADDRESS est défini côté backend.'
    );
  }
  if (status === 403) {
    return (
      '🚫 Accès refusé (403).\n' +
      'Le wallet service (BOT_SERVICE_WALLET_ADDRESS) doit avoir STUDENT_ROLE et accès aux documents indexés.'
    );
  }
  if (status === 429) {
    return '⏳ Limite de requêtes atteinte (429). Patientez une minute avant de réessayer.';
  }
  if (status === 400 && detail) {
    return `❌ Requête invalide : ${detail}`;
  }
  if (status >= 500) {
    return (
      `⚠️ Erreur serveur (${status})${detail ? ` : ${detail}` : ''}.\n` +
      'Le backend est-il démarré ? (`cd backend && npm run dev`)'
    );
  }
  return detail ?? `Erreur HTTP ${status}`;
}

function parseSources(raw: unknown): RetrievedSource[] {
  if (!Array.isArray(raw)) return [];
  const out: RetrievedSource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const documentId = Number(s.documentId);
    if (!Number.isFinite(documentId)) continue;
    out.push({
      documentId,
      filename: typeof s.filename === 'string' ? s.filename : `doc-${documentId}`,
      chunkId: typeof s.chunkId === 'string' ? s.chunkId : '',
      snippet: typeof s.snippet === 'string' ? s.snippet : '',
      score: typeof s.score === 'number' ? s.score : 0,
    });
  }
  return out;
}

export function parseChatResponse(body: Record<string, unknown>): ChatApiResponse {
  const answer = typeof body.answer === 'string' ? body.answer : '';
  const mode = body.mode === 'openai' ? 'openai' : 'context-only';
  const sources = parseSources(body.sources ?? body.citations);
  const needsIndex = body.needsIndex === true;
  return { answer, mode, sources, needsIndex };
}

export function formatAskReply(question: string, data: ChatApiResponse): string {
  if (data.needsIndex || (!data.answer.trim() && data.sources.length === 0)) {
    return (
      data.answer.trim() ||
      "Je n'ai pas encore de documents indexés.\n\n" +
        'Téléversez un PDF via l’interface web (Documents), attendez l’indexation (~30 s), puis utilisez /ask.'
    );
  }

  if (looksOffTopic(question, data.sources)) {
    return (
      '🤔 Votre message semble hors du périmètre des documents académiques indexés.\n\n' +
      'Posez une question sur un syllabus, une annonce ou un PDF déjà téléversé.\n' +
      'Exemple : /ask Quelles sont les dates importantes du cours ?'
    );
  }

  const parts: string[] = [];

  if (hasLowSimilarity(data.sources) && data.sources.length > 0) {
    parts.push(
      '⚠️ Peu de correspondance dans les documents indexés. Essayez de reformuler ou préciser le cours / le document.\n',
    );
  }

  if (data.mode === 'context-only' && data.sources.length > 0) {
    parts.push(buildBulletSynthèse(data.sources));
  }

  let body = data.answer.trim();
  if (!body && data.sources.length > 0) {
    body = 'Extraits pertinents récupérés — voir la synthèse ci-dessus.';
  }
  if (!body) {
    body = 'Aucune réponse textuelle ; vérifiez l’index RAG avec /status.';
  }

  parts.push(body);
  parts.push(formatSourcesLine(data.sources));

  return parts.join('').trim();
}

export async function replyInChunks(
  reply: (text: string) => Promise<unknown>,
  text: string,
): Promise<void> {
  if (text.length <= TELEGRAM_MAX) {
    await reply(text);
    return;
  }
  for (let i = 0; i < text.length; i += CHUNK_SAFE) {
    const chunk = text.slice(i, i + CHUNK_SAFE);
    const prefix = i > 0 ? `(suite ${Math.floor(i / CHUNK_SAFE) + 1})\n` : '';
    await reply(prefix + chunk);
  }
}
