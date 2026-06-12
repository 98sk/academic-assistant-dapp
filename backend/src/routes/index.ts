import { Router } from 'express';

import { acknowledgmentsRouter } from './acknowledgments.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { assistantRouter } from './assistant.routes.js';
import { announcementsRouter } from './announcements.routes.js';
import { authRouter } from './auth.routes.js';
import { configRouter } from './config.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { documentsRouter } from './documents.routes.js';
import { legacyRouter } from './legacy.routes.js';
import { protectedRouter } from './protected.routes.js';
import { rolesRouter } from './roles.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api' });
});

apiRouter.use('/config', configRouter);
apiRouter.use(legacyRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/protected', protectedRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/announcements', announcementsRouter);
apiRouter.use('/documents', documentsRouter);
apiRouter.use('/acknowledgments', acknowledgmentsRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/assistant', assistantRouter);

