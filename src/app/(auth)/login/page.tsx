import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { login } from "@/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-bold text-balance">{t("loginTitle")}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AuthForm
          namespace="auth"
          action={login}
          submitLabel={t("login")}
          fields={[
            { name: "email", label: t("email"), type: "email", autoComplete: "email", inputMode: "email" },
            { name: "password", label: t("password"), type: "password", autoComplete: "current-password" },
          ]}
        />
        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("signup")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
