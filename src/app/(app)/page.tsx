import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ShoppingBasket } from "lucide-react";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { DayNav } from "@/components/coffee/day-nav";
import { Readout } from "@/components/coffee/readout";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { addisToday } from "@/lib/day";
import { formatBirr, formatKg } from "@/lib/money";
import { dailyByGrade, dayPurchases } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";
import { daySchema } from "@/server/validation";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day: dayRaw } = await searchParams;
  const day = daySchema.safeParse(dayRaw).data ?? addisToday();
  const locale = (await getLocale()) as Locale;
  const [t, grades, purchases, { profile }] = await Promise.all([getTranslations("today"), dailyByGrade(day), dayPurchases(day), getSession()]);
  const totalKg = grades.reduce((sum, g) => sum + g.kg, 0);
  const totalAmount = grades.reduce((sum, g) => sum + g.amount, 0);
  const farmers = new Set(purchases.map((p) => p.farmerId)).size;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <Link href="/buy" className={buttonVariants()}>{t("buy")}</Link>
      </div>
      <DayNav path="/" day={day} maxToday />
      <Readout label={t("bought")} value={formatKg(totalKg)} unit="kg">
        {formatBirr(totalAmount, locale)} · {t("farmers", { count: farmers })}
      </Readout>

      {profile.role !== "staff" ? <Link href="/reports" className="text-sm font-semibold text-primary underline underline-offset-4">{t("reports")}</Link> : null}

      {grades.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          message={t("empty")}
          action={<Link href="/buy" className={buttonVariants()}>{t("buy")}</Link>}
        />
      ) : (
        <>
          <section className="grid gap-2">
            <h2 className="font-semibold">{t("byGrade")}</h2>
            <ListSheet>
              {grades.map((g) => (
                <ListRow
                  key={g.gradeId}
                  title={g.name}
                  sub={<span className="num">{t("avgPrice", { price: formatBirr(g.avgPrice, locale) })}</span>}
                  right={
                    <>
                      <span className="num text-xl font-bold whitespace-nowrap">{formatKg(g.kg)} kg</span>
                      <span className="num text-sm text-muted-foreground">{formatBirr(g.amount, locale)}</span>
                    </>
                  }
                />
              ))}
            </ListSheet>
          </section>
          <section className="grid gap-2">
            <h2 className="font-semibold">{t("weighings")}</h2>
            <ListSheet>
              {purchases.map((p) => (
                <ListRow
                  key={p.id}
                  href={`/farmers/${p.farmerId}`}
                  title={p.farmer}
                  sub={<span className="num truncate">{p.grade} · {p.lot}</span>}
                  right={
                    <>
                      <span className="num font-semibold whitespace-nowrap">{formatKg(p.kg)} kg</span>
                      <span className="num text-sm text-muted-foreground">{formatBirr(p.amount, locale)}</span>
                    </>
                  }
                />
              ))}
            </ListSheet>
          </section>
        </>
      )}
    </div>
  );
}
