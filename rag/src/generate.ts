import type { RetrievedSource } from './types.js';

const ACADEMIC_SYSTEM_PROMPT = `You are an academic assistant for a decentralized university document platform.
Answer ONLY using the provided document excerpts. If the context is insufficient, say so clearly.
Cite document filenames when relevant. Do not invent facts, grades, or policies not present in the context.
Respond in the same language as the user's question when possible.`;

/** Context-only answer when no LLM API key (pipeline step 5 — demo mode). */
export function buildContextOnlyAnswer(question: string, sources: RetrievedSource[]): string {
  const lines: string[] = [
    '**Réponse basée sur le contexte uniquement**',
    '',
    '_Aucune clé `OPENAI_API_KEY` configurée : réponse construite à partir des extraits récupérés (pas de génération LLM)._',
    '',
    `**Question :** ${question}`,
    '',
  ];

  if (sources.length === 0) {
    lines.push(
      'Aucun extrait pertinent trouvé dans l’index. Indexez des PDF (upload ou `POST /api/assistant/index`) puis réessayez.',
    );
    return lines.join('\n');
  }

  lines.push('**Synthèse des extraits les plus pertinents :**', '');
  sources.forEach((s, i) => {
    lines.push(
      `${i + 1}. **${s.filename}** (document #${s.documentId}, similarité ${s.score.toFixed(3)})`,
    );
    lines.push(`> ${s.snippet.replace(/\n/g, ' ')}`, '');
  });

  lines.push(
    '---',
    'Pour une réponse rédigée par un modèle de langage, définissez `OPENAI_API_KEY` dans le backend.',
  );
  return lines.join('\n');
}

/** OpenAI chat completion with retrieved context (pipeline step 5). */
export async function generateOpenAIAnswer(args: {
  question: string;
  sources: RetrievedSource[];
  apiKey: string;
  model?: string;
}): Promise<string> {
  const contextBlocks = args.sources
    .map(
      (s, i) =>
        `[${i + 1}] documentId=${s.documentId} file="${s.filename}" score=${s.score.toFixed(3)}\n${s.snippet}`,
    )
    .join('\n\n');

  const userContent = `Context excerpts:\n\n${contextBlocks || '(no context)'}\n\nQuestion: ${args.question}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model ?? 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: ACADEMIC_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI chat failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned an empty completion');
  return content;
}

export { ACADEMIC_SYSTEM_PROMPT };
