import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFeedDisplayName } from "../lib/memberCardStorage.js";
import { fetchLocalAds, mapLocalAdToStoreCard } from "../lib/localAdsApi.js";
import { isPaidMembershipKind, normalizeMembershipKind } from "../lib/membershipBm.js";
import LocalAdRegisterModal from "./LocalAdRegisterModal.jsx";
import MembershipUpgradeModal from "./MembershipUpgradeModal.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import ModalCloseButton from "./common/ModalCloseButton";
import { FAVORITE_SHOPS_CHANGED, isFavoriteShop, toggleFavoriteShop } from "../lib/favoriteShopsStorage.js";
import {
  disablePushForShop,
  enablePushForShop,
  isPushEnabledForShop,
  readSubscribedShopIds,
  SHOP_PUSH_SUBSCRIBERS_CHANGED,
  toggleSubscribedShop
} from "../lib/shopPushStorage.js";
import { getStoryIdByRoomId } from "../lib/shopCatalog.js";
import {
  HQ_HOME_LAYOUT_CHANGED,
  mergeHomeLayout,
  readCachedHomeLayout,
  writeCachedHomeLayout
} from "../lib/homeLayoutConfig.js";
import { fetchPublicHomeLayout } from "../lib/hqAdminApi.js";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import HomeBizDirectorySearch from "./HomeBizDirectorySearch.jsx";
import CallBigPushPreviewSection from "./CallBigPushPreviewSection.jsx";
import FriendShowcaseList from "./FriendShowcaseList.jsx";
import HomeNotificationPanel from "./HomeNotificationPanel.jsx";
import { v1AppShell } from "../lib/v1ReleaseScope.js";

/** 상단 공식 광고 배너 — 샘플(이미지·문구는 교체 가능) / 배지 VLUE 공식 + 부가 라벨 */
const OFFICIAL_BANNERS = [
  {
    id: "ad-myeonggyeong",
    subLabel: "의료",
    title: "성주 명경체용양병원",
    tagline: "정형·재활·체형교정, 성주 지역 맞춤 케어",
    cta: "병원 소개",
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80",
    fallbackGradient: "from-slate-800 via-blue-900 to-slate-900"
  },
  {
    id: "ad-jhtc",
    subLabel: "글로벌 HR",
    title: "JHTC 글로벌 네트워크 센터",
    tagline: "캄보디아 기술학교 연계 · 교육·파견·채용",
    cta: "사업 안내",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
    fallbackGradient: "from-indigo-900 via-slate-900 to-emerald-900"
  },
  {
    id: "ad-humancurating",
    subLabel: "PG",
    title: "휴먼큐레이팅 (PG사)",
    tagline: "결제·정산 자동화 파트너",
    cta: "서비스 소개",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80",
    fallbackGradient: "from-slate-900 via-blue-950 to-violet-950"
  }
];

