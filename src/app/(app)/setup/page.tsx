import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { addGradeAction, updateGradeAction } from "@/actions/coffee";
import { ActionForm } from "@/components/coffee/action-form";
import { SelectField } from "@/components/coffee/fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { listGrades } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";

export default async function SetupPage() {
  const { profile } = await getSession();
  if (profile.role === "staff") redirect("/");
  const locale = (await getLocale()) as Locale;
  const [t, grades] = await Promise.all([getTranslations("setup"), listGrades()]);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <section className="grid gap-2">
        <h2 className="font-semibold">{t("grades")}</h2>
        <p className="text-sm text-muted-foreground">{t("gradesHint")}</p>
        {grades.length === 0 ? <p className="text-muted-foreground">{t("noGrades")}</p> : (
          <ul className="grid gap-2 md:grid-cols-2">
            {grades.map((g) => (
              <li key={g.id} className="rounded-md border bg-card p-3">
                <details>
                  <summary className="cursor-pointer">
                    <span className="num font-bold">{g.code}</span> <span className="font-semibold">{g.name}</span>
                    <span className="num block text-sm text-muted-foreground">{t("pricePerKg", { price: formatBirr(g.defaultPrice, locale) })}{g.active ? "" : ` · ${t("inactive")}`}</span>
                  </summary>
                  <ActionForm action={updateGradeAction} submitLabel={t("save")} doneLabel={t("saved")} className="mt-3 grid gap-3">
                    <input type="hidden" name="grade" value={g.id} />
                    <div className="grid gap-2"><Label htmlFor={`name-${g.id}`}>{t("name")}</Label><Input id={`name-${g.id}`} name="name" defaultValue={g.name} required maxLength={60} /></div>
                    <div className="grid gap-2"><Label htmlFor={`price-${g.id}`}>{t("price")}</Label><Input id={`price-${g.id}`} name="price" inputMode="decimal" defaultValue={g.defaultPrice} className="num" required /></div>
                    <SelectField name="active" label={t("status")} defaultValue={String(g.active)} options={[{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} />
                  </ActionForm>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3 rounded-md border bg-card p-3">
        <h2 className="font-semibold">{t("addGrade")}</h2>
        <ActionForm action={addGradeAction} submitLabel={t("addAction")} doneLabel={t("saved")} className="grid gap-3">
          <div className="grid gap-2"><Label htmlFor="code">{t("code")}</Label><Input id="code" name="code" required maxLength={6} placeholder="G1" /></div>
          <div className="grid gap-2"><Label htmlFor="name">{t("name")}</Label><Input id="name" name="name" required maxLength={60} /></div>
          <div className="grid gap-2"><Label htmlFor="price">{t("price")}</Label><Input id="price" name="price" inputMode="decimal" className="num" required /></div>
        </ActionForm>
      </section>
    </div>
  );
}
