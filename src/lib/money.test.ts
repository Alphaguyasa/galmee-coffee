import { describe, expect, it } from "vitest";
import { formatBirr, formatKg, previewAmount } from "./money";

describe("formatBirr", () => {
  it("uses the Amharic prefix for am", () => expect(formatBirr(1250, "am")).toBe("ብር 1,250.00"));
  it("uses the ETB suffix otherwise", () => expect(formatBirr(1250.5, "en")).toBe("1,250.50 ETB"));
});

describe("kilos", () => {
  it("formats kilos without trailing zeros", () => {
    expect(formatKg(1250.5)).toBe("1,250.5");
    expect(formatKg(50)).toBe("50");
  });
  it("previews kg x price in whole cents", () => {
    expect(previewAmount(50.5, 120)).toBe(6060);
    expect(previewAmount(0.1, 0.2)).toBe(0.02);
  });
});
