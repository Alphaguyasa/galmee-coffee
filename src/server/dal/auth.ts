import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { ok: !error };
}

/** `needsConfirmation` is true when the project requires email confirmation (no session yet). */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; needsConfirmation: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { ok: !error, needsConfirmation: !error && !data.session };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
