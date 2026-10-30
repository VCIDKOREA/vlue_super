import { describe, expect, it } from "vitest";
import {
  isProvisionalAutoPublicHandle,
  needsPublicHandleClaim,
  normalizeDesiredPublicHandle
} from "../lib/publicHandle.js";

describe("publicHandle claim helpers", () => {
  it("detects provisional auto handles", () => {
    expect(isProvisionalAutoPublicHandle("vluea1b2c3")).toBe(true);
    expect(isProvisionalAutoPublicHandle("@vlueabcdef")).toBe(true);
    expect(isProvisionalAutoPublicHandle("ceo1")).toBe(false);
    expect(isProvisionalAutoPublicHandle("vlue_ceo1")).toBe(false);
  });

  it("needs claim when empty or provisional", () => {
    expect(needsPublicHandleClaim("")).toBe(true);
    expect(needsPublicHandleClaim(null)).toBe(true);
    expect(needsPublicHandleClaim("vlue12ab34")).toBe(true);
    expect(needsPublicHandleClaim("ceo1")).toBe(false);
  });

  it("rejects provisional pattern as desired claim", () => {
    expect(normalizeDesiredPublicHandle("vluea1b2c3")).toBe("vluea1b2c3");
    expect(isProvisionalAutoPublicHandle(normalizeDesiredPublicHandle("vluea1b2c3"))).toBe(true);
  });
});
