import { encodeFunctionData, getAddress } from 'viem';

import { env } from '../../config/env.js';
import { publicClient, walletClient } from './client.js';
import { getAbis } from './contracts.js';

export const acknowledgmentService = {
  async hasAcknowledged(announcementId: bigint, student: string) {
    const { acknowledgmentAbi } = await getAbis();
    return (publicClient.readContract({
      address: env.ACK_LOG_ADDRESS,
      abi: acknowledgmentAbi,
      functionName: 'hasAcknowledged',
      args: [announcementId, getAddress(student)],
    }) as Promise<boolean>);
  },

  async getAcknowledgmentTimestamp(announcementId: bigint, student: string) {
    const { acknowledgmentAbi } = await getAbis();
    const ts = (await publicClient.readContract({
      address: env.ACK_LOG_ADDRESS,
      abi: acknowledgmentAbi,
      functionName: 'getAcknowledgmentTimestamp',
      args: [announcementId, getAddress(student)],
    })) as bigint;
    return ts.toString();
  },

  async listAcknowledgments(opts?: { fromBlock?: bigint; toBlock?: bigint | 'latest' }) {
    const { acknowledgmentAbi } = await getAbis();
    const events = await publicClient.getContractEvents({
      address: env.ACK_LOG_ADDRESS,
      abi: acknowledgmentAbi,
      eventName: 'Acknowledged',
      fromBlock: opts?.fromBlock ?? 0n,
      toBlock: opts?.toBlock ?? 'latest',
    });
    return events.map((e) => ({
      student: (e.args as any).student ?? null,
      announcementId: (e.args as any).announcementId?.toString?.() ?? null,
      timestamp: (e.args as any).timestamp?.toString?.() ?? null,
      blockNumber: e.blockNumber?.toString?.() ?? null,
      transactionHash: e.transactionHash ?? null,
    }));
  },

  async listAcknowledgmentsForAnnouncement(
    announcementId: bigint,
    opts?: { fromBlock?: bigint; toBlock?: bigint | 'latest' },
  ) {
    const idStr = announcementId.toString();
    const items = await this.listAcknowledgments(opts);
    return items.filter((a) => a.announcementId === idStr);
  },

  async buildAcknowledgeCalldata(args: { announcementId: bigint }) {
    const { acknowledgmentAbi } = await getAbis();
    const data = encodeFunctionData({
      abi: acknowledgmentAbi,
      functionName: 'acknowledge',
      args: [args.announcementId],
    });
    return { to: env.ACK_LOG_ADDRESS, data };
  },

  async relayAcknowledge(args: { announcementId: bigint }) {
    if (!walletClient) throw new Error('Server tx relaying is disabled (BACKEND_PRIVATE_KEY not set).');
    const { acknowledgmentAbi } = await getAbis();
    const transactionHash = await walletClient.writeContract({
      address: env.ACK_LOG_ADDRESS,
      abi: acknowledgmentAbi,
      chain: null,
      functionName: 'acknowledge' as const,
      args: [args.announcementId] as const,
    });
    return { transactionHash };
  },
};

