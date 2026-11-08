import { describe, expect, it } from "vitest";
import { addDays, addisTime, addisToday } from "./day";

describe("day helpers", () => {
  it("rolls to the next Addis day before UTC midnight", () => {
    expect(addisToday(new Date("2026-11-08T21:30:00Z"))).toBe("2026-11-09");
    expect(addisToday(new Date("2026-11-08T20:59:00Z"))).toBe("2026-11-08");
  });
  it("adds days across a month boundary", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("shows clock time in Addis", () => {
    expect(addisTime("2026-11-08T05:30:00Z")).toBe("08:30");
  });
});
