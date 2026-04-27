import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Challenge, ChallengeState, ScheduleProposal, ResultRound, FraudEvaluation, CheckInStatus } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StateBadge } from "@/components/StateBadge";
import { fmtMoney, fmtDateTime, fmtRel } from "@/lib/format";
import { Loader } from "@/components/Loader";
import {
  Lock, Unlock, Calendar, ClipboardCheck, ShieldAlert, CheckCircle2, XCircle,
  ArrowLeft, Trophy, MapPin, Clock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges/$id")({ component: ChallengeDetail });

function ChallengeDetail() {
  const { id } = Route.useParams();
  const { currentUser, users } = useApp();
  const [c, setC] = useState<Challenge | null | undefined>(undefined);
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [round, setRound] = useState<ResultRound | null>(null);
  const [fraud, setFraud] = useState<FraudEvaluation[]>([]);
  const [checkin, setCheckin] = useState<CheckInStatus | null>(null);

  const refresh = useCallback(async () => {
    const ch = await api.getChallenge(id);
    setC(ch ?? null);
    if (ch?.scheduleProposalId) setProposal((await api.getProposal(ch.scheduleProposalId)) ?? null);
    if (ch?.activeRoundId) setRound((await api.getRound(ch.activeRoundId)) ?? null);
    setFraud(await api.getFraud(id));
    setCheckin(await api.getCheckIn(id));
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (c === undefined) return <Loader label="Loading challenge…" />;
  if (c === null) return (
    <div className="text-center py-20"><p className="text-lg font-semibold">Challenge not found</p>
      <Link to="/challenges" className="text-primary text-sm mt-2 inline-block">← Back to challenges</Link></div>
  );

  const creator = users.find((u) => u.id === c.creatorId);
  const opponent = users.find((u) => u.id === c.opponentId);
  const isCreator = currentUser?.id === c.creatorId;
  const isParticipant = currentUser?.id === c.creatorId || currentUser?.id === c.opponentId;

  const action = async (a: string) => {
    try {
      const next = await api.transitionChallenge(c.id, a, currentUser?.id);
      setC(next);
      toast.success(`Action: ${a}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  return (
    <>
      <Link to="/challenges" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-3 w-3" />All challenges</Link>

      <PageHeader
        title={`Challenge #${c.id}`}
        subtitle={`${c.sport.replace("_", " ")} · ${c.mode.replace("_", " ")}`}
        actions={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stake</div>
              <div className="text-2xl font-bold text-primary text-numeric">{fmtMoney(c.stake, c.currency)}</div>
            </div>
            <StateBadge state={c.state} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Participants */}
          <Card className="surface-card border-border">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <Participant name={creator?.displayName ?? c.creatorId} role="Creator" elo={creator?.elo} />
              <div className="text-2xl font-black text-gradient">VS</div>
              <Participant name={opponent?.displayName ?? c.opponentId} role="Opponent" elo={opponent?.elo} align="right" />
            </CardContent>
          </Card>

          {/* Lifecycle */}
          <Card className="surface-card border-border">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Lifecycle timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 relative pl-5 border-l-2 border-border ml-2">
                {c.timeline.map((t) => (
                  <li key={t.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-primary glow-primary" />
                    <div className="text-sm font-medium capitalize">{t.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{t.message} · {fmtDateTime(t.at)} ({fmtRel(t.at)})</div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Funding */}
          <Card className="surface-card border-border">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />Escrow & funding</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FundCell label={creator?.displayName ?? "Creator"} locked={c.funding.creatorLocked} amount={c.funding.amount} currency={c.currency} />
              <FundCell label={opponent?.displayName ?? "Opponent"} locked={c.funding.opponentLocked} amount={c.funding.amount} currency={c.currency} />
              {isParticipant && c.state === "accepted" && !(isCreator ? c.funding.creatorLocked : c.funding.opponentLocked) && (
                <div className="col-span-2">
                  <Button className="w-full glow-primary" onClick={() => action(isCreator ? "lock_creator" : "lock_opponent")}>
                    <Lock className="h-4 w-4 mr-2" />Lock my stake ({fmtMoney(c.stake, c.currency)})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          {proposal && (
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Scheduling</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">Proposal {proposal.id} · expires {fmtRel(proposal.expiresAt)} · state: <span className="text-foreground font-medium">{proposal.state}</span></div>
                {proposal.slots.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-md border ${proposal.confirmedSlotId === s.id ? "border-primary/60 bg-primary/10" : "border-border bg-card/40"}`}>
                    <div>
                      <div className="text-sm font-medium">{fmtDateTime(s.startsAt)} → {new Date(s.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-xs text-muted-foreground">Confirmed by {s.confirmedBy.length}/2</div>
                    </div>
                    {proposal.confirmedSlotId === s.id && <span className="text-xs uppercase tracking-wider text-primary font-bold">Confirmed</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {round && (
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Results</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">Round {round.id} · fingerprint <span className="font-mono">{round.fingerprint}</span> · submitted by {round.submittedBy}</div>
                <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 overflow-x-auto">{JSON.stringify(round.payload, null, 2)}</pre>
                <div className="space-y-1.5">
                  {round.decisions.map((d, i) => (
                    <div key={i} className="text-xs flex items-center gap-2">
                      {d.decision === "confirm" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      <span>{users.find((u) => u.id === d.userId)?.displayName ?? d.userId}</span>
                      <span className={`uppercase font-semibold tracking-wider ${d.decision === "confirm" ? "text-success" : "text-destructive"}`}>{d.decision}</span>
                      {d.reason && <span className="text-muted-foreground">— {d.reason}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fraud */}
          {fraud.length > 0 && (
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" />Fraud evaluation</CardTitle></CardHeader>
              <CardContent>
                <FraudCard ev={fraud[fraud.length - 1]} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action rail */}
        <div className="space-y-4">
          <Card className="surface-card border-border">
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {c.state === "pending" && (
                <>
                  {!isCreator && <Button className="w-full" onClick={() => action("accept")}><CheckCircle2 className="h-4 w-4 mr-2" />Accept</Button>}
                  {!isCreator && <Button variant="outline" className="w-full" onClick={() => action("decline")}><XCircle className="h-4 w-4 mr-2" />Decline</Button>}
                  {isCreator && <Button variant="outline" className="w-full" onClick={() => action("cancel")}>Cancel challenge</Button>}
                </>
              )}
              {c.state === "funded" && <Button asChild className="w-full"><Link to="/challenges/$id" params={{ id: c.id }} hash="schedule"><Calendar className="h-4 w-4 mr-2" />Propose schedule</Link></Button>}
              {c.state === "scheduled" && (
                <>
                  <Button asChild className="w-full"><Link to="/checkin"><ClipboardCheck className="h-4 w-4 mr-2" />Check in</Link></Button>
                  <Button variant="outline" className="w-full" onClick={() => action("submit_result")}><Trophy className="h-4 w-4 mr-2" />Submit result</Button>
                </>
              )}
              {c.state === "completed" && (
                <>
                  <Button className="w-full" onClick={() => action("confirm")}><CheckCircle2 className="h-4 w-4 mr-2" />Confirm result</Button>
                  <Button variant="outline" className="w-full" onClick={() => action("dispute")}><XCircle className="h-4 w-4 mr-2" />Dispute</Button>
                </>
              )}
              {c.state === "confirmed" && <Button className="w-full" onClick={() => action("payout")}>Trigger payout</Button>}
              {c.state === "disputed" && <Button variant="outline" className="w-full" onClick={() => action("refund")}>Refund both sides</Button>}
              {(["paid_out", "cancelled", "refunded"] as ChallengeState[]).includes(c.state) && (
                <p className="text-xs text-muted-foreground py-2">No actions — terminal state.</p>
              )}
            </CardContent>
          </Card>

          {c.venueId && (
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Venue</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{c.venueId}</div>
                <div className="text-xs text-muted-foreground mt-1">Use the Venues page to inspect details.</div>
              </CardContent>
            </Card>
          )}

          {checkin && (
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />Check-in status</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Both valid</span><span className={checkin.bothCheckedInValid ? "text-success" : "text-warning"}>{checkin.bothCheckedInValid ? "Yes" : "Pending"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Radius</span><span className="text-numeric">{checkin.policyRadiusM}m</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Window</span><span className="text-numeric">{checkin.windowMinutes}m</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Records</span><span>{checkin.records.length}</span></div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Participant({ name, role, elo, align }: { name: string; role: string; elo?: number; align?: "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
        {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{role}</div>
        <div className="font-semibold">{name}</div>
        {elo && <div className="text-xs text-muted-foreground text-numeric">ELO {elo}</div>}
      </div>
    </div>
  );
}

function FundCell({ label, locked, amount, currency }: { label: string; locked: boolean; amount: number; currency: any }) {
  return (
    <div className={`rounded-lg border p-3 ${locked ? "border-success/40 bg-success/5" : "border-border bg-card/40"}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {locked ? <Lock className="h-3 w-3 text-success" /> : <Unlock className="h-3 w-3" />} {label}
      </div>
      <div className="text-lg font-bold text-numeric mt-1">{fmtMoney(amount, currency)}</div>
      <div className={`text-xs font-semibold uppercase tracking-wider ${locked ? "text-success" : "text-warning"}`}>{locked ? "Locked" : "Pending"}</div>
    </div>
  );
}

function FraudCard({ ev }: { ev: FraudEvaluation }) {
  const tone = ev.recommendedAction === "block" ? "destructive" : ev.recommendedAction === "review" ? "warning" : "success";
  return (
    <div className={`rounded-lg border border-${tone}/40 bg-${tone}/5 p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score · v{ev.version}</div>
          <div className={`text-3xl font-bold text-${tone} text-numeric`}>{(ev.score * 100).toFixed(0)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</div>
          <div className={`text-lg font-bold text-${tone} uppercase`}>{ev.recommendedAction}</div>
          <div className="text-xs text-muted-foreground">Payout: {ev.payoutEligible ? "eligible" : "blocked"}</div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {ev.signals.map((s, i) => (
          <li key={i} className="text-xs flex items-start justify-between gap-2 border-t border-border/50 pt-1.5 first:border-0 first:pt-0">
            <span><span className="font-mono text-warning">{s.code}</span> — {s.description}</span>
            <span className="text-numeric text-muted-foreground">+{(s.weight * 100).toFixed(0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
