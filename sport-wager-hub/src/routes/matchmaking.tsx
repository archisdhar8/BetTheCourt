import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { MatchCandidate, Sport } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/Loader";
import { Search, Sparkles, MapPin, Target, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/matchmaking")({ component: Matchmaking });

const sports: Sport[] = ["basketball", "tennis", "padel", "pool", "darts", "chess", "ping_pong"];

function Matchmaking() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [sport, setSport] = useState<Sport>("tennis");
  const [maxKm, setMaxKm] = useState(15);
  const [stakeMin, setStakeMin] = useState(20);
  const [stakeMax, setStakeMax] = useState(200);
  const [results, setResults] = useState<MatchCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const r = await api.findMatches({ sport, userId: currentUser.id, maxKm, stakeMin, stakeMax });
      setResults(r);
    } finally { setLoading(false); }
  };

  useEffect(() => { search(); /* initial */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currentUser?.id]);

  return (
    <>
      <PageHeader title="Matchmaking" subtitle="Find skill-balanced opponents nearby" />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card className="surface-card border-border h-fit">
          <CardHeader><CardTitle className="text-base">Search criteria</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sport</Label>
              <select value={sport} onChange={(e) => setSport(e.target.value as Sport)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm capitalize">
                {sports.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max travel (km)</Label>
              <Input type="number" value={maxKm} onChange={(e) => setMaxKm(+e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stake min</Label>
                <Input type="number" value={stakeMin} onChange={(e) => setStakeMin(+e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stake max</Label>
                <Input type="number" value={stakeMax} onChange={(e) => setStakeMax(+e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Availability</Label>
              <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                <option>Any time this week</option>
                <option>Weekend evenings</option>
                <option>Weekday mornings</option>
              </select>
            </div>
            <Button onClick={search} disabled={loading} className="w-full glow-primary">
              <Search className="h-4 w-4 mr-2" />{loading ? "Searching…" : "Search opponents"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading && <Loader />}
          {!loading && results?.map((m) => (
            <Card key={m.user.id} className="surface-card border-border hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-primary-foreground">
                      {m.user.displayName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="font-semibold">{m.user.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{m.user.username} · ELO {m.user.elo}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" /> {m.distanceKm.toFixed(1)} km
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Score label="Match quality" value={m.matchQuality} accent="primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Stat label="Match quality" value={m.matchQuality} />
                  <Stat label="Fairness" value={m.fairnessConfidence} />
                  <Stat label="Acceptance" value={m.acceptanceLikelihood} />
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                    <Sparkles className="h-3 w-3 text-primary" /> Why this match
                  </div>
                  <ul className="text-xs space-y-0.5">
                    {m.explanation.map((e, i) => <li key={i} className="flex items-start gap-1.5"><Target className="h-3 w-3 mt-0.5 text-accent shrink-0" />{e}</li>)}
                  </ul>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={() => navigate({ to: "/challenges/new", search: { opponentId: m.user.id, sport } as any })}>
                    Start challenge <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && results?.length === 0 && <p className="text-sm text-muted-foreground">No matches found. Try widening filters.</p>}
        </div>
      </div>

      <div className="mt-6">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-numeric font-semibold mt-0.5">{Math.round(value * 100)}%</div>
      <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${value * 100}%` }} /></div>
    </div>
  );
}
function Score({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold text-${accent} text-numeric`}>{Math.round(value * 100)}<span className="text-sm">%</span></div>
    </div>
  );
}
