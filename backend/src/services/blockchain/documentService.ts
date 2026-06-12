import { encodeFunctionData, getAddress } from 'viem';

import { env } from '../../config/env.js';
import { publicClient, walletClient } from './client.js';
import { getAbis } from './contracts.js';

export const documentService = {
  async getDocument(contentHash: `0x${string}`) {
    const { documentRegistryAbi } = await getAbis();
    const [documentType, targetGroup, uploader, timestamp] = (await publicClient.readContract({
      address: env.DOCUMENT_REGISTRY_ADDRESS,
      abi: documentRegistryAbi,
      functionName: 'getDocument',
      args: [contentHash],
    })) as readonly [string, string, `0x${string}`, bigint];
    return {
      contentHash,
      documentType,
      targetGroup,
      uploader,
      timestamp: timestamp.toString(),
    };
  },

  async verifyDocument(contentHash: `0x${string}`) {
    const { documentRegistryAbi } = await getAbis();
    return (publicClient.readContract({
      address: env.DOCUMENT_REGISTRY_ADDRESS,
      abi: documentRegistryAbi,
      functionName: 'verifyDocument',
      args: [contentHash],
    }) as Promise<boolean>);
  },

  async listDocuments(opts?: { fromBlock?: bigint; toBlock?: bigint | 'latest' }) {
    const { documentRegistryAbi } = await getAbis();
    const events = await publicClient.getContractEvents({
      address: env.DOCUMENT_REGISTRY_ADDRESS,
      abi: documentRegistryAbi,
      eventName: 'DocumentRegistered',
      fromBlock: opts?.fromBlock ?? 0n,
      toBlock: opts?.toBlock ?? 'latest',
    });

    return events.map((e) => ({
      contentHash: (e.args as any).contentHash ?? null,
      uploader: (e.args as any).uploader ?? null,
      documentType: (e.args as any).documentType ?? null,
      targetGroup: (e.args as any).targetGroup ?? null,
      timestamp: (e.args as any).timestamp?.toString?.() ?? null,
      blockNumber: e.blockNumber?.toString?.() ?? null,
      transactionHash: e.transactionHash ?? null,
    }));
  },

  async buildRegisterCalldata(args: { contentHash: `0x${string}`; documentType: string; targetGroup: string }) {
    const { documentRegistryAbi } = await getAbis();
    const data = encodeFunctionData({
      abi: documentRegistryAbi,
      functionName: 'registerDocument',
      args: [args.contentHash, args.documentType, args.targetGroup],
    });
    return { to: env.DOCUMENT_REGISTRY_ADDRESS, data };
  },

  async relayRegister(args: { contentHash: `0x${string}`; documentType: string; targetGroup: string }) {
    if (!walletClient) throw new Error('Server tx relaying is disabled (BACKEND_PRIVATE_KEY not set).');
    const { documentRegistryAbi } = await getAbis();
    const transactionHash = await walletClient.writeContract({
      address: env.DOCUMENT_REGISTRY_ADDRESS,
      abi: documentRegistryAbi,
      chain: null,
      functionName: 'registerDocument' as const,
      args: [args.contentHash, args.documentType, args.targetGroup] as const,
    });
    return { transactionHash };
  },

  normalizeAddress: (a: string) => getAddress(a),
};

