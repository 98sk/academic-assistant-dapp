import type { AnnouncementContentRecord } from '../announcements/store.js';
import type { DocumentRecord } from '../documents/store.js';

type UserCtx = {
  address: string;
  roles?: {
    isAdmin: boolean;
    isProfessor: boolean;
    isStudent: boolean;
    group?: string;
  };
};

/** ACL: own uploads, same targetGroup, or admin. Professors see group-wide docs. */
export function canAccessDocument(user: UserCtx, doc: DocumentRecord): boolean {
  const roles = user.roles;
  if (roles?.isAdmin) return true;

  const sameWallet = doc.uploaderWallet.toLowerCase() === user.address.toLowerCase();
  if (sameWallet) return true;

  const userGroup = roles?.group?.trim();
  const docGroup = doc.targetGroup?.trim();

  if (roles?.isProfessor) {
    if (!docGroup) return true;
    if (userGroup && docGroup === userGroup) return true;
    return sameWallet;
  }

  if (docGroup && userGroup && docGroup === userGroup) return true;

  return false;
}

export function filterAccessibleDocuments(user: UserCtx, docs: DocumentRecord[]): DocumentRecord[] {
  return docs.filter((d) => canAccessDocument(user, d));
}

export function canAccessAnnouncement(user: UserCtx, ann: AnnouncementContentRecord): boolean {
  const roles = user.roles;
  if (roles?.isAdmin) return true;

  const sameWallet = ann.publisher.toLowerCase() === user.address.toLowerCase();
  if (sameWallet) return true;

  const userGroup = roles?.group?.trim();
  const annGroup = ann.targetGroup?.trim();

  if (roles?.isProfessor) {
    if (!annGroup) return true;
    if (userGroup && annGroup === userGroup) return true;
    return sameWallet;
  }

  if (annGroup && userGroup && annGroup === userGroup) return true;

  return false;
}

export function filterAccessibleAnnouncements(
  user: UserCtx,
  items: AnnouncementContentRecord[],
): AnnouncementContentRecord[] {
  return items.filter((a) => canAccessAnnouncement(user, a) && Boolean(a.body?.trim()));
}
