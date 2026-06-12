import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Telegraf, type Context } from 'telegraf';
import { getAddress, isAddress } from 'viem';

import {
  DEMO_WALLETS,
  formatAskReply,
  formatBackendError,
  parseChatResponse,
  replyInChunks,
} from './format.js';

const BOT_NAME = 'DAA — Assistant Académique Décentralisé';
const token = process.env.TELEGRAM_BOT_TOKEN;
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const serviceToken = process.env.BACKEND_SERVICE_TOKEN?.trim();
const askTimeoutMs = Number(process.env.ASK_TIMEOUT_MS ?? 90_000);

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN manquant — copiez telegram-bot/.env.example vers .env');
  process.exit(1);
}

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const linksPath = path.join(dataDir, 'wallet-links.json');

type LinkStore = Record<string, { wallet: string; updatedAt: string }>;

function loadLinks(): LinkStore {
  if (!existsSync(linksPath)) return {};
  return JSON.parse(readFileSync(linksPath, 'utf8')) as LinkStore;
}

function saveLinks(store: LinkStore) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(linksPath, JSON.stringify(store, null, 2), 'utf8');
}

function serviceHeaders(): Record<string, string> | null {
  if (!serviceToken) return null;
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${serviceToken}`,
  };
}

function stripCommandPrefix(text: string, command: string): string {
  const re = new RegExp(`^/${command}(?:@\\w+)?\\s*`, 'i');
  return text.replace(re, '').trim();
}

async function backendFetch(
  route: string,
  init?: RequestInit & { auth?: boolean },
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const headers = init?.auth !== false ? serviceHeaders() : { Accept: 'application/json' };
  if (init?.auth !== false && !headers) {
    throw new Error(
      'BACKEND_SERVICE_TOKEN non configuré.\n' +
        '1) Générez un secret (ex. scripts/setup-telegram.ps1)\n' +
        '2) Identique dans backend/.env et telegram-bot/.env\n' +
        '3) BOT_SERVICE_WALLET_ADDRESS dans backend/.env\n' +
        '4) Redémarrez backend + bot',
    );
  }

  let res: Response;
  try {
    res = await fetch(`${backendUrl}${route}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort') || msg.includes('timeout')) {
      throw new Error('Délai dépassé en attendant le backend. Réessayez ou vérifiez l’index RAG (/status).');
    }
    throw new Error(`Impossible de joindre le backend (${backendUrl}).\nLancez : cd backend && npm run dev\n(${msg})`);
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

