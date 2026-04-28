import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Sport, VenueRanking } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MapPin, Sparkles, Home, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/venues")({ component: Venues });

const sports: Sport[] = ["basketball", "tennis", "padel", "pool", "darts", "chess", "ping_pong"];

function Venues() {
  const { users, currentUser } = useApp();
  const [sport, setSport] = useState<Sport>("tennis");
  const [participants, setParticipants] = useState<string[]>([]);
  const [list, setList] = useState<VenueRanking[] | null>(null);

  useEffect(() => {
    if (currentUser && participants.length === 0) setParticipants([currentUser.id, users[1]?.id].filter(Boolean) as string[]);
  }, [currentUser, users, participants.length]);

  const run = async () => {
    if (participants.length < 2) return;
    setList(null);
    const r = await api.rankVenues({ sport, participants });
    setList(r);
  };

  useEffect(() => { if (participants.length >= 2) run(); /* eslint-disable-next-line */ }, [sport, participants.join(",")]);

  return (
    <>
      <PageHeader title="Venue discovery" subtitle="Ranked venues with travel and centrality rationale" />

      <Card className="surface-card border-border mb-6">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport)} className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-sm capitalize">
              {sports.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Participant 1</label>
            <select value={participants[0] ?? ""} onChange={(e) => setParticipants([e.target.value, participants[1] ?? ""])} className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-sm">
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Participant 2</label>
            <select value={participants[1] ?? ""} onChange={(e) => setParticipants([participants[0] ?? "", e.target.value])} className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-sm">
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {list === null ? <Loader /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((v) => (
            <Card key={v.venue.id} className="surface-card border-border hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {v.venue.name}
                      {list[0]?.venue.id === v.venue.id && (
                        <span className="text-[10px] bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded uppercase tracking-wider">Midpoint pick</span>
                      )}
                      {v.homeCourtFor && <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><Home className="h-3 w-3" />Home</span>}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{v.venue.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Suitability</div>
                    <div className="text-2xl font-bold text-primary text-numeric">{Math.round(v.suitabilityScore * 100)}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Mini label="Quality" value={v.venue.qualityScore} icon={<Star className="h-3 w-3" />} />
                  <Mini label="Centrality" value={v.centrality} />
                  <Mini label="Suitability" value={v.suitabilityScore} />
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Travel split</div>
                  {Object.entries(v.travelKmByParty).map(([uid, km]) => (
                    <div key={uid} className="flex justify-between text-xs">
                      <span>{users.find((u) => u.id === uid)?.displayName ?? uid}</span>
                      <span className="text-numeric">{km.toFixed(1)} km</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Sheet>
                    <SheetTrigger asChild><Button variant="outline" size="sm" className="flex-1"><Sparkles className="h-3.5 w-3.5 mr-2" />Why this venue</Button></SheetTrigger>
                    <SheetContent>
                      <SheetHeader><SheetTitle>{v.venue.name}</SheetTitle></SheetHeader>
                      <div className="mt-6 space-y-4">
                        <div>
                          <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Scoring breakdown</div>
                          <ul className="space-y-2 text-sm">
                            {v.rationale.map((r, i) => <li key={i} className="flex gap-2"><span className="text-primary">→</span>{r}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Travel</div>
                          {Object.entries(v.travelKmByParty).map(([uid, km]) => (
                            <div key={uid} className="flex justify-between text-sm py-1 border-b border-border/50">
                              <span>{users.find((u) => u.id === uid)?.displayName ?? uid}</span>
                              <span className="text-numeric">{km.toFixed(1)} km</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Button size="sm" className="flex-1" onClick={() => toast.success(`Selected ${v.venue.name}`)}>Select venue</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Mini({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-card/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-sm font-semibold text-numeric mt-0.5">{Math.round(value * 100)}%</div>
    </div>
  );
}
