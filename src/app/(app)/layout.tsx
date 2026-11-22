import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/server/dal/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ userId, profile, tenant }, tRoles] = await Promise.all([getSession(), getTranslations("roles")]);
  return (
    <AppShell
      tenantName={tenant.name}
      logoUrl={tenant.logoUrl}
      userName={profile.fullName}
      roleLabel={tRoles(profile.role)}
      canManage={profile.role !== "staff"}
      owner={{ userId, tenantId: tenant.id }}
    >
      {children}
    </AppShell>
  );
}
