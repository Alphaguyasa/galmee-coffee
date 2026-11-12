import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Readout } from "@/components/coffee/readout";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { addisToday } from "@/lib/day";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr, formatKg } from "@/lib/money";
import { periodRange, PERIODS, type Period } from "@/lib/period";
import { cn } from "@/lib/utils";
import { periodReport } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { profile } = await getSession();
  if (profile.role === "staff") redirect("/");
  const { period: raw } = await searchParams;
  const period: Period = PERIODS.find((p) => p === raw) ?? "today";
  const { from, to } = periodRange(period, addisToday());
  const locale = (await getLocale()) as Locale;
  const [t, report] = await Promise.all([getTranslations("reports"), periodReport(from, to)]);
  const totalKg = report.grades.reduce((sum, g) => sum + g.kg, 0);
  const totalAmount = report.grades.reduce((sum, g) => sum + g.amount, 0);

  return (
    <div className="grid gap-4">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
      <nav aria-label={t("title")} className="grid grid-cols-3 gap-2">
        {PERIODS.map((p) => (
          <Link key={p} href={`/reports?period=${p}`} aria-current={p === period ? "page" : undefined}
            className={cn("flex min-h-12 items-center justify-center rounded-md border bg-card px-2 text-center text-sm", p === period && "border-primary bg-accent font-semibold")}>
            {t(p)}
          </Link>
        ))}
      </nav>
      <p className="num text-sm text-muted-foreground">{t("range", { from: formatEthiopianDate(from, locale), to: formatEthiopianDate(to, locale) })}</p>
      <Readout label={t("bought")} value={formatKg(totalKg)} unit="kg">{formatBirr(totalAmount, locale)}</Readout>

      {report.grades.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : (
        <section className="grid gap-2">
          <h2 className="font-semibold">{t("byGrade")}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {report.grades.map((g) => (
              <li key={g.gradeId} className="grid gap-1 rounded-md border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">{g.name}</span>
                  <span className="num text-xl font-bold whitespace-nowrap">{formatKg(g.kg)} kg</span>
                </div>
                <p className="num text-sm">{formatBirr(g.amount, locale)}</p>
                <p className="num text-sm text-muted-foreground">{t("line", { count: g.purchases, farmers: g.farmers, price: formatBirr(g.avgPrice, locale) })}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-1 rounded-md border bg-card p-3">
        <h2 className="font-semibold">{t("moneyOut")}</h2>
        <p className="num flex justify-between gap-2"><span>{t("advanced")}</span><span>{formatBirr(report.advanced, locale)}</span></p>
        <p className="num flex justify-between gap-2"><span>{t("paid")}</span><span>{formatBirr(report.paid, locale)}</span></p>
      </section>

      <a href={`/reports/export?period=${period}`} className={buttonVariants({ variant: "outline" })}>{t("export")}</a>
    </div>
  );
}
