import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "./api";
import type { User, AppNotification, Sport } from "./types";

interface AppContextValue {
  currentUser: User | null;
  users: User[];
  isAuthReady: boolean;
  setCurrentUserId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  syncLocation: () => Promise<void>;
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
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [sportFilter, setSportFilter] = useState<Sport | "all">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    (async () => {
      const [me, all] = await Promise.all([api.me(), api.listUsers()]);
      setUsers(all);
      setCurrentUserId(me?.id ?? "");
      setIsAuthReady(true);
    })();
  }, []);

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

  const login = useCallback(async (email: string, password: string) => {
    const user = await api.login(email, password);
    const all = await api.listUsers();
    setUsers(all);
    setCurrentUserId(user.id);
  }, []);

  const register = useCallback(async (input: { email: string; username: string; displayName: string; password: string }) => {
    const user = await api.register(input);
    const all = await api.listUsers();
    setUsers(all);
    setCurrentUserId(user.id);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setCurrentUserId("");
    setNotifications([]);
  }, []);

  const syncLocation = useCallback(async () => {
    if (!currentUserId || typeof window === "undefined" || !navigator.geolocation) return;
    const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition((pos) => resolve(pos.coords), reject, { enableHighAccuracy: true, timeout: 7000 });
    });
    await api.updateMyLocation(currentUserId, {
      lat: coords.latitude,
      lng: coords.longitude,
      locationPrivacy: "hybrid_private",
    });
    const all = await api.listUsers();
    setUsers(all);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    void syncLocation().catch(() => {});
  }, [currentUserId, syncLocation]);

  return (
    <AppContext.Provider value={{
      isAuthReady,
      currentUser, users, setCurrentUserId,
      login, register, logout, syncLocation,
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
