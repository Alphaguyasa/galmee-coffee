import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Money entry: numeric keyboard, tabular figures, the currency written as a
 * trailing unit so the field never needs a symbol glyph. Use for every birr
 * amount — never a bare number field.
 */
export function BirrInput({
  unitLabel,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { unitLabel: string }) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        className={cn("num pr-14 text-right", className)}
        {...props}
      />
      <span aria-hidden className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
        {unitLabel}
      </span>
    </div>
  );
}
