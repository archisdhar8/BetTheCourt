import type { ChallengeState, Currency, NotificationType } from "./types";

export const fmtMoney = (n: number, c: Currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n);

export const fmtRel = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "ago" : "from now";
  if (abs < 60) return `${Math.round(abs)}s ${sign}`;
  if (abs < 3600) return `${Math.round(abs / 60)}m ${sign}`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h ${sign}`;
  return `${Math.round(abs / 86400)}d ${sign}`;
};

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const stateColor: Record<ChallengeState, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/20 text-warning border-warning/40",
  accepted: "bg-info/20 text-info border-info/40",
  funded: "bg-accent/20 text-accent border-accent/40",
  scheduled: "bg-primary/20 text-primary border-primary/40",
  completed: "bg-info/20 text-info border-info/40",
  confirmed: "bg-success/20 text-success border-success/40",
  disputed: "bg-destructive/20 text-destructive border-destructive/40",
  refunded: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
  paid_out: "bg-success/20 text-success border-success/40",
};

export const stateLabel: Record<ChallengeState, string> = {
  draft: "Draft",
  pending: "Pending",
  accepted: "Accepted",
  funded: "Funded",
  scheduled: "Scheduled",
  completed: "Completed",
  confirmed: "Confirmed",
  disputed: "Disputed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  paid_out: "Paid out",
};

export const notifTypeLabel: Record<NotificationType, string> = {
  challenge_received: "Challenge",
  challenge_accepted: "Accepted",
  challenge_declined: "Declined",
  funds_locked: "Funds locked",
  venue_selected: "Venue",
  schedule_proposed: "Schedule",
  schedule_confirmed: "Scheduled",
  checkin_reminder: "Check-in",
  checkin_valid: "Check-in",
  result_submitted: "Result",
  result_confirmed: "Confirmed",
  dispute_opened: "Disputed",
  result_disputed: "Disputed",
  payout_released: "Payout",
  payout_completed: "Payout",
  fraud_flagged: "Fraud",
  fraud_hold: "Fraud",
  ranking_updated: "Ranking",
};
