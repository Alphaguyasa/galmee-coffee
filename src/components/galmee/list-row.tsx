import Link from "next/link";
import { cn } from "@/lib/utils";

/** The ruled sheet: full-width rows divided by hairlines, like a counter book. */
export function ListSheet({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("divide-y rounded-md border bg-card", className)} {...props} />;
}

/**
 * One line of the ledger: an optional margin mark on the left, the name and a
 * sub-line in the middle, the figure or status hanging on the right.
 * Use for every homogeneous list; never a grid of cards.
 */
export function ListRow({
  title,
  titleLang,
  sub,
  mark,
  right,
  href,
  className,
}: {
  title: React.ReactNode;
  titleLang?: string;
  sub?: React.ReactNode;
  /** Sits in the left margin, the way a clerk marks a book. */
  mark?: React.ReactNode;
  /** Right-aligned figure or StatusBadge. */
  right?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      {mark ? <div className="flex shrink-0 items-start pt-0.5">{mark}</div> : null}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p lang={titleLang} className="font-semibold break-words">
          {title}
        </p>
        {sub ? <div className="grid gap-0.5 text-sm text-muted-foreground">{sub}</div> : null}
      </div>
      {right ? <div className="flex shrink-0 flex-col items-end gap-1 text-right">{right}</div> : null}
    </>
  );
  const styles = cn("flex min-h-14 items-start gap-3 p-3", className);
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(styles, "focus-visible:bg-band focus-visible:outline-none active:bg-band")}>
          {inner}
        </Link>
      ) : (
        <div className={styles}>{inner}</div>
      )}
    </li>
  );
}
