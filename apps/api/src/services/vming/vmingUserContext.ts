import { prisma } from "../../db/client.js";
import { countDownlineUsers } from "../vluer/tierEngine.js";

async function loadRewardPoints(userId: string): Promise<number> {
  try {
    const rows = await prisma.commissionLedger.aggregate({
      where: {
        vluerUserId: userId,
        payoutMode: "reward_only",
        blockedReason: null
      },
      _sum: { commissionKrw: true }
    });
    return Math.max(0, rows._sum.commissionKrw ?? 0);
  } catch {
    return 0;
  }
}

function parseExportSnapshot(json: unknown) {
  if (!json || typeof json !== "object") return {};
  const o = json as Record<string, string>;
  return {
    organization: String(o.organization || "").trim(),
    name: String(o.name || "").trim(),
    title: String(o.title || "").trim(),
    introBack: String(o.introBack || "").trim()
  };
}

/** Gemini에 주입할 컴팩트 유저 컨텍스트 */
export async function buildVmingUserContextBlock(userId: string): Promise<string> {
  try {
    const [user, digitalCard, downlineUsers, rewardPoints] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          nickFeed: true,
          nickChat: true,
          legalName: true,
          publicHandle: true,
          isEnterpriseVerified: true,
          businessProfile: {
            select: { companyName: true, jobTitle: true, isBusiness: true }
          }
        }
      }),
      prisma.digitalCard.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { membershipTierSnapshot: true, exportSnapshotJson: true }
      }),
      countDownlineUsers(userId).catch(() => 0),
      loadRewardPoints(userId)
    ]);

    if (!user) return "[유저 컨텍스트] 미연동 — 일반 컨설팅 모드.";

    const snap = parseExportSnapshot(digitalCard?.exportSnapshotJson);
    const bp = user.businessProfile;
    const name = user.nickFeed || user.nickChat || user.legalName || "회원";

    const lines = [
      "[유저 컨텍스트 — 제공된 사실만 활용]",
      `- 표시명: ${name}`,
      `- VLUE ID: ${user.publicHandle || "(미설정)"}`,
      `- 멤버십 스냅샷: ${digitalCard?.membershipTierSnapshot || "free"}${user.isEnterpriseVerified ? " · 기업인증" : ""}`,
      `- 회사: ${bp?.companyName || snap.organization || "(미입력)"}`,
      `- 직함: ${bp?.jobTitle || snap.title || "(미입력)"}`,
      `- 사업자 회원: ${bp?.isBusiness ? "예" : "아니오"}`,
      `- 명함 소개(스냅샷): ${snap.introBack || "(미입력)"}`,
      `- 추천 다운라인(활성 추정): ${downlineUsers}명`,
      `- 리워드 포인트 잔액: ${rewardPoints}P`,
      "- 가족 GPS·실시간 동선: 이 요청에 별도 좌표가 없으면 분석하지 말고 가족보호 등록 경로만 안내."
    ];
    return lines.join("\n");
  } catch (e) {
    console.warn("[vming] context_load_failed", e);
    return "[유저 컨텍스트] 로드 실패 — 일반 컨설팅 모드.";
  }
}
