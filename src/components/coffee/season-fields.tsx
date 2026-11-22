import { useTranslations } from "next-intl";
import { DateField } from "@/components/coffee/fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SeasonDTO } from "@/server/dal/coffee";

/** The fields of a season form; `prefix` keeps ids unique when several forms share a page. */
export function SeasonFields({ prefix, season }: { prefix: string; season?: SeasonDTO }) {
  const t = useTranslations("setup");
  const id = (field: string) => `${prefix}-${field}`;
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={id("name")}>{t("seasonName")}</Label>
        <Input id={id("name")} name="name" defaultValue={season?.name} required maxLength={40} placeholder={t("seasonNameExample")} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DateField id={id("startsOn")} name="startsOn" label={t("seasonStarts")} defaultValue={season?.startsOn ?? ""} />
        <DateField id={id("endsOn")} name="endsOn" label={t("seasonEnds")} defaultValue={season?.endsOn ?? ""} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={id("bonus")}>{t("bonusPerKg")}</Label>
          <Input id={id("bonus")} name="bonus" inputMode="decimal" defaultValue={season?.bonus ?? 0} className="num" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("ceiling")}>{t("ceilingPerKg")}</Label>
          <Input id={id("ceiling")} name="ceiling" inputMode="decimal" defaultValue={season?.ceiling ?? 0} className="num" required />
        </div>
      </div>
      <DateField id={id("opensOn")} name="opensOn" label={t("opensOn")} defaultValue={season?.opensOn ?? ""} />
    </>
  );
}
