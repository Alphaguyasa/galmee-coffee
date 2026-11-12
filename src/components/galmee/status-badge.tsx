import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  ok: "text-money-in bg-money-in/10",
  warn: "text-warn bg-warn/10",
  urgent: "text-urgent bg-urgent/10",
  sync: "text-sync bg-sync/10",
  neutral: "text-muted-foreground bg-muted",
} as const;

/**
 * A status is an icon plus a word (plus an optional figure) — never colour
 * alone, because colour disappears in sunlight and to a tenth of men.
 */
export function StatusBadge({
  tone,
  icon: Icon,
  className,
  children,
}: {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[0.8125rem] font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </span>
  );
}
