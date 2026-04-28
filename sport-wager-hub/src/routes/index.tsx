import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Challenge, Wallet, AppNotification, LeaderboardRow } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StateBadge } from "@/components/StateBadge";
import { fmtMoney, fmtRel } from "@/lib/format";
import { Loader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Search, ArrowRight, TrendingUp, Wallet as WalletIcon, BellRing, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { currentUser, notifications, sportFilter } = useApp();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    api.listChallenges().then(setChallenges);
    api.getWallet(currentUser.id).then((w) => setWallet(w ?? null));
    api.leaderboard(sportFilter === "all" ? undefined : sportFilter).then(setBoard);
  }, [currentUser, sportFilter]);

  if (!currentUser) return <Loader label="Loading dashboard…" />;

  const myActive = (challenges ?? []).filter(
    (c) => (c.creatorId === currentUser.id || c.opponentId === currentUser.id) &&
      !["paid_out", "cancelled", "refunded"].includes(c.state)
  );
  const grouped = myActive.reduce<Record<string, Challenge[]>>((acc, c) => {
    (acc[c.state] ??= []).push(c); return acc;
  }, {});
  const unread = notifications.filter((n) => !n.read).slice(0, 5);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${currentUser.displayName.split(" ")[0]}`}
        subtitle="Your active wagers, wallet, and the latest action"
        actions={
          <>
            <Button asChild variant="outline"><Link to="/matchmaking"><Search className="h-4 w-4 mr-2" />Find opponent</Link></Button>
            <Button asChild className="glow-primary"><Link to="/challenges/new" search={{}}><Plus className="h-4 w-4 mr-2" />New challenge</Link></Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active wagers" value={myActive.length.toString()} icon={<Trophy className="h-4 w-4" />} accent="primary" />
        <KpiCard label="Wallet available" value={wallet ? fmtMoney(wallet.available, wallet.currency) : "—"} icon={<WalletIcon className="h-4 w-4" />} accent="accent" />
        <KpiCard label="Locked in escrow" value={wallet ? fmtMoney(wallet.locked, wallet.currency) : "—"} icon={<WalletIcon className="h-4 w-4" />} accent="warning" />
        <KpiCard label="Unread notifications" value={unread.length.toString()} icon={<BellRing className="h-4 w-4" />} accent="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active challenges by state */}
        <Card className="lg:col-span-2 surface-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active challenges</CardTitle>
            <Link to="/challenges" className="text-xs text-primary hover:underline flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>
          </CardHeader>
          <CardContent className="space-y-5">
            {challenges === null && <Loader />}
            {challenges !== null && myActive.length === 0 && (
              <EmptyState title="No active challenges" description="Find an opponent or create a challenge to get started." action={<Button asChild><Link to="/challenges/new" search={{}}>Create challenge</Link></Button>} />
            )}
            {Object.entries(grouped).map(([state, list]) => (
              <div key={state}>
                <div className="flex items-center gap-2 mb-2">
                  <StateBadge state={state as Challenge["state"]} />
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((c) => <ChallengeRow key={c.id} c={c} />)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="surface-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <Link to="/notifications" className="text-xs text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {unread.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">You're all caught up.</p>
              ) : unread.map((n) => <NotifRow key={n.id} n={n} />)}
            </CardContent>
          </Card>

          <Card className="surface-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Leaderboard</CardTitle>
              <Link to="/leaderboards" className="text-xs text-primary hover:underline">Full</Link>
            </CardHeader>
            <CardContent>
              {board === null ? <Loader /> : (
                <ol className="space-y-1.5">
                  {board.slice(0, 5).map((row) => (
                    <li key={row.userId} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground w-5">#{row.rank}</span>
                        <span className="font-medium">{row.username}</span>
                      </span>
                      <span className="text-numeric text-primary font-semibold">{Math.round(row.displayScore ?? row.elo)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: "primary" | "accent" | "warning" | "info" }) {
  const tone = {
    primary: "text-primary border-primary/30",
    accent: "text-accent border-accent/30",
    warning: "text-warning border-warning/30",
    info: "text-info border-info/30",
  }[accent];
  return (
    <div className="surface-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
        <span>{label}</span>
        <span className={`h-7 w-7 rounded-md border ${tone} flex items-center justify-center`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-numeric">{value}</div>
    </div>
  );
}

function ChallengeRow({ c }: { c: Challenge }) {
  return (
    <Link to="/challenges/$id" params={{ id: c.id }} className="block rounded-lg border border-border bg-card/40 hover:bg-card hover:border-primary/40 transition-colors p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground">#{c.id}</span>
            <span className="capitalize font-medium">{c.sport.replace("_", " ")}</span>
            <span className="text-muted-foreground text-xs">· {c.mode.replace("_", " ")}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Updated {fmtRel(c.updatedAt)}</div>
        </div>
        <div className="text-right">
          <div className="text-numeric font-semibold text-primary">{fmtMoney(c.stake, c.currency)}</div>
          <StateBadge state={c.state} />
        </div>
      </div>
    </Link>
  );
}

function NotifRow({ n }: { n: AppNotification }) {
  return (
    <Link
      to={n.metadata.challengeId ? "/challenges/$id" : "/notifications"}
      params={n.metadata.challengeId ? { id: n.metadata.challengeId } : undefined}
      className="block rounded-lg p-2.5 hover:bg-muted/40 transition-colors border border-transparent hover:border-border"
    >
      <div className="flex items-start gap-2">
        <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{n.title}</div>
          <div className="text-xs text-muted-foreground truncate">{n.body}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{fmtRel(n.createdAt)}</div>
        </div>
      </div>
    </Link>
  );
}
