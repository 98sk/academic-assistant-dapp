import { encodeFunctionData } from 'viem';

import { env } from '../../config/env.js';
import { publicClient, walletClient } from './client.js';
import { getAbis } from './contracts.js';
import { assertReceiptSucceeded, extractAnnouncementPublishedId } from './receiptEvents.js';

export const announcementService = {
  async getAnnouncement(id: bigint) {
    const { announcementAbi } = await getAbis();
    const [contentHash, category, targetGroup, timestamp, publisher] = (await publicClient.readContract({
      address: env.ANNOUNCEMENT_LOG_ADDRESS,
      abi: announcementAbi,
      functionName: 'getAnnouncement',
      args: [id],
    })) as readonly [`0x${string}`, string, string, bigint, `0x${string}`];
    return { id: id.toString(), contentHash, category, targetGroup, timestamp: timestamp.toString(), publisher };
  },

  async listAnnouncements(opts?: { fromBlock?: bigint; toBlock?: bigint | 'latest' }) {
    const { announcementAbi } = await getAbis();
    const events = await publicClient.getContractEvents({
      address: env.ANNOUNCEMENT_LOG_ADDRESS,
      abi: announcementAbi,
      eventName: 'AnnouncementPublished',
      fromBlock: opts?.fromBlock ?? 0n,
      toBlock: opts?.toBlock ?? 'latest',
    });

    return events.map((e) => ({
      id: (e.args as any).id?.toString?.() ?? null,
      contentHash: (e.args as any).contentHash ?? null,
      publisher: (e.args as any).publisher ?? null,
      category: (e.args as any).category ?? null,
      targetGroup: (e.args as any).targetGroup ?? null,
      timestamp: (e.args as any).timestamp?.toString?.() ?? null,
      blockNumber: e.blockNumber?.toString?.() ?? null,
      transactionHash: e.transactionHash ?? null,
    }));
  },

  async buildPublishCalldata(args: { contentHash: `0x${string}`; category: string; targetGroup: string }) {
    const { announcementAbi } = await getAbis();
    const data = encodeFunctionData({
      abi: announcementAbi,
      functionName: 'publishAnnouncement',
      args: [args.contentHash, args.category, args.targetGroup],
    });
    return { to: env.ANNOUNCEMENT_LOG_ADDRESS, data };
  },

  async relayPublish(args: { contentHash: `0x${string}`; category: string; targetGroup: string }) {
    if (!walletClient) throw new Error('Server tx relaying is disabled (BACKEND_PRIVATE_KEY not set).');
    const { announcementAbi } = await getAbis();
    const transactionHash = await walletClient.writeContract({
      address: env.ANNOUNCEMENT_LOG_ADDRESS,
      abi: announcementAbi,
      chain: null,
      functionName: 'publishAnnouncement' as const,
      args: [args.contentHash, args.category, args.targetGroup] as const,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
    assertReceiptSucceeded(receipt);
    const announcementId = await extractAnnouncementPublishedId({
      receipt,
      contractAddress: env.ANNOUNCEMENT_LOG_ADDRESS,
      abi: announcementAbi,
      publicClient,
      transactionHash,
    });

    return { transactionHash, announcementId };
  },
};

