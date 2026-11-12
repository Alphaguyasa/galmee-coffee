import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** An empty screen is an invitation: one plain sentence, one action. */
export function EmptyState({
  icon: Icon,
  message,
  action,
  className,
}: {
  icon?: LucideIcon;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-3 rounded-md border border-dashed px-4 py-10 text-center", className)}>
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-xl bg-band">
          <Icon className="size-6 text-muted-foreground" aria-hidden />
        </span>
      ) : null}
      <p className="max-w-[28ch] text-balance">{message}</p>
      {action}
    </div>
  );
}
