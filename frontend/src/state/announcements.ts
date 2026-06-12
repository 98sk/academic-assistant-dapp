import { create } from "zustand";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  read: boolean;
};

type AnnouncementsState = {
  items: Announcement[];
  markRead: (id: string) => void;
};

export const useAnnouncementsStore = create<AnnouncementsState>((set) => ({
  items: [
    {
      id: "a1",
      title: "Welcome to the dashboard",
      body: "This is a placeholder announcement feed.",
      read: false
    }
  ],
  markRead: (id) =>
    set((s) => ({
      items: s.items.map((a) => (a.id === id ? { ...a, read: true } : a))
    }))
}));

