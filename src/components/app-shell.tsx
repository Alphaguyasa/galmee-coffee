import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { AppNav } from "@/components/app-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

type ShellProps = {
  tenantName: string;
  logoUrl: string | null;
  userName: string;
  roleLabel: string;
  canManage: boolean;
  children: React.ReactNode;
};

function TenantBadge({
  tenantName,
  logoUrl,
  inverse = false,
}: Pick<ShellProps, "tenantName" | "logoUrl"> & { inverse?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tenant logos come from Supabase Storage
        <img src={logoUrl} alt="" className="size-8 rounded-lg object-cover" />
      ) : (
        <Logo inverse={inverse} />
      )}
      <span className="truncate font-bold">{tenantName}</span>
    </div>
  );
}

export async function AppShell({ tenantName, logoUrl, userName, roleLabel, canManage, children }: ShellProps) {
  const [t, tCommon] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr] print:block">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-foreground"
      >
        {tCommon("skipToContent")}
      </a>
      <aside className="hidden print:!hidden border-r bg-card md:flex md:flex-col md:gap-6 md:p-4">
        <TenantBadge tenantName={tenantName} logoUrl={logoUrl} />
        <AppNav variant="side" canManage={canManage} />
        <div className="mt-auto grid gap-3">
          <div className="text-sm">
            <div className="truncate font-medium">{userName}</div>
            <div className="text-muted-foreground">{roleLabel}</div>
          </div>
          <LanguageSwitcher />
          <form action={logout}>
            <Button variant="outline" size="sm" className="w-full">
              <LogOut aria-hidden />
              {t("logout")}
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="print:hidden sticky top-0 z-30 flex h-16 items-center justify-between gap-2 bg-primary px-4 text-primary-foreground md:hidden">
          <TenantBadge tenantName={tenantName} logoUrl={logoUrl} inverse />
          <div className="flex items-center gap-1">
            <LanguageSwitcher inverse />
            <form action={logout}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("logout")}
                className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              >
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:p-8 print:m-0 print:p-0">{children}</main>
      </div>

      <AppNav variant="bottom" canManage={canManage} />
    </div>
  );
}
