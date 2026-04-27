import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Challenge, ResultRound } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/Loader";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/results")({ component: Results });

function Results() {
  const { currentUser } = useApp();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [round, setRound] = useState<ResultRound | null>(null);
  const [payload, setPayload] = useState(`{\n  "winner": "u_1",\n  "scores": [[6, 4], [6, 3]]\n}`);
  const [ack, setAck] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { api.listChallenges().then((cs) => {
    const eligible = cs.filter((c) => ["scheduled", "completed", "disputed"].includes(c.state));
    setChallenges(eligible);
    if (eligible[0]) setSelected(eligible[0].id);
  }); }, []);

  useEffect(() => {
    if (!selected) return;
    const c = challenges.find((x) => x.id === selected);
    if (c?.activeRoundId) api.getRound(c.activeRoundId).then((r) => setRound(r ?? null));
    else setRound(null);
  }, [selected, challenges]);

  const sel = challenges.find((c) => c.id === selected);

  const submit = async () => {
    if (!sel || !currentUser) return;
    try {
      const r = await api.submitResult(sel.id, currentUser.id, JSON.parse(payload));
      setRound(r); toast.success(`Result submitted · fingerprint ${r.fingerprint}`);
      setChallenges((cs) => cs.map((c) => c.id === sel.id ? { ...c, state: "completed", activeRoundId: r.id } : c));
    } catch (e: any) { toast.error(e?.message ?? "Invalid JSON or submission failed"); }
  };
  const confirm = async () => { if (!round || !currentUser) return; const r = await api.confirmResult(round.id, currentUser.id, ack || undefined); setRound(r); toast.success("Confirmed"); };
  const dispute = async () => { if (!round || !currentUser || !reason) return; const r = await api.disputeResult(round.id, currentUser.id, reason); setRound(r); toast.success("Disputed"); };

  return (
    <>
      <PageHeader title="Results verification" subtitle="Submit, confirm, or dispute match results" />

      <div className="mb-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Challenge</Label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full max-w-md bg-input border border-border rounded-md px-3 py-2 text-sm mt-1">
          {challenges.length === 0 && <option value="">No eligible challenges</option>}
          {challenges.map((c) => <option key={c.id} value={c.id}>#{c.id} · {c.sport} · {c.state}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base">Submit result</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payload (JSON)</Label>
            <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="font-mono text-xs h-40" />
            <Button onClick={submit} disabled={!sel} className="w-full glow-primary"><Send className="h-4 w-4 mr-2" />Submit result</Button>
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base">Active round</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!round ? <Loader label="No active round." /> : (
              <>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Round</span><span className="font-mono">{round.id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fingerprint</span><span className="font-mono text-primary">{round.fingerprint}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="uppercase font-semibold">{round.state}</span></div>
                </div>
                <pre className="text-xs bg-muted/40 border border-border rounded-md p-2 overflow-x-auto">{JSON.stringify(round.payload, null, 2)}</pre>
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm with optional ack fingerprint</Label>
                  <div className="flex gap-2">
                    <input value={ack} onChange={(e) => setAck(e.target.value)} placeholder={round.fingerprint} className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-xs font-mono" />
                    <Button onClick={confirm} variant="outline"><CheckCircle2 className="h-4 w-4 mr-1" />Confirm</Button>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dispute reason</Label>
                  <div className="flex gap-2">
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong?" className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-xs" />
                    <Button onClick={dispute} variant="outline" disabled={!reason}><XCircle className="h-4 w-4 mr-1" />Dispute</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
