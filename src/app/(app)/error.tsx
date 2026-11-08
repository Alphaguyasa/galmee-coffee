"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");
  return (
    <div role="alert" className="grid max-w-md gap-3">
      <p>{t("load")}</p>
      <Button onClick={reset}>{tCommon("retry")}</Button>
    </div>
  );
}
