import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { logB2bPipeline } from "../../lib/b2bPipelineLog.js";

export type CompanyBrandingJson = {
  logoUrl?: string;
  logoFileName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  appliesAccountWide?: boolean;
};

const MAX_LOGO_DATA_URL_LEN = 2_200_000;

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const FONT_OPTIONS = [
  "Pretendard, sans-serif",
  "Noto Sans KR, sans-serif",
  "Apple SD Gothic Neo, sans-serif",
  "Malgun Gothic, sans-serif",
  "Georgia, serif"
];

export function parseBrandingPayload(body: Record<string, unknown>): {
  ok: true;
  branding: CompanyBrandingJson;
} | { ok: false; error: string } {
  const logoUrl = String(body.logoUrl ?? body.logo_url ?? "").trim();
  const primaryColor = String(body.primaryColor ?? body.primary_color ?? "#1e3a8a").trim();
  const secondaryColor = String(body.secondaryColor ?? body.secondary_color ?? "#3b82f6").trim();
  const fontFamily = String(body.fontFamily ?? body.font_family ?? FONT_OPTIONS[0]).trim();

  if (primaryColor && !HEX_RE.test(primaryColor)) {
    return { ok: false, error: "프라이머리 컬러는 #RRGGBB 형식이어야 합니다." };
  }
  if (secondaryColor && !HEX_RE.test(secondaryColor)) {
    return { ok: false, error: "세컨더리 컬러는 #RRGGBB 형식이어야 합니다." };
  }
  const logoFileName = String(body.logoFileName ?? body.logo_file_name ?? "").trim();

  if (
    logoUrl &&
    !/^https?:\/\//i.test(logoUrl) &&
    !logoUrl.startsWith("data:image/")
  ) {
    return { ok: false, error: "로고는 https URL 또는 업로드한 이미지 파일이어야 합니다." };
  }
  if (logoUrl.startsWith("data:image/") && logoUrl.length > MAX_LOGO_DATA_URL_LEN) {
    return { ok: false, error: "로고 이미지가 너무 큽니다. 1.5MB 이하 PNG/JPG를 사용해 주세요." };
  }

  return {
    ok: true,
    branding: {
      logoUrl: logoUrl || undefined,
      logoFileName: logoFileName || undefined,
      primaryColor,
      secondaryColor,
      fontFamily: fontFamily || FONT_OPTIONS[0],
      appliesAccountWide: true
    }
  };
}

export function hasActiveEnterpriseBranding(branding: unknown): boolean {
  if (!branding || typeof branding !== "object") return false;
  const b = branding as CompanyBrandingJson;
  return Boolean(
    b.logoUrl ||
    b.primaryColor ||
    b.secondaryColor ||
    (b.fontFamily && b.fontFamily !== FONT_OPTIONS[0])
  );
}

/** 저장된 브랜딩을 기업 소속 전체 계정(관리자·귀속 임직원)에 적용 */
export async function applyBrandingAccountWide(enterpriseId: string, adminUserId: string) {
  await prisma.userCorporateMembership.updateMany({
    where: { enterpriseId },
    data: { overrideByCompany: true }
  });

  const memberRows = await prisma.userCorporateMembership.findMany({
    where: { enterpriseId },
    select: { userId: true }
  });
  const userIds = [...new Set([adminUserId, ...memberRows.map((m) => m.userId)])];

  await prisma.businessCard.updateMany({
    where: { userId: { in: userIds } },
    data: { b2bEnterpriseId: enterpriseId }
  });

  return { memberCount: memberRows.length, linkedCardUsers: userIds.length };
}

export async function uploadEnterpriseLogo(
  adminUserId: string,
  payload: { dataUrl?: string; fileName?: string }
) {
  const dataUrl = String(payload.dataUrl || "").trim();
  const fileName = String(payload.fileName || "logo.png").trim();

  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false as const, error: "이미지 파일(PNG/JPG/WebP)만 업로드할 수 있습니다." };
  }
  if (dataUrl.length > MAX_LOGO_DATA_URL_LEN) {
    return { ok: false as const, error: "로고 파일이 너무 큽니다. 1.5MB 이하로 올려 주세요." };
  }

  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId },
    orderBy: { updatedAt: "desc" }
  });
  if (!ent) {
    return { ok: false as const, error: "B2B 기업 계정이 없습니다." };
  }

  const prev = (ent.companyBrandingJson as CompanyBrandingJson | null) ?? {};
  const branding: CompanyBrandingJson = {
    ...prev,
    logoUrl: dataUrl,
    logoFileName: fileName,
    appliesAccountWide: true
  };

  const updated = await prisma.b2BEnterpriseAccount.update({
    where: { id: ent.id },
    data: { companyBrandingJson: branding as Prisma.InputJsonValue }
  });

  const scope = await applyBrandingAccountWide(ent.id, adminUserId);
  logB2bPipeline("branding.logo_uploaded", {
    enterpriseId: ent.id,
    fileName,
    ...scope
  });

  return {
    ok: true as const,
    enterpriseId: ent.id,
    branding: updated.companyBrandingJson,
    appliesAccountWide: true
  };
}

export async function getEnterpriseBranding(adminUserId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      companyName: true,
      companyBrandingJson: true,
      status: true
    }
  });
  if (!ent) return { enterprise: null, branding: null };
  return {
    enterprise: ent,
    branding: (ent.companyBrandingJson as CompanyBrandingJson | null) ?? null,
    fontOptions: FONT_OPTIONS
  };
}

export async function patchEnterpriseBranding(
  adminUserId: string,
  branding: CompanyBrandingJson
) {
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId },
    orderBy: { updatedAt: "desc" }
  });
  if (!ent) {
    logB2bPipeline("branding.save_failed", { adminUserId, reason: "no_enterprise" });
    return { ok: false as const, error: "B2B 기업 계정이 없습니다." };
  }

  const brandingWithScope: CompanyBrandingJson = {
    ...branding,
    appliesAccountWide: true
  };

  const updated = await prisma.b2BEnterpriseAccount.update({
    where: { id: ent.id },
    data: { companyBrandingJson: brandingWithScope as Prisma.InputJsonValue }
  });

  const scope = await applyBrandingAccountWide(ent.id, adminUserId);
  logB2bPipeline("branding.saved", { enterpriseId: ent.id, adminUserId, ...scope });

  return {
    ok: true as const,
    enterpriseId: ent.id,
    branding: updated.companyBrandingJson,
    appliesAccountWide: true,
    accountWide: scope
  };
}
