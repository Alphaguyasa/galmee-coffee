import { describe, expect, it } from "vitest";
import { csvCell, periodRange } from "./period";

describe("periodRange", () => {
  it("today is one day", () => expect(periodRange("today", "2026-11-08")).toEqual({ from: "2026-11-08", to: "2026-11-08" }));
  it("a week starts on Monday", () => {
    expect(periodRange("week", "2026-11-08")).toEqual({ from: "2026-11-02", to: "2026-11-08" }); // a Sunday
    expect(periodRange("week", "2026-11-02")).toEqual({ from: "2026-11-02", to: "2026-11-02" }); // a Monday
  });
  it("the month starts on the first of the Ethiopian month", () => {
    expect(periodRange("month", "2026-11-08")).toEqual({ from: "2026-10-11", to: "2026-11-08" }); // Tikimt 2019
  });
});

describe("csvCell", () => {
  it("quotes commas and quotes", () => expect(csvCell('a,"b')).toBe('"a,""b"'));
  it("defuses formulas in text", () => expect(csvCell("=1+1")).toBe("'=1+1"));
  it("leaves numbers alone", () => expect(csvCell(-5)).toBe("-5"));
});
