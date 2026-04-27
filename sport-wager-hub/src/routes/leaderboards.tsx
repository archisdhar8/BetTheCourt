import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LeaderboardRow, Sport } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Loader } from "@/components/Loader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/leaderboards")({ component: Leaderboards });

const sports: (Sport | "all")[] = ["all", "basketball", "tennis", "padel", "pool", "darts", "chess", "ping_pong"];

function Leaderboards() {
  const [sport, setSport] = useState<Sport | "all">("all");
  const [window_, setWindow] = useState<"all_time" | "weekly">("all_time");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => { api.leaderboard(sport === "all" ? undefined : sport, window_).then(setRows); }, [sport, window_]);

  return (
    <>
      <PageHeader title="Leaderboards" subtitle="Compete on ELO, streaks, and weekly wins" />

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={sport} onChange={(e) => setSport(e.target.value as Sport | "all")} className="bg-input border border-border rounded-md px-3 py-2 text-sm capitalize">
          {sports.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <Tabs value={window_} onValueChange={(v) => setWindow(v as any)}>
          <TabsList className="bg-card/40 border border-border">
            <TabsTrigger value="all_time">All time</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="surface-card border-border">
        <CardContent className="p-0 overflow-x-auto">
          {!rows ? <Loader /> : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Player</th>
                  <th className="text-right px-4 py-3">ELO</th>
                  <th className="text-right px-4 py-3">W</th>
                  <th className="text-right px-4 py-3">L</th>
                  <th className="text-right px-4 py-3">Streak</th>
                  <th className="text-right px-4 py-3">Wk wins</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        r.rank === 1 ? "bg-primary/20 text-primary border border-primary/40" :
                        r.rank <= 3 ? "bg-accent/20 text-accent border border-accent/40" :
                        "bg-muted text-muted-foreground"
                      }`}>{r.rank}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.username}</td>
                    <td className="px-4 py-3 text-right text-numeric font-bold text-primary">{r.elo}</td>
                    <td className="px-4 py-3 text-right text-numeric text-success">{r.wins}</td>
                    <td className="px-4 py-3 text-right text-numeric text-muted-foreground">{r.losses}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-numeric ${r.streak > 0 ? "text-success" : "text-destructive"}`}>
                        {r.streak > 0 ? <Flame className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(r.streak)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-numeric">{r.windowWins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
