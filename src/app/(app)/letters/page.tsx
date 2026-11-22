import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, Mail } from "lucide-react";
import { PrintButton } from "@/components/coffee/print-button";
import { EmptyState } from "@/components/galmee/empty-state";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr, formatKg } from "@/lib/money";
import { getSeasonLetters, listSeasons } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";
import { idSchema } from "@/server/validation";

type Search = Promise<{ season?: string; farmer?: string }>;

/** Season opening letters: one printed page per farmer, from last season's deliveries. */
export default async function LettersPage({ searchParams }: { searchParams: Search }) {
  const { profile, tenant } = await getSession();
  if (profile.role === "staff") redirect("/");
  const query = await searchParams;
  const locale = (await getLocale()) as Locale;
  const [t, seasons] = await Promise.all([getTranslations("letters"), listSeasons()]);

  if (seasons.length === 0) {
    return (
      <div className="grid gap-4">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <EmptyState icon={Mail} message={t("noSeason")} action={<Link href="/setup" className="font-semibold underline underline-offset-4">{t("goToSetup")}</Link>} />
      </div>
    );
  }

  const seasonId = idSchema.safeParse(query.season).data;
  const season = seasons.find((s) => s.id === seasonId) ?? seasons[0];
  const farmerId = idSchema.safeParse(query.farmer).data;
  const letters = await getSeasonLetters(season.id, farmerId);
  const opens = formatEthiopianDate(season.opensOn, locale);
  const range = t("range", { from: formatEthiopianDate(season.startsOn, locale), to: formatEthiopianDate(season.endsOn, locale) });
  const today = formatEthiopianDate(new Date(), locale);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 print:hidden">
        <Link href={farmerId ? `/farmers/${farmerId}` : "/setup"} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" aria-hidden />{t("back")}
        </Link>
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        {seasons.length > 1 ? (
          <nav aria-label={t("seasonPicker")} className="flex flex-wrap gap-2">
            {seasons.map((s) => (
              <Link
                key={s.id}
                href={`/letters?season=${s.id}${farmerId ? `&farmer=${farmerId}` : ""}`}
                aria-current={s.id === season.id ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-md border px-3 font-semibold aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
              >
                {s.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <p className="num text-sm">{t("count", { count: letters.length })}</p>
        {letters.length > 0 ? <PrintButton label={t("print")} /> : null}
      </div>

      {letters.length === 0 ? (
        <EmptyState icon={Mail} message={t("noFarmers")} />
      ) : (
        <div className="grid gap-4 print:block">
          {letters.map((l) => (
            <article key={l.farmerId} className="season-letter grid gap-3 rounded-md border bg-card p-4 print:rounded-none print:border-0 print:p-0">
              <header className="flex items-baseline justify-between gap-2 border-b pb-2">
                <p className="font-bold">{tenant.name}</p>
                <p className="num text-sm text-muted-foreground">{today}</p>
              </header>
              <h2 className="text-lg font-bold">{t("dear", { name: l.name })}</h2>
              <p className="num text-sm text-muted-foreground">{t("farmerLine", { no: l.farmerNo, kebele: l.kebele })}</p>
              {l.kg > 0 ? (
                <p>{t("delivered", { season: season.name, range, kg: formatKg(l.kg), amount: formatBirr(l.bought, locale) })}</p>
              ) : (
                <p>{t("notDelivered", { season: season.name })}</p>
              )}
              <dl className="num grid gap-1 rounded-md border p-3">
                <div className="flex justify-between gap-2"><dt>{t("kg")}</dt><dd className="shrink-0 text-right font-semibold whitespace-nowrap">{formatKg(l.kg)} kg</dd></div>
                {season.bonus > 0 ? (
                  <div className="flex justify-between gap-2"><dt>{t("bonus", { rate: formatBirr(season.bonus, locale) })}</dt><dd className="shrink-0 text-right font-semibold whitespace-nowrap">{formatBirr(l.bonus, locale)}</dd></div>
                ) : null}
                {season.ceiling > 0 ? (
                  <>
                    <div className="flex justify-between gap-2"><dt>{t("ceiling", { rate: formatBirr(season.ceiling, locale) })}</dt><dd className="shrink-0 text-right font-semibold whitespace-nowrap">{formatBirr(l.ceiling, locale)}</dd></div>
                    {l.owes > 0 ? (
                      <div className="flex justify-between gap-2"><dt>{t("owes")}</dt><dd className="shrink-0 text-right font-semibold whitespace-nowrap">−{formatBirr(l.owes, locale)}</dd></div>
                    ) : null}
                    <div className="flex justify-between gap-2 border-t pt-1"><dt className="font-semibold">{t("available")}</dt><dd className="shrink-0 text-right font-bold whitespace-nowrap">{formatBirr(l.available, locale)}</dd></div>
                  </>
                ) : null}
              </dl>
              <p className="font-semibold">{t("opens", { date: opens })}</p>
              <p>{t("thanks")}</p>
              <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
                <p className="border-t pt-1">{t("signBuyer")}</p>
                <p className="border-t pt-1">{t("signFarmer")}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
