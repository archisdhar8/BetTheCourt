import { Link, useLocation } from "@tanstack/react-router";
import { Toaster } from "sonner";
import {
  LayoutDashboard, Swords, MapPin, Trophy, Wallet, BellRing, ShieldAlert,
  CheckCircle2, ClipboardCheck, Calendar, Users2, Zap, LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/contexts";
import { API_MODE } from "@/lib/api";
import type { Sport } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matchmaking", label: "Matchmaking", icon: Swords },
  { to: "/venues", label: "Venues", icon: MapPin },
  { to: "/challenges", label: "Challenges", icon: Trophy },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { to: "/results", label: "Results", icon: CheckCircle2 },
  { to: "/fraud", label: "Fraud", icon: ShieldAlert },
  { to: "/leaderboards", label: "Leaderboards", icon: Calendar },
  { to: "/notifications", label: "Notifications", icon: BellRing },
] as const;

const sports: (Sport | "all")[] = ["all", "basketball", "tennis", "padel", "pool", "darts", "chess", "ping_pong"];

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, users, setCurrentUserId, sportFilter, setSportFilter, unreadCount, syncLocation, logout } = useApp();
  const loc = useLocation();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight tracking-tight">WAGR</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-widest">Sports challenges</div>
          </div>
        </Link>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((n) => {
            const active = n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                {n.to === "/notifications" && unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-muted-foreground">
          v0.1 · {API_MODE === "mock" ? "Mock data" : "Live API"}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-30 flex items-center gap-4 px-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`uppercase text-[10px] tracking-wider ${API_MODE === "mock" ? "border-warning/50 text-warning" : "border-success/50 text-success"}`}>
              {API_MODE === "mock" ? "● Local mock" : "● Live"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <Users2 className="h-4 w-4 text-muted-foreground" />
            <select
              value={currentUser?.id ?? ""}
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="bg-transparent text-sm border border-border rounded-md px-2 py-1 hover:border-primary/50 focus:outline-none focus:border-primary"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName} · {u.elo}</option>
              ))}
            </select>
          </div>
          <button
            className="text-xs border border-border rounded-md px-2 py-1 hover:border-primary/50"
            onClick={() => { void syncLocation(); }}
          >
            Sync location
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sport</span>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value as Sport | "all")}
              className="bg-transparent text-sm border border-border rounded-md px-2 py-1 capitalize hover:border-primary/50 focus:outline-none focus:border-primary"
            >
              {sports.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>

          <div className="flex-1" />

          <Link to="/notifications" className="relative h-9 w-9 rounded-md border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors">
            <BellRing className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <button className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:border-primary/50" onClick={() => { void logout(); }}>
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 px-6 py-6 min-w-0">{children}</main>
      </div>

      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
