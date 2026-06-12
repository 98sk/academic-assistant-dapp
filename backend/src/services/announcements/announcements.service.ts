import { HttpError } from '../../middleware/error.js';
import { announcementService } from '../blockchain/announcementService.js';
import { canRelayTransactions } from '../blockchain/client.js';
import { hashAnnouncementBody } from './hash.js';
import { announcementsStore } from './store.js';
import { ragService } from '../rag/rag.service.js';

export type AnnouncementView = {
  id: string | null;
  contentHash: `0x${string}`;
  category: string;
  targetGroup: string;
  timestamp: string | null;
  publisher: `0x${string}` | null;
  blockNumber?: string | null;
  transactionHash?: string | null;
  title?: string;
  body?: string;
  createdAt?: string;
  hasContent: boolean;
};

function mergeOnChainWithContent(
  onChain: {
    id: string;
    contentHash: `0x${string}`;
    category: string;
    targetGroup: string;
    timestamp: string;
    publisher: `0x${string}`;
  },
  content: Awaited<ReturnType<typeof announcementsStore.getByContentHash>>,
): AnnouncementView {
  return {
    id: onChain.id,
    contentHash: onChain.contentHash,
    category: onChain.category,
    targetGroup: onChain.targetGroup,
    timestamp: onChain.timestamp,
    publisher: onChain.publisher,
    title: content?.title,
    body: content?.body,
    createdAt: content?.createdAt,
    hasContent: Boolean(content?.body),
  };
}

export const announcementsService = {
  async list(): Promise<{ items: AnnouncementView[] }> {
    const [events, stored] = await Promise.all([
      announcementService.listAnnouncements(),
      announcementsStore.list(),
    ]);

    const contentByHash = new Map(stored.map((s) => [s.contentHash.toLowerCase(), s]));
    const contentById = new Map(stored.filter((s) => s.id).map((s) => [s.id!, s]));

    const items: AnnouncementView[] = events.map((e) => {
      const hashKey = (e.contentHash as string)?.toLowerCase();
      const byHash = hashKey ? contentByHash.get(hashKey) : undefined;
      const byId = e.id ? contentById.get(e.id) : undefined;
      const content = byHash ?? byId;

      return {
        id: e.id,
        contentHash: e.contentHash as `0x${string}`,
        category: e.category ?? '',
        targetGroup: e.targetGroup ?? '',
        timestamp: e.timestamp,
        publisher: e.publisher as `0x${string}` | null,
        blockNumber: e.blockNumber,
        transactionHash: e.transactionHash,
        title: content?.title,
        body: content?.body,
        createdAt: content?.createdAt,
        hasContent: Boolean(content?.body),
      };
    });

    for (const s of stored) {
      if (s.id && items.some((i) => i.id === s.id)) continue;
      items.push({
        id: s.id,
        contentHash: s.contentHash,
        category: s.category,
        targetGroup: s.targetGroup,
        timestamp: null,
        publisher: s.publisher,
        title: s.title,
        body: s.body,
        createdAt: s.createdAt,
        transactionHash: s.txHash,
        hasContent: true,
      });
    }

    items.sort((a, b) => {
      const ta = Number(a.timestamp ?? 0);
      const tb = Number(b.timestamp ?? 0);
      if (ta !== tb) return tb - ta;
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    });

    return { items };
  },

  async getById(id: string): Promise<AnnouncementView> {
    const onChain = await announcementService.getAnnouncement(BigInt(id));
    const content =
      (await announcementsStore.getById(id)) ??
      (await announcementsStore.getByContentHash(onChain.contentHash));
    return mergeOnChainWithContent(onChain, content);
  },

  async publish(args: {
    publisher: `0x${string}`;
    title: string;
    body: string;
    category: string;
    targetGroup: string;
    mode: 'calldata' | 'relay';
  }) {
    const title = args.title.trim();
    const body = args.body.trim();
    const category = args.category.trim();
    const targetGroup = args.targetGroup.trim();

    if (!title) throw new HttpError(400, 'Title is required');
    if (!body) throw new HttpError(400, 'Body is required');
    if (!category) throw new HttpError(400, 'Category is required');

    const contentHash = hashAnnouncementBody(body);
    const createdAt = new Date().toISOString();

    const stored = await announcementsStore.create({
      contentHash,
      title,
      body,
      category,
      targetGroup,
      publisher: args.publisher,
      createdAt,
    });

    ragService.scheduleIndexAnnouncement(stored);

    if (args.mode === 'relay') {
      if (!canRelayTransactions) {
        throw new HttpError(500, 'Backend tx relaying is disabled (BACKEND_PRIVATE_KEY not set).');
      }

      let tx: { transactionHash: `0x${string}`; announcementId?: string };
      try {
        tx = await announcementService.relayPublish({ contentHash, category, targetGroup });
      } catch (e: any) {
        const msg = String(e?.shortMessage ?? e?.message ?? e);
        if (msg.toLowerCase().includes('professor')) {
          throw new HttpError(403, 'Backend wallet is not authorized to publish (missing PROFESSOR_ROLE).');
        }
        throw e;
      }

      if (!tx.announcementId) {
        throw new HttpError(
          500,
          'Transaction confirmée mais événement AnnouncementPublished introuvable. Vérifiez ANNOUNCEMENT_LOG_ADDRESS et le nœud Hardhat.',
        );
      }

      const linked = await announcementsStore.linkId(contentHash, tx.announcementId, tx.transactionHash);
      if (linked) ragService.scheduleIndexAnnouncement(linked);

      const record = await announcementsStore.getByContentHash(contentHash);
      return {
        mode: 'relay' as const,
        transactionHash: tx.transactionHash,
        announcementId: tx.announcementId ?? null,
        contentHash,
        record,
      };
    }

    const call = await announcementService.buildPublishCalldata({ contentHash, category, targetGroup });
    const record = await announcementsStore.getByContentHash(contentHash);
    return {
      mode: 'calldata' as const,
      contentHash,
      ...call,
      record,
    };
  },
};

export const dashboardService = {
  async summary() {
    const [{ items: announcements }, documents] = await Promise.all([
      announcementsService.list(),
      import('../documents/store.js').then((m) => m.documentsStore.list()),
    ]);

    const recentAnnouncements = announcements.slice(0, 5).map((a) => ({
      type: 'announcement' as const,
      id: a.id,
      title: a.title ?? `Announcement #${a.id ?? '?'}`,
      meta: a.timestamp
        ? `${new Date(Number(a.timestamp) * 1000).toLocaleString()} • Announcements`
        : 'Pending • Announcements',
    }));

    const recentDocuments = documents.slice(0, 5).map((d) => ({
      type: 'document' as const,
      id: String(d.id),
      title: d.filename,
      meta: `${new Date(d.uploadDate).toLocaleString()} • Documents`,
    }));

    const recent = [...recentAnnouncements, ...recentDocuments]
      .sort((a, b) => b.meta.localeCompare(a.meta))
      .slice(0, 8);

    return {
      documents: documents.length,
      announcements: announcements.length,
      recent,
    };
  },
};
