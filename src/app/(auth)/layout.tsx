import { getTranslations } from "next-intl/server";
import { GalmeeMark, GalmeeWordmark } from "@/components/galmee/brand";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-end">
        <LanguageSwitcher />
      </div>
      <div className="grid justify-items-center gap-3 pt-6 text-center">
        <GalmeeMark className="size-14" />
        <div className="grid gap-1">
          <p translate="no" className="text-xl font-bold">
            {t("name")}
          </p>
          <p className="text-sm text-muted-foreground text-balance">{t("tagline")}</p>
        </div>
      </div>
      {children}
      <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
        <GalmeeWordmark className="font-semibold" />
      </p>
    </main>
  );
}
