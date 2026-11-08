import { describe, expect, it } from "vitest";
import am from "../../messages/am.json";
import en from "../../messages/en.json";
import om from "../../messages/om.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("am and om have exactly the same keys as en", () => {
    const base = keys(en).sort();
    expect(keys(am).sort()).toEqual(base);
    expect(keys(om).sort()).toEqual(base);
  });
});
