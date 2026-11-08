import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { addDays, addisToday } from "@/lib/day";
import { formatEthiopianDate } from "@/lib/ethiopian-date";

/** Previous/next day links for day-scoped screens; never navigates past `maxToday` when set. */
export async function DayNav({ path, day, maxToday = false }: { path: string; day: string; maxToday?: boolean }) {
  const [locale, t] = await Promise.all([getLocale() as Promise<Locale>, getTranslations("common")]);
  const today = addisToday();
  const nextDisabled = maxToday && day >= today;
  return (
    <nav aria-label={t("chooseDay")} className="flex items-center justify-between gap-2">
      <Link href={`${path}?day=${addDays(day, -1)}`} aria-label={t("previousDay")} className="inline-flex size-12 items-center justify-center rounded-md border bg-card">
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <p className="num text-center font-semibold">
        {formatEthiopianDate(day, locale)}
        {day === today ? <span className="ms-2 text-sm font-normal text-muted-foreground">{t("today")}</span> : null}
      </p>
      {nextDisabled ? (
        <span className="size-12" aria-hidden />
      ) : (
        <Link href={`${path}?day=${addDays(day, 1)}`} aria-label={t("nextDay")} className="inline-flex size-12 items-center justify-center rounded-md border bg-card">
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
