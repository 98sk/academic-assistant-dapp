import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dashboardService } from '../services/announcements/announcements.service.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.summary();
    res.json(data);
  }),
);
