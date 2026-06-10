/** API 미연결 시 VLUER 대시보드 데모 */
export function buildVluerDashboardDemoFallback() {
  return {
    tierCode: "general",
    vluerGrade: "general",
    referralChannel: "friend",
    promoActive: false,
    tierDisplay: {
      code: "지인",
      label: "지인 추천",
      commissionPct: 10,
      tagline: "10% 포인트 (2번째 유료 추천부터)",
      memberRange: "누구나 가능",
      payoutMode: "reward_only",
      canWithdraw: false,
      benefitLabel: "지인 추천 10% 포인트 · 출금 불가",
      grade: "general"
    },
    stats: {
      downlineUsers: 12,
      enterprises: 0,
      totalMembers: 12,
      paidReferrals: 8,
      monthlyEstimatedKrw: 0,
      monthlyEstimatedPoints: 2160,
      monthlyEstimatedLabel: "2,160P",
      monthlyIsPoints: true,
      canWithdraw: false,
      pendingChurnRequests: 0,
      activePenaltyVictims: 0,
      platformRetainedTotalKrw: 0
    },
    upgrade: {
      nextTierCode: null,
      nextTierDisplay: null,
      projectedMonthlyLabel: "4,320원",
      certifiedAvailable: false,
      partnerAvailable: false,
      certifiedNotice: "SNS·유튜브·틱톡 인증 후 VLUER 승인 시 홍보 추천(15%/5% 캐시)으로 전환됩니다.",
      partnerNotice: "",
      priceChangeNotice: ""
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
