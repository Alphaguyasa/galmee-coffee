"use server";

import { redirect } from "next/navigation";
import { signInWithPassword, signOut, signUpWithPassword } from "@/server/dal/auth";
import { credentialsSchema, formToObject, signupSchema } from "@/server/validation";

/** Message keys are looked up in the form's next-intl namespace. */
export type FormState = { error?: string; info?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(formToObject(formData, ["email", "password"]));
  if (!parsed.success) return { error: "errorInvalid" };

  const { ok } = await signInWithPassword(parsed.data.email, parsed.data.password);
  if (!ok) return { error: "errorInvalid" };
  redirect("/");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(formToObject(formData, ["email", "password"]));
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.some((i) => i.path[0] === "password");
    return { error: passwordIssue ? "errorPassword" : "errorEmail" };
  }

  const result = await signUpWithPassword(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: "errorGeneric" };
  if (result.needsConfirmation) return { info: "checkEmail" };
  redirect("/onboarding");
}

export async function logout() {
  await signOut();
  redirect("/login");
}
