/**
 * 헤더 통합검색 — 채팅·메시지·화면 이동·메인(홈) 라벨 등 앱 내 문자열 인덱싱
 */
import { formatMembershipTierLabel } from "./membershipTierDisplay.js";

export function tabForRoom(roomId) {
  if (!roomId) return "all";
  if (String(roomId).startsWith("vlue:")) return "all";
  const g = String(roomId).split(":")[0];
  if (g === "work") return "clients";
  if (g === "subscribe") return "subscribe";
  return "all";
}

const GROUP_LABEL = {
  family: "가족",
  friends: "친구",
  work: "직장·비즈니스",
  subscribe: "구독·매장"
};

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim();
}

function tokens(q) {
  const n = norm(q);
  if (!n) return [];
  return n
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^#+/, ""));
}

/** 모든 토큰이 텍스트 어딘가에 포함되는지 (AND) */
function tokensMatchFields(q, fields) {
  const toks = tokens(q);
  if (toks.length === 0) return true;
  const hay = fields.map((f) => norm(f)).join(" ");
  return toks.every((t) => hay.includes(t));
}

function scoreMatch(q, title, subtitle, extraFields = []) {
  const toks = tokens(q);
  if (toks.length === 0) return 1;
  if (!tokensMatchFields(q, [title, subtitle, ...extraFields])) return 0;
  let s = 0;
  const nt = norm(title);
  const ns = norm(subtitle);
  const nh = [nt, ns, ...extraFields.map(norm)].join(" ");
  for (const t of toks) {
    if (nt.includes(t)) s += 120;
    else if (ns.includes(t)) s += 85;
    else if (nh.includes(t)) s += 55;
  }
  if (nt.startsWith(toks[0])) s += 40;
  return s;
}

/** 메인(Home)에 노출되는 정적 라벨 — Home.jsx 데이터와 동기화 */
const MAIN_DISCOVER = [
  { id: "cat-food", title: "식음료", subtitle: "메인 카테고리", keywords: ["카페", "맛집", "음식"] },
  { id: "cat-beauty", title: "뷰티", subtitle: "메인 카테고리", keywords: ["헤어", "네일"] },
  { id: "cat-edu", title: "교육", subtitle: "메인 카테고리", keywords: ["학원", "강의"] },
  { id: "cat-service", title: "정비", subtitle: "메인 카테고리", keywords: ["수리", "AS"] },
  { id: "cat-job", title: "채용", subtitle: "메인 카테고리", keywords: ["구인"] },
  { id: "cat-med", title: "의료", subtitle: "메인 카테고리", keywords: ["병원", "클리닉"] },
  { id: "ad-1", title: "성주 명경체용양병원", subtitle: "의료 · 공식 배너", keywords: ["명경", "병원", "재활"] },
  { id: "ad-2", title: "JHTC 글로벌 네트워크 센터", subtitle: "글로벌 HR · 공식 배너", keywords: ["캄보디아", "교육"] },
  { id: "ad-3", title: "휴먼큐레이팅 (PG사)", subtitle: "결제 · 공식 배너", keywords: ["PG", "결제"] },
  { id: "rec-1", title: "강남역 야경 카페 5곳", subtitle: "추천 활동", keywords: ["카페", "야경"] },
  { id: "rec-2", title: "이번 주 핫한 보안 트렌드", subtitle: "추천 활동", keywords: ["보안"] },
  { id: "rec-3", title: "역삼 골목 맛집 지도", subtitle: "추천 활동", keywords: ["맛집", "역삼"] },
  { id: "local-1", title: "청담 헤어 라운지", subtitle: "우리 동네 핫플", keywords: ["청담", "헤어"] },
  { id: "local-2", title: "역삼 브런치 하우스", subtitle: "우리 동네 핫플", keywords: ["브런치"] },
  { id: "local-3", title: "강남 필라테스", subtitle: "우리 동네 핫플", keywords: ["필라테스"] },
  { id: "local-4", title: "논현 꽃집 블루", subtitle: "우리 동네 핫플", keywords: ["꽃", "논현"] },
  { id: "upd-soul", title: "Soul Cafe", subtitle: "업데이트 · 구독", keywords: ["소울", "카페"] },
  { id: "upd-blue", title: "블루정비", subtitle: "업데이트 · 구독", keywords: ["정비", "역삼"] },
  { id: "upd-cc", title: "커리어센터", subtitle: "업데이트 · 구독", keywords: ["채용", "강남"] },
  { id: "upd-kim", title: "김친구", subtitle: "업데이트 · 친구", keywords: [] },
  { id: "upd-bro", title: "동생", subtitle: "업데이트 · 친구", keywords: [] }
];

