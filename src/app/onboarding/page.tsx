import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { logout } from "@/actions/auth";
import { createCompany } from "@/actions/onboarding";
import { AuthForm } from "@/components/auth-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserId, hasProfile } from "@/server/dal/session";

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (await hasProfile(userId)) redirect("/");

  const [t, tAuth] = await Promise.all([getTranslations("onboarding"), getTranslations("auth")]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 px-4 py-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-bold text-balance">{t("title")}</h1>
          </CardTitle>
          <CardDescription>{t("intro")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            namespace="onboarding"
            action={createCompany}
            submitLabel={t("submit")}
            fields={[
              { name: "companyName", label: t("companyName"), autoComplete: "organization" },
              { name: "fullName", label: t("fullName"), autoComplete: "name" },
              { name: "phone", label: t("phone"), type: "tel", autoComplete: "tel", inputMode: "tel" },
            ]}
          />
        </CardContent>
      </Card>
      <form action={logout}>
        <Button variant="ghost" className="w-full">
          {tAuth("logout")}
        </Button>
      </form>
    </main>
  );
}
