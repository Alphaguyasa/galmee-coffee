"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { am: "አማ", om: "Oro", en: "EN" };
const FULL: Record<Locale, string> = { am: "አማርኛ", om: "Afaan Oromoo", en: "English" };

export function LanguageSwitcher({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const current = useLocale();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("language")} className={cn("inline-flex rounded-md border p-0.5", inverse && "border-white/40", className)}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          title={FULL[locale]}
          aria-pressed={current === locale}
          disabled={pending}
          onClick={() => startTransition(() => setLocale(locale))}
          className={cn(
            "h-11 min-w-12 rounded px-2 text-sm",
            inverse
              ? current === locale
                ? "bg-primary-foreground text-primary font-bold"
                : "text-primary-foreground/85 hover:bg-white/15"
              : current === locale
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:bg-accent",
          )}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
