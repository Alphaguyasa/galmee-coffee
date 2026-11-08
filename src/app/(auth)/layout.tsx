import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold" translate="no">
          <Logo />
          {t("name")}
        </div>
        <LanguageSwitcher />
      </div>
      <p className="text-sm text-muted-foreground">{t("tagline")}</p>
      {children}
    </main>
  );
}
