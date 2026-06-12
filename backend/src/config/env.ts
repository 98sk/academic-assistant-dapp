import 'dotenv/config';

import { isAddress } from 'viem';

export type Env = {
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';

  CHAIN_ID: number;
  RPC_URL: string;

  ROLE_MANAGER_ADDRESS: `0x${string}`;
  ANNOUNCEMENT_LOG_ADDRESS: `0x${string}`;
  DOCUMENT_REGISTRY_ADDRESS: `0x${string}`;
  ACK_LOG_ADDRESS: `0x${string}`;

  JWT_SECRET: string;
  APP_DOMAIN: string;
  BACKEND_DOMAIN: string;
  FRONTEND_ORIGIN?: string;
  ALLOWED_CHAIN_IDS?: number[];

  BACKEND_PRIVATE_KEY?: `0x${string}`;
  /** Static bearer for Telegram bot / automation (must match telegram-bot .env). */
  BACKEND_SERVICE_TOKEN?: string;
  /** Wallet impersonated when BACKEND_SERVICE_TOKEN is used (needs STUDENT_ROLE for RAG). */
  BOT_SERVICE_WALLET_ADDRESS?: `0x${string}`;
  CONTRACTS_ARTIFACTS_DIR?: string;

  OPENAI_API_KEY?: string;
  RAG_INDEX_PATH?: string;
  RAG_EMBEDDING_MODEL?: string;
  RAG_OPENAI_EMBEDDING_MODEL?: string;
  RAG_OPENAI_CHAT_MODEL?: string;
  RAG_TOP_K?: number;
  RAG_CHUNK_SIZE?: number;
  RAG_CHUNK_OVERLAP?: number;
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function asInt(name: string, v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`Env var ${name} must be an integer`);
  return n;
}

function asIntList(v?: string): number[] | undefined {
  if (!v) return undefined;
  const parts = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
  if (parts.some((n) => !Number.isInteger(n))) throw new Error('ALLOWED_CHAIN_IDS must be integers');
  return parts;
}

function asAddress(name: string, v: string): `0x${string}` {
  if (!isAddress(v)) throw new Error(`Env var ${name} must be an EVM address`);
  return v;
}

function asPrivateKey(v?: string): `0x${string}` | undefined {
  if (!v) return undefined;
  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error('BACKEND_PRIVATE_KEY must be a 32-byte hex string (0x...)');
  }
  return v as `0x${string}`;
}

export const env: Env = {
  PORT: asInt('PORT', optional('PORT') ?? '4000'),
  NODE_ENV: (optional('NODE_ENV') as Env['NODE_ENV']) ?? 'development',

  CHAIN_ID: asInt('CHAIN_ID', required('CHAIN_ID')),
  RPC_URL: required('RPC_URL'),

  ROLE_MANAGER_ADDRESS: asAddress('ROLE_MANAGER_ADDRESS', required('ROLE_MANAGER_ADDRESS')),
  ANNOUNCEMENT_LOG_ADDRESS: asAddress('ANNOUNCEMENT_LOG_ADDRESS', required('ANNOUNCEMENT_LOG_ADDRESS')),
  DOCUMENT_REGISTRY_ADDRESS: asAddress('DOCUMENT_REGISTRY_ADDRESS', required('DOCUMENT_REGISTRY_ADDRESS')),
  ACK_LOG_ADDRESS: asAddress('ACK_LOG_ADDRESS', required('ACK_LOG_ADDRESS')),

  // Support legacy name SESSION_SECRET, but prefer JWT_SECRET.
  JWT_SECRET: optional('JWT_SECRET') ?? required('SESSION_SECRET'),
  APP_DOMAIN: required('APP_DOMAIN'),
  BACKEND_DOMAIN: required('BACKEND_DOMAIN'),
  FRONTEND_ORIGIN: optional('FRONTEND_ORIGIN'),
  ALLOWED_CHAIN_IDS: asIntList(optional('ALLOWED_CHAIN_IDS')),

  // Prefer BACKEND_PRIVATE_KEY; support legacy PRIVATE_KEY.
  BACKEND_PRIVATE_KEY: asPrivateKey(optional('BACKEND_PRIVATE_KEY') ?? optional('PRIVATE_KEY')),
  BACKEND_SERVICE_TOKEN: optional('BACKEND_SERVICE_TOKEN'),
  BOT_SERVICE_WALLET_ADDRESS: optional('BOT_SERVICE_WALLET_ADDRESS')
    ? asAddress('BOT_SERVICE_WALLET_ADDRESS', optional('BOT_SERVICE_WALLET_ADDRESS')!)
    : undefined,
  CONTRACTS_ARTIFACTS_DIR: optional('CONTRACTS_ARTIFACTS_DIR'),

  OPENAI_API_KEY: optional('OPENAI_API_KEY'),
  RAG_INDEX_PATH: optional('RAG_INDEX_PATH'),
  RAG_EMBEDDING_MODEL: optional('RAG_EMBEDDING_MODEL') ?? 'Xenova/all-MiniLM-L6-v2',
  RAG_OPENAI_EMBEDDING_MODEL: optional('RAG_OPENAI_EMBEDDING_MODEL'),
  RAG_OPENAI_CHAT_MODEL: optional('RAG_OPENAI_CHAT_MODEL'),
  RAG_TOP_K: optional('RAG_TOP_K') ? asInt('RAG_TOP_K', optional('RAG_TOP_K')!) : 5,
  RAG_CHUNK_SIZE: optional('RAG_CHUNK_SIZE') ? asInt('RAG_CHUNK_SIZE', optional('RAG_CHUNK_SIZE')!) : 900,
  RAG_CHUNK_OVERLAP: optional('RAG_CHUNK_OVERLAP')
    ? asInt('RAG_CHUNK_OVERLAP', optional('RAG_CHUNK_OVERLAP')!)
    : 120,
};

