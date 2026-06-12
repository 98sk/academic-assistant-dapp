import { Router } from 'express';

import { requireAuth, attachRoles, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { acknowledgmentService } from '../services/blockchain/acknowledgmentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const acknowledgmentsRouter = Router();

acknowledgmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const qbFrom = req.query.fromBlock;
    const qbTo = req.query.toBlock;
    const fromBlock = qbFrom === undefined ? undefined : BigInt(String(qbFrom));
    const toBlock =
      qbTo === undefined ? undefined : String(qbTo) === 'latest' ? 'latest' : BigInt(String(qbTo));
    const items = await acknowledgmentService.listAcknowledgments({ fromBlock, toBlock });
    res.json({ items });
  }),
);

acknowledgmentsRouter.get(
  '/:announcementId/:student',
  asyncHandler(async (req, res) => {
    const announcementId = BigInt(req.params.announcementId!);
    const student = req.params.student!;
    const acknowledged = await acknowledgmentService.hasAcknowledged(announcementId, student);
    const timestamp = acknowledged
      ? await acknowledgmentService.getAcknowledgmentTimestamp(announcementId, student)
      : '0';
    res.json({ announcementId: announcementId.toString(), student, acknowledged, timestamp });
  }),
);

acknowledgmentsRouter.post(
  '/',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isStudent || r.isAdmin),
  asyncHandler(async (req, res) => {
    const announcementIdRaw = req.body?.announcementId;
    const mode = (req.body?.mode as 'calldata' | 'relay' | undefined) ?? 'calldata';

    if (announcementIdRaw === undefined || announcementIdRaw === null) throw new HttpError(400, 'Missing announcementId');
    const announcementId = BigInt(String(announcementIdRaw));

    if (mode === 'relay') {
      const tx = await acknowledgmentService.relayAcknowledge({ announcementId });
      res.json({ mode: 'relay', ...tx });
      return;
    }

    const call = await acknowledgmentService.buildAcknowledgeCalldata({ announcementId });
    res.json({ mode: 'calldata', ...call });
  }),
);

