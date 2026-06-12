import { Router } from 'express';

import { requireAuth, attachRoles, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { roleService } from '../services/blockchain/roleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const rolesRouter = Router();

rolesRouter.get(
  '/:address',
  asyncHandler(async (req, res) => {
    const address = req.params.address!;
    const roles = await roleService.getRolesFor(address);
    const group = await roleService.getGroup(address);
    res.json({ address, ...roles, group });
  }),
);

rolesRouter.get(
  '/groups/:address',
  asyncHandler(async (req, res) => {
    const address = req.params.address!;
    const group = await roleService.getGroup(address);
    res.json({ address, group });
  }),
);

rolesRouter.post(
  '/grant',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isAdmin),
  asyncHandler(async (req, res) => {
    const address = req.body?.address as string | undefined;
    const role = req.body?.role as 'ADMIN' | 'PROFESSOR' | 'STUDENT' | undefined;
    if (!address || !role) throw new HttpError(400, 'Missing address/role');
    const call = await roleService.buildGrantRoleCalldata(role, address);
    res.json({ mode: 'calldata', ...call });
  }),
);

rolesRouter.post(
  '/groups/assign',
  requireAuth,
  attachRoles,
  requireRole((r) => r.isAdmin),
  asyncHandler(async (req, res) => {
    const address = req.body?.address as string | undefined;
    const group = req.body?.group as string | undefined;
    if (!address || !group) throw new HttpError(400, 'Missing address/group');
    const call = await roleService.buildAssignGroupCalldata(address, group);
    res.json({ mode: 'calldata', ...call });
  }),
);

