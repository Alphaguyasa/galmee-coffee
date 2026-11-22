import { z } from "zod";

export const MIN_PASSWORD = 10;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(128),
});

export const signupSchema = credentialsSchema.extend({
  password: z.string().min(MIN_PASSWORD).max(128),
});

// Ethiopian mobile/landline: 09xxxxxxxx, 07xxxxxxxx or +2519xxxxxxxx; spaces and dashes allowed.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+251|0)[1-9]\d{8}$/));

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});

export function formToObject(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? ""]));
}

const uuid = z.string().uuid();
const optional = (max: number) => z.string().trim().max(max).optional().default("");
const optionalPhone = z.union([z.literal(""), phoneSchema]);
const price = z.coerce.number().positive().max(100_000);
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const METHODS = ["cash", "telebirr", "cbe_birr", "bank"] as const;
export const ADVANCE_KINDS = ["advance", "payment"] as const;
const clientRef = z.union([z.literal(""), uuid]).optional().default("");

export const farmerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kebele: z.string().trim().min(2).max(80),
  phone: optionalPhone,
});
export const farmerUpdateSchema = farmerSchema.extend({ farmer: uuid, active: z.enum(["true", "false"]) });
export const gradeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/),
  name: z.string().trim().min(2).max(60),
  price,
});
export const gradeUpdateSchema = z.object({ grade: uuid, name: z.string().trim().min(2).max(60), price, active: z.enum(["true", "false"]) });
export const purchaseSchema = z.object({
  farmer: uuid,
  grade: uuid,
  kg: z.coerce.number().positive().max(100_000),
  price,
  moisture: optional(120),
  day: z.union([z.literal(""), daySchema]).optional().default(""),
  clientRef,
});
export const advanceSchema = z.object({
  farmer: uuid,
  kind: z.enum(ADVANCE_KINDS),
  amount: z.coerce.number().positive().max(100_000_000),
  method: z.enum(METHODS),
  note: optional(300),
  clientRef,
});
export const voidSchema = z.object({
  id: uuid,
  farmer: uuid,
  entry: z.enum(["purchase", "advance", "payment"]),
  reason: z.string().trim().min(2).max(300),
});
export const lotSchema = z.object({ lot: uuid });
export const dispatchSchema = z.object({ lot: uuid, to: z.string().trim().min(2).max(120) });
export const idSchema = uuid;

const perKg = z.coerce.number().min(0).max(100_000);
/** A buying season: last season's dates, the bonus and advance ceiling per kg, and the day buying opens again. */
export const seasonSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    startsOn: daySchema,
    endsOn: daySchema,
    bonus: perKg,
    ceiling: perKg,
    opensOn: daySchema,
  })
  .refine((s) => s.endsOn >= s.startsOn, { message: "bad_season_dates", path: ["endsOn"] })
  .refine((s) => s.opensOn > s.endsOn, { message: "bad_season_dates", path: ["opensOn"] });
export const seasonUpdateSchema = z.intersection(seasonSchema, z.object({ season: uuid }));
export const SEASON_KEYS = ["name", "startsOn", "endsOn", "bonus", "ceiling", "opensOn"] as const;
