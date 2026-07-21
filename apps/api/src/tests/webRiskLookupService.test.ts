import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCheckUri } from "../services/webrisk/webRiskLookupService.js";

describe("webRiskLookupService.normalizeCheckUri", () => {
  it("keeps https urls", () => {
    assert.equal(normalizeCheckUri("https://example.com/a"), "https://example.com/a");
  });

  it("prefixes https when scheme missing", () => {
    assert.equal(normalizeCheckUri("example.com/path"), "https://example.com/path");
  });

  it("handles protocol-relative urls", () => {
    assert.equal(normalizeCheckUri("//cdn.example.com/x"), "https://cdn.example.com/x");
  });

  it("trims empty", () => {
    assert.equal(normalizeCheckUri("  "), "");
  });
});
