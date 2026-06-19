import { prisma } from "../../db/client.js";
import type { MailTalkTemplateInput } from "./businessEmailTemplate.js";
import { getMailTalkTemplate } from "./mailTalkStore.js";

/**
 * DB 템플릿 + 디지털 명함/비즈니스 프로필에서 발신 서명 데이터를 병합.
 */
export async function resolveMailTalkTemplateForUser(userId: string): Promise<MailTalkTemplateInput> {
  const saved = await getMailTalkTemplate(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phoneE164: true,
      legalName: true,
      businessProfile: {
        select: { companyName: true, jobTitle: true }
      },
      digitalCard: {
        select: { exportSnapshotJson: true }
      },
      businessCardsOwned: {
        where: { kind: "mobile" },
        take: 1,
        select: {
          displayName: true,
          jobTitle: true,
          companyName: true,
          profileJson: true
        }
      }
    }
  });

  const card = user?.businessCardsOwned[0];
  const profile = (card?.profileJson && typeof card.profileJson === "object"
    ? card.profileJson
    : {}) as Record<string, unknown>;
  const snapshot = (user?.digitalCard?.exportSnapshotJson &&
  typeof user.digitalCard.exportSnapshotJson === "object"
    ? user.digitalCard.exportSnapshotJson
    : {}) as Record<string, unknown>;

  return {
    greetingText: saved?.greeting_text ?? "안녕하세요.",
    closingText: saved?.closing_text ?? "감사합니다.",
    signatureHtml: saved?.signature_html,
    logoUrl:
      saved?.logo_url ||
      String(profile.logoUrl || profile.logo_url || snapshot.logoUrl || "").trim() ||
      null,
    displayName:
      saved?.display_name ||
      card?.displayName ||
      user?.legalName ||
      String(snapshot.displayName || "").trim() ||
      null,
    jobTitle:
      saved?.job_title ||
      card?.jobTitle ||
      user?.businessProfile?.jobTitle ||
      String(snapshot.jobTitle || "").trim() ||
      null,
    companyName:
      saved?.company_name ||
      card?.companyName ||
      user?.businessProfile?.companyName ||
      String(snapshot.companyName || "").trim() ||
      null,
    phone:
      saved?.phone ||
      String(profile.phone || user?.phoneE164 || snapshot.phone || "").trim() ||
      null,
    email:
      saved?.email ||
      String(profile.email || user?.email || snapshot.email || "").trim() ||
      null,
    website:
      saved?.website ||
      String(profile.website || profile.homepage || snapshot.website || "").trim() ||
      null
  };
}
