import { Router } from 'express';

import { requireAuth, attachRoles, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { announcementsService } from '../services/announcements/announcements.service.js';
import { announcementsStore } from '../services/announcements/store.js';
import { announcementService } from '../services/blockchain/announcementService.js';
import { acknowledgmentService } from '../services/blockchain/acknowledgmentService.js';

export const announcementsRouter = Router();

announcementsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const data = await announcementsService.list();
    res.json(data);
  }),
);

announcementsRouter.get(
  '/:id/acknowledgment',
  requireAuth,
  attachRoles,
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    if (!/^\d+$/.test(id)) throw new HttpError(400, 'Invalid announcement id');
    const student = req.user!.address;
    const announcementId = BigInt(id);
    const acknowledged = await acknowledgmentService.hasAcknowledged(announcementId, student);
    const timestamp = acknowledged
      ? await acknowledgmentService.getAcknowledgmentTimestamp(announcementId, student)
      : '0';
    res.json({ announcementId: id, student, acknowledged, timestamp });
  }),
);

announcementsRouter.get(
  '/:id/acknowledgments',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isProfessor || r.isAdmin),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    if (!/^\d+$/.test(id)) throw new HttpError(400, 'Invalid announcement id');
    const items = await acknowledgmentService.listAcknowledgmentsForAnnouncement(BigInt(id));
    res.json({ announcementId: id, items });
  }),
);

announcementsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    if (!/^\d+$/.test(id)) throw new HttpError(400, 'Invalid announcement id');
    const a = await announcementsService.getById(id);
    res.json(a);
  }),
);

/** Link on-chain announcement id after professor signed publishAnnouncement via MetaMask. */
announcementsRouter.post(
  '/confirm',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isProfessor || r.isAdmin),
  asyncHandler(async (req, res) => {
    const contentHash = req.body?.contentHash as `0x${string}` | undefined;
    const announcementId = req.body?.announcementId;
    const transactionHash = req.body?.transactionHash as `0x${string}` | undefined;

    if (!contentHash || !contentHash.startsWith('0x')) {
      throw new HttpError(400, 'Missing contentHash');
    }
    if (announcementId === undefined || announcementId === null) {
      throw new HttpError(400, 'Missing announcementId');
    }

    const record = await announcementsStore.linkId(
      contentHash,
      String(announcementId),
      transactionHash,
    );
    if (!record) throw new HttpError(404, 'Announcement content not found for hash');

    res.json({ linked: true, record });
  }),
);

announcementsRouter.post(
  '/publish',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isProfessor || r.isAdmin),
  asyncHandler(async (req, res) => {
    const publisher = req.user!.address;
    const title = String(req.body?.title ?? '');
    const body = String(req.body?.body ?? '');
    const category = String(req.body?.category ?? '');
    const targetGroup = String(req.body?.targetGroup ?? '');
    const mode = (req.body?.mode as 'calldata' | 'relay' | undefined) ?? 'relay';

    const result = await announcementsService.publish({
      publisher,
      title,
      body,
      category,
      targetGroup,
      mode,
    });
    res.status(201).json(result);
  }),
);

// Legacy endpoint — accepts precomputed contentHash
announcementsRouter.post(
  '/',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isProfessor || r.isAdmin),
  asyncHandler(async (req, res) => {
    const contentHash = req.body?.contentHash as `0x${string}` | undefined;
    const category = req.body?.category as string | undefined;
    const targetGroup = req.body?.targetGroup as string | undefined;
    const mode = (req.body?.mode as 'calldata' | 'relay' | undefined) ?? 'calldata';

    if (!contentHash || !category || !targetGroup) throw new HttpError(400, 'Missing contentHash/category/targetGroup');

    if (mode === 'relay') {
      const tx = await announcementService.relayPublish({ contentHash, category, targetGroup });
      res.json({ mode: 'relay', ...tx });
      return;
    }

    const call = await announcementService.buildPublishCalldata({ contentHash, category, targetGroup });
    res.json({ mode: 'calldata', ...call });
  }),
);
