import { cn } from "@/lib/utils";

export type DataColumn<Row> = {
  key: string;
  header: string;
  /** Right-align and tabular figures — for money and quantities. */
  num?: boolean;
  cell: (row: Row) => React.ReactNode;
};

/**
 * Reports and any 3+-column data: a real table from 768 px up, collapsing to
 * ruled label/value rows on phones. Headers and cells arrive via columns.
 */
export function DataList<Row>({
  columns,
  rows,
  rowKey,
  caption,
  className,
}: {
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-card", className)}>
      {/* Phone: each row is a small ruled sheet. */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="grid gap-1 p-3">
            {columns.map((col) => (
              <div key={col.key} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{col.header}</span>
                <span className={cn("text-right break-words", col.num && "num")}>{col.cell(row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
      {/* Desktop: the table. */}
      <table className="hidden w-full md:table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn("px-4 py-3 text-left text-sm font-semibold", col.num && "text-right")}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3", col.num && "num text-right")}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
