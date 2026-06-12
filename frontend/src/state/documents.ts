import { create } from "zustand";

import type { DocumentRecord } from "../features/documents/documentsApi";
import { listDocuments } from "../features/documents/documentsApi";

type DocumentsState = {
  items: DocumentRecord[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  setItems: (items: DocumentRecord[]) => void;
};

export const useDocumentsStore = create<DocumentsState>((set) => ({
  items: [],
  loading: false,
  error: undefined,
  setItems: (items) => set({ items }),
  refresh: async () => {
    set({ loading: true, error: undefined });
    try {
      const { items } = await listDocuments();
      set({ items, loading: false });
    } catch (e: any) {
      set({ loading: false, error: String(e?.message ?? e) });
    }
  },
}));

