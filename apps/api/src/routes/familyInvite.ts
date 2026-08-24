import { Hono } from "hono";
import { handleFamilyProtectionRouteError } from "../lib/familyProtectionRouteError.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { createProtectionLink, parseFamilyRelation } from "../services/familyProtection/familyProtectionEngine.js";

/** 스펙 별칭: POST /api/family/invite → 가족 보호 초대 */
export const familyInviteRoutes = new Hono();

familyInviteRoutes.post("/invite", requireUserHeader, async (c) => {
  try {
    const me = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as {
      wardHandle?: string;
      wardRole?: string;
      familyRelation?: string;
      guardianImpUid?: string;
    };
    const familyRelation = parseFamilyRelation(body.familyRelation || body.wardRole);
    const result = await createProtectionLink(
      me,
      String(body.wardHandle || ""),
      familyRelation,
      body.guardianImpUid
    );
    if ("error" in result && result.error) {
      return c.json({ error: result.error, code: result.code ?? "FAMILY_INVITE_FAILED" }, 400);
    }
    return c.json(result);
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/invite", err);
  }
});
