"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as dal from "@/server/dal/coffee";
import { getSession, getUserId } from "@/server/dal/session";
import {
  advanceSchema,
  dispatchSchema,
  farmerSchema,
  farmerUpdateSchema,
  formToObject,
  gradeSchema,
  gradeUpdateSchema,
  lotSchema,
  purchaseSchema,
  voidSchema,
} from "@/server/validation";

/** `error` is a key in the `errors` message namespace. */
export type ActionState = { error?: string; done?: boolean } | undefined;

// Server Actions are public endpoints: every one checks the login and validates; the RPCs re-check tenant and role.
async function requireLogin() {
  if (!(await getUserId())) redirect("/login");
}

async function requireManager(): Promise<ActionState> {
  await requireLogin();
  const { profile } = await getSession();
  return profile.role === "staff" ? { error: "not_allowed" } : undefined;
}

export async function addFarmerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = farmerSchema.safeParse(formToObject(formData, ["name", "kebele", "phone"]));
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "phone" ? "phone" : "form" };
  const result = await dal.addFarmer(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath("/farmers");
  redirect(`/farmers/${result.data}`);
}

export async function updateFarmerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireManager();
  if (denied) return denied;
  const parsed = farmerUpdateSchema.safeParse(formToObject(formData, ["farmer", "name", "kebele", "phone", "active"]));
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "phone" ? "phone" : "form" };
  const result = await dal.updateFarmer({ ...parsed.data, active: parsed.data.active === "true" });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/farmers/${parsed.data.farmer}`);
  revalidatePath("/farmers");
  return { done: true };
}

export async function recordPurchaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = purchaseSchema.safeParse(formToObject(formData, ["farmer", "grade", "kg", "price", "moisture", "day", "clientRef"]));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "farmer" ? "farmer_not_found" : field === "grade" ? "grade_not_found" : field === "kg" ? "bad_kg" : field === "price" ? "bad_amount" : "form" };
  }
  const result = await dal.recordPurchase(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath("/");
  revalidatePath("/stock");
  redirect(`/buy?done=${result.data}`);
}

export async function recordAdvanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireLogin();
  const parsed = advanceSchema.safeParse(formToObject(formData, ["farmer", "kind", "amount", "method", "note", "clientRef"]));
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "amount" ? "bad_amount" : "form" };
  const result = await dal.recordAdvance(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/farmers/${parsed.data.farmer}`);
  return { done: true };
}

export async function voidEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireManager();
  if (denied) return denied;
  const parsed = voidSchema.safeParse(formToObject(formData, ["id", "farmer", "entry", "reason"]));
  if (!parsed.success) return { error: "reason_required" };
  const result = parsed.data.entry === "purchase" ? await dal.voidPurchase(parsed.data.id, parsed.data.reason) : await dal.voidAdvance(parsed.data.id, parsed.data.reason);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/farmers/${parsed.data.farmer}`);
  revalidatePath("/");
  revalidatePath("/stock");
  return { done: true };
}

export async function closeLotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireManager();
  if (denied) return denied;
  const parsed = lotSchema.safeParse(formToObject(formData, ["lot"]));
  if (!parsed.success) return { error: "form" };
  const result = await dal.closeLot(parsed.data.lot);
  if (!result.ok) return { error: result.error };
  revalidatePath("/stock");
  return { done: true };
}

export async function dispatchLotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireManager();
  if (denied) return denied;
  const parsed = dispatchSchema.safeParse(formToObject(formData, ["lot", "to"]));
  if (!parsed.success) return { error: "buyer_required" };
  const result = await dal.dispatchLot(parsed.data.lot, parsed.data.to);
  if (!result.ok) return { error: result.error };
  revalidatePath("/stock");
  return { done: true };
}

export async function addGradeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireManager();
  if (denied) return denied;
  const parsed = gradeSchema.safeParse(formToObject(formData, ["code", "name", "price"]));
  if (!parsed.success) return { error: "form" };
  const result = await dal.addGrade(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath("/setup");
  return { done: true };
}

export async function updateGradeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireManager();
  if (denied) return denied;
  const parsed = gradeUpdateSchema.safeParse(formToObject(formData, ["grade", "name", "price", "active"]));
  if (!parsed.success) return { error: "form" };
  const result = await dal.updateGrade({ ...parsed.data, active: parsed.data.active === "true" });
  if (!result.ok) return { error: result.error };
  revalidatePath("/setup");
  return { done: true };
}
