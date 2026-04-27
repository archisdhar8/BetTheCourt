import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/contexts";
import type { Wallet, Challenge } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { Loader } from "@/components/Loader";
import { Plus, Minus, WalletIcon, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const { currentUser } = useApp();
  const [wallet, setWallet] = useState<Wallet | null | undefined>(undefined);
  const [amount, setAmount] = useState(50);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const refresh = async () => {
    if (!currentUser) return;
    const w = await api.getWallet(currentUser.id);
    setWallet(w ?? null);
    const cs = await api.listChallenges();
    setChallenges(cs);
  };
  useEffect(() => { refresh(); }, [currentUser?.id]); // eslint-disable-line

  if (!currentUser) return <Loader />;
  if (wallet === undefined) return <Loader label="Loading wallet…" />;

  if (wallet === null) return (
    <>
      <PageHeader title="Wallet" />
      <Card className="surface-card border-border max-w-md">
        <CardContent className="p-8 text-center">
          <WalletIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">No wallet yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create one to fund stakes.</p>
          <Button onClick={async () => { await api.createWallet(currentUser.id); refresh(); toast.success("Wallet created"); }}>Create wallet</Button>
        </CardContent>
      </Card>
    </>
  );

  const myLocks = challenges.filter((c) =>
    (c.creatorId === currentUser.id || c.opponentId === currentUser.id) &&
    ((c.creatorId === currentUser.id && c.funding.creatorLocked) || (c.opponentId === currentUser.id && c.funding.opponentLocked)) &&
    !["paid_out", "refunded", "cancelled"].includes(c.state)
  );

  const credit = async () => { await api.creditWallet(currentUser.id, amount); refresh(); toast.success(`Credited ${fmtMoney(amount, wallet.currency)}`); };
  const debit = async () => { await api.debitWallet(currentUser.id, amount); refresh(); toast.success(`Debited ${fmtMoney(amount, wallet.currency)}`); };

  return (
    <>
      <PageHeader title="Wallet" subtitle={`Currency: ${wallet.currency}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BalanceCard label="Available" value={wallet.available} currency={wallet.currency} accent="primary" />
        <BalanceCard label="Locked in escrow" value={wallet.locked} currency={wallet.currency} accent="warning" />
        <BalanceCard label="Total" value={wallet.available + wallet.locked} currency={wallet.currency} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base">Dev controls</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} className="flex-1" />
              <Button onClick={credit} className="glow-primary"><Plus className="h-4 w-4 mr-1" />Credit</Button>
              <Button variant="outline" onClick={debit}><Minus className="h-4 w-4 mr-1" />Debit</Button>
            </div>
            <p className="text-xs text-muted-foreground">For development only. In production, deposits and withdrawals route through the payments stack.</p>
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-warning" />Locked by challenge</CardTitle></CardHeader>
          <CardContent>
            {myLocks.length === 0 ? <p className="text-sm text-muted-foreground">No active locks.</p> : (
              <ul className="space-y-2">
                {myLocks.map((c) => (
                  <li key={c.id} className="flex justify-between items-center p-2 rounded border border-border bg-card/40">
                    <div>
                      <div className="text-sm font-mono">#{c.id}</div>
                      <div className="text-xs text-muted-foreground capitalize">{c.sport.replace("_", " ")} · {c.state}</div>
                    </div>
                    <div className="text-numeric font-semibold text-warning">{fmtMoney(c.stake, c.currency)}</div>
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

function BalanceCard({ label, value, currency, accent }: { label: string; value: number; currency: any; accent: "primary" | "warning" | "accent" }) {
  const tone = { primary: "text-primary border-primary/30", warning: "text-warning border-warning/30", accent: "text-accent border-accent/30" }[accent];
  return (
    <div className={`surface-card rounded-xl border ${tone} p-5`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold mt-2 text-numeric ${tone.split(" ")[0]}`}>{fmtMoney(value, currency)}</div>
    </div>
  );
}
