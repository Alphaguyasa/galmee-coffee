import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { addFarmerAction } from "@/actions/coffee";
import { ActionForm } from "@/components/coffee/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatBirr, formatKg } from "@/lib/money";
import { searchFarmers } from "@/server/dal/coffee";

export default async function FarmersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qRaw } = await searchParams;
  const q = typeof qRaw === "string" ? qRaw.slice(0, 60) : "";
  const locale = (await getLocale()) as Locale;
  const [t, { rows, more }] = await Promise.all([getTranslations("farmers"), searchFarmers(q)]);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form className="flex gap-2" role="search">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} aria-label={t("search")} placeholder={t("search")} className="pl-9" />
        </div>
        <Button type="submit" variant="outline">{t("searchAction")}</Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{q ? t("noMatch") : t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {rows.map((f) => (
            <li key={f.id}>
              <Link href={`/farmers/${f.id}`} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{f.name}{f.active ? "" : ` (${t("inactive")})`}</span>
                  <span className="num block truncate text-sm text-muted-foreground">{f.no} · {f.kebele}{f.phone ? ` · ${f.phone}` : ""}</span>
                </span>
                <span className="num shrink-0 text-right">
                  <span className={`block font-semibold ${f.due < 0 ? "text-destructive" : ""}`}>{formatBirr(Math.abs(f.due), locale)}</span>
                  <span className="block text-sm text-muted-foreground">{f.due < 0 ? t("owes") : f.due > 0 ? t("due") : `${formatKg(f.kg)} kg`}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {more ? <p className="text-sm text-muted-foreground">{t("more")}</p> : null}

      <details className="rounded-md border bg-card p-3" open={rows.length === 0 && !q}>
        <summary className="cursor-pointer font-semibold">{t("add")}</summary>
        <ActionForm action={addFarmerAction} submitLabel={t("addAction")} className="mt-3 grid gap-3">
          <div className="grid gap-2"><Label htmlFor="name">{t("name")}</Label><Input id="name" name="name" required maxLength={120} /></div>
          <div className="grid gap-2"><Label htmlFor="kebele">{t("kebele")}</Label><Input id="kebele" name="kebele" required maxLength={80} /></div>
          <div className="grid gap-2"><Label htmlFor="phone">{t("phone")}</Label><Input id="phone" name="phone" type="tel" maxLength={20} /></div>
        </ActionForm>
      </details>
    </div>
  );
}
