import { describe, expect, it } from "vitest";
import {
  VLUE_INTELLIGENCE_BADGE,
  buildIntelligenceSafeLookupBody
} from "../services/search/phoneIntelligenceLookup.js";

describe("buildIntelligenceSafeLookupBody", () => {
  it("marks VLUE intelligence branding fields", () => {
    const body = buildIntelligenceSafeLookupBody({
      displayName: "서울특별시 중구청",
      category: "행정복지센터",
      address: "서울 중구",
      source: "public_directory",
      phoneE164: "+8223393500",
      badge: VLUE_INTELLIGENCE_BADGE
    });
    expect(body.matched).toBe(true);
    expect(body.profileKind).toBe("public_directory_safe");
    expect(body.displayName).toBe("서울특별시 중구청");
    expect(body.vlueIntelligenceFound).toBe(true);
    expect(body.intelligenceBadge).toContain("VLUE");
    expect(body.dcp?.contactName).toBe("서울특별시 중구청");
  });
});
