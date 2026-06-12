import { env } from '../../config/env.js';
import { publicClient } from './client.js';
import { getAbis } from './contracts.js';

function dateBucket(timestampSeconds: bigint, bucket: 'day' | 'hour') {
  const ms = Number(timestampSeconds) * 1000;
  const d = new Date(ms);
  if (bucket === 'day') return d.toISOString().slice(0, 10);
  return d.toISOString().slice(0, 13) + ':00';
}

export const analyticsService = {
  async announcementsCounts(opts?: { bucket?: 'day' | 'hour'; fromBlock?: bigint; toBlock?: bigint | 'latest' }) {
    const { announcementAbi } = await getAbis();
    const bucket = opts?.bucket ?? 'day';
    const events = await publicClient.getContractEvents({
      address: env.ANNOUNCEMENT_LOG_ADDRESS,
      abi: announcementAbi,
      eventName: 'AnnouncementPublished',
      fromBlock: opts?.fromBlock ?? 0n,
      toBlock: opts?.toBlock ?? 'latest',
    });

    const byBucket = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byGroup = new Map<string, number>();

    for (const e of events) {
      const ts = (e.args as any).timestamp as bigint | undefined;
      const category = String((e.args as any).category ?? '');
      const group = String((e.args as any).targetGroup ?? '');
      if (ts !== undefined) {
        const b = dateBucket(ts, bucket);
        byBucket.set(b, (byBucket.get(b) ?? 0) + 1);
      }
      if (category) byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
      if (group) byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
    }

    return {
      bucket,
      total: events.length,
      byBucket: Object.fromEntries([...byBucket.entries()].sort(([a], [b]) => a.localeCompare(b))),
      byCategory: Object.fromEntries([...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))),
      byGroup: Object.fromEntries([...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))),
    };
  },

  async acknowledgments(opts?: { fromBlock?: bigint; toBlock?: bigint | 'latest' }) {
    const { acknowledgmentAbi } = await getAbis();
    const events = await publicClient.getContractEvents({
      address: env.ACK_LOG_ADDRESS,
      abi: acknowledgmentAbi,
      eventName: 'Acknowledged',
      fromBlock: opts?.fromBlock ?? 0n,
      toBlock: opts?.toBlock ?? 'latest',
    });

    const byAnnouncement = new Map<string, number>();
    for (const e of events) {
      const id = (e.args as any).announcementId as bigint | undefined;
      if (id === undefined) continue;
      const key = id.toString();
      byAnnouncement.set(key, (byAnnouncement.get(key) ?? 0) + 1);
    }

    return {
      total: events.length,
      byAnnouncement: Object.fromEntries([...byAnnouncement.entries()].sort(([a], [b]) => Number(a) - Number(b))),
    };
  },
};

