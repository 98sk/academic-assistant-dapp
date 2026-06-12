import { Router } from 'express';
import { getAddress } from 'viem';

import { env } from '../config/env.js';
import { HttpError } from '../middleware/error.js';
import {
  consumeNonce,
  issueNonce,
  assertAuthMessageValid,
  buildAuthMessage,
  signSessionToken,
  verifySignedAuthMessage,
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { roleService } from '../services/blockchain/roleService.js';

export const authRouter = Router();

authRouter.post(
  '/nonce',
  asyncHandler(async (req, res) => {
    const address = typeof req.body?.address === 'string' ? req.body.address : undefined;
    if (!address) throw new HttpError(400, 'Missing address');
    const nonce = issueNonce(address);
    const issuedAt = new Date().toISOString();
    const uri = `https://${env.APP_DOMAIN}`;

    res.json({
      nonce,
      issuedAt,
      chainId: env.CHAIN_ID,
      domain: env.APP_DOMAIN,
      uri,
      version: '1',
      messageTemplate: 'Call /auth/verify with {address, signature, message}.',
    });
  }),
);

authRouter.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const address = typeof req.body?.address === 'string' ? req.body.address : null;
    const signature = typeof req.body?.signature === 'string' ? (req.body.signature as `0x${string}`) : null;
    const nonce = typeof req.body?.nonce === 'string' ? req.body.nonce : null;
    const issuedAt = typeof req.body?.issuedAt === 'string' ? req.body.issuedAt : new Date().toISOString();
    const chainId = typeof req.body?.chainId === 'number' ? req.body.chainId : env.CHAIN_ID;

    if (!address || !signature || !nonce) throw new HttpError(400, 'Missing address/signature/nonce');
    const allowed = env.ALLOWED_CHAIN_IDS?.length ? env.ALLOWED_CHAIN_IDS : [env.CHAIN_ID];
    if (!allowed.includes(chainId)) throw new HttpError(400, `Wrong chainId (allowed: ${allowed.join(', ')})`);

    const message =
      typeof req.body?.message === 'string'
        ? req.body.message
        : buildAuthMessage({
            domain: env.APP_DOMAIN,
            address,
            uri: `https://${env.APP_DOMAIN}`,
            version: '1',
            chainId,
            nonce,
            issuedAt,
          });

    assertAuthMessageValid({
      message,
      expected: {
        domain: env.APP_DOMAIN,
        uri: `https://${env.APP_DOMAIN}`,
        chainId,
        address,
        nonce,
      },
    });

    const ok = await verifySignedAuthMessage({ address, signature, message });
    if (!ok) throw new HttpError(401, 'Signature verification failed');

    if (!consumeNonce(address, nonce)) throw new HttpError(400, 'Invalid or expired nonce');

    const checksum = getAddress(address);
    const [roles, group] = await Promise.all([
      roleService.getRolesFor(checksum),
      roleService.getGroup(checksum),
    ]);

    const token = signSessionToken({
      address: checksum,
      chainId,
      roles,
      group,
      expiresIn: '1h',
    });

    res.json({
      token,
      address: checksum,
      chainId,
      roles,
      group,
      expiresInSeconds: 60 * 60,
    });
  }),
);

