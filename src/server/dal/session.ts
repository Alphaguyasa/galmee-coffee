import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";

export type SessionDTO = {
  userId: string;
  profile: { fullName: string; role: Enums<"user_role"> };
  tenant: { id: string; name: string; logoUrl: string | null };
};

/** Verified user id (getClaims checks the JWT signature), or null. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

/** Profile row exists for this user (i.e. they belong to a tenant). */
export const hasProfile = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
});

/** User, profile and tenant for logged-in screens. Redirects when any is missing. */
export const getSession = cache(async (): Promise<SessionDTO> => {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name, role, active, tenants(id, name, logo_url)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile || !profile.tenants) redirect("/onboarding");
  if (!profile.active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    userId,
    profile: { fullName: profile.full_name, role: profile.role },
    tenant: { id: profile.tenants.id, name: profile.tenants.name, logoUrl: profile.tenants.logo_url },
  };
});
