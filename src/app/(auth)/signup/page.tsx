import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signup } from "@/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-bold text-balance">{t("signupTitle")}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AuthForm
          namespace="auth"
          action={signup}
          submitLabel={t("signup")}
          fields={[
            { name: "email", label: t("email"), type: "email", autoComplete: "email", inputMode: "email" },
            {
              name: "password",
              label: t("password"),
              type: "password",
              autoComplete: "new-password",
              hint: t("passwordHint"),
            },
          ]}
        />
        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
