import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Challenge, ChallengeState } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StateBadge } from "@/components/StateBadge";
import { fmtMoney, fmtRel } from "@/lib/format";
import { Loader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/challenges/")({ component: ChallengesList });

const TABS: { key: "all" | ChallengeState | "terminal"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "funded", label: "Funded" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "disputed", label: "Disputed" },
  { key: "terminal", label: "Terminal" },
];

const TERMINAL: ChallengeState[] = ["paid_out", "refunded", "cancelled"];

function ChallengesList() {
  const { users, sportFilter } = useApp();
  const [list, setList] = useState<Challenge[] | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");

  useEffect(() => { api.listChallenges().then(setList); }, []);

  const filtered = useMemo(() => {
    if (!list) return [];
    return list.filter((c) => {
      if (sportFilter !== "all" && c.sport !== sportFilter) return false;
      if (tab === "all") return true;
      if (tab === "terminal") return TERMINAL.includes(c.state);
      return c.state === tab;
    });
  }, [list, tab, sportFilter]);

  return (
    <>
      <PageHeader
        title="Challenges"
        subtitle="All wagers across the platform"
        actions={<Button asChild className="glow-primary"><Link to="/challenges/new" search={{}}><Plus className="h-4 w-4 mr-2" />New challenge</Link></Button>}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList className="bg-card/40 border border-border">
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {list === null ? <Loader /> : filtered.length === 0 ? (
        <EmptyState title="No challenges in this view" description="Try a different tab or create a new challenge." />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const opp = users.find((u) => u.id === c.opponentId);
            const creator = users.find((u) => u.id === c.creatorId);
            return (
              <Link key={c.id} to="/challenges/$id" params={{ id: c.id }}>
                <Card className="surface-card border-border hover:border-primary/40 transition-colors mb-2">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stake</div>
                      <div className="text-lg font-bold text-primary text-numeric">{fmtMoney(c.stake, c.currency)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">#{c.id}</span>
                        <span className="capitalize font-semibold">{c.sport.replace("_", " ")}</span>
                        <span className="text-muted-foreground text-xs">· {c.mode.replace("_", " ")}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {creator?.displayName ?? c.creatorId} <span className="text-primary mx-1">vs</span> {opp?.displayName ?? c.opponentId} · updated {fmtRel(c.updatedAt)}
                      </div>
                    </div>
                    <StateBadge state={c.state} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
