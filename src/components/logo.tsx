import { cn } from "@/lib/utils";

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-base font-bold",
        inverse ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
        className,
      )}
    >
      G
    </span>
  );
}