function staticScreens(membershipTier) {
  const tierKo = formatMembershipTierLabel(membershipTier);
  return [
    {
      id: "scr-chat",
      category: "바로가기",
      title: "채팅",
      subtitle: "대화 목록 · 미확인 메시지",
      fields: ["채팅", "대화", "목록", "메시지"],
      action: { type: "page", page: "list", tab: "all" }
    },
    {
      id: "scr-blueai",
      category: "바로가기",
      title: "블루AI",
      subtitle: "AI 상담",
      fields: ["블루", "ai", "인공지능"],
      action: { type: "page", page: "blueai" }
    },
    {
      id: "scr-my",
      category: "바로가기",
      title: "MY · 마이페이지",
      subtitle: "프로필 · 명함 · 설정",
      fields: ["my", "마이", "프로필", "설정", "명함"],
      action: { type: "page", page: "mypage" }
    },
    {
      id: "scr-shop",
      category: "쇼핑·상점",
      title: "VLUE 스토어 / 상점",
      subtitle: "입점 · 라이브 · 쇼핑",
      fields: [
        "쇼핑",
        "스토어",
        "상점",
        "상품",
        "입점",
        "vlue",
        "브랜드",
        "스토어탭",
        "해시",
        "태그",
        "딜",
        "라이브"
      ],
      action: { type: "page", page: "subhub", subscriptionSubTab: "recommend" }
    },
    {
      id: "scr-gift-box",
      category: "쇼핑·상점",
      title: "선물함",
      subtitle: "받은 선물 · 쿠폰 · 교환권",
      fields: ["선물", "선물함", "쿠폰", "교환", "이벤트", "혜택", "gift"],
      action: { type: "page", page: "subhub", subscriptionSubTab: "gifts" }
    },
    {
      id: "scr-friend",
      category: "바로가기",
      title: "친구검색",
      subtitle: "친구 찾기 · 요청",
      fields: ["친구", "검색", "추천"],
      action: { type: "page", page: "friendSearch" }
    },
    {
      id: "scr-feedmgr",
      category: "바로가기",
      title: "페이지관리 · 활동",
      subtitle: "활동 글 관리",
      fields: ["활동", "페이지", "관리", "글"],
      action: { type: "page", page: "manage" }
    },
    {
      id: "scr-profile",
      category: "바로가기",
      title: "사이드 메뉴 (설정)",
      subtitle: "알림 · 레터링 · 프로필 패널",
      fields: ["설정", "알림", "vcid", "다크"],
      action: { type: "profile", view: "main" }
    },
    {
      id: "scr-wallet",
      category: "바로가기",
      title: "개인케이스 · Wallet",
      subtitle: "명함저장 · 내문서",
      fields: ["지갑", "wallet", "명함", "카드", "케이스", "자료실"],
      action: { type: "wallet" }
    },
    {
      id: "scr-documents",
      category: "바로가기",
      title: "업무·일상 서류 양식",
      subtitle: "개인 자료실 · 서류 양식 다운로드",
      fields: ["서류", "양식", "다운로드", "위임장", "근로계약", "내용증명", "계약서", "문서", "자료실"],
      action: { type: "wallet", tab: "mydocs" }
    },
    {
      id: "scr-local-ad",
      category: "바로가기",
      title: "우리동네 핫플레이스 · 지역 광고",
      subtitle: "상점 피드 게시물 선택 · AI 송출",
      fields: ["광고", "핫플", "핫플레이스", "지역", "매장", "홍보", "동네"],
      action: { type: "main" }
    },
    {
      id: "scr-tier",
      category: "멤버십",
      title: `현재 등급 · ${tierKo}`,
      subtitle: "멤버십 · 등급 안내는 프로필에서",
      fields: ["등급", "멤버십", "무료", "유료", "가족보호", "구독료"],
      action: { type: "profile", view: "main" }
    },
    {
      id: "scr-tabs-all",
      category: "채팅 탭",
      title: "탭 · 전체",
      subtitle: "채팅 목록 필터",
      fields: ["전체", "탭"],
      action: { type: "page", page: "list", tab: "all" }
    },
    {
      id: "scr-tabs-fav",
      category: "채팅 탭",
      title: "탭 · 즐겨찾기",
      subtitle: "채팅 목록 필터",
      fields: ["즐겨찾기", "즐겨"],
      action: { type: "page", page: "list", tab: "favorites" }
    },
    {
      id: "scr-tabs-biz",
      category: "채팅 탭",
      title: "탭 · 비즈니스",
      subtitle: "직장·내선 대화",
      fields: ["비즈니스", "비지니스", "직장"],
      action: { type: "page", page: "list", tab: "clients" }
    },
    {
      id: "scr-tabs-unread",
      category: "채팅 탭",
      title: "탭 · 미확인",
      subtitle: "읽지 않은 방",
      fields: ["미확인", "안읽음"],
      action: { type: "page", page: "list", tab: "unread" }
    },
    {
      id: "scr-tabs-sub",
      category: "채팅 탭",
      title: "탭 · 구독",
      subtitle: "매장·브랜드 채널",
      fields: ["구독", "매장"],
      action: { type: "page", page: "list", tab: "subscribe" }
    }
  ];
}

