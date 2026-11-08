import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { coffeeErrorKey } from "@/lib/coffee-errors";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

// The generated database types cover the core tables; cf_* rows are typed by the DTOs below.
async function db(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

function failure(message: string | undefined): Result<never> {
  return { ok: false, error: coffeeErrorKey(message) };
}

const toNumber = (v: unknown) => Number(v ?? 0);

export type GradeDTO = { id: string; code: string; name: string; defaultPrice: number; active: boolean };
export type FarmerDTO = { id: string; no: number; name: string; kebele: string; phone: string | null; active: boolean };
export type FarmerRowDTO = FarmerDTO & { due: number; kg: number };
export type BalanceDTO = { kg: number; bought: number; advanced: number; paid: number; due: number };
export type StatementLineDTO = {
  id: string;
  day: string;
  entry: "purchase" | "advance" | "payment";
  label: string | null;
  kg: number | null;
  price: number | null;
  moisture: string | null;
  method: string | null;
  credit: number;
  debit: number;
  balance: number;
  voided: boolean;
  voidReason: string | null;
};
export type DailyGradeDTO = { gradeId: string; code: string; name: string; purchases: number; farmers: number; kg: number; amount: number; avgPrice: number };
export type DayPurchaseDTO = { id: string; farmerId: string; farmer: string; grade: string; kg: number; price: number; amount: number; lot: string };
export type ReceiptDTO = DayPurchaseDTO & { day: string; moisture: string | null; due: number };
export type StockDTO = { gradeId: string; code: string; name: string; kgOnHand: number; costOnHand: number; kgDispatched: number };
export type LotDTO = { id: string; code: string; grade: string; status: "open" | "closed" | "dispatched"; openedOn: string; dispatchedTo: string | null; kg: number; amount: number; purchases: number };

type FarmerRow = { id: string; farmer_no: number; name: string; kebele: string; phone: string | null; active: boolean };
const FARMER_COLUMNS = "id, farmer_no, name, kebele, phone, active";
const toFarmer = (r: FarmerRow): FarmerDTO => ({ id: r.id, no: r.farmer_no, name: r.name, kebele: r.kebele, phone: r.phone, active: r.active });

export async function listGrades(activeOnly = false): Promise<GradeDTO[]> {
  const supabase = await db();
  let query = supabase.from("cf_grades").select("id, code, name, default_price, active").order("code");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error("load grades");
  return (data as { id: string; code: string; name: string; default_price: number; active: boolean }[]).map((g) => ({
    id: g.id, code: g.code, name: g.name, defaultPrice: toNumber(g.default_price), active: g.active,
  }));
}

/** Characters with meaning in a PostgREST `or` filter or an ILIKE pattern are dropped from the search text. */
function searchTerm(raw: string): string {
  return raw.replace(/[,()*%_\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

const LIST_LIMIT = 50;

export async function searchFarmers(q: string): Promise<{ rows: FarmerRowDTO[]; more: boolean }> {
  const supabase = await db();
  let query = supabase.from("cf_farmers").select(FARMER_COLUMNS).order("name").limit(LIST_LIMIT + 1);
  const term = searchTerm(q);
  if (term) {
    const number = /^\d{1,7}$/.test(term) ? `,farmer_no.eq.${term}` : "";
    query = query.or(`name.ilike.*${term}*,phone.ilike.*${term}*,kebele.ilike.*${term}*${number}`);
  }
  const { data, error } = await query;
  if (error) throw new Error("load farmers");
  const rows = (data as FarmerRow[]).slice(0, LIST_LIMIT);
  const balances = new Map<string, { due: number; kg: number }>();
  if (rows.length) {
    const { data: bal, error: balError } = await supabase.from("cf_farmer_balances").select("farmer_id, due, kg").in("farmer_id", rows.map((r) => r.id));
    if (balError) throw new Error("load balances");
    for (const b of bal as { farmer_id: string; due: number; kg: number }[]) balances.set(b.farmer_id, { due: toNumber(b.due), kg: toNumber(b.kg) });
  }
  return {
    rows: rows.map((r) => ({ ...toFarmer(r), due: balances.get(r.id)?.due ?? 0, kg: balances.get(r.id)?.kg ?? 0 })),
    more: (data as FarmerRow[]).length > LIST_LIMIT,
  };
}

/** Compact list of active farmers for the buying form, which filters on the phone. */
export async function listActiveFarmers(): Promise<Pick<FarmerDTO, "id" | "no" | "name" | "kebele" | "phone">[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("cf_farmers").select(FARMER_COLUMNS).eq("active", true).order("name").limit(5000);
  if (error) throw new Error("load farmers");
  return (data as FarmerRow[]).map(({ id, farmer_no, name, kebele, phone }) => ({ id, no: farmer_no, name, kebele, phone }));
}

export async function getFarmer(id: string): Promise<{ farmer: FarmerDTO; balance: BalanceDTO; lines: StatementLineDTO[] } | null> {
  const supabase = await db();
  const [farmerRes, balanceRes, linesRes] = await Promise.all([
    supabase.from("cf_farmers").select(FARMER_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("cf_farmer_balances").select("kg, bought, advanced, paid, due").eq("farmer_id", id).maybeSingle(),
    supabase.rpc("cf_farmer_statement", { p_farmer: id }),
  ]);
  if (farmerRes.error || balanceRes.error || linesRes.error) throw new Error("load farmer");
  if (!farmerRes.data) return null;
  const b = (balanceRes.data ?? {}) as Record<string, unknown>;
  type LineRow = Omit<StatementLineDTO, "voidReason"> & { void_reason: string | null };
  return {
    farmer: toFarmer(farmerRes.data as FarmerRow),
    balance: { kg: toNumber(b.kg), bought: toNumber(b.bought), advanced: toNumber(b.advanced), paid: toNumber(b.paid), due: toNumber(b.due) },
    lines: (linesRes.data as LineRow[]).map((l) => ({
      id: l.id, day: l.day, entry: l.entry, label: l.label, moisture: l.moisture, method: l.method,
      kg: l.kg === null ? null : toNumber(l.kg), price: l.price === null ? null : toNumber(l.price),
      credit: toNumber(l.credit), debit: toNumber(l.debit), balance: toNumber(l.balance), voided: l.voided, voidReason: l.void_reason,
    })),
  };
}

export async function dailyByGrade(day: string): Promise<DailyGradeDTO[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("cf_daily_by_grade", { p_day: day });
  if (error) throw new Error("load daily");
  return (data as { grade_id: string; code: string; name: string; purchases: number; farmers: number; kg: number; amount: number; avg_price: number }[]).map((r) => ({
    gradeId: r.grade_id, code: r.code, name: r.name, purchases: toNumber(r.purchases), farmers: toNumber(r.farmers), kg: toNumber(r.kg), amount: toNumber(r.amount), avgPrice: toNumber(r.avg_price),
  }));
}

type PurchaseRow = {
  id: string; farmer_id: string; kg: number; price_per_kg: number; amount: number; purchased_on: string; moisture_note: string | null;
  cf_farmers: { name: string }; cf_grades: { name: string }; cf_lots: { code: string };
};
const PURCHASE_COLUMNS = "id, farmer_id, kg, price_per_kg, amount, purchased_on, moisture_note, cf_farmers(name), cf_grades(name), cf_lots(code)";
const toPurchase = (r: PurchaseRow): DayPurchaseDTO => ({
  id: r.id, farmerId: r.farmer_id, farmer: r.cf_farmers.name, grade: r.cf_grades.name, lot: r.cf_lots.code,
  kg: toNumber(r.kg), price: toNumber(r.price_per_kg), amount: toNumber(r.amount),
});

export async function dayPurchases(day: string): Promise<DayPurchaseDTO[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("cf_purchases").select(PURCHASE_COLUMNS).eq("purchased_on", day).is("voided_at", null).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("load purchases");
  return (data as unknown as PurchaseRow[]).map(toPurchase);
}

export async function getReceipt(id: string): Promise<ReceiptDTO | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("cf_purchases").select(PURCHASE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("load receipt");
  if (!data) return null;
  const row = data as unknown as PurchaseRow;
  const { data: bal } = await supabase.from("cf_farmer_balances").select("due").eq("farmer_id", row.farmer_id).maybeSingle();
  return { ...toPurchase(row), day: row.purchased_on, moisture: row.moisture_note, due: toNumber((bal as { due: number } | null)?.due) };
}

export async function stockByGrade(): Promise<StockDTO[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("cf_stock_by_grade").select("grade_id, code, name, kg_on_hand, cost_on_hand, kg_dispatched, active").order("code");
  if (error) throw new Error("load stock");
  return (data as { grade_id: string; code: string; name: string; kg_on_hand: number; cost_on_hand: number; kg_dispatched: number; active: boolean }[])
    .filter((r) => r.active || toNumber(r.kg_on_hand) > 0)
    .map((r) => ({ gradeId: r.grade_id, code: r.code, name: r.name, kgOnHand: toNumber(r.kg_on_hand), costOnHand: toNumber(r.cost_on_hand), kgDispatched: toNumber(r.kg_dispatched) }));
}

export async function listLots(): Promise<LotDTO[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("cf_lot_totals").select("lot_id, code, grade_name, status, opened_on, dispatched_to, kg, amount, purchases").order("opened_on", { ascending: false }).limit(100);
  if (error) throw new Error("load lots");
  return (data as { lot_id: string; code: string; grade_name: string; status: LotDTO["status"]; opened_on: string; dispatched_to: string | null; kg: number; amount: number; purchases: number }[]).map((l) => ({
    id: l.lot_id, code: l.code, grade: l.grade_name, status: l.status, openedOn: l.opened_on, dispatchedTo: l.dispatched_to, kg: toNumber(l.kg), amount: toNumber(l.amount), purchases: toNumber(l.purchases),
  }));
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<Result<T>> {
  const supabase = await db();
  const { data, error } = await supabase.rpc(name, args);
  return error ? failure(error.message) : { ok: true, data: data as T };
}

export const addFarmer = (i: { name: string; kebele: string; phone: string }) =>
  rpc<string>("cf_add_farmer", { p_name: i.name, p_kebele: i.kebele, p_phone: i.phone || null });

export const updateFarmer = (i: { farmer: string; name: string; kebele: string; phone: string; active: boolean }) =>
  rpc<void>("cf_update_farmer", { p_farmer: i.farmer, p_name: i.name, p_kebele: i.kebele, p_phone: i.phone || null, p_active: i.active });

export const recordPurchase = (i: { farmer: string; grade: string; kg: number; price: number; moisture: string; day: string; clientRef: string }) =>
  rpc<string>("cf_record_purchase", { p_farmer: i.farmer, p_grade: i.grade, p_kg: i.kg, p_price: i.price, p_moisture: i.moisture || null, p_day: i.day || null, p_client_ref: i.clientRef || null });

export const recordAdvance = (i: { farmer: string; kind: string; amount: number; method: string; note: string; clientRef: string }) =>
  rpc<string>("cf_record_advance", { p_farmer: i.farmer, p_kind: i.kind, p_amount: i.amount, p_method: i.method, p_note: i.note || null, p_client_ref: i.clientRef || null });

export const voidPurchase = (id: string, reason: string) => rpc<void>("cf_void_purchase", { p_purchase: id, p_reason: reason });
export const voidAdvance = (id: string, reason: string) => rpc<void>("cf_void_advance", { p_advance: id, p_reason: reason });
export const closeLot = (lot: string) => rpc<void>("cf_close_lot", { p_lot: lot });
export const dispatchLot = (lot: string, to: string) => rpc<void>("cf_dispatch_lot", { p_lot: lot, p_to: to });

export async function addGrade(i: { code: string; name: string; price: number }): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("cf_grades").insert({ code: i.code, name: i.name, default_price: i.price });
  if (error) return error.code === "23505" ? { ok: false, error: "grade_exists" } : failure(error.message);
  return { ok: true, data: undefined };
}

export async function updateGrade(i: { grade: string; name: string; price: number; active: boolean }): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("cf_grades").update({ name: i.name, default_price: i.price, active: i.active }).eq("id", i.grade);
  return error ? failure(error.message) : { ok: true, data: undefined };
}
