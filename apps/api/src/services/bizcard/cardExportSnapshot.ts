import { prisma } from "../../db/client.js";
import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { normalizeBizcardTemplate } from "./bizcardClassicSpec.js";
import { resolveDigitalCardIdParam } from "./resolveCardId.js";

function pickName(u: {
  legalName: string | null;
  nickFeed: string | null;
  nickChat: string | null;
  publicHandle: string | null;
}) {
  return u.legalName || u.nickFeed || u.nickChat || u.publicHandle || "VLUE 회원";
}

function parseSnapshotJson(raw: unknown): BizcardClassicSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    organization: String(o.organization || "").trim(),
    name: String(o.name || "").trim(),
    title: String(o.title || "").trim(),
    department: String(o.department || "").trim(),
    phone: String(o.phone || "").trim(),
    email: String(o.email || "").trim(),
    address: String(o.address || "").trim(),
    website: String(o.website || "").trim(),
    logoUrl: String(o.logoUrl || "").trim(),
    photoUrl: String(o.photoUrl || "").trim(),
    shareCoverUrl: String(o.shareCoverUrl || o.kakaoFeedBgUrl || "").trim(),
    designTemplate: normalizeBizcardTemplate(String(o.designTemplate || ""))
  };
}

export async function loadBizcardSnapshotByCardId(cardIdOrHandle: string): Promise<{
  snapshot: BizcardClassicSnapshot;
  userId: string;
  cardId: string;
} | null> {
  const cardId = await resolveDigitalCardIdParam(cardIdOrHandle);
  if (!cardId) return null;

  const row = await prisma.digitalCard.findUnique({
    where: { id: cardId },
    select: {
      userId: true,
      designTemplateSnapshot: true,
      exportSnapshotJson: true,
      user: {
        select: {
          legalName: true,
          nickFeed: true,
          nickChat: true,
          publicHandle: true,
          phoneE164: true,
          businessProfile: {
            select: { companyName: true, jobTitle: true }
          }
        }
      }
    }
  });
  if (!row) return null;

  const fromJson = parseSnapshotJson(row.exportSnapshotJson);
  const bp = row.user.businessProfile;
  const snapshot: BizcardClassicSnapshot = fromJson
    ? {
        ...fromJson,
        designTemplate: normalizeBizcardTemplate(
          fromJson.designTemplate || row.designTemplateSnapshot
        )
      }
    : {
        organization: bp?.companyName || "VLUE",
        name: pickName(row.user),
        title: bp?.jobTitle || "",
        department: "",
        phone: row.user.phoneE164 || "",
        email: "",
        address: "",
        designTemplate: normalizeBizcardTemplate(row.designTemplateSnapshot)
      };

  return { snapshot, userId: row.userId, cardId };
}

export async function saveBizcardExportSnapshot(
  userId: string,
  snapshot: BizcardClassicSnapshot
) {
  const existing = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!existing) return { ok: false, error: "디지털 명함 없음" };

  const tpl = normalizeBizcardTemplate(snapshot.designTemplate);
  await prisma.digitalCard.update({
    where: { userId },
    data: {
      exportSnapshotJson: { ...snapshot, designTemplate: tpl },
      designTemplateSnapshot: tpl
    }
  });
  return { ok: true, cardId: existing.id };
}
