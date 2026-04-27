import type { ChallengeState } from "@/lib/types";
import { stateColor, stateLabel } from "@/lib/format";

export function StateBadge({ state }: { state: ChallengeState }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${stateColor[state]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {stateLabel[state]}
    </span>
  );
}
