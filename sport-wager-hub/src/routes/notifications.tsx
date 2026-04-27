import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/contexts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { fmtRel, notifTypeLabel } from "@/lib/format";
import { CheckCheck, BellOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/notifications")({ component: Notifications });

function Notifications() {
  const { notifications, markRead, markAllRead, unreadCount } = useApp();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const list = unreadOnly ? notifications.filter((n) => !n.read) : notifications;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2"><Switch id="unread" checked={unreadOnly} onCheckedChange={setUnreadOnly} /><Label htmlFor="unread" className="text-xs">Unread only</Label></div>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}><CheckCheck className="h-4 w-4 mr-2" />Mark all read</Button>
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState title="Nothing here" icon={<BellOff className="h-6 w-6" />} description="You're all caught up." />
      ) : (
        <Card className="surface-card border-border">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {list.map((n) => (
                <li key={n.id} className={`p-4 flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}>
                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.read ? "bg-muted" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground">{notifTypeLabel[n.type]}</span>
                      <span className="font-medium text-sm">{n.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-3">
                      <span>{fmtRel(n.createdAt)}</span>
                      {n.metadata.challengeId && (
                        <Link to="/challenges/$id" params={{ id: n.metadata.challengeId as string }} className="text-primary hover:underline">
                          Open challenge →
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
