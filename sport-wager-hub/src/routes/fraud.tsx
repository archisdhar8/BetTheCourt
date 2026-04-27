import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Challenge, FraudEvaluation } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { fmtRel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/fraud")({ component: Fraud });

function Fraud() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [evals, setEvals] = useState<FraudEvaluation[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => { api.listChallenges().then((cs) => { setChallenges(cs); if (cs[0]) setSelected(cs[0].id); }); }, []);
  useEffect(() => { if (selected) api.getFraud(selected).then(setEvals); }, [selected]);

  const evaluate = async () => {
    if (!selected) return;
    setRunning(true);
    try { await api.evaluateFraud(selected); setEvals(await api.getFraud(selected)); toast.success("Evaluation complete"); }
    finally { setRunning(false); }
  };

  const latest = evals[evals.length - 1];

  return (
    <>
      <PageHeader title="Fraud console" subtitle="Latest evaluations, signals, and recommended actions" />

      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1 max-w-md">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Challenge</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-sm">
            {challenges.map((c) => <option key={c.id} value={c.id}>#{c.id} · {c.sport} · {c.state}</option>)}
          </select>
        </div>
        <Button onClick={evaluate} disabled={running}><RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />Run evaluation</Button>
        {selected && <Button asChild variant="outline"><Link to="/challenges/$id" params={{ id: selected }}>Open challenge</Link></Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" />Latest evaluation</CardTitle></CardHeader>
          <CardContent>
            {!latest ? <Loader label="No evaluation yet — run one." /> : (
              <div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Big label="Score" value={`${(latest.score * 100).toFixed(0)}`} accent={latest.recommendedAction === "block" ? "destructive" : latest.recommendedAction === "review" ? "warning" : "success"} />
                  <Big label="Action" value={latest.recommendedAction.toUpperCase()} accent={latest.recommendedAction === "block" ? "destructive" : latest.recommendedAction === "review" ? "warning" : "success"} />
                  <Big label="Payout" value={latest.payoutEligible ? "Eligible" : "Blocked"} accent={latest.payoutEligible ? "success" : "destructive"} />
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Signals</div>
                <ul className="space-y-2">
                  {latest.signals.map((s, i) => (
                    <li key={i} className="rounded border border-border bg-card/40 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono text-warning">{s.code}</span>
                        <span className="text-numeric">+{(s.weight * 100).toFixed(0)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card border-border h-fit">
          <CardHeader><CardTitle className="text-base">Audit log</CardTitle></CardHeader>
          <CardContent>
            {evals.length === 0 ? <p className="text-sm text-muted-foreground">No history.</p> : (
              <ul className="space-y-1.5">
                {evals.slice().reverse().map((ev) => (
                  <li key={ev.id} className="flex justify-between text-xs p-2 rounded border border-border bg-card/40">
                    <span>v{ev.version}</span>
                    <span className="text-numeric">{(ev.score * 100).toFixed(0)}</span>
                    <span className="text-muted-foreground">{fmtRel(ev.evaluatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent: "success" | "warning" | "destructive" }) {
  const tone = { success: "text-success border-success/30", warning: "text-warning border-warning/30", destructive: "text-destructive border-destructive/30" }[accent];
  return (
    <div className={`rounded-lg border ${tone} p-3 text-center`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${tone.split(" ")[0]} text-numeric`}>{value}</div>
    </div>
  );
}
