import { describe, expect, it } from "vitest";
import { seasonSchema, seasonUpdateSchema } from "./validation";

const season = { name: "2018 harvest", startsOn: "2025-10-01", endsOn: "2026-01-31", bonus: "2.5", ceiling: "40", opensOn: "2026-09-25" };

describe("seasonSchema", () => {
  it("accepts a season and turns the per-kg amounts into numbers", () => {
    const parsed = seasonSchema.parse(season);
    expect(parsed.bonus).toBe(2.5);
    expect(parsed.ceiling).toBe(40);
  });

  it("refuses a season that ends before it starts", () => {
    const result = seasonSchema.safeParse({ ...season, endsOn: "2025-09-30" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain("bad_season_dates");
  });

  it("refuses an opening day that is not after the season ends", () => {
    const result = seasonSchema.safeParse({ ...season, opensOn: "2026-01-31" });
    expect(result.error?.issues.map((i) => i.message)).toContain("bad_season_dates");
  });

  it("refuses negative bonus or ceiling", () => {
    expect(seasonSchema.safeParse({ ...season, bonus: "-1" }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...season, ceiling: "-5" }).success).toBe(false);
  });

  it("needs a season id to update", () => {
    expect(seasonUpdateSchema.safeParse(season).success).toBe(false);
    expect(seasonUpdateSchema.safeParse({ ...season, season: "3f0c6c55-3a3a-4c1e-9d2e-8f1f0f2b7a10" }).success).toBe(true);
  });
});
