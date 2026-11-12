import { cn } from "@/lib/utils";

/**
 * The Galmee mark: the letter ገ reduced to one stroke — the left curl, the
 * bar, the leg. Same geometry in every Galmee app; only the tile colour
 * (--trade via bg-primary) changes.
 */
export function GalmeeMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={cn("size-8 shrink-0", inverse ? "text-primary" : "text-primary-foreground", className)}
    >
      <rect width="48" height="48" rx="12" className={inverse ? "fill-primary-foreground" : "fill-primary"} />
      <path
        d="M12.5 22c0-4 2.5-6.5 6.5-6.5h13a3 3 0 0 1 3 3v16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The wordmark: ገልሜ first, Galmee beside it. Used on auth screens, receipts
 * and anywhere the product (not the tenant) speaks.
 */
export function GalmeeWordmark({ className }: { className?: string }) {
  return (
    <span translate="no" className={cn("inline-flex items-baseline gap-1.5 font-bold", className)}>
      <span lang="am">ገልሜ</span>
      <span lang="en">Galmee</span>
    </span>
  );
}
