/** API 미연결 시 VLUER 대시보드 데모 */
export function buildVluerDashboardDemoFallback() {
  return {
    tierCode: "general",
    vluerGrade: "general",
    tierDisplay: {
      code: "VLUER",
      label: "일반 VLUER",
      commissionPct: 5,
      tagline: "5% 포인트 리워드",
      memberRange: "VLUER 활동",
      payoutMode: "reward_only",
      canWithdraw: false,
      benefitLabel: "5% 포인트 리워드 적립",
      grade: "general"
    },
    stats: {
      downlineUsers: 12,
      enterprises: 0,
      totalMembers: 12,
      paidReferrals: 8,
      monthlyEstimatedKrw: 0,
      monthlyEstimatedPoints: 4200,
      monthlyEstimatedLabel: "4,200P",
      monthlyIsPoints: true,
      canWithdraw: false,
      pendingChurnRequests: 0,
      activePenaltyVictims: 0,
      platformRetainedTotalKrw: 0
    },
    upgrade: {
      nextTierCode: "certified",
      nextTierDisplay: {
        code: "CV",
        label: "인증 VLUER",
        commissionPct: 10,
        benefitLabel: "10% 캐시 적립"
      },
      projectedMonthlyLabel: "8,400원",
      certifiedAvailable: false,
      partnerAvailable: false,
      certifiedNotice: "정가 28,300원으로 전환되며, 리워드 요율이 10% 캐시 적립으로 상승합니다.",
      partnerNotice: "정가 28,300원으로 전환되며, 리워드 요율이 15% 캐시 적립으로 상승합니다.",
      priceChangeNotice: "기존 할인이 종료되며 정가 28,300원으로 전환되고, 리워드 요율이 상향됩니다."
    }
  };
}

export function buildVluerOrgMapDemoFallback() {
  return {
    members: [
      { userId: "demo-1", name: "김○○", handle: "member1", churnRisk: false },
      { userId: "demo-2", name: "이○○", handle: "member2", churnRisk: false }
    ],
    enterprises: []
  };
}
