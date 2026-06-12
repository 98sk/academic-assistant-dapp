import { Router } from 'express';

import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const configRouter = Router();

/** Public chain + contract addresses for wallet clients (no secrets). */
configRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({
      chainId: env.CHAIN_ID,
      contracts: {
        roleManager: env.ROLE_MANAGER_ADDRESS,
        announcementLog: env.ANNOUNCEMENT_LOG_ADDRESS,
        documentRegistry: env.DOCUMENT_REGISTRY_ADDRESS,
        acknowledgmentLog: env.ACK_LOG_ADDRESS,
      },
    });
  }),
);
