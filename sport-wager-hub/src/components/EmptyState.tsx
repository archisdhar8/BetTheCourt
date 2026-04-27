import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6 rounded-xl border border-dashed border-border bg-card/20">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
