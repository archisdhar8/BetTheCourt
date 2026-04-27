import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Challenge, CheckInStatus } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/Loader";
import { ClipboardCheck, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkin")({ component: CheckIn });

function CheckIn() {
  const { currentUser, users } = useApp();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [lat, setLat] = useState(40.74);
  const [lng, setLng] = useState(-73.87);

  useEffect(() => { api.listChallenges().then((cs) => {
    const eligible = cs.filter((c) => c.state === "scheduled");
    setChallenges(eligible);
    if (eligible[0]) setSelected(eligible[0].id);
  }); }, []);

  useEffect(() => { if (selected) api.getCheckIn(selected).then(setStatus); }, [selected]);

  const submit = async () => {
    if (!selected || !currentUser) return;
    const s = await api.submitCheckIn(selected, currentUser.id, lat, lng);
    setStatus(s);
    const last = s.records[s.records.length - 1];
    if (last?.valid) toast.success("Check-in valid"); else toast.error(`Invalid: ${last?.reason}`);
  };

  return (
    <>
      <PageHeader title="Check-in" subtitle="Verify presence at the venue within policy radius and time window" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Submit check-in</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Challenge</Label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm mt-1">
                {challenges.length === 0 && <option value="">No scheduled challenges</option>}
                {challenges.map((c) => <option key={c.id} value={c.id}>#{c.id} · {c.sport}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Latitude</Label>
                <Input type="number" step="0.001" value={lat} onChange={(e) => setLat(+e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Longitude</Label>
                <Input type="number" step="0.001" value={lng} onChange={(e) => setLng(+e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/20 h-40 flex items-center justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Map preview ({lat.toFixed(3)}, {lng.toFixed(3)})</span>
            </div>
            <Button onClick={submit} disabled={!selected} className="w-full glow-primary"><ClipboardCheck className="h-4 w-4 mr-2" />Check in</Button>
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent>
            {!status ? <Loader /> : (
              <div className="space-y-3">
                <div className={`rounded-lg p-4 border ${status.bothCheckedInValid ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Both checked in valid</div>
                  <div className={`text-xl font-bold mt-1 ${status.bothCheckedInValid ? "text-success" : "text-warning"}`}>
                    {status.bothCheckedInValid ? "✓ Yes" : "Awaiting both parties"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground tracking-wider">Radius</div><div className="text-numeric font-semibold">{status.policyRadiusM}m</div></div>
                  <div className="rounded border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground tracking-wider">Window</div><div className="text-numeric font-semibold">{status.windowMinutes} min</div></div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Records</div>
                  {status.records.length === 0 ? <p className="text-sm text-muted-foreground">No check-ins yet.</p> : (
                    <ul className="space-y-1.5">
                      {status.records.map((r, i) => (
                        <li key={i} className="text-xs flex items-center gap-2 p-2 rounded bg-card/40 border border-border">
                          {r.valid ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                          <span className="flex-1">{users.find((u) => u.id === r.userId)?.displayName ?? r.userId}</span>
                          <span className={`uppercase font-semibold ${r.valid ? "text-success" : "text-destructive"}`}>{r.reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
