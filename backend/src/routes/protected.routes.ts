import { Router } from 'express';

import { requireAuth, attachRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protectedRouter = Router();

protectedRouter.get(
  '/me',
  requireAuth,
  attachRoles,
  asyncHandler(async (req, res) => {
    res.json({
      address: req.user!.address,
      chainId: req.user!.chainId,
      roles: req.user!.roles,
    });
  }),
);

