import { create } from "zustand";
import { getUnreadNotificationsCount } from "@/actions/social.actions";

interface NotificationState {
  unreadCount: number;
  lastFetchedAt: number | null;
  isFetching: boolean;
  setUnreadCount: (count: number) => void;
  fetchUnreadCount: (force?: boolean) => Promise<number>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  lastFetchedAt: null,
  isFetching: false,
  setUnreadCount: (count) => set({ unreadCount: count }),
  fetchUnreadCount: async (force = false) => {
    const { lastFetchedAt, unreadCount, isFetching } = get();
    
    // Lock concurrent fetches
    if (isFetching) {
      return unreadCount;
    }

    const now = Date.now();
    // Cache count for 30 seconds to avoid duplicate requests during navigation/mounts
    if (!force && lastFetchedAt && now - lastFetchedAt < 30000) {
      return unreadCount;
    }

    set({ isFetching: true });
    try {
      const count = await getUnreadNotificationsCount();
      set({ unreadCount: count, lastFetchedAt: now, isFetching: false });
      return count;
    } catch (err) {
      console.warn("[NotificationStore] Error fetching unread notifications:", err);
      set({ isFetching: false });
      return unreadCount;
    }
  },
}));
