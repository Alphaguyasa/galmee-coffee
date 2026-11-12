import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { PurchaseForm } from "@/components/coffee/purchase-form";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatBirr, formatKg } from "@/lib/money";
import { getReceipt, listActiveFarmers, listGrades } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";
import { idSchema } from "@/server/validation";

export default async function BuyPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done: doneRaw } = await searchParams;
  const done = idSchema.safeParse(doneRaw).data;
  const locale = (await getLocale()) as Locale;
  const [t, farmers, grades, receipt, { profile }] = await Promise.all([
    getTranslations("buy"),
    listActiveFarmers(),
    listGrades(true),
    done ? getReceipt(done) : null,
    getSession(),
  ]);

  return (
    <div className="grid gap-4">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
      {receipt ? (
        <section role="status" className="grid gap-1 rounded-md border border-primary bg-accent p-3">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-primary" aria-hidden />{t("recorded", { name: receipt.farmer })}</p>
          <p className="num text-sm">{formatKg(receipt.kg)} kg · {receipt.grade} · {t("lot", { code: receipt.lot })} · {formatBirr(receipt.amount, locale)}</p>
          <p className="num text-sm font-semibold">{receipt.due < 0 ? t("stillOwes", { amount: formatBirr(-receipt.due, locale) }) : t("nowDue", { amount: formatBirr(receipt.due, locale) })}</p>
          <Link href={`/farmers/${receipt.farmerId}`} className="text-sm font-semibold text-primary underline underline-offset-4">{t("seeStatement")}</Link>
        </section>
      ) : null}
      {grades.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{profile.role === "staff" ? t("needGradesStaff") : t("needGrades")}</p>
          {profile.role !== "staff" ? <Link href="/setup" className={buttonVariants({ variant: "outline" })}>{t("goSetup")}</Link> : null}
        </div>
      ) : farmers.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground">{t("needFarmers")}</p>
          <Link href="/farmers" className={buttonVariants({ variant: "outline" })}>{t("goFarmers")}</Link>
        </div>
      ) : (
        <PurchaseForm key={done ?? "new"} farmers={farmers} grades={grades} />
      )}
    </div>
  );
}
