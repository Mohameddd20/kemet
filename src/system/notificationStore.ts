import { create } from 'zustand';
import { playNotificationChime } from './soundEffects';

export interface OsNotification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  category: 'system' | 'files' | 'network';
  toastVisible: boolean;
}

interface NotificationStoreState {
  notifications: OsNotification[];
  pushNotification: (
    title: string,
    message: string,
    category?: OsNotification['category']
  ) => void;
  dismissToast: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [
    {
      id: 'welcome-notif',
      title: 'NizamOS Ready',
      message: 'IndexedDB file system mounted at /home/user.',
      createdAt: Date.now(),
      category: 'system',
      toastVisible: false,
    },
  ],

  pushNotification: (title, message, category = 'system') => {
    const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: OsNotification = {
      id,
      title,
      message,
      createdAt: Date.now(),
      category,
      toastVisible: true,
    };

    playNotificationChime();

    set((state) => ({
      notifications: [entry, ...state.notifications.slice(0, 29)],
    }));

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, toastVisible: false } : n
          ),
        }));
      }, 3500);
    }
  },

  dismissToast: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, toastVisible: false } : n
      ),
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));
