import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { StatusBadge } from "./status-badge";

const STATES = {
  queued: { icon: Clock, tone: "sync" },
  syncing: { icon: RefreshCw, tone: "sync" },
  synced: { icon: CheckCircle2, tone: "ok" },
  failed: { icon: AlertTriangle, tone: "urgent" },
} as const;

/**
 * The per-item chip for the offline queue: "will sync", "syncing", "synced",
 * "failed". Labels come in as props (they are app translations).
 */
export function SyncStatus({
  state,
  label,
  className,
}: {
  state: keyof typeof STATES;
  label: string;
  className?: string;
}) {
  const { icon, tone } = STATES[state];
  return (
    <StatusBadge tone={tone} icon={icon} className={className}>
      {label}
    </StatusBadge>
  );
}
