import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  band: "bg-band",
  in: "bg-money-in/10 [--figure:var(--money-in)]",
  owed: "bg-owed/10 [--figure:var(--owed)]",
  warn: "bg-warn/10 [--figure:var(--warn)]",
} as const;

/**
 * The band: a screen's one headline figure, large and tabular, on a tinted
 * full-width strip — the total a shopkeeper reads in two seconds.
 * At most two per screen; everything else is a ListRow.
 */
export function MoneySummaryCard({
  label,
  figure,
  sub,
  tone = "band",
  size = "lg",
  href,
  className,
}: {
  label: string;
  figure: string;
  sub?: string;
  tone?: keyof typeof TONES;
  size?: "lg" | "md";
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <p className="text-sm text-foreground">{label}</p>
      <p
        className={cn(
          "num font-bold break-words text-[color:var(--figure,var(--ink))]",
          size === "lg" ? "text-[1.9375rem] leading-tight" : "text-[1.5625rem] leading-tight",
        )}
      >
        {figure}
      </p>
      {sub ? <p className="num text-sm text-muted-foreground">{sub}</p> : null}
    </>
  );
  const styles = cn("grid gap-0.5 rounded-md px-4 py-3", TONES[tone], className);
  if (href) {
    return (
      <Link href={href} className={cn(styles, "focus-visible:outline-2 focus-visible:outline-ring")}>
        {inner}
      </Link>
    );
  }
  return <div className={styles}>{inner}</div>;
}
