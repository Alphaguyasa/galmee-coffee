import { GalmeeWordmark } from "./brand";
import { cn } from "@/lib/utils";

export type ReceiptLine = { name: string; qty: string; amount: string };

/**
 * A 58 mm receipt, on screen and in print: tenant header, dashed rules, item
 * lines, tabular totals, the Ethiopian date. All strings arrive as props.
 * Printing uses the global `.receipt-58` print rules.
 */
export function ReceiptPreview({
  tenantName,
  title,
  dateLabel,
  lines,
  totals,
  footer,
  className,
}: {
  tenantName: string;
  title: string;
  /** Already-formatted Ethiopian date. */
  dateLabel: string;
  lines: ReceiptLine[];
  /** e.g. total, paid, change — the last entry is set bold. */
  totals: { label: string; amount: string }[];
  footer?: string;
  className?: string;
}) {
  return (
    <div className={cn("receipt-58 mx-auto w-[58mm] max-w-full border bg-white p-3 text-[0.8125rem] text-black", className)}>
      <div className="grid justify-items-center gap-0.5 text-center">
        <p className="text-base font-bold break-words">{tenantName}</p>
        <p>{title}</p>
        <p className="num">{dateLabel}</p>
      </div>
      <hr className="my-2 border-t border-dashed border-black" />
      <table className="w-full">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="align-top">
              <td className="pr-1 break-words">{line.name}</td>
              <td className="num pr-1 text-right whitespace-nowrap">{line.qty}</td>
              <td className="num text-right whitespace-nowrap">{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2 border-t border-dashed border-black" />
      <table className="w-full">
        <tbody>
          {totals.map((row, i) => (
            <tr key={i} className={i === totals.length - 1 ? "font-bold" : undefined}>
              <td>{row.label}</td>
              <td className="num text-right">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2 border-t border-dashed border-black" />
      <div className="grid justify-items-center gap-0.5 text-center">
        {footer ? <p className="break-words">{footer}</p> : null}
        <GalmeeWordmark className="text-[0.8125rem]" />
      </div>
    </div>
  );
}