async function checkHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${backendUrl}/api/health`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const service = typeof body.service === 'string' ? body.service : 'api';
    return { ok: true, detail: service };
  } catch {
    return { ok: false, detail: 'hors ligne' };
  }
}

async function fetchRagStatus(): Promise<string | null> {
  if (!serviceToken) return null;
  const { ok, status, body } = await backendFetch('/api/assistant/status', { auth: true });
  if (!ok) return `index : erreur ${status}`;
  const chunkCount = Number(body.chunkCount ?? 0);
  const pdfCount = Number(body.pdfCount ?? 0);
  const needsIndex = body.needsIndex === true;
  if (needsIndex) {
    return `index : vide (0 extrait) — téléversez un PDF via l’UI web`;
  }
  return `index : ${chunkCount} extrait(s), ${pdfCount} PDF accessible(s)`;
}

async function askBackend(question: string) {
  const { ok, status, body } = await backendFetch('/api/chat', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(askTimeoutMs),
  });
  if (!ok) throw new Error(formatBackendError(status, body));
  return parseChatResponse(body);
}

async function buildStatusBlock(): Promise<string> {
  const health = await checkHealth();
  const healthLine = health.ok ? `✅ Backend en ligne (${health.detail})` : `❌ Backend ${health.detail}`;
  const tokenLine = serviceToken ? '✅ Token service configuré' : '❌ Token service manquant';
  const ragLine = serviceToken ? await fetchRagStatus() : 'index : (token requis pour /status détaillé)';
  return `${healthLine}\n${tokenLine}\n${ragLine ?? 'index : inconnu'}`;
}

function welcomeText(statusBlock: string): string {
  return (
    `👋 Bienvenue sur ${BOT_NAME}\n\n` +
    `Je réponds à vos questions sur les documents académiques indexés (PDF, annonces) via le même moteur RAG que l’interface web.\n\n` +
    `État\n${statusBlock}\n\n` +
    `Commandes utiles\n` +
    `/ask <question> — interroger les documents\n` +
    `/documents — liste des PDF\n` +
    `/announcements — dernières annonces\n` +
    `/status — santé backend + index\n` +
    `/help — aide complète\n\n` +
    `Exemples /ask\n` +
    `• /ask Quelles sont les dates importantes du syllabus ?\n` +
    `• /ask Résume le contenu principal du document\n` +
    `• /ask Y a-t-il des consignes d’évaluation ?`
  );
}

function helpText(): string {
  return (
    `📖 Aide — ${BOT_NAME}\n\n` +
    `Commandes\n` +
    `/start — accueil + état du backend\n` +
    `/help — cette aide\n` +
    `/ask <question> — question RAG (PDF / annonces indexés)\n` +
    `/status — backend + index RAG\n` +
    `/link — associer un wallet (démo locale)\n` +
    `/link 0x… — enregistrer votre adresse\n` +
    `/documents — PDF enregistrés (via API)\n` +
    `/announcements — annonces récentes\n\n` +
    `Exemples\n` +
    `/ask Quel est le planning du cours ?\n` +
    `/link ${DEMO_WALLETS.student}\n` +
    `/documents\n\n` +
    `Configuration\n` +
    `BACKEND_URL=${backendUrl}\n` +
    (serviceToken ? 'Token : configuré ✓' : 'Token : manquant ✗ (voir telegram-bot/README.md)') +
    `\n\nLes questions en texte libre : utilisez /ask votre question.`
  );
}

const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const status = await buildStatusBlock();
  await replyInChunks((t) => ctx.reply(t), welcomeText(status));
});

bot.help((ctx) => {
  void replyInChunks((t) => ctx.reply(t), helpText());
});

bot.command('status', async (ctx) => {
  const status = await buildStatusBlock();
  const id = String(ctx.from?.id ?? '');
  const link = loadLinks()[id];
  const linkLine = link ? `\n\n🔗 Wallet lié : ${link.wallet}` : '\n\n🔗 Aucun wallet lié (/link 0x…)';
  await ctx.reply(`${status}${linkLine}`);
});

bot.command('link', (ctx) => {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const arg = stripCommandPrefix(text.trim(), 'link').split(/\s+/)[0]?.trim() ?? '';

  if (!arg) {
    void ctx.reply(
      'Associer un wallet (démo locale)\n\n' +
        'Usage : /link 0xVotreAdresseEthereum\n\n' +
        'Exemples (comptes de démo Hardhat / docs) :\n' +
        `• Professeur : /link ${DEMO_WALLETS.professor}\n` +
        `• Étudiant : /link ${DEMO_WALLETS.student}\n\n` +
        'Le lien est stocké localement (telegram-bot/data/wallet-links.json) et n’authentifie pas /ask — le bot utilise BOT_SERVICE_WALLET_ADDRESS côté backend.',
    );
    return;
  }

  if (!isAddress(arg)) {
    void ctx.reply('❌ Adresse invalide. Utilisez une adresse Ethereum checksummée, ex. 0x suivi de 40 caractères hex.');
    return;
  }

  let wallet: string;
  try {
    wallet = getAddress(arg);
  } catch {
    void ctx.reply('❌ Adresse invalide. Vérifiez le format 0x…');
    return;
  }

  const store = loadLinks();
  const id = String(ctx.from?.id ?? '');
  store[id] = { wallet, updatedAt: new Date().toISOString() };
  saveLinks(store);
  void ctx.reply(
    `✅ Wallet enregistré pour votre compte Telegram :\n${wallet}\n\n` +
      'Pour interroger le RAG : /ask <question> (nécessite BACKEND_SERVICE_TOKEN).',
  );
});

bot.command('documents', async (ctx) => {
  try {
    const { ok, status, body } = await backendFetch('/api/documents', { auth: true });
    if (!ok) {
      await ctx.reply(formatBackendError(status, body));
      return;
    }
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      await ctx.reply(
        '📄 Aucun document enregistré.\n\nTéléversez un PDF via l’interface web, puis /ask sur son contenu après indexation.',
      );
      return;
    }
    const lines = items.slice(0, 15).map((d: Record<string, unknown>) => {
      const id = d.id ?? '?';
      const name = typeof d.filename === 'string' ? d.filename : typeof d.title === 'string' ? d.title : 'PDF';
      const type = typeof d.documentType === 'string' ? ` (${d.documentType})` : '';
      return `• #${id} — ${name}${type}`;
    });
    const more = items.length > 15 ? `\n… et ${items.length - 15} autre(s)` : '';
    await replyInChunks(
      (t) => ctx.reply(t),
      `📄 Documents (${items.length})\n\n${lines.join('\n')}${more}\n\nPosez une question avec /ask sujet du document`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await ctx.reply(`Erreur :\n${msg}`);
  }
});

