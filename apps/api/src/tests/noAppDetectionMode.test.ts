import { describe, expect, it } from "vitest";
import { normalizeNoAppDetectionMode } from "../services/familyProtection/familyProtectionSettingsHelper.js";

describe("normalizeNoAppDetectionMode", () => {
  it("maps aliases to device_idle", () => {
    expect(normalizeNoAppDetectionMode("device_idle")).toBe("device_idle");
    expect(normalizeNoAppDetectionMode("sensing")).toBe("device_idle");
    expect(normalizeNoAppDetectionMode("idle")).toBe("device_idle");
  });

  it("defaults to app_open", () => {
    expect(normalizeNoAppDetectionMode("")).toBe("app_open");
    expect(normalizeNoAppDetectionMode("app_open")).toBe("app_open");
    expect(normalizeNoAppDetectionMode("unknown")).toBe("app_open");
  });
});
