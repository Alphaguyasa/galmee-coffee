import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { DayNav } from "@/components/coffee/day-nav";
import { Readout } from "@/components/coffee/readout";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { addisToday } from "@/lib/day";
import { formatBirr, formatKg } from "@/lib/money";
import { dailyByGrade, dayPurchases } from "@/server/dal/coffee";
import { daySchema } from "@/server/validation";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day: dayRaw } = await searchParams;
  const day = daySchema.safeParse(dayRaw).data ?? addisToday();
  const locale = (await getLocale()) as Locale;
  const [t, grades, purchases] = await Promise.all([getTranslations("today"), dailyByGrade(day), dayPurchases(day)]);
  const totalKg = grades.reduce((sum, g) => sum + g.kg, 0);
  const totalAmount = grades.reduce((sum, g) => sum + g.amount, 0);
  const farmers = new Set(purchases.map((p) => p.farmerId)).size;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/buy" className={buttonVariants()}>{t("buy")}</Link>
      </div>
      <DayNav path="/" day={day} maxToday />
      <Readout label={t("bought")} value={formatKg(totalKg)} unit="kg">
        {formatBirr(totalAmount, locale)} · {t("farmers", { count: farmers })}
      </Readout>

      {grades.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <section className="grid gap-2">
            <h2 className="font-semibold">{t("byGrade")}</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {grades.map((g) => (
                <li key={g.gradeId} className="grid gap-1 rounded-md border bg-card p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">{g.name}</span>
                    <span className="num text-xl font-bold whitespace-nowrap">{formatKg(g.kg)} kg</span>
                  </div>
                  <div className="num flex items-baseline justify-between gap-2 text-sm text-muted-foreground">
                    <span>{t("avgPrice", { price: formatBirr(g.avgPrice, locale) })}</span>
                    <span>{formatBirr(g.amount, locale)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-2">
            <h2 className="font-semibold">{t("weighings")}</h2>
            <ul className="divide-y rounded-md border bg-card">
              {purchases.map((p) => (
                <li key={p.id}>
                  <Link href={`/farmers/${p.farmerId}`} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-accent">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.farmer}</span>
                      <span className="num block truncate text-sm text-muted-foreground">{p.grade} · {p.lot}</span>
                    </span>
                    <span className="num shrink-0 text-right">
                      <span className="block font-semibold">{formatKg(p.kg)} kg</span>
                      <span className="block text-sm text-muted-foreground">{formatBirr(p.amount, locale)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
