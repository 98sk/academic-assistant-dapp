import { Router } from 'express';

import { analyticsService } from '../services/blockchain/analyticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/announcements',
  asyncHandler(async (req, res) => {
    const bucket = (req.query.bucket as 'day' | 'hour' | undefined) ?? 'day';
    const qbFrom = req.query.fromBlock;
    const qbTo = req.query.toBlock;
    const fromBlock = qbFrom === undefined ? undefined : BigInt(String(qbFrom));
    const toBlock =
      qbTo === undefined ? undefined : String(qbTo) === 'latest' ? 'latest' : BigInt(String(qbTo));
    const data = await analyticsService.announcementsCounts({ bucket, fromBlock, toBlock });
    res.json(data);
  }),
);

analyticsRouter.get(
  '/acknowledgments',
  asyncHandler(async (req, res) => {
    const qbFrom = req.query.fromBlock;
    const qbTo = req.query.toBlock;
    const fromBlock = qbFrom === undefined ? undefined : BigInt(String(qbFrom));
    const toBlock =
      qbTo === undefined ? undefined : String(qbTo) === 'latest' ? 'latest' : BigInt(String(qbTo));
    const data = await analyticsService.acknowledgments({ fromBlock, toBlock });
    res.json(data);
  }),
);

