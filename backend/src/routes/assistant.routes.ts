import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { ragService } from '../services/rag/rag.service.js';
import { assertWithinRateLimit } from '../services/rag/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const assistantRouter = Router();

const MAX_QUESTION_LEN = 2000;

assistantRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Missing user context');

    const status = await ragService.indexStatus({ address: user.address, roles: user.roles });
    res.json(status);
  }),
);

function parseDocumentIds(raw: unknown): number[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new HttpError(400, 'documentIds must be an array of numbers');
  const ids = raw.map((v) => Number(v));
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new HttpError(400, 'documentIds must be positive integers');
  }
  return ids;
}

assistantRouter.post(
  '/query',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Missing user context');

    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question) throw new HttpError(400, 'Missing question');
    if (question.length > MAX_QUESTION_LEN) {
      throw new HttpError(400, `Question exceeds ${MAX_QUESTION_LEN} characters`);
    }

    try {
      assertWithinRateLimit(user.address);
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      throw new HttpError(err.status ?? 429, err.message);
    }

    const documentIds = parseDocumentIds(req.body?.documentIds);
    const result = await ragService.query(
      { address: user.address, roles: user.roles },
      question,
      documentIds,
    );

    res.json(result);
  }),
);

assistantRouter.post(
  '/index',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Missing user context');

    const userCtx = { address: user.address, roles: user.roles };
    const documentIdRaw = req.body?.documentId;

    if (documentIdRaw === undefined) {
      const out = await ragService.indexAllAccessible(userCtx);
      res.json(out);
      return;
    }

    const documentId = Number(documentIdRaw);
    if (!Number.isInteger(documentId) || documentId < 1) {
      throw new HttpError(400, 'Invalid documentId');
    }

    const out = await ragService.indexDocumentForUser(userCtx, documentId);
    res.json(out);
  }),
);
