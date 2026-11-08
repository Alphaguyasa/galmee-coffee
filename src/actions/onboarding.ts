"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getUserId, hasProfile } from "@/server/dal/session";
import { createCoffeeTenant } from "@/server/dal/tenant";
import { formToObject, onboardingSchema } from "@/server/validation";
import type { FormState } from "./auth";

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  // Server Actions are public endpoints: re-check auth here, not only on the page.
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (await hasProfile(userId)) redirect("/");

  const parsed = onboardingSchema.safeParse(formToObject(formData, ["companyName", "fullName", "phone"]));
  if (!parsed.success) {
    const phoneIssue = parsed.error.issues.some((i) => i.path[0] === "phone");
    return { error: phoneIssue ? "errorPhone" : "errorRequired" };
  }

  const locale = await getLocale();
  const { ok } = await createCoffeeTenant({
    name: parsed.data.companyName,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    lang: isLocale(locale) ? locale : defaultLocale,
  });
  if (!ok) return { error: "error" };
  redirect("/");
}
