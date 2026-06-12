import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { requireAuth, attachRoles, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { documentService } from '../services/blockchain/documentService.js';
import { documentsService } from '../services/documents/documents.service.js';
import { uploadsDirPath } from '../services/documents/uploads.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const documentsRouter = Router();

const tmpUploadDir = path.join(uploadsDirPath(), 'tmp');
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(tmpUploadDir, { recursive: true });
      cb(null, tmpUploadDir);
    },
    filename: (_req, file, cb) => {
      // Keep multer temp filename unique; final filename is assigned after metadata id exists.
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

documentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { items } = await documentsService.list();
    res.json({ items });
  }),
);

documentsRouter.get(
  '/:id(\\d+)',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid id');
    const out = await documentsService.getById(id);
    res.json(out);
  }),
);

documentsRouter.get(
  '/:id(\\d+)/download',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid id');
    const { record } = await documentsService.getById(id);
    const filePath = documentsService.filePathFor(record);
    res.download(filePath, record.filename);
  }),
);

documentsRouter.post(
  '/upload',
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

// ---- Existing on-chain oriented endpoints (kept for compatibility) ----
documentsRouter.get(
  '/onchain',
  asyncHandler(async (req, res) => {
    const qbFrom = req.query.fromBlock;
    const qbTo = req.query.toBlock;
    const fromBlock = qbFrom === undefined ? undefined : BigInt(String(qbFrom));
    const toBlock =
      qbTo === undefined ? undefined : String(qbTo) === 'latest' ? 'latest' : BigInt(String(qbTo));
    const items = await documentService.listDocuments({ fromBlock, toBlock });
    res.json({ items });
  }),
);

documentsRouter.get(
  '/by-hash/:hash',
  asyncHandler(async (req, res) => {
    const contentHash = req.params.hash! as `0x${string}`;
    const doc = await documentService.getDocument(contentHash);
    res.json(doc);
  }),
);

documentsRouter.get(
  '/verify/:hash',
  asyncHandler(async (req, res) => {
    const contentHash = req.params.hash! as `0x${string}`;
    const ok = await documentService.verifyDocument(contentHash);
    res.json({ contentHash, verified: ok });
  }),
);

documentsRouter.post(
  '/register',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isProfessor || r.isAdmin),
  asyncHandler(async (req, res) => {
    const contentHash = req.body?.contentHash as `0x${string}` | undefined;
    const documentType = req.body?.documentType as string | undefined;
    const targetGroup = req.body?.targetGroup as string | undefined;
    const mode = (req.body?.mode as 'calldata' | 'relay' | undefined) ?? 'calldata';

    if (!contentHash || !documentType || !targetGroup) {
      throw new HttpError(400, 'Missing contentHash/documentType/targetGroup');
    }

    if (mode === 'relay') {
      const tx = await documentService.relayRegister({ contentHash, documentType, targetGroup });
      res.json({ mode: 'relay', ...tx });
      return;
    }

    const call = await documentService.buildRegisterCalldata({ contentHash, documentType, targetGroup });
    res.json({ mode: 'calldata', ...call });
  }),
);

