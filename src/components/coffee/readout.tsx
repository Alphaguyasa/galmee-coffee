/** The dark scale display: the one loud thing on a screen, used for the figure that matters. */
export function Readout({ label, value, unit, children }: { label: string; value: string; unit?: string; children?: React.ReactNode }) {
  return (
    <section className="grid gap-1 rounded-md bg-readout p-4 text-readout-foreground">
      <p className="text-sm">{label}</p>
      <p className="num flex flex-wrap items-baseline gap-2 text-4xl font-bold">
        <span>{value}</span>
        {unit ? <span className="text-lg font-semibold">{unit}</span> : null}
      </p>
      {children ? <div className="num text-sm">{children}</div> : null}
    </section>
  );
}
