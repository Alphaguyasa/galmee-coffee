import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";

export default async function OfflinePage() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="size-14 text-2xl" />
      <h1 className="text-xl font-semibold">{t("offline")}</h1>
      <p className="text-muted-foreground">{t("offlineBody")}</p>
      {/* Full reload on purpose: client-side navigation cannot recover from offline. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="font-medium text-primary underline-offset-4 hover:underline">
        {t("retry")}
      </a>
    </main>
  );
}
