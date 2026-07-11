/** 데모 채팅방 ↔ 가족 보호 등록(활성) 매핑 */
export const DEMO_FAMILY_BY_ROOM_ID = {
  "family:mom": {
    linkId: "demo-family-mom",
    peerUserId: "demo-family-mom",
    peerPublicHandle: "mom",
    familyRelation: "parent",
    wardRole: "elder",
    displayName: "엄마"
  },
  "family:brother": {
    linkId: "demo-family-brother",
    peerUserId: "demo-family-brother",
    peerPublicHandle: "brother",
    familyRelation: "child",
    wardRole: "child",
    displayName: "동생"
  }
};

/** 채팅 목록·가족 링크 등 — 관계 유형(parent/child)과 무관한 통일 배지 */
export const FAMILY_MEMBER_DISPLAY_LABEL = "FAMILY";

export const FAMILY_RELATION_LABEL = {
  parent: FAMILY_MEMBER_DISPLAY_LABEL,
  child: FAMILY_MEMBER_DISPLAY_LABEL
};

export function getDemoFamilyRoomIds() {
  return Object.keys(DEMO_FAMILY_BY_ROOM_ID);
}

/** 가족 보호 패널 — V1 실가입 UX: 데모 가족 링크를 넣지 않음 */
export function getDemoFamilyGuardianLinks() {
  return [];
}

export function getDemoFamilyPeers() {
  return { userIds: new Set(), handles: new Set() };
}

export function mergeFamilyPeers(apiPeers) {
  return {
    userIds: new Set([...(apiPeers?.userIds || [])]),
    handles: new Set([...(apiPeers?.handles || [])])
  };
}

export function demoFamilyMetaForRoom(roomId, room = {}) {
  const demo = DEMO_FAMILY_BY_ROOM_ID[roomId];
  if (!demo) return null;
  return {
    familyRegistered: true,
    familyRelation: demo.familyRelation,
    peerUserId: demo.peerUserId,
    peerPublicHandle: demo.peerPublicHandle
  };
}

export function isDemoFamilyRoom(roomId) {
  return Boolean(DEMO_FAMILY_BY_ROOM_ID[roomId]);
}

/** API 500/오프라인 시 가족 보호 패널 기본 데이터 */
export function buildDemoFamilyProtectionApiFallback() {
  return {
    usageGuide: {
      summary: "유료 회원이 가족을 등록하면, 가족에게 승인 메시지가 전달됩니다. 수락한 뒤부터 보호가 시작됩니다.",
      steps: [
        "① 유료 회원이 VLUE 아이디로 가족 초대 (관계 유형 선택 후 등록)",
        "② 초대받은 가족에게 앱·알림으로 승인 요청",
        "③ 가족이 수락하면 가족 보호 활동 시작",
        "④ 알림 조건은 보호자가 설정에서 변경 가능"
      ]
    },
    canInviteFamily: true,
    inviteBlockReason: null,
    settings: {
      alertNoAppEnabled: true,
      alertNoAppHours: 24,
      alertMissedCallEnabled: true,
      alertMissedCallThreshold: 3,
      alertChildSiteEnabled: true
    },
    asGuardian: [],
    asWard: [],
    alerts: [],
    familyPeers: [],
    myActiveWardRole: null,
    myActiveFamilyRelation: null,
    offlineDemo: true
  };
}
