import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { requireAuth, attachRoles, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { hashAnnouncementBody } from '../services/announcements/hash.js';
import { announcementsService } from '../services/announcements/announcements.service.js';
import { announcementService } from '../services/blockchain/announcementService.js';
import { acknowledgmentService } from '../services/blockchain/acknowledgmentService.js';
import { documentService } from '../services/blockchain/documentService.js';
import { documentsService } from '../services/documents/documents.service.js';
import { uploadsDirPath } from '../services/documents/uploads.js';
import { ragService } from '../services/rag/rag.service.js';
import { assertWithinRateLimit } from '../services/rag/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const legacyRouter = Router();

const tmpUploadDir = path.join(uploadsDirPath(), 'tmp');
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(tmpUploadDir, { recursive: true });
      cb(null, tmpUploadDir);
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-() ]+/g, '_');
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}-${safe}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (ok) cb(null, true);
    else cb(new HttpError(400, 'Only PDF uploads are supported'));
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

/** Enoncé alias: POST /api/announcement → publish */
legacyRouter.post(
  '/announcement',
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

/** Enoncé alias: POST /api/document → upload */
legacyRouter.post(
  '/document',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const uploaderWallet = req.user?.address;
    if (!uploaderWallet) throw new HttpError(401, 'Missing user context');
    if (!req.file) throw new HttpError(400, 'Missing file');

    const documentType = typeof req.body?.documentType === 'string' ? req.body.documentType : undefined;
    const targetGroup = typeof req.body?.targetGroup === 'string' ? req.body.targetGroup : undefined;

    const out = await documentsService.uploadAndRegister({
      uploaderWallet,
      tempFilePath: req.file.path,
      originalFilename: req.file.originalname,
      documentType,
      targetGroup,
    });
    res.status(201).json(out);
  }),
);

/** Enoncé alias: POST /api/chat → assistant query */
legacyRouter.post(
  '/chat',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Missing user context');

    const question =
      typeof req.body?.question === 'string'
        ? req.body.question.trim()
        : typeof req.body?.message === 'string'
          ? req.body.message.trim()
          : '';
    if (!question) throw new HttpError(400, 'Missing question');

    try {
      assertWithinRateLimit(user.address);
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      throw new HttpError(err.status ?? 429, err.message);
    }

    const documentIds = Array.isArray(req.body?.documentIds)
      ? (req.body.documentIds as unknown[]).map((v) => Number(v))
      : undefined;

    const result = await ragService.query(
      { address: user.address, roles: user.roles },
      question,
      documentIds,
    );
    res.json(result);
  }),
);

/** Enoncé alias: POST /api/acknowledge — wallet calldata or relay; optional txHash confirmation */
legacyRouter.post(
  ['/acknowledge', '/acknowledge/'],
  requireAuth,
  attachRoles,
  requireRole((r) => r.isStudent || r.isAdmin),
  asyncHandler(async (req, res) => {
    const announcementIdRaw = req.body?.announcementId;
    if (announcementIdRaw === undefined || announcementIdRaw === null) {
      throw new HttpError(400, 'Missing announcementId');
    }
    const announcementId = BigInt(String(announcementIdRaw));
    const txHash = req.body?.transactionHash as `0x${string}` | undefined;

    if (txHash) {
      const acknowledged = await acknowledgmentService.hasAcknowledged(announcementId, req.user!.address);
      res.json({
        mode: 'wallet',
        transactionHash: txHash,
        acknowledged,
        message: acknowledged
          ? 'Acknowledgment confirmed on-chain.'
          : 'Transaction submitted; wait for confirmation then refresh status.',
      });
      return;
    }

    const mode = (req.body?.mode as 'calldata' | 'relay' | undefined) ?? 'calldata';
    if (mode === 'relay') {
      const tx = await acknowledgmentService.relayAcknowledge({ announcementId });
      res.json({ mode: 'relay', ...tx });
      return;
    }

    const call = await acknowledgmentService.buildAcknowledgeCalldata({ announcementId });
    res.json({
      mode: 'calldata',
      ...call,
      instructions:
        'Sign this transaction with MetaMask (AcknowledgmentLog.acknowledge). Your wallet must hold STUDENT_ROLE.',
    });
  }),
);

/** Enoncé alias: GET /api/verify — announcement integrity (hash vs on-chain) */
legacyRouter.get(
  '/verify',
  asyncHandler(async (req, res) => {
    const idRaw = req.query.announcementId ?? req.query.id;
    if (idRaw === undefined) throw new HttpError(400, 'Missing announcementId query parameter');

    const announcementId = BigInt(String(idRaw));
    const onChain = await announcementService.getAnnouncement(announcementId);

    const body = typeof req.query.body === 'string' ? req.query.body : undefined;
    const contentHashParam = req.query.contentHash ?? req.query.hash;
    let providedHash: `0x${string}` | undefined;
    if (typeof contentHashParam === 'string' && contentHashParam.startsWith('0x')) {
      providedHash = contentHashParam as `0x${string}`;
    } else if (body !== undefined) {
      providedHash = hashAnnouncementBody(body);
    }

    const verified =
      providedHash !== undefined
        ? providedHash.toLowerCase() === onChain.contentHash.toLowerCase()
        : undefined;

    res.json({
      announcementId: announcementId.toString(),
      onChainContentHash: onChain.contentHash,
      providedContentHash: providedHash ?? null,
      verified,
      publisher: onChain.publisher,
      category: onChain.category,
      targetGroup: onChain.targetGroup,
      timestamp: onChain.timestamp,
    });
  }),
);

/** Document verify alias: GET /api/verify/document?hash=0x... */
legacyRouter.get(
  '/verify/document',
  asyncHandler(async (req, res) => {
    const hash = req.query.hash;
    if (typeof hash !== 'string' || !hash.startsWith('0x')) {
      throw new HttpError(400, 'Missing hash query parameter (bytes32 hex)');
    }
    const contentHash = hash as `0x${string}`;
    const ok = await documentService.verifyDocument(contentHash);
    res.json({ contentHash, verified: ok });
  }),
);
