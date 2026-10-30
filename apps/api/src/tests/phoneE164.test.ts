import { describe, expect, it } from "vitest";
import {
  normalizeToE164KR,
  phoneMatchVariants,
  toKoreaLocalDigits
} from "../lib/phoneE164.js";

describe("normalizeToE164KR", () => {
  it("normalizes domestic mobile", () => {
    expect(normalizeToE164KR("010-1234-5678")).toBe("+821012345678");
    expect(normalizeToE164KR("01012345678")).toBe("+821012345678");
  });

  it("collapses Google-style +82 010…", () => {
    expect(normalizeToE164KR("+82 010-1234-5678")).toBe("+821012345678");
    expect(normalizeToE164KR("8201012345678")).toBe("+821012345678");
    expect(toKoreaLocalDigits("+82 010-1234-5678")).toBe("01012345678");
  });

  it("builds match variants that intersect", () => {
    const a = new Set(phoneMatchVariants("+82 010-1234-5678"));
    const b = new Set(phoneMatchVariants("01012345678"));
    expect([...a].some((v) => b.has(v))).toBe(true);
    expect(a.has("+821012345678")).toBe(true);
  });
});
