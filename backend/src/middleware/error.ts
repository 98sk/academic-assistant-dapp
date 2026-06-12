import type { ErrorRequestHandler, RequestHandler } from 'express';

import { logger } from '../config/logger.js';

export class HttpError extends Error {
  status: number;
  expose: boolean;

  constructor(status: number, message: string, expose = true) {
    super(message);
    this.status = status;
    this.expose = expose;
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const expose = typeof err?.expose === 'boolean' ? err.expose : status < 500;

  if (status >= 500) logger.error(err);
  else logger.warn(err);

  res.status(status).json({
    error: expose ? String(err?.message ?? 'Error') : 'Internal Server Error',
  });
};