/** 추천 광고 — 카드 뉴스 큐레이션 */
const RECOMMENDED = [
  { id: "r1", tag: "동네", title: "강남역 야경 카페 5곳", desc: "AI가 골랐어요 · 오늘의 픽", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80" },
  { id: "r2", tag: "전국", title: "이번 주 핫한 보안 트렌드", desc: "큐레이션 · 3분 요약", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" },
  { id: "r3", tag: "동네", title: "역삼 골목 맛집 지도", desc: "거리 기반 추천", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80" }
];

/** 업데이트(구독/친구/추천) — 스토리 + 미니 활동 */
const UPDATE_SHOPS_BY_TAB = {
  subscribe: [
  { id: "s1", roomId: "soul-cafe", name: "Soul Cafe", avatar: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80", hasNew: true },
  { id: "s2", roomId: "blue-repair", name: "블루정비", avatar: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&q=80", hasNew: true },
  { id: "s3", roomId: "career-center", name: "커리어센터", avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&q=80", hasNew: false },
  { id: "s4", roomId: "soul-cafe", name: "VLUE Store", avatar: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&q=80", hasNew: true }
  ],
  friends: [
    { id: "f1", roomId: "friend-kim", name: "김친구", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80", hasNew: true },
    { id: "f2", roomId: "brother", name: "동생", avatar: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=200&q=80", hasNew: false }
  ],
  recommend: [
    { id: "r1", roomId: "blue-repair", name: "블루 추천관", avatar: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&q=80", hasNew: true },
    { id: "r2", roomId: "soul-cafe", name: "오늘의 픽", avatar: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=200&q=80", hasNew: true }
  ]
};

const UPDATE_POSTS_BY_TAB = {
  subscribe: [
  { id: "p1", shopId: "s1", roomId: "soul-cafe", shop: "Soul Cafe", time: "2시간 전", title: "신메뉴 오트 라떼 출시", thumb: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80" },
  { id: "p2", shopId: "s2", roomId: "blue-repair", shop: "역삼 블루정비", time: "5시간 전", title: "겨울 점검 패키지 안내", thumb: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80" },
  { id: "p3", shopId: "s3", roomId: "career-center", shop: "강남 커리어센터", time: "어제", title: "채용 설명회 라이브 다시보기", thumb: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80" }
  ],
  friends: [
    { id: "fp1", shopId: "f1", roomId: "friend-kim", shop: "김친구", time: "1시간 전", title: "주말 풋살 멤버 모집", thumb: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80" },
    { id: "fp2", shopId: "f2", roomId: "brother", shop: "동생", time: "3시간 전", title: "동네 신상 분식집 후기", thumb: "https://images.unsplash.com/photo-1562967916-eb82221dfb36?w=400&q=80" }
  ],
  recommend: [
    { id: "rp1", shopId: "r1", roomId: "blue-repair", shop: "블루 추천관", time: "방금", title: "오늘의 추천 테마 모음", thumb: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80" },
    { id: "rp2", shopId: "r2", roomId: "soul-cafe", shop: "오늘의 픽", time: "4시간 전", title: "이번 주 인기 활동 TOP", thumb: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=400&q=80" }
  ]
};

const CATEGORY_CONFIG = [
  { id: "food", label: "식음료", emoji: "☕", tone: "from-amber-500 to-orange-600", subcats: ["커피", "중식", "브런치", "레스토랑", "패스트푸드", "야식", "분식", "한식", "치킨", "피자"] },
  { id: "beautyFashion", label: "뷰티·패션", emoji: "✨", tone: "from-pink-500 to-rose-600", subcats: ["여성의류", "남성의류", "브랜드", "네일", "올리브영", "선케어", "태닝", "왁싱", "미용실"] },
  { id: "education", label: "교육", emoji: "📚", tone: "from-blue-500 to-indigo-600", subcats: ["태권도", "영수학원", "과외", "인터넷강의", "초등교육", "중등교육", "고등교육", "교육과제물"] },
  { id: "repair", label: "정비", emoji: "🔧", tone: "from-slate-600 to-slate-800", subcats: ["자동차정비", "이륜차정비", "튜닝", "용품"] },
  { id: "recruit", label: "채용", emoji: "💼", tone: "from-emerald-500 to-teal-600", subcats: ["공식 채용정보", "구인업체", "구직지원"] },
  { id: "medical", label: "의료", emoji: "🏥", tone: "from-cyan-500 to-blue-600", subcats: ["종합병원", "대학병원", "요양병원", "소아과", "내과", "외과", "피부과", "성형외과"] }
];

const CATEGORY_BUSINESSES = [
  { id: "biz-food-1", categoryId: "food", subcat: "커피", name: "소울 커피 로스터스", popular: 97, distance: 0.2, rating: 4.9, likes: 2210, roomId: "subscribe:soul-cafe", phone: "0212345678", address: "서울 강남구 테헤란로 12", intro: "스페셜티 원두와 브런치가 강점인 카페", menu: ["시그니처 라떼", "플랫화이트", "바질 샌드위치"], img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=80" },
  { id: "biz-food-2", categoryId: "food", subcat: "중식", name: "청담 만리장성", popular: 88, distance: 0.8, rating: 4.6, likes: 980, roomId: "friends:friend-kim", phone: "0277771111", address: "서울 강남구 청담동 100", intro: "직화 짜장과 탕수육이 인기인 중식당", menu: ["유니짜장", "탕수육", "고추잡채"], img: "https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?w=900&q=80" },
  { id: "biz-beauty-1", categoryId: "beautyFashion", subcat: "미용실", name: "청담 헤어 라운지", popular: 98, distance: 0.3, rating: 4.9, likes: 1240, roomId: "subscribe:blue-repair", phone: "0211112222", address: "서울 강남구 청담로 21", intro: "예약 기반 프리미엄 헤어 디자인", menu: ["컷/펌", "컬러", "클리닉"], img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80" },
  { id: "biz-edu-1", categoryId: "education", subcat: "영수학원", name: "강남 영수 에이스", popular: 90, distance: 1.4, rating: 4.7, likes: 760, roomId: "friends:brother", phone: "0233334444", address: "서울 강남구 역삼동 77", intro: "초중고 영수 집중 코칭", menu: ["중등 수학", "고등 영어", "내신 대비"], img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80" },
  { id: "biz-repair-1", categoryId: "repair", subcat: "자동차정비", name: "블루 모터스", popular: 95, distance: 0.6, rating: 4.8, likes: 1120, roomId: "subscribe:blue-repair", phone: "0244445555", address: "서울 강남구 논현로 90", intro: "국산/수입차 경정비 전문", menu: ["엔진오일", "브레이크 점검", "타이어 정렬"], img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=900&q=80" },
  { id: "biz-recruit-1", categoryId: "recruit", subcat: "공식 채용정보", name: "커리어 센터", popular: 89, distance: 1.2, rating: 4.7, likes: 680, roomId: "subscribe:career-center", phone: "0255556666", address: "서울 강남구 선릉로 55", intro: "공식 채용공고와 면접 매칭 지원", menu: ["채용 상담", "이력서 코칭", "면접 대비"], img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80" },
  { id: "biz-med-1", categoryId: "medical", subcat: "내과", name: "강남 메디컬 내과", popular: 94, distance: 0.5, rating: 4.8, likes: 920, roomId: "work:park", phone: "0266667777", address: "서울 강남구 강남대로 130", intro: "건강검진과 만성질환 진료 중심", menu: ["검진센터", "내과진료", "영양수액"], img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=80" }
];
const LOCAL_STORES_BASE = [
  {
    id: "l1",
    name: "청담 헤어 라운지",
    distance: 0.3,
    popular: 98,
    rating: 4.9,
    likes: 1240,
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80",
    tag: "오늘의 매장",
    roomId: "friends:friend-kim",
    reviews: ["\"컬러 고민 상담이 꼼꼼했어요. 결과도 만족!\" — 최**", "\"예약부터 시술까지 깔끔하게 진행돼요. 재방문 각입니다.\" — 한**"]
  },
  {
    id: "l2",
    name: "역삼 브런치 하우스",
    distance: 0.6,
    popular: 92,
    rating: 4.7,
    likes: 980,
    img: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&q=80",
    tag: "인기",
    roomId: "subscribe:soul-cafe",
    reviews: ["\"수요일 오전에도 웨이팅 있을 정도예요. 플레이팅 예쁩니다.\" — 박**", "\"가성비 좋고 메뉴 설명도 친절해요.\" — 이**"]
  },
  {
    id: "l3",
    name: "강남 필라테스",
    distance: 1.1,
    popular: 88,
    rating: 4.8,
    likes: 860,
    img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80",
    tag: "주변",
    roomId: "friends:brother",
    reviews: ["\"초급 클래스도 자세 교정 디테일이 좋아요.\" — 정**", "\"시설 쾌적하고 강사님 진행 속도 적당했어요.\" — 문**"]
  },
  {
    id: "l4",
    name: "논현 꽃집 블루",
    distance: 1.4,
    popular: 95,
    rating: 4.6,
    likes: 770,
    img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&q=80",
    tag: "추천",
    roomId: "subscribe:blue-repair",
    reviews: ["\"당일 꽃다발도 신선하게 맞춰주셔서 행사에 잘 썼어요.\" — 강**", "\"포장 깔끔하고 카드까지 챙겨 주셔서 선물하기 좋아요.\" — 송**"]
  }
];

const GAP_PX = 12;
const AUTO_MS = 5200;
const BLUE_CONSULT_ROOM_ID = "blue-repair";
const DASHBOARD_PAGE_SIZE = 10;
const CATEGORY_EXPOSE_POSTS_KEY = "vlue_category_exposed_posts_v1";
const DASHBOARD_STORAGE_KEY = "vlue_main_dashboard_metrics_v1";
const FIRST_GUIDE_KEY = "vlue_first_30s_guide_done_v1";
const TOP_INFO_BANNERS = [
  {
    id: "vlue-guide",
    badge: "서비스소개",
    title: "VLUE 100% 활용법",
    desc: "",
    cta: "상세보기"
  },
  {
    id: "voice-phishing",
    badge: "NEWS",
    title: "최근 보이스피싱 사칭사례",
    desc: "실제 사칭 패턴과 대응법을 확인하세요.",
    cta: "상세보기"
  },
  {
    id: "updates-detail",
    badge: "업데이트",
    title: "업데이트 내용 상세보기",
    desc: "",
    cta: "상세보기"
  }
];
const GUIDE_FEATURES = [
  {
    id: "digital-bizcard",
    title: "디지털인증명함 (전화 한 통이 홍보가 되는 공간)",
    detail:
      "통화 화면에 VLUE 인증 디지털명함이 노출되어 상대가 이름·직함·연락처·소개를 바로 확인합니다. 단순 전화가 신뢰 기반 홍보·상담 접점으로 이어지고, 사칭·피싱 의심을 줄이는 데도 도움이 됩니다.",
    actionLabel: "디지털인증명함 설정으로 이동"
  },
  {
    id: "family-protection",
    title: "가족 보호 시스템 (부모·자녀 안심 모니터링)",
    detail:
      "보호자와 자녀(피보호자)를 연결해 통화·부재중·앱 미접속, 원격제어 앱·유해 링크, 계좌 동의 후 입출금 알림(오픈뱅킹·임계치·미등록 상대)을 한곳에서 관리합니다. 정부기관 번호(112·119·1332 등)는 자동 분류되며, Android 앱에서는 통화 기록·원격앱 감지 브릿지를 지원합니다.",
    actionLabel: "가족 보호 등록으로 이동"
  },
  {
    id: "direct-chat",
    title: "고객과의 다이랙트 소통 (1:1채팅)",
    detail:
      "관심 고객과 바로 1:1 상담을 시작하고, 문의·답변 이력을 한곳에서 관리해 재문의 대응 속도를 높일 수 있습니다.",
    actionLabel: "채팅목록(구독)으로 이동"
  },
  {
    id: "live",
    title: "라이브방송 (실시간매출극대화)",
    detail:
      "방송 중 실시간 안내/프로모션/구매 유도를 동시에 진행해 관심 전환을 즉시 매출로 연결할 수 있습니다.",
    actionLabel: "쇼핑으로 이동"
  },
  {
    id: "hotplace",
    title: "저렴한 광고 (AI기반 동네핫플레이스 기능)",
    detail:
      "AI 추천 기반으로 지역 사용자에게 우선 노출되어 대형 광고비 없이도 우리동네 타깃 고객 유입을 만들 수 있습니다.",
    actionLabel: "내 활동으로 이동"
  },
  {
    id: "pricing",
    title: "V1 출시 기념 — 유료 월 9,900원 (정가 28,300원 65% 할인)",
    detail:
      "블루 쇼케이스·디지털 인증명함·가족보호. 연간 99,000원(2개월 추가 무료). B2B 직원 회선 이벤트 5,200원 · SOHO 송출 옵션 +4,200원.",
    actionLabel: "멤버십 안내로 이동"
  },
  {
    id: "certification",
    title: "강력한 인증시스템 (보이스피싱 사칭을 예방하는 시스템)",
    detail:
      "인증된 프로필/명함 기반으로 상대 신뢰 정보를 확인해 사칭 계정 및 피싱 위험을 낮추고, 안심 소통 환경을 제공합니다.",
    actionLabel: ""
  }
];

const DEFAULT_DASHBOARD_METRICS = {
  deliveredToday: 0,
  cardViews: 0,
  opened: 0,
  saved: 0,
  recallClicks: 0,
  promoSends: 0,
  shopClicks: 0
};

/** 가로 스크롤만 조작 (세로 페이지 스크롤에 영향 없음) + PC 드래그 */
function scrollHToIndex(el, index) {
  if (!el || !el.children.length) return 0;
  let left = 0;
  const n = Math.min(Math.max(index, 0), el.children.length - 1);
  for (let j = 0; j < n; j += 1) {
    left += el.children[j].offsetWidth + GAP_PX;
  }
  el.scrollTo({ left, behavior: "smooth" });
  return left;
}

function useDragScroll(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastTs = 0;
    let velocity = 0;
    let momentumRaf = 0;

    const stopMomentum = () => {
      if (!momentumRaf) return;
      cancelAnimationFrame(momentumRaf);
      momentumRaf = 0;
    };

    const runMomentum = () => {
      stopMomentum();
      // 가속도를 살짝 키워 손맛을 주고 점진 감속
      let v = velocity * 22;
      const tick = () => {
        el.scrollLeft += v;
        v *= 0.92;
        if (Math.abs(v) < 0.2) {
          momentumRaf = 0;
          return;
        }
        momentumRaf = requestAnimationFrame(tick);
      };
      momentumRaf = requestAnimationFrame(tick);
    };

    const onDown = (e) => {
      if (e.button !== 0) return;
      stopMomentum();
      dragging = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      lastX = e.clientX;
      lastTs = performance.now();
      velocity = 0;
      el.classList.add("is-dragging");
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (Math.abs(velocity) > 0.015) runMomentum();
    };
    const onMove = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      el.scrollLeft = startScroll - dx;
      const now = performance.now();
      const dt = now - lastTs;
      if (dt > 0) {
        const instant = (lastX - e.clientX) / dt;
        velocity = velocity * 0.75 + instant * 0.25;
      }
      lastX = e.clientX;
      lastTs = now;
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", end);
    el.addEventListener("mouseleave", end);
    return () => {
      stopMomentum();
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", end);
      el.removeEventListener("mouseleave", end);
    };
  }, [ref]);
}

function SectionHeader({ title, subtitle, right, subtitleClassName }) {
  return (
    <div className="vlue-section-header mb-2">
      <div className="vlue-section-header__text">
        <h2 className="vlue-fluid-title font-black tracking-tight text-gray-900">{title}</h2>
        {subtitle ? (
          <p
            className={
              subtitleClassName
                ? `vlue-fluid-subtitle mt-0.5 font-bold ${subtitleClassName}`
                : "vlue-fluid-subtitle mt-0.5 font-bold uppercase tracking-wide text-gray-400"
            }
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="vlue-section-header__aside">{right}</div> : null}
    </div>
  );
}

/** 가로 스냅 캐러셀 트랙 — 터치 + PC 마우스 드래그
 *  glowSafe: 스토리 링 box-shadow가 스크롤 박스에 직각으로 잘리지 않게 py/px 패딩(세로는 overflow-y-hidden 미사용) */
function HCarousel({ children, className = "", glowSafe = false }) {
  const scrollRef = useRef(null);
  useDragScroll(scrollRef);
  const overflowClasses = glowSafe
    ? "overflow-x-auto py-2 px-2"
    : "overflow-x-auto overflow-y-hidden pb-0.5";
  return (
    <div
      ref={scrollRef}
      className={`home-h-carousel home-drag-scroll no-scrollbar flex snap-x snap-proximity gap-3 ${overflowClasses} ${className}`}
      style={{ scrollPaddingInline: "0.5rem" }}
    >
      {children}
    </div>
  );
}

function Home({
  onOpenStoryTarget,
  onOpenBlueConsultRoom,
  onOpenBusinessRoom,
  onOpenGuideFeature,
  onOpenFamilyProtection,
  onOpenMyPageFeed,
  onOpenFriendSearch,
  catalogFriends = [],
  contactMatchData = null,
  membershipTier = "free",
  isDarkMode = false,
  browseAsGuest = false
}) {
  const membershipKind = normalizeMembershipKind(membershipTier);
  const isPaidUser = isPaidMembershipKind(membershipKind);
  const [feedNickTick, setFeedNickTick] = useState(0);
  const [publishedLayout, setPublishedLayout] = useState(
    () => readCachedHomeLayout() || mergeHomeLayout(null)
  );
  const feedDisplayLabel = useMemo(() => getFeedDisplayName("회원"), [feedNickTick]);
  useEffect(() => {
    let cancelled = false;
    fetchPublicHomeLayout().then((layout) => {
      if (cancelled) return;
      if (layout) {
        const merged = mergeHomeLayout(layout);
        setPublishedLayout(merged);
        writeCachedHomeLayout(merged);
        return;
      }
      setPublishedLayout((prev) => prev || readCachedHomeLayout() || mergeHomeLayout(null));
    });
    const onLayout = (ev) => {
      const next = ev.detail || readCachedHomeLayout() || mergeHomeLayout(null);
      setPublishedLayout(next);
    };
    window.addEventListener(HQ_HOME_LAYOUT_CHANGED, onLayout);
    return () => {
      cancelled = true;
      window.removeEventListener(HQ_HOME_LAYOUT_CHANGED, onLayout);
    };
  }, []);
  const officialBanners = publishedLayout?.vluePick?.length ? publishedLayout.vluePick : OFFICIAL_BANNERS;
  const recommendedItems = publishedLayout?.aiRecommend?.length ? publishedLayout.aiRecommend : RECOMMENDED;
  const layoutHotPlaces = publishedLayout?.hotPlaces;
  const layoutCategories = publishedLayout?.categories;
  const categoryConfig = useMemo(() => {
    if (!layoutCategories?.length) return CATEGORY_CONFIG;
    return CATEGORY_CONFIG.map((c) => {
      const pub = layoutCategories.find((x) => x.id === c.id);
      return pub ? { ...c, label: pub.label, emoji: pub.emoji } : c;
    });
  }, [layoutCategories]);
  useEffect(() => {
    const h = () => setFeedNickTick((n) => n + 1);
    window.addEventListener("vlue-nicknames-changed", h);
    return () => window.removeEventListener("vlue-nicknames-changed", h);
  }, []);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [topInfoIndex, setTopInfoIndex] = useState(0);
  const bannerScrollRef = useRef(null);
  const topInfoScrollRef = useRef(null);
  const skipBannerScrollFxRef = useRef(false);
  const skipTopInfoScrollFxRef = useRef(false);
  useDragScroll(bannerScrollRef);
  useDragScroll(topInfoScrollRef);
  const [dashboardMetrics, setDashboardMetrics] = useState(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!raw) return DEFAULT_DASHBOARD_METRICS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DASHBOARD_METRICS, ...(parsed || {}) };
    } catch {
      return DEFAULT_DASHBOARD_METRICS;
    }
  });
  const [activeDetailId, setActiveDetailId] = useState("");
  const [activeGuideIdx, setActiveGuideIdx] = useState(-1);
  const [showFirstGuide, setShowFirstGuide] = useState(false);

  const [localSort, setLocalSort] = useState("popular");
  const [apiAdStores, setApiAdStores] = useState([]);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [adToast, setAdToast] = useState("");
  /** 우리동네 핫플레이스 — 리뷰 모달 (store id) */
  const [hotplaceReviewStoreId, setHotplaceReviewStoreId] = useState("");

  const loadLocalAds = useCallback(async () => {
    try {
      const { ads } = await fetchLocalAds();
      setApiAdStores(ads.map((ad, i) => mapLocalAdToStoreCard(ad, i)));
    } catch {
      setApiAdStores([]);
    }
  }, []);

  useEffect(() => {
    loadLocalAds();
  }, [loadLocalAds]);

  useEffect(() => {
    const bump = () => setFavoriteTick((n) => n + 1);
    window.addEventListener(FAVORITE_SHOPS_CHANGED, bump);
    window.addEventListener(SHOP_PUSH_SUBSCRIBERS_CHANGED, bump);
    window.addEventListener("vlue-subscribe-shops-changed", bump);
    return () => {
      window.removeEventListener(FAVORITE_SHOPS_CHANGED, bump);
      window.removeEventListener(SHOP_PUSH_SUBSCRIBERS_CHANGED, bump);
      window.removeEventListener("vlue-subscribe-shops-changed", bump);
    };
  }, []);

  useEffect(() => {
    const onFocusUpdateStory = (ev) => {
      const tab = ev?.detail?.tab;
      if (tab === "subscribe" || tab === "friends" || tab === "recommend") setUpdateTab(tab);
      else setUpdateTab("subscribe");
      requestAnimationFrame(() => {
        updateStorySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    window.addEventListener("vlue-home-focus-update-story", onFocusUpdateStory);
    return () => window.removeEventListener("vlue-home-focus-update-story", onFocusUpdateStory);
  }, []);

  useEffect(() => {
    if (!adToast) return;
    const t = setTimeout(() => setAdToast(""), 2800);
    return () => clearTimeout(t);
  }, [adToast]);

  const handleOpenLocalAdRegister = () => {
    if (!isPaidUser) {
      setAdToast("유료 구독 회원 전용 기능입니다.");
      setUpgradeOpen(true);
      return;
    }
    setAdModalOpen(true);
  };

  const handleAdRegistered = () => {
    loadLocalAds();
    setAdToast("지역 광고가 신청되었습니다. AI 송출 기준에 따라 핫플레이스에 노출됩니다.");
  };
  const [categoryId, setCategoryId] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [categoryBoardOpen, setCategoryBoardOpen] = useState(false);
  const [categoryBoardPage, setCategoryBoardPage] = useState(1);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [categoryExposedPosts, setCategoryExposedPosts] = useState(() => {
    try {
      const raw = localStorage.getItem(CATEGORY_EXPOSE_POSTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const categoryScrollRef = useRef(null);
  const updateStorySectionRef = useRef(null);
  const [favoriteTick, setFavoriteTick] = useState(0);
  const [updateTab, setUpdateTab] = useState(browseAsGuest ? "recommend" : "subscribe");
  const [selectedStoryId, setSelectedStoryId] = useState(() => UPDATE_SHOPS_BY_TAB.subscribe?.[0]?.id || "");
  /** 스토리 행에서 한 번 탭해 연 스토어 id — 인스타처럼 본 뒤 링은 연블루(그라데이션 해제). 선택만으로는 그라데이션 유지하지 않음 */
  const [openedUpdateStoryIds, setOpenedUpdateStoryIds] = useState(() => new Set());

  const activeCategory = useMemo(() => categoryConfig.find((c) => c.id === categoryId) || null, [categoryId, categoryConfig]);
  const activeSubcats = activeCategory?.subcats || [];
  const filteredBusinesses = useMemo(() => {
    if (!categoryId) return [];
    const merged = [
      ...CATEGORY_BUSINESSES,
      ...categoryExposedPosts.map((p) => ({
        ...p,
        id: p.id || `cp-${Math.random().toString(36).slice(2)}`,
        rating: Number(p.rating || 4.5),
        likes: Number(p.likes || 0),
        popular: Number(p.popular || 80),
        distance: Number(p.distance || 0.5),
        menu: Array.isArray(p.menu) ? p.menu : [],
        intro: String(p.intro || ""),
        name: String(p.name || "활동 등록 업체"),
        img: String(p.img || "")
      }))
    ];
    const arr = merged.filter((b) => b.categoryId === categoryId && (!subCategory || b.subcat === subCategory));
    arr.sort((a, b) => a.distance - b.distance);
    return arr;
  }, [categoryId, subCategory, categoryExposedPosts]);
  const categoryBoardPages = Math.max(1, Math.ceil(filteredBusinesses.length / DASHBOARD_PAGE_SIZE));
  const categoryBoardItems = useMemo(() => {
    const start = (categoryBoardPage - 1) * DASHBOARD_PAGE_SIZE;
    return filteredBusinesses.slice(start, start + DASHBOARD_PAGE_SIZE);
  }, [filteredBusinesses, categoryBoardPage]);
  const selectedBusiness = useMemo(
    () => CATEGORY_BUSINESSES.find((b) => b.id === selectedBusinessId) || null,
    [selectedBusinessId]
  );
  const localStores = useMemo(() => {
    const base = layoutHotPlaces?.length
      ? layoutHotPlaces.map((h) => ({
          ...h,
          popular: h.popular ?? 90,
          reviews: h.reviews || []
        }))
      : LOCAL_STORES_BASE;
    const arr = [...apiAdStores, ...base];
    if (localSort === "distance") {
      arr.sort((a, b) => a.distance - b.distance);
    } else {
      arr.sort((a, b) => b.popular - a.popular);
    }
    return arr;
  }, [localSort, apiAdStores, layoutHotPlaces]);

  const hotplaceReviewTarget = useMemo(
    () => localStores.find((s) => s.id === hotplaceReviewStoreId) || null,
    [localStores, hotplaceReviewStoreId]
  );

  const within24Hours = useCallback((timeLabel = "") => {
    if (!timeLabel) return false;
    if (timeLabel.includes("방금")) return true;
    const hMatch = timeLabel.match(/(\d+)\s*시간/);
    if (hMatch) return Number(hMatch[1]) <= 24;
    const mMatch = timeLabel.match(/(\d+)\s*분/);
    if (mMatch) return true;
    return false;
  }, []);

  const guestMergedUpdatePosts = useMemo(() => {
    if (!browseAsGuest) return [];
    const seen = new Set();
    const merged = [];
    for (const tab of ["recommend", "subscribe", "friends"]) {
      for (const post of UPDATE_POSTS_BY_TAB[tab] || []) {
        if (seen.has(post.id) || !within24Hours(post.time)) continue;
        seen.add(post.id);
        merged.push(post);
      }
    }
    return merged;
  }, [browseAsGuest, within24Hours]);

  const currentUpdatePosts = useMemo(() => {
    if (browseAsGuest) return guestMergedUpdatePosts;
    return (UPDATE_POSTS_BY_TAB[updateTab] || []).filter((p) => within24Hours(p.time));
  }, [browseAsGuest, guestMergedUpdatePosts, updateTab, within24Hours]);

  const subscribedShopIds = useMemo(() => readSubscribedShopIds(), [favoriteTick]);

  const currentUpdateShops = useMemo(() => {
    const shopSet = new Set(currentUpdatePosts.map((p) => p.shopId));
    if (browseAsGuest) {
      const seen = new Set();
      const merged = [];
      for (const tab of ["recommend", "subscribe", "friends"]) {
        for (const shop of UPDATE_SHOPS_BY_TAB[tab] || []) {
          if (seen.has(shop.id) || !shopSet.has(shop.id)) continue;
          seen.add(shop.id);
          merged.push(shop);
        }
      }
      return merged;
    }
    let shops = (UPDATE_SHOPS_BY_TAB[updateTab] || []).filter((s) => shopSet.has(s.id));
    if (updateTab === "subscribe" && subscribedShopIds.length > 0) {
      const subSet = new Set(subscribedShopIds);
      const picked = shops.filter((s) => subSet.has(s.id));
      if (picked.length > 0) shops = picked;
    }
    return shops;
  }, [browseAsGuest, updateTab, currentUpdatePosts, subscribedShopIds]);

  useEffect(() => {
    if (!currentUpdateShops.length) return;
    setSelectedStoryId((prev) => {
      if (currentUpdateShops.some((s) => s.id === prev)) return prev;
      return currentUpdateShops[0].id;
    });
  }, [currentUpdateShops]);

  const selectedStory = useMemo(
    () => currentUpdateShops.find((s) => s.id === selectedStoryId) || currentUpdateShops[0],
    [selectedStoryId, currentUpdateShops]
  );
  const selectedStoryPosts = useMemo(() => {
    const list = currentUpdatePosts.filter((p) => p.shopId === selectedStory?.id);
    return list.length ? list : currentUpdatePosts;
  }, [selectedStory, currentUpdatePosts]);

  const goBanner = useCallback((idx) => {
    const n = officialBanners.length;
    const i = ((idx % n) + n) % n;
    setBannerIndex(i);
  }, []);
  useEffect(() => {
    if (!activeSubcats.length) {
      setSubCategory("");
      return;
    }
    setSubCategory((prev) => (activeSubcats.includes(prev) ? prev : ""));
  }, [activeSubcats]);
  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(CATEGORY_EXPOSE_POSTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setCategoryExposedPosts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCategoryExposedPosts([]);
      }
    };
    window.addEventListener("vlue-category-posts-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vlue-category-posts-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    setCategoryBoardPage(1);
  }, [categoryId, subCategory]);
  const goTopInfo = useCallback((idx) => {
    const n = TOP_INFO_BANNERS.length;
    const i = ((idx % n) + n) % n;
    setTopInfoIndex(i);
  }, []);

  useEffect(() => {
    if (skipBannerScrollFxRef.current) {
      skipBannerScrollFxRef.current = false;
      return;
    }
    const root = bannerScrollRef.current;
    if (!root || !root.children[bannerIndex]) return;
    requestAnimationFrame(() => {
      scrollHToIndex(root, bannerIndex);
    });
  }, [bannerIndex]);
  useEffect(() => {
    if (skipTopInfoScrollFxRef.current) {
      skipTopInfoScrollFxRef.current = false;
      return;
    }
    const root = topInfoScrollRef.current;
    if (!root || !root.children[topInfoIndex]) return;
    requestAnimationFrame(() => {
      scrollHToIndex(root, topInfoIndex);
    });
  }, [topInfoIndex]);

  const syncBannerIndexFromScroll = useCallback(() => {
    const root = bannerScrollRef.current;
    if (!root || !root.children.length) return;
    const scrollLeft = root.scrollLeft;
    let acc = 0;
    let best = 0;
    let bestDist = Infinity;
    for (let j = 0; j < root.children.length; j += 1) {
      const dist = Math.abs(scrollLeft - acc);
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
      acc += root.children[j].offsetWidth + GAP_PX;
    }
    setBannerIndex((prev) => {
      if (best === prev) return prev;
      skipBannerScrollFxRef.current = true;
      return best;
    });
  }, []);

  useEffect(() => {
    const root = bannerScrollRef.current;
    if (!root) return undefined;
    let t;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(syncBannerIndexFromScroll, 80);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      root.removeEventListener("scroll", onScroll);
    };
  }, [syncBannerIndexFromScroll]);
  useEffect(() => {
    const root = topInfoScrollRef.current;
    if (!root) return undefined;
    let t;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const scrollLeft = root.scrollLeft;
        let acc = 0;
        let best = 0;
        let bestDist = Infinity;
        for (let j = 0; j < root.children.length; j += 1) {
          const dist = Math.abs(scrollLeft - acc);
          if (dist < bestDist) {
            bestDist = dist;
            best = j;
          }
          acc += root.children[j].offsetWidth + GAP_PX;
        }
        setTopInfoIndex((prev) => {
          if (best === prev) return prev;
          skipTopInfoScrollFxRef.current = true;
          return best;
        });
      }, 80);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      root.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setBannerIndex((p) => (p + 1) % officialBanners.length);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      setTopInfoIndex((p) => (p + 1) % TOP_INFO_BANNERS.length);
    }, 4600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(dashboardMetrics));
    } catch {
      /* noop */
    }
  }, [dashboardMetrics]);
  useEffect(() => {
    const onMetric = (e) => {
      const kind = e?.detail?.kind;
      if (!kind) return;
      setDashboardMetrics((prev) => {
        if (kind === "card_sent") return { ...prev, deliveredToday: prev.deliveredToday + 1 };
        if (kind === "card_viewed") return { ...prev, cardViews: prev.cardViews + 1, opened: prev.opened + 1 };
        if (kind === "card_saved") return { ...prev, saved: prev.saved + 1 };
        if (kind === "recall_clicked") return { ...prev, recallClicks: prev.recallClicks + 1 };
        if (kind === "promo_sent") return { ...prev, promoSends: prev.promoSends + 1 };
        if (kind === "shop_clicked") return { ...prev, shopClicks: prev.shopClicks + 1 };
        return prev;
      });
    };
    window.addEventListener("vlue-kpi-event", onMetric);
    return () => window.removeEventListener("vlue-kpi-event", onMetric);
  }, []);
  useEffect(() => {
    try {
      if (localStorage.getItem(FIRST_GUIDE_KEY) === "done") return;
    } catch {
      /* noop */
    }
    const t = window.setTimeout(() => setShowFirstGuide(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const detailContent = useMemo(() => {
    if (activeDetailId === "voice-phishing") {
      return {
        title: "최근 보이스피싱 사칭사례",
        lines: [
          "기관·금융사를 사칭해 앱 설치를 유도하는 사례가 늘고 있습니다.",
          "전화 중 링크 설치 요청은 즉시 종료하고, 공식 번호로 재확인하세요.",
          "VLUE에서는 인증명함으로 상대 신뢰 정보를 먼저 확인하세요."
        ]
      };
    }
    if (activeDetailId === "updates-detail") {
      return {
        title: "업데이트 내용 상세",
        lines: [
          "메인 상단 KPI로 전달/조회/저장/재연락 클릭을 즉시 확인할 수 있습니다.",
          "성과 요약 배너는 탭 방식으로 필요한 정보만 펼쳐서 볼 수 있습니다.",
          "좁은 화면에서도 탭/배너가 깨지지 않도록 반응형 레이아웃을 적용했습니다."
        ]
      };
    }
    if (activeDetailId === "vlue-guide") {
      return {
        title: "VLUE 100% 활용법",
        lines: []
      };
    }
    return { title: "", lines: [] };
  }, [activeDetailId]);

  const openTopInfoDetail = useCallback((id) => {
    setActiveDetailId(id);
    if (id === "vlue-guide") setActiveGuideIdx(-1);
  }, []);

  const v1FriendHomeLayout = v1AppShell.friendShowcaseFeed && !v1AppShell.homeLegacyFeed;

  return (
    <main
      className={`home-main-feed home-main-feed--spaced min-h-0 w-full max-w-none min-w-0 flex-1 flex flex-col overflow-y-auto overflow-x-hidden ${
        v1FriendHomeLayout
          ? "home-main-feed--kakao px-0 pb-[calc(56px+env(safe-area-inset-bottom,0px))] pt-0"
          : "gap-5 px-2.5 pb-32 pt-0"
      }`}
    >
      <div className={v1FriendHomeLayout ? "flex flex-col gap-5 px-2.5 pt-0" : "contents"}>
      {v1AppShell.homeBizSearch ? (
      <HomeBizDirectorySearch
        categoryExposedPosts={categoryExposedPosts}
        onOpenBusinessRoom={onOpenBusinessRoom}
      />
      ) : null}

      {v1AppShell.callBigPush ? <CallBigPushPreviewSection membershipTier={membershipTier} /> : null}
      </div>

      {v1AppShell.friendShowcaseFeed ? (
        <FriendShowcaseList
          variant={v1FriendHomeLayout ? "home" : "card"}
          catalogFriends={catalogFriends}
          contactMatchData={contactMatchData}
          onOpenFriendSearch={browseAsGuest ? undefined : onOpenFriendSearch}
        />
      ) : null}

      {!v1FriendHomeLayout && v1AppShell.notificationInbox && !v1AppShell.notificationBottomNavOnly ? (
        <HomeNotificationPanel onOpenFamilyProtection={onOpenFamilyProtection} />
      ) : null}

      {v1AppShell.homeLegacyFeed ? (
      <>
      <section>
        <div className="relative w-full min-w-0 max-w-full">
          <button
            type="button"
            aria-label="이전 안내 배너"
            onClick={() => goTopInfo(topInfoIndex - 1)}
            className="absolute left-1 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-black/18 text-[11px] font-black text-white/85 backdrop-blur-sm"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="다음 안내 배너"
            onClick={() => goTopInfo(topInfoIndex + 1)}
            className="absolute right-1 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-black/18 text-[11px] font-black text-white/85 backdrop-blur-sm"
          >
            ›
          </button>
          <div
            ref={topInfoScrollRef}
            className="home-drag-scroll no-scrollbar flex w-full min-w-0 snap-x snap-proximity gap-0 overflow-x-auto overflow-y-hidden scroll-smooth pb-1"
            style={{ scrollPaddingInline: 0 }}
          >
            {TOP_INFO_BANNERS.map((item) => (
              <article
                key={item.id}
                className="w-full shrink-0 grow-0 basis-full snap-start rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-4 py-2 text-white shadow-sm box-border"
              >
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-0.5">
                  <div className="min-w-0 text-center">
                    <p className="text-[10px] font-black tracking-wider text-blue-200">{item.badge}</p>
                    <h3 className="mt-0.5 text-[12px] min-[360px]:text-[13px] font-black leading-snug break-keep">{item.title}</h3>
                  </div>
                  <button type="button" onClick={() => openTopInfoDetail(item.id)} className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-[10px] min-[360px]:text-[11px] font-black text-white ring-1 ring-white/30">
                    {item.cta}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-0.5 flex justify-center gap-1.5">
            {TOP_INFO_BANNERS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`안내 배너 ${i + 1}`}
                onClick={() => goTopInfo(i)}
                className={`h-1.5 rounded-full transition-all ${i === topInfoIndex ? "w-5 bg-blue-600" : "w-1.5 bg-slate-300"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {activeDetailId === "vlue-guide" && (
        <section
          className="fixed inset-x-0 top-[48px] bottom-[calc(48px+env(safe-area-inset-bottom,0px))] z-[140] flex w-full max-w-none flex-col bg-[#f8fafc]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActiveDetailId("");
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2.5">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setActiveDetailId("");
              }}
              className="text-[11px] font-semibold text-blue-600"
            >
              닫기
            </button>
            <p className="truncate text-[13px] font-semibold text-gray-900">VLUE 100% 활용법</p>
            <span className="text-[11px] font-semibold text-blue-600">VLUE</span>
          </div>
          <div className="vlue-scroll-pad-bottom-nav flex-1 overflow-y-auto px-3 py-3">
            <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">서비스소개</p>
              <h3 className="mt-1 text-[16px] font-semibold text-slate-900">VLUE 100% 활용법</h3>
              <p className="mt-1 text-[11px] text-slate-500">제목을 탭하면 상세 설명이 열립니다.</p>
              <div className="mt-3 space-y-2">
                {GUIDE_FEATURES.map((item, idx) => {
                  const opened = activeGuideIdx === idx;
                  return (
                    <div key={item.id} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setActiveGuideIdx((prev) => (prev === idx ? -1 : idx))}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      >
                        <p className="text-[12px] font-semibold leading-relaxed text-slate-800">{item.title}</p>
                        <span className="shrink-0 text-[11px] font-semibold text-blue-600">{opened ? "닫기 ▲" : "열기 ▼"}</span>
                      </button>
                      {opened ? (
                        <div className="border-t border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-[12px] font-medium leading-relaxed text-slate-700">{item.detail}</p>
                          {item.actionLabel ? (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenGuideFeature?.(item.id);
                                setActiveDetailId("");
                              }}
                              className="mt-2 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700"
                            >
                              {item.actionLabel}
                            </button>
                          ) : (
                            <p className="mt-2 text-[11px] font-bold text-slate-500">통합시스템 앱 기능 상세내용에서 확인할 수 있습니다.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
      {activeDetailId && activeDetailId !== "vlue-guide" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-5" onMouseDown={() => setActiveDetailId("")}>
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setActiveDetailId("")} />
            <h3 className="text-[16px] font-black text-slate-900">{detailContent.title}</h3>
            <div className="mt-3 space-y-2">
              {detailContent.lines.map((line) => (
                <p key={line} className="text-[12px] font-semibold leading-relaxed text-slate-700">{line}</p>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setActiveDetailId("")} className="rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-black text-white">확인</button>
            </div>
          </div>
        </div>
      )}
      {showFirstGuide && (
        <div className="fixed inset-0 z-[121] flex items-center justify-center bg-black/45 px-5" onMouseDown={() => setShowFirstGuide(false)}>
          <div className="relative w-full max-w-sm rounded-3xl border border-blue-100 bg-white p-5 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setShowFirstGuide(false)} />
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">처음 오셨나요?</p>
            <h3 className="mt-1 text-[16px] font-black text-slate-900">30초 가이드</h3>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-700">
              지금 인증명함 1개만 보내보세요. 전달 이후 조회/저장/재연락 클릭이 상단 KPI에 바로 반영됩니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem(FIRST_GUIDE_KEY, "done"); } catch { /* noop */ }
                  setShowFirstGuide(false);
                }}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[12px] font-black text-slate-600"
              >
                다음에 보기
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem(FIRST_GUIDE_KEY, "done"); } catch { /* noop */ }
                  setShowFirstGuide(false);
                  onOpenBlueConsultRoom?.(BLUE_CONSULT_ROOM_ID);
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white"
              >
                지금 1개 보내보기
              </button>
            </div>
          </div>
        </div>
      )}
      {hotplaceReviewTarget && (
        <div
          className="fixed inset-0 z-[122] flex items-center justify-center bg-black/45 px-5"
          onMouseDown={() => setHotplaceReviewStoreId("")}
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setHotplaceReviewStoreId("")} />
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">우리동네 핫플레이스</p>
            <h3 className="mt-1 text-[16px] font-black text-slate-900">{hotplaceReviewTarget.name} · 방문자 리뷰</h3>
            <div className="mt-3 space-y-2.5">
              {(hotplaceReviewTarget.reviews || []).map((line) => (
                <p key={line} className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-slate-700">
                  {line}
                </p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setHotplaceReviewStoreId("")} className="rounded-xl bg-slate-100 px-4 py-2 text-[12px] font-black text-slate-600">
                닫기
              </button>
              {hotplaceReviewTarget.roomId ? (
                <button
                  type="button"
                  onClick={() => {
                    const rid = hotplaceReviewTarget.roomId;
                    setHotplaceReviewStoreId("");
                    onOpenBusinessRoom?.(rid);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-black text-white"
                >
                  매장 연결하기
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* 1. 업데이트 스토리 */}
      <section ref={updateStorySectionRef} className="scroll-mt-3">
        <div className="home-update-story-panel rounded-[1.25rem] border border-sky-200/45 bg-gradient-to-br from-white via-sky-50/55 to-indigo-50/45 p-4 shadow-[0_16px_44px_-18px_rgba(30,58,138,0.22)] ring-1 ring-white/90">
          <SectionHeader
            title="업데이트 스토리"
            subtitle={
              browseAsGuest ? "동네 · 전국 · AI 추천 큐레이션" : `활동 표시명: ${feedDisplayLabel}`
            }
            subtitleClassName="home-update-story-subtitle text-[12px] normal-case tracking-tight text-sky-950/90"
            right={
              browseAsGuest ? (
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                  추천
                </span>
              ) : (
                <div className="home-update-story-tabs vlue-fluid-chip-row rounded-full bg-slate-200/55 p-0.5 font-black ring-1 ring-sky-300/30">
                  <button
                    type="button"
                    onClick={() => setUpdateTab("subscribe")}
                    className={`rounded-full transition ${updateTab === "subscribe" ? "bg-white text-blue-600 shadow-md shadow-blue-900/10" : "text-slate-600"}`}
                  >
                    구독
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateTab("friends")}
                    className={`rounded-full transition ${updateTab === "friends" ? "bg-white text-blue-600 shadow-md shadow-blue-900/10" : "text-slate-600"}`}
                  >
                    친구
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateTab("recommend")}
                    className={`rounded-full transition ${updateTab === "recommend" ? "bg-white text-blue-600 shadow-md shadow-blue-900/10" : "text-slate-600"}`}
                  >
                    추천
                  </button>
                </div>
              )
            }
          />
          {currentUpdateShops.length ? (
            <>
              <HCarousel className="mb-3" glowSafe>
                {currentUpdateShops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStoryId(s.id);
                      setOpenedUpdateStoryIds((prev) => {
                        const next = new Set(prev);
                        next.add(s.id);
                        return next;
                      });
                    }}
                    className="flex shrink-0 snap-start flex-col items-center gap-1.5 outline-none transition-transform duration-200 ease-out active:scale-[0.96]"
                  >
                    <div
                      className={`home-story-ring-outer relative box-border flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-visible rounded-full ${
                        s.hasNew && !openedUpdateStoryIds.has(s.id) ? "home-story-ring-outer--live" : ""
                      }`}
                    >
                      <div className="home-story-ring-face relative z-[1] h-full w-full min-h-0 min-w-0">
                        <img src={s.avatar} alt="" className="h-full w-full object-cover" />
                      </div>
                    </div>
                    <span
                      className={`max-w-[82px] truncate text-center text-[11px] font-bold transition-colors duration-300 ease-out ${
                        selectedStory?.id === s.id ? "home-update-story-pick-name text-rose-700" : "text-slate-800"
                      }`}
                    >
                      {s.name}
                    </span>
                  </button>
                ))}
              </HCarousel>
              <p className="home-update-story-shop-line mb-1 text-[12px] font-semibold normal-case tracking-tight text-sky-900/80">
                {selectedStory ? selectedStory.name : ""}
              </p>
              <HCarousel>
                {selectedStoryPosts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() =>
                      onOpenStoryTarget?.({
                        postId: post.id,
                        shopId: post.shopId,
                        roomId: post.roomId || selectedStory?.roomId,
                        shopName: post.shop || selectedStory?.name || ""
                      })
                    }
                    className="home-feed-card home-update-story-feed-card w-[min(88vw,340px)] snap-start overflow-hidden rounded-2xl border border-sky-100/70 bg-white text-left shadow-md shadow-slate-900/6 active:opacity-95"
                  >
                    <div className="flex h-[124px] gap-2.5 p-3">
                      <img src={post.thumb} alt="" className="h-[100px] w-[100px] shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-[12px] font-bold text-blue-600">{post.shop}</p>
                        <p className="mt-1 line-clamp-2 text-[15px] font-black leading-snug text-gray-900">{post.title}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{post.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </HCarousel>
            </>
          ) : (
            <div>
              <div className="home-update-story-empty rounded-2xl border border-sky-100/90 bg-white/75 px-4 py-3.5 text-center text-[12px] font-semibold text-slate-600 shadow-inner shadow-sky-950/5">
                최근 24시간 이내 업데이트가 없습니다.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. VLUE PICK */}
      <section className="mb-5">
        <SectionHeader title="VLUE PICK" subtitle="VLUE 공식 파트너프로모션" />
        <div className="relative w-full min-w-0 max-w-full">
          <button
            type="button"
            aria-label="이전 배너"
            onClick={() => goBanner(bannerIndex - 1)}
            className="home-banner-arrow absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-lg font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="다음 배너"
            onClick={() => goBanner(bannerIndex + 1)}
            className="home-banner-arrow absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-lg font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50"
          >
            ›
          </button>

          <div
            ref={bannerScrollRef}
            className="home-drag-scroll no-scrollbar flex w-full min-w-0 snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden scroll-smooth pb-1"
            style={{ scrollPaddingInline: 0 }}
          >
            {officialBanners.map((b) => (
              <article
                key={b.id}
                className="home-banner-slide home-official-card flex snap-start shrink-0 flex-col overflow-hidden rounded-[24px] bg-white shadow-md ring-1 ring-gray-100"
              >
                <div className="relative h-[128px] w-full shrink-0 overflow-hidden bg-gray-100">
                  {b.imageUrl ? (
                    <>
                      <img src={b.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" />
                    </>
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${b.fallbackGradient}`} />
                  )}
                  <span className="ad-shield-badge absolute right-2 top-2">
                    AD
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col px-3.5 pb-3 pt-2.5">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">VLUE 공식</span>
                    {b.subLabel && (
                      <span className="text-[10px] font-bold text-gray-400">{b.subLabel}</span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-black leading-snug tracking-tight text-gray-900 break-keep">{b.title}</h3>
                  {b.tagline && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500">{b.tagline}</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-gray-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenBlueConsultRoom?.(BLUE_CONSULT_ROOM_ID)}
                      className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 active:opacity-90"
                    >
                      상담하기
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-black text-white active:opacity-90"
                    >
                      {b.cta || "자세히"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-center gap-1.5 pt-0.5">
            {officialBanners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`배너 ${i + 1}`}
                onClick={() => goBanner(i)}
                className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? "w-6 bg-blue-600" : "w-1.5 bg-gray-300"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. VLUE AI 추천 콘텐츠 */}
      <section className="mb-5 w-full min-w-0">
        <SectionHeader
          title="VLUE AI 추천 콘텐츠"
          subtitle="맞춤큐레이션"
          right={<span className="algorithm-chip rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600">AI</span>}
        />
        <HCarousel>
          {recommendedItems.map((item) => (
            <article
              key={item.id}
              className="home-feed-card snap-start overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm"
            >
              <div className="relative h-36 w-full overflow-hidden">
                <img src={item.img} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">{item.tag}</span>
                <span className="ad-shield-badge absolute right-2 top-2">
                  AD
                </span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-[14px] font-black leading-snug text-gray-900">{item.title}</h3>
                <p className="mt-1 text-[12px] text-gray-500">{item.desc}</p>
              </div>
            </article>
          ))}
        </HCarousel>
      </section>

      <section className="mb-5">
        <SectionHeader
          title="우리동네 핫플레이스"
          subtitle={isPaidUser ? "AI 송출 · 지역·관심도 반영" : "유료 회원 · 상점 피드 게시물 선택"}
          right={
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={handleOpenLocalAdRegister}
                className="rounded-full bg-violet-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm active:scale-[0.99]"
              >
                내 지역 광고 등록하기
              </button>
              <div className="flex items-center gap-2 text-[11px] font-black text-gray-500">
                <button type="button" onClick={() => setLocalSort("popular")} className={localSort === "popular" ? "text-blue-600" : ""}>인기순</button>
                <span>|</span>
                <button type="button" onClick={() => setLocalSort("distance")} className={localSort === "distance" ? "text-blue-600" : ""}>거리순</button>
              </div>
            </div>
          }
        />
        {adToast ? (
          <p className="mb-2 rounded-xl bg-violet-50 px-3 py-2 text-center text-[11px] font-bold text-violet-900">{adToast}</p>
        ) : null}
        <HCarousel>
          {localStores.map((store) => (
            <article
              key={store.id}
              className={`home-feed-card-narrow flex snap-start flex-col overflow-hidden rounded-[22px] border bg-white shadow-sm ${
                store.isUserAd ? "border-violet-200 ring-1 ring-violet-100" : "border-gray-100"
              }`}
            >
              <div className="relative h-28 w-full shrink-0">
                <img src={store.img} alt="" className="h-full w-full object-cover" />
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                    store.isUserAd ? "bg-violet-600/90" : "bg-black/50"
                  }`}
                >
                  {store.tag}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-3 pt-2.5">
                <h3 className="line-clamp-1 text-[13px] font-black text-gray-900">{store.name}</h3>
                <p className="mt-1 text-[11px] font-semibold text-gray-500">
                  {localSort === "distance" ? `${store.distance}km` : `⭐ ${store.rating} · ❤ ${store.likes.toLocaleString()}`}
                </p>
                <button
                  type="button"
                  onClick={() => setHotplaceReviewStoreId(store.id)}
                  className="mt-2 w-full text-left text-[11px] font-black text-blue-600 underline-offset-2 hover:underline active:opacity-85"
                >
                  리뷰보기
                </button>
              </div>
            </article>
          ))}
        </HCarousel>
      </section>

      <section className="mb-4">
        <SectionHeader title="카테고리 조회" subtitle="" />
        <div className="relative">
          <button
            type="button"
            onClick={() => categoryScrollRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 px-2 py-1 text-[13px] font-black text-white"
            aria-label="이전 카테고리"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => categoryScrollRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 px-2 py-1 text-[13px] font-black text-white"
            aria-label="다음 카테고리"
          >
            ›
          </button>
          <div ref={categoryScrollRef} className="home-drag-scroll no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden pb-1">
            {categoryConfig.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`home-cat-card flex shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] bg-gradient-to-br p-3 text-white shadow-md sm:p-4 ${c.tone} min-h-[100px] active:scale-[0.98] sm:min-h-[108px] ${
                  categoryId === c.id ? "ring-4 ring-blue-200" : ""
                }`}
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-center text-[12px] font-black leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {categoryId ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-gray-500">
            {activeSubcats.map((s, idx) => (
              <span key={s} className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubCategory(s);
                    setCategoryBoardOpen(true);
                  }}
                  className={subCategory === s ? "text-blue-600 underline underline-offset-2" : ""}
                >
                  {s}
                </button>
                {idx < activeSubcats.length - 1 ? <span>|</span> : null}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {categoryBoardOpen && (
        <section className="fixed inset-x-0 top-[48px] bottom-[calc(54px+env(safe-area-inset-bottom,0px))] z-[125] flex w-full max-w-none flex-col bg-[#f8fafc]">
          <ScreenBackHeader
            sticky={false}
            title={`${activeCategory.label} · ${subCategory}`}
            onBack={() => {
              if (selectedBusinessId) setSelectedBusinessId("");
              else setCategoryBoardOpen(false);
            }}
            right={
              <button type="button" onClick={() => setCategoryBoardOpen(false)} className="text-[12px] font-black text-blue-600">
                닫기
              </button>
            }
          />
          {!selectedBusinessId ? (
            <>
              <div className="vlue-scroll-pad-bottom-nav flex-1 overflow-y-auto px-3 py-2">
              <div className="space-y-0">
                {categoryBoardItems.map((biz) => {
                  const favorited = isFavoriteShop(biz.id);
                  const shopOwnerKey = `shop:${biz.id}`;
                  const pushOn = isPushEnabledForShop(shopOwnerKey);
                  const storyId = getStoryIdByRoomId(biz.roomId);
                  const subscribed = storyId ? subscribedShopIds.includes(storyId) : false;
                  return (
                  <article
                    key={biz.id}
                    onClick={() => setSelectedBusinessId(biz.id)}
                    className="w-full cursor-pointer border-b border-gray-200 bg-transparent py-3 text-left last:border-b-0"
                  >
                    <div className="flex gap-3">
                      <img src={biz.img} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[14px] font-black text-gray-900">{biz.name}</p>
                        <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={favorited ? "관심상점 해제" : "관심상점 등록"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteShop(biz.id);
                          }}
                          className={`rounded-full p-1.5 ${favorited ? "bg-rose-50 text-rose-600" : "bg-gray-100 text-gray-400"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                            <path
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                              fill={favorited ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        </button>
                        {storyId ? (
                          <button
                            type="button"
                            aria-label={subscribed ? "구독 해제" : "업데이트 스토리 구독"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubscribedShop(storyId);
                              setFavoriteTick((n) => n + 1);
                            }}
                            className={`rounded-full p-1.5 ${subscribed ? "bg-blue-100 ring-1 ring-blue-200" : "bg-gray-100"}`}
                          >
                            <img src={VLUE_SHIELD_LOGO} alt="" className="h-4 w-4 object-contain" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label={pushOn ? "게시물 알림 끄기" : "게시물 알림 받기"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pushOn) disablePushForShop(shopOwnerKey);
                            else {
                              enablePushForShop({
                                ownerKey: shopOwnerKey,
                                shopId: biz.id,
                                shopName: biz.name,
                                displayName: getFeedDisplayName("회원")
                              });
                            }
                            setFavoriteTick((n) => n + 1);
                          }}
                          className={`rounded-full p-1.5 ${pushOn ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill={pushOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </button>
                        </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-600">{biz.intro}</p>
                        <p className="mt-1 text-[11px] text-gray-500">⭐ {biz.rating} · ❤ {biz.likes.toLocaleString()} · {biz.distance}km</p>
                        <p className="mt-1 text-[11px] font-bold text-blue-600">업체보기</p>
                      </div>
                    </div>
                  </article>
                  );
                })}
                {categoryBoardItems.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-5 text-center text-[12px] font-semibold text-gray-500">등록된 상점이 없습니다.</div>
                ) : null}
              </div>
              </div>
              <div className="border-t border-gray-200 bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-black text-gray-500">
                {Array.from({ length: categoryBoardPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <span key={pageNum} className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryBoardPage(pageNum)}
                        className={categoryBoardPage === pageNum ? "text-blue-600" : ""}
                      >
                        {pageNum}
                      </button>
                      {pageNum < categoryBoardPages ? <span>|</span> : null}
                    </span>
                  );
                })}
              </div>
              </div>
            </>
          ) : selectedBusiness ? (
            <div className="vlue-scroll-pad-bottom-nav flex-1 overflow-y-auto px-3 py-2">
            {(() => {
              const favorited = isFavoriteShop(selectedBusiness.id);
              const shopOwnerKey = `shop:${selectedBusiness.id}`;
              const pushOn = isPushEnabledForShop(shopOwnerKey);
              const storyId = getStoryIdByRoomId(selectedBusiness.roomId);
              const subscribed = storyId ? subscribedShopIds.includes(storyId) : false;
              return (
                <div className="mb-2 flex items-center justify-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
                  <button
                    type="button"
                    aria-label={favorited ? "관심상점 해제" : "관심상점 등록"}
                    onClick={() => toggleFavoriteShop(selectedBusiness.id)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 ${favorited ? "text-rose-600" : "text-gray-400"}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={favorited ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                    <span className="text-[10px] font-bold">관심상점</span>
                  </button>
                  {storyId ? (
                    <button
                      type="button"
                      aria-label={subscribed ? "구독 해제" : "구독"}
                      onClick={() => {
                        toggleSubscribedShop(storyId);
                        setFavoriteTick((n) => n + 1);
                      }}
                      className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 ${subscribed ? "text-blue-600" : "text-gray-400"}`}
                    >
                      <img src={VLUE_SHIELD_LOGO} alt="" className="h-5 w-5 object-contain" />
                      <span className="text-[10px] font-bold">구독</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={pushOn ? "알림 끄기" : "알림 설정"}
                    onClick={() => {
                      if (pushOn) disablePushForShop(shopOwnerKey);
                      else {
                        enablePushForShop({
                          ownerKey: shopOwnerKey,
                          shopId: selectedBusiness.id,
                          shopName: selectedBusiness.name,
                          displayName: getFeedDisplayName("회원")
                        });
                      }
                      setFavoriteTick((n) => n + 1);
                    }}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 ${pushOn ? "text-amber-600" : "text-gray-400"}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill={pushOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="text-[10px] font-bold">알림설정</span>
                  </button>
                </div>
              );
            })()}
            <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="h-44 w-full overflow-hidden">
                <img src={selectedBusiness.img} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <p className="text-[16px] font-black text-gray-900">{selectedBusiness.name}</p>
                <p className="mt-1 text-[12px] font-semibold text-gray-600">{selectedBusiness.address}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-gray-700">{selectedBusiness.intro}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedBusiness.menu.map((m) => (
                    <span key={m} className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-700">
                      {m}
                    </span>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                  <p className="text-[11px] font-bold text-gray-500">위치지도</p>
                  <div className="mt-1 flex h-28 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-gray-400">
                    지도 API 키 연결 전 준비 영역
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenBusinessRoom?.(selectedBusiness.roomId)}
                    className="rounded-xl bg-blue-600 py-2 text-[11px] font-black text-white"
                  >
                    문의 채팅
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.location.href = `tel:${selectedBusiness.phone}`;
                      } catch {
                        /* noop */
                      }
                    }}
                    className="rounded-xl bg-slate-900 py-2 text-[11px] font-black text-white"
                  >
                    전화 문의
                  </button>
                </div>
              </div>
            </article>
            </div>
          ) : null}
        </section>
      )}

      </>
      ) : null}

      <LocalAdRegisterModal
        open={adModalOpen}
        onClose={() => setAdModalOpen(false)}
        onRegistered={handleAdRegistered}
        onGoPostToFeed={onOpenMyPageFeed}
        isDarkMode={isDarkMode}
        cardId={typeof window !== "undefined" ? localStorage.getItem("vlue_primary_card_id") || "" : ""}
      />
      <MembershipUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        membershipTier={membershipKind}
        isDarkMode={isDarkMode}
      />
    </main>
  );
}

export default Home;
