import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { env } from '../../config/env.js';

export const publicClient = createPublicClient({
  chain: undefined,
  transport: http(env.RPC_URL),
});

export const walletClient = env.BACKEND_PRIVATE_KEY
  ? createWalletClient({
      chain: undefined,
      transport: http(env.RPC_URL),
      account: privateKeyToAccount(env.BACKEND_PRIVATE_KEY),
    })
  : undefined;

export const canRelayTransactions = Boolean(walletClient);

