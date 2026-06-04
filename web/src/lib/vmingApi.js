import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

/** 메인 퀵 메뉴 — VLUE 사용법·기능 안내 */
export const VMING_QUICK_REPLIES = [
  { id: "blue-guide", icon: "guide", label: "블루 사용법", message: "VLUE 블루 앱 사용법을 알려줘" },
  { id: "referral", icon: "referral", label: "추천제 혜택", message: "추천제 혜택이 어떻게 되나요?" },
  { id: "family", icon: "shield", label: "가족보호시스템 사용법", message: "가족보호시스템 등록과 사용 방법을 알려줘" },
  { id: "ad-video", icon: "video", label: "15초짜리 광고 영상 만들기", message: "15초 홍보 영상 만드는 방법을 알려줘" },
  { id: "printer", icon: "printer", label: "원격 복합기 사용방법", message: "원격 복합기 사용 방법을 알려줘" }
];

/** AI 전문 엔진 — 별도 메뉴 (5대 파이프라인) */
export const VMING_AI_ENGINES = [
  {
    id: "biz-card",
    icon: "guide",
    label: "AI 명함·카피",
    desc: "신뢰도·소개 문장 3종",
    message: "내 비즈니스 프로필을 분석해 신뢰도 점수와 소개 문장 3종을 제안해줘"
  },
  {
    id: "reward-predict",
    icon: "referral",
    label: "리워드 정산 예측",
    desc: "활동 패턴·수익 시뮬레이션",
    message: "내 추천·리워드 활동 패턴을 분석하고 이번 달 정산 전망과 마케팅 액션을 알려줘"
  },
  {
    id: "safe-zone",
    icon: "shield",
    label: "안심 동선 분석",
    desc: "가족보호 GPS 맥락 분석",
    message: "가족보호시스템 기준으로 피보호자 안심 브리핑 형식으로 안내해줘"
  },
  {
    id: "ad-script",
    icon: "video",
    label: "15초 광고 콘티",
    desc: "타임라인 대본·카피",
    message: "15초 홍보 영상용 타임라인 대본과 카피를 3단 구간으로 작성해줘"
  },
  {
    id: "smart-doc",
    icon: "printer",
    label: "스마트 문서·인쇄",
    desc: "요약 3줄·인쇄 서식 제안",
    message: "인쇄할 문서를 3줄로 요약하고 추천 인쇄 서식과 원격 출력 가이드를 알려줘"
  }
];

export async function postVmingChat({ message, history, quickReplyId, roomId, chatLogs, type, hiddenCommand = false }) {
  const res = await vlueAuthFetch(apiUrl("/api/ai/chat"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, quickReplyId, roomId, chatLogs, type, hiddenCommand })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data?.openUnlimitedPurchase) {
      try {
        window.dispatchEvent(
          new CustomEvent("vlue-open-vming-upgrade", {
            detail: {
              roomId,
              reasonCode: data?.code || "LIMIT",
              message: data?.message || "",
              blockedReasonType: data?.blocked_reason_type || "GENERAL_LIMIT_EXCEEDED"
            }
          })
        );
      } catch {
        /* ignore */
      }
    }
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchVmingUserStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/vming/user/vming-status"), {
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export async function purchaseVmingUnlimited() {
  const res = await vlueAuthFetch(apiUrl("/api/vming/user/vming-unlimited/purchase"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export async function confirmVmingUnlimitedPayment({ merchantUid, impUid, provider = "portone" }) {
  const res = await vlueAuthFetch(apiUrl("/api/vming/user/vming-unlimited/confirm"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ merchantUid, impUid, provider })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export async function postVmingHiddenCommand({ command, roomId, history = [], chatLogs = [] }) {
  return postVmingChat({
    message: `/브이밍 ${String(command || "").trim()}`,
    history,
    roomId,
    chatLogs,
    hiddenCommand: true
  });
}

export async function generatePostDescription({ message, roomId }) {
  return postVmingChat({
    message: String(message || "게시물 상세설명 생성 요청"),
    roomId,
    type: "post_desc"
  });
}

/** AI 기능 선체크(카운터 미증가) — PPT/post_desc 작업 전 */
export async function checkVmingFeature({ featureType = "web_ppt", message = "", roomId } = {}) {
  const res = await vlueAuthFetch(apiUrl("/api/vming/feature/check"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ featureType, message, roomId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data?.openUnlimitedPurchase) {
      try {
        window.dispatchEvent(
          new CustomEvent("vlue-open-vming-upgrade", {
            detail: {
              roomId,
              reasonCode: data?.code || "LIMIT",
              message: data?.message || "",
              blockedReasonType: data?.blocked_reason_type || "PROJECT_LIMIT_EXCEEDED"
            }
          })
        );
      } catch {
        /* ignore */
      }
    }
    const err = new Error(data.message || data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