function collectRooms(roomCatalog, officialChannelMeta) {
  const rows = [];
  const groups = ["friends", "family", "work", "subscribe"];
  for (const g of groups) {
    for (const r of roomCatalog[g] || []) {
      const roomId = `${g}:${r.id}`;
      rows.push({
        id: `room-${roomId}`,
        category: `채팅 · ${GROUP_LABEL[g] || g}`,
        title: r.name || r.cardName,
        subtitle: [r.lastMsg, r.cardOrg, r.cardTitle].filter(Boolean).join(" · ") || "대화방",
        fields: [r.name, r.cardName, r.lastMsg, r.cardOrg, r.cardTitle, GROUP_LABEL[g]],
        action: { type: "room", roomId }
      });
    }
  }
  rows.unshift({
    id: "room-vlue-official",
    category: "채팅 · 공식",
    title: "VLUE 공식 알림",
    subtitle: officialChannelMeta?.lastMsg || "신뢰 인증 · 공지",
    fields: ["vlue", "공식", "알림", "인증", "신뢰", officialChannelMeta?.lastMsg],
    action: { type: "room", roomId: "vlue:official" }
  });
  return rows;
}

function collectMainDiscover() {
  return MAIN_DISCOVER.map((d) => ({
    id: `main-${d.id}`,
    category: "메인 홈",
    title: d.title,
    subtitle: d.subtitle,
    fields: [d.title, d.subtitle, ...(d.keywords || [])],
    action: { type: "main" }
  }));
}

function collectMessageHits(q, messagesByRoom, roomCatalog) {
  const toks = tokens(q);
  if (toks.length === 0) return [];
  const out = [];
  const roomMeta = (rid) => {
    const [g, id] = rid.split(":");
    const r = (roomCatalog[g] || []).find((x) => x.id === id);
    return r?.name || r?.cardName || rid;
  };
  for (const [roomId, msgs] of Object.entries(messagesByRoom || {})) {
    if (!Array.isArray(msgs)) continue;
    for (const m of msgs) {
      const text = String(m.text || "");
      if (!text.trim()) continue;
      if (!tokensMatchFields(q, [text])) continue;
      const preview = text.length > 56 ? `${text.slice(0, 54)}…` : text;
      out.push({
        id: `msg-${roomId}-${m.id}`,
        category: "대화 내용",
        title: preview,
        subtitle: `방: ${roomMeta(roomId)}`,
        fields: [text],
        action: { type: "room", roomId }
      });
      if (out.length >= 24) return out;
    }
  }
  return out;
}

/**
 * @returns {{ id, category, title, subtitle, action, score }[]}
 */
export function runUnifiedSearch(query, ctx) {
  const {
    roomCatalog,
    messagesByRoom,
    officialChannelMeta,
    membershipTier = "free"
  } = ctx;

  const q = String(query || "").trim();
  const screens = staticScreens(membershipTier);
  const rooms = collectRooms(roomCatalog, officialChannelMeta);
  const mainRows = collectMainDiscover();

  const candidates = [...screens, ...rooms, ...mainRows];

  if (!q) {
    const shortcuts = screens.filter((s) =>
      ["scr-chat", "scr-blueai", "scr-my", "scr-shop", "scr-friend", "scr-profile"].includes(s.id)
    );
    return shortcuts.map((c) => ({ ...c, score: 1 }));
  }

  const scored = [];
  for (const c of candidates) {
    const sc = scoreMatch(q, c.title, c.subtitle, [...(c.fields || [])]);
    if (sc > 0) scored.push({ ...c, score: sc });
  }

  for (const m of collectMessageHits(q, messagesByRoom, roomCatalog)) {
    const sc = scoreMatch(q, m.title, m.subtitle, m.fields || []);
    if (sc > 0) scored.push({ ...m, score: sc * 0.92 });
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const uniq = [];
  for (const row of scored) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    uniq.push(row);
    if (uniq.length >= 14) break;
  }
  return uniq;
}
