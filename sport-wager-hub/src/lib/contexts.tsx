import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "./api";
import type { User, AppNotification, Sport } from "./types";

interface AppContextValue {
  currentUser: User | null;
  users: User[];
  setCurrentUserId: (id: string) => void;
  sportFilter: Sport | "all";
  setSportFilter: (s: Sport | "all") => void;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("u_1");
  const [sportFilter, setSportFilter] = useState<Sport | "all">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => { api.listUsers().then(setUsers); }, []);

  const refreshNotifications = useCallback(async () => {
    if (!currentUserId) return;
    const list = await api.listNotifications(currentUserId);
    setNotifications(list);
  }, [currentUserId]);

  useEffect(() => { refreshNotifications(); }, [refreshNotifications]);

  const markRead = useCallback(async (id: string) => {
    // optimistic
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await api.markRead(id); } catch { refreshNotifications(); }
  }, [refreshNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await api.markAllRead(currentUserId); } catch { refreshNotifications(); }
  }, [currentUserId, refreshNotifications]);

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, users, setCurrentUserId,
      sportFilter, setSportFilter,
      notifications, unreadCount, refreshNotifications, markRead, markAllRead,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