bot.command('announcements', async (ctx) => {
  try {
    const res = await fetch(`${backendUrl}/api/announcements`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      await ctx.reply(formatBackendError(res.status, body));
      return;
    }
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      await ctx.reply('📢 Aucune annonce pour le moment.');
      return;
    }
    const lines = items.slice(0, 10).map((a: Record<string, unknown>) => {
      const id = a.id ?? a.announcementId ?? '?';
      const title =
        typeof a.title === 'string' && a.title.trim()
          ? a.title.trim()
          : typeof a.category === 'string'
            ? a.category
            : 'Annonce';
      const cat = typeof a.category === 'string' && a.category ? ` [${a.category}]` : '';
      return `• #${id} — ${title}${cat}`;
    });
    const more = items.length > 10 ? `\n… et ${items.length - 10} autre(s)` : '';
    await replyInChunks(
      (t) => ctx.reply(t),
      `📢 Annonces récentes\n\n${lines.join('\n')}${more}\n\nContenu indexé dans le RAG : /ask Que dit l’annonce sur … ?`,
    );
  } catch {
    await ctx.reply(`Impossible de joindre ${backendUrl} pour les annonces.`);
  }
});

async function handleAsk(ctx: Context, question: string) {
  const q = question.trim();
  if (!q) {
    await ctx.reply(
      'Usage : /ask Votre question\n\nExemple : /ask Quelles sont les modalités d’évaluation du cours ?',
    );
    return;
  }
  if (q.length > 2000) {
    await ctx.reply('❌ Question trop longue (max. 2000 caractères). Reformulez plus court.');
    return;
  }

  try {
    await ctx.reply('🔍 Recherche dans les documents indexés…');
    const data = await askBackend(q);
    const formatted = formatAskReply(q, data);
    await replyInChunks((t) => ctx.reply(t), formatted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await replyInChunks((t) => ctx.reply(t), `❌ ${msg}`);
  }
}

bot.command('ask', async (ctx) => {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const question = stripCommandPrefix(text, 'ask');
  await handleAsk(ctx, question);
});

bot.on('text', async (ctx) => {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  if (!text || text.startsWith('/')) return;
  await ctx.reply(
    '💡 Pour interroger les documents académiques, utilisez :\n/ask ' + text.slice(0, 120) + (text.length > 120 ? '…' : ''),
  );
});

bot.catch((err, ctx) => {
  console.error('Telegram bot error:', err);
  void ctx.reply(
    '⚠️ Erreur interne du bot. Réessayez dans un instant ou consultez les logs du terminal (npm run dev).',
  );
});

bot
  .launch()
  .then(() => console.log('Telegram bot running —', BOT_NAME))
  .catch((err) => {
    console.error('Impossible de démarrer le bot Telegram:', err);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
