import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Sport, Mode, Currency } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges/new")({
  component: NewChallenge,
  validateSearch: (s: Record<string, unknown>): { opponentId?: string; sport?: Sport } => ({
    opponentId: typeof s.opponentId === "string" ? s.opponentId : undefined,
    sport: typeof s.sport === "string" ? (s.sport as Sport) : undefined,
  }),
});

const sports: Sport[] = ["basketball", "tennis", "padel", "pool", "darts", "chess", "ping_pong"];
const modes: Mode[] = ["singles", "doubles", "best_of_3", "best_of_5"];
const currencies: Currency[] = ["USD", "EUR", "GBP"];

function NewChallenge() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { currentUser, users } = useApp();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [sport, setSport] = useState<Sport>(search.sport ?? "tennis");
  const [mode, setMode] = useState<Mode>("singles");
  const [stake, setStake] = useState(50);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [opponentId, setOpponentId] = useState<string>(search.opponentId ?? "");
  const [venueId, setVenueId] = useState<string>("");

  const opponent = users.find((u) => u.id === opponentId);

  const submit = async () => {
    if (!currentUser || !opponentId) return;
    setSubmitting(true);
    try {
      const c = await api.createChallenge({ sport, mode, stake, currency, creatorId: currentUser.id, opponentId, venueId: venueId || undefined });
      toast.success("Challenge created — opponent notified");
      navigate({ to: "/challenges/$id", params: { id: c.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create challenge");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <PageHeader title="New challenge" subtitle="Stake, opponent, and venue" />

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-6">
        {["Basics", "Opponent", "Venue", "Review"].map((label, i) => {
          const n = i + 1;
          const active = step === n; const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${
                done ? "bg-primary text-primary-foreground" : active ? "bg-primary/20 border border-primary text-primary" : "bg-muted text-muted-foreground border border-border"
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={`text-sm ${active ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
              {n < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <Card className="surface-card border-border max-w-2xl">
        <CardContent className="p-6 space-y-5">
          {step === 1 && (
            <>
              <Field label="Sport"><select value={sport} onChange={(e) => setSport(e.target.value as Sport)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm capitalize">
                {sports.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select></Field>
              <Field label="Mode"><select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm capitalize">
                {modes.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stake"><Input type="number" min={1} value={stake} onChange={(e) => setStake(+e.target.value)} /></Field>
                <Field label="Currency"><select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></Field>
              </div>
            </>
          )}
          {step === 2 && (
            <Field label="Opponent">
              <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                <option value="">— Select opponent —</option>
                {users.filter((u) => u.id !== currentUser?.id).map((u) => <option key={u.id} value={u.id}>{u.displayName} · ELO {u.elo}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-2">Or use Matchmaking to get suggestions.</p>
            </Field>
          )}
          {step === 3 && (
            <Field label="Venue (optional)">
              <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                <option value="">Skip — decide later</option>
                <option value="v_1">Riverside Courts · Brooklyn</option>
                <option value="v_2">Eastside Sports Club · Queens</option>
                <option value="v_3">Downtown Pool Hall · Manhattan</option>
                <option value="v_4">Harbor Rec Center · Jersey City</option>
              </select>
            </Field>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <Row k="Sport"><span className="capitalize">{sport.replace("_", " ")}</span></Row>
              <Row k="Mode"><span className="capitalize">{mode.replace("_", " ")}</span></Row>
              <Row k="Stake"><span className="text-primary font-semibold text-numeric">{stake} {currency}</span></Row>
              <Row k="Opponent">{opponent?.displayName ?? "—"}</Row>
              <Row k="Venue">{venueId || "Decide later"}</Row>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 2 && !opponentId}>Continue</Button>
            ) : (
              <Button onClick={submit} disabled={submitting || !opponentId} className="glow-primary">
                {submitting ? "Submitting…" : "Submit challenge"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"><span className="text-sm text-muted-foreground">{k}</span><span className="text-sm">{children}</span></div>;
}
