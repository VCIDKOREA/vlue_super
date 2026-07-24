import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fileToFittedAvatarDataUrl, readAvatar, writeAvatar } from "../lib/vlueAvatar.js";
import {
  addMyPagePost,
  getPageDisplayProfile,
  isPageCreated,
  OPEN_MYPAGE_COMPOSER_KEY,
  OPEN_MYPAGE_COMPOSER_STORE_KEY,
  PAGE_PROFILE_CHANGED_EVENT,
  readMyPagePosts,
  savePageManagerConfig
} from "../lib/pageProfileStorage.js";
import ScreenBackHeader from "./common/ScreenBackHeader";
import ActiveBoard from "./ActiveBoard.jsx";
import VlueStoreShopSection from "./VlueStoreShopSection.jsx";
import EnterpriseProcurementPanel from "./EnterpriseProcurementPanel.jsx";
import DeviceApprovalPanel from "./DeviceApprovalPanel.jsx";
import EnterpriseMemberCredentialsPanel from "./EnterpriseMemberCredentialsPanel.jsx";
import EnterpriseMemberManagePanel from "./EnterpriseMemberManagePanel.jsx";
import EnterpriseGroupChatPanel from "./EnterpriseGroupChatPanel.jsx";
import PersonalComboPanel from "./PersonalComboPanel.jsx";
import SocialAccountLinkPanel from "./auth/SocialAccountLinkPanel.jsx";
import VlueEmailMappingPanel from "./VlueEmailMappingPanel.jsx";
import AiSourcingUploadScreen from "./shopping/AiSourcingUploadScreen.jsx";
import { isPaidMembershipKind } from "../lib/membershipBm.js";
import { isStoreApproved } from "../lib/vlueStoreStorage.js";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import { FAVORITE_SHOPS_CHANGED, readFavoriteShopIds, toggleFavoriteShop } from "../lib/favoriteShopsStorage.js";
import { getHubShopById, SUBSCRIBE_STORY_SHOPS } from "../lib/shopCatalog.js";
import {
  countPushSubscribersForOwner,
  ensureDemoPushSubscribers,
  readPushSubscribersForOwner,
  readSubscribedShopIds,
  SHOP_OWNER_POSTED,
  SHOP_PUSH_SUBSCRIBERS_CHANGED,
  toggleSubscribedShop
} from "../lib/shopPushStorage.js";
import { generatePostDescription } from "../lib/vmingApi.js";
import SecurityVaultPanel from "./mypage/SecurityVaultPanel.jsx";
import VluerPartnerDashboard from "./VluerPartnerDashboard.jsx";

const HUB_TABS = [
  { id: "favorites", label: "관심상점", activeClass: "bg-rose-600 text-white shadow-md shadow-rose-900/15" },
  { id: "subscribe", label: "구독", activeClass: "bg-blue-600 text-white shadow-md shadow-blue-900/15" },
  { id: "notify", label: "알림설정", activeClass: "bg-amber-500 text-white shadow-md shadow-amber-900/15" }
];

function HubHeartIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function HubBellIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {filled ? <circle cx="18" cy="5" r="3" fill="currentColor" stroke="none" /> : null}
    </svg>
  );
}

function ProfileHubModal({ open, tab, title, onClose, children }) {
  if (!open || !tab) return null;
  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[min(78vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-[15px] font-black text-gray-900">{title}</p>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-black text-gray-600">
            닫기
          </button>
        </div>
        <div className="vlue-scroll-pad-bottom-nav flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

const DEFAULT_GRID = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80",
  "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=600&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80"
];

const CATEGORY_EXPOSE_POSTS_KEY = "vlue_category_exposed_posts_v1";
const CATEGORY_EXPOSE_OPTIONS = [
  { id: "food", label: "식음료", subcats: ["커피", "중식", "브런치", "레스토랑", "패스트푸드", "야식", "분식", "한식", "치킨", "피자"] },
  { id: "beautyFashion", label: "뷰티·패션", subcats: ["여성의류", "남성의류", "브랜드", "네일", "올리브영", "선케어", "태닝", "왁싱", "미용실"] },
  { id: "education", label: "교육", subcats: ["태권도", "영수학원", "과외", "인터넷강의", "초등교육", "중등교육", "고등교육", "교육과제물"] },
  { id: "repair", label: "정비", subcats: ["자동차정비", "이륜차정비", "튜닝", "용품"] },
  { id: "recruit", label: "채용", subcats: ["공식 채용정보", "구인업체", "구직지원"] },
  { id: "medical", label: "의료", subcats: ["종합병원", "대학병원", "요양병원", "소아과", "내과", "외과", "피부과", "성형외과"] }
];

function MyPage({
  membershipTier = "free",
  isDarkMode = false,
  onOpenManager,
  onGoMain,
  onOpenCardWallet,
  onOpenBetaGuide,
  onOpenLetteringBizcardSettings,
  onOpenUpdateStory,
  onOpenCalendar,
  onOpenFamilyProtection,
  onOpenMycase,
  resetNonce = 0
}) {
  const panelCls = isDarkMode
    ? "rounded-2xl border border-white/10 bg-[#151821] p-3 shadow-sm"
    : "rounded-2xl border border-gray-100 bg-white p-3 shadow-sm";
  const titleCls = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subCls = isDarkMode ? "text-gray-400" : "text-gray-500";
  const btnPostCls = isDarkMode
    ? "rounded-lg border border-blue-400/40 bg-blue-600/20 py-2 text-[12px] font-black text-blue-100"
    : "rounded-lg border border-blue-200 bg-blue-50 py-2 text-[12px] font-black text-blue-700";
  const btnWalletCls = isDarkMode
    ? "mt-2 w-full rounded-lg border border-amber-400/35 bg-amber-500/15 py-2.5 text-[12px] font-black text-amber-100 active:scale-[0.99]"
    : "mt-2 w-full rounded-lg border border-amber-200 bg-amber-50 py-2.5 text-[12px] font-black text-amber-900 active:scale-[0.99]";
  const btnGuideCls = isDarkMode
    ? "mt-2 w-full rounded-lg border border-blue-400/35 bg-blue-600/15 py-2.5 text-[12px] font-black text-blue-100 active:scale-[0.99]"
    : "mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-[12px] font-black text-blue-700 active:scale-[0.99]";
  const hubIdleCls = isDarkMode ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-600";
  const pageScrollRef = useRef(null);
  const [profileTick, setProfileTick] = useState(0);
  const [isCreated, setIsCreated] = useState(() => isPageCreated());
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postPreviewUrl, setPostPreviewUrl] = useState("");
  const [postType, setPostType] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postHashtags, setPostHashtags] = useState("");
  const [postAltText, setPostAltText] = useState("");
  const [tagPeopleNote, setTagPeopleNote] = useState("");
  const [postAudience, setPostAudience] = useState("public");
  const [alsoShowOnStore, setAlsoShowOnStore] = useState(false);
  const [categoryExposeEnabled, setCategoryExposeEnabled] = useState(false);
  const [categoryLocationConsent, setCategoryLocationConsent] = useState(false);
  const [categoryExposeCategoryId, setCategoryExposeCategoryId] = useState("food");
  const [categoryExposeSubcat, setCategoryExposeSubcat] = useState("커피");
  const [categoryExposeEditMode, setCategoryExposeEditMode] = useState(false);
  const [categoryMenuText, setCategoryMenuText] = useState("");
  const [categoryPriceText, setCategoryPriceText] = useState("");
  const [categoryEventText, setCategoryEventText] = useState("");
  const [categoryMenuNone, setCategoryMenuNone] = useState(false);
  const [categoryPriceNone, setCategoryPriceNone] = useState(false);
  const [categoryEventNone, setCategoryEventNone] = useState(false);
  const [toast, setToast] = useState("");
  const [ownerSourcingOpen, setOwnerSourcingOpen] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState(null);
  const [hubModal, setHubModal] = useState(null);
  const [hubTick, setHubTick] = useState(0);
  const [securityVaultOpen, setSecurityVaultOpen] = useState(false);

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "security-vault") setSecurityVaultOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const bump = () => setHubTick((n) => n + 1);
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
    const refresh = () => {
      setProfileTick((n) => n + 1);
      setIsCreated(isPageCreated());
    };
    window.addEventListener(PAGE_PROFILE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PAGE_PROFILE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const pageDisplay = useMemo(() => getPageDisplayProfile(), [profileTick, isCreated]);
  const { feedName, intro, notice, avatarUrl: storedProfileImg } = pageDisplay;
  const avatarUrl =
    storedProfileImg && !String(storedProfileImg).startsWith("blob:")
      ? storedProfileImg
      : readAvatar("feed") || readAvatar("primary") || "";
  const myPosts = useMemo(() => readMyPagePosts(), [profileTick, isComposerOpen]);
  const posts = myPosts.length;
  const ownerKey = useMemo(() => {
    try {
      return localStorage.getItem("vlue_server_user_id") || "local-user";
    } catch {
      return "local-user";
    }
  }, []);
  const favoriteShopIds = useMemo(() => readFavoriteShopIds(), [hubTick]);
  const subscribedShopIds = useMemo(() => readSubscribedShopIds(), [hubTick]);
  const pushSubscribers = useMemo(() => {
    ensureDemoPushSubscribers(ownerKey);
    return readPushSubscribersForOwner(ownerKey);
  }, [hubTick, ownerKey]);
  const favoriteShopsList = useMemo(() => {
    const seen = new Set();
    return favoriteShopIds
      .map((id) => getHubShopById(id))
      .filter((shop) => {
        if (!shop || seen.has(shop.id)) return false;
        seen.add(shop.id);
        return true;
      });
  }, [favoriteShopIds]);
  const subscribedStories = useMemo(() => {
    const idSet = new Set(subscribedShopIds);
    const picked = SUBSCRIBE_STORY_SHOPS.filter((s) => idSet.has(s.id));
    return picked.length ? picked : SUBSCRIBE_STORY_SHOPS;
  }, [subscribedShopIds]);
  const hubCounts = useMemo(
    () => ({
      favorites: favoriteShopIds.length,
      subscribe: subscribedShopIds.length || subscribedStories.length,
      notify: countPushSubscribersForOwner(ownerKey)
    }),
    [favoriteShopIds.length, subscribedShopIds.length, subscribedStories.length, ownerKey, hubTick]
  );

  const openHubModal = (tabId) => {
    setActiveHubTab(tabId);
    setHubModal(tabId);
    if (tabId === "notify") ensureDemoPushSubscribers(ownerKey);
  };
  const closeHubModal = () => setHubModal(null);
  const previewPosts = useMemo(() => myPosts.slice(0, 6), [myPosts]);
  const isPaid = isPaidMembershipKind(membershipTier);
  const canUseStore = isPaid && isStoreApproved();
  const currentExposeCategory = useMemo(
    () => CATEGORY_EXPOSE_OPTIONS.find((c) => c.id === categoryExposeCategoryId) || CATEGORY_EXPOSE_OPTIONS[0],
    [categoryExposeCategoryId]
  );
  const currentExposeSubcats = currentExposeCategory?.subcats || [];
  const existingCategoryPost = useMemo(() => {
    try {
      const raw = localStorage.getItem(CATEGORY_EXPOSE_POSTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return null;
      return parsed.find((p) => String(p.ownerKey || "") === ownerKey) || null;
    } catch {
      return null;
    }
  }, [ownerKey, isComposerOpen]);

  useLayoutEffect(() => {
    const resetTop = () => {
      if (pageScrollRef.current) pageScrollRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
      if (document?.documentElement) document.documentElement.scrollTop = 0;
      if (document?.body) document.body.scrollTop = 0;
      const nested = document.querySelectorAll("[data-mypage-scroll='1']");
      nested.forEach((el) => {
        el.scrollTop = 0;
      });
    };
    resetTop();
    const raf1 = requestAnimationFrame(resetTop);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(resetTop));
    const timer = setTimeout(resetTop, 60);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [resetNonce]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPEN_MYPAGE_COMPOSER_KEY) !== "1") return;
      sessionStorage.removeItem(OPEN_MYPAGE_COMPOSER_KEY);
      const wantStore = sessionStorage.getItem(OPEN_MYPAGE_COMPOSER_STORE_KEY) === "1";
      sessionStorage.removeItem(OPEN_MYPAGE_COMPOSER_STORE_KEY);
      if (!isPageCreated()) {
        onOpenManager?.();
        setToast("VLUE PAGE를 먼저 만든 뒤 게시물을 올려 주세요.");
        setTimeout(() => setToast(""), 3200);
        return;
      }
      setIsComposerOpen(true);
      if (wantStore && canUseStore) setAlsoShowOnStore(true);
    } catch {
      /* ignore */
    }
  }, [resetNonce, canUseStore, onOpenManager]);

  const onPickProfileImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setToast("프로필은 이미지 파일만 가능합니다.");
    try {
      const dataUrl = await fileToFittedAvatarDataUrl(file);
      setProfileImageUrl(dataUrl);
      writeAvatar("primary", dataUrl);
      writeAvatar("feed", dataUrl);
      savePageManagerConfig({ pageProfileImageDataUrl: dataUrl });
    } catch {
      setToast("이미지를 읽지 못했습니다.");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const onPickPostMedia = (file) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return setToast("이미지 또는 영상 파일만 업로드할 수 있습니다.");
    const url = URL.createObjectURL(file);
    setPostPreviewUrl(url);
    setPostType(isImage ? "image" : "video");
  };

  const publishPost = () => {
    if (!postPreviewUrl) return setToast("사진 또는 영상을 먼저 선택해 주세요.");
    if (categoryExposeEnabled && existingCategoryPost && !categoryExposeEditMode) {
      setToast("카테고리 노출 게시물은 1개만 가능합니다. '카테고리 게시물 변경'으로 수정해 주세요.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    if (categoryExposeEnabled && !categoryLocationConsent) {
      setToast("카테고리 노출은 위치기반 동의가 필요합니다.");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    if (categoryExposeEnabled) {
      const menuVal = String(categoryMenuText || "").trim();
      const priceVal = String(categoryPriceText || "").trim();
      const eventVal = String(categoryEventText || "").trim();
      if (!categoryMenuNone && !menuVal) {
        setToast("카테고리 노출 시 메뉴 정보를 입력해 주세요. (없음 선택 가능)");
        setTimeout(() => setToast(""), 2200);
        return;
      }
      if (!categoryPriceNone && !priceVal) {
        setToast("카테고리 노출 시 가격 정보를 입력해 주세요. (없음 선택 가능)");
        setTimeout(() => setToast(""), 2200);
        return;
      }
      if (!categoryEventNone && !eventVal) {
        setToast("카테고리 노출 시 이벤트 정보를 입력해 주세요. (없음 선택 가능)");
        setTimeout(() => setToast(""), 2200);
        return;
      }
      if (!categoryPriceNone && /(상담|미정)/.test(priceVal) && priceVal.length < 3) {
        setToast("가격이 상담/미정인 경우 관련 내용을 함께 입력해 주세요.");
        setTimeout(() => setToast(""), 2200);
        return;
      }
    }
    if (categoryExposeEnabled) {
      const post = {
        id: `cp-${Date.now()}`,
        categoryId: categoryExposeCategoryId,
        subcat: categoryExposeSubcat || currentExposeSubcats[0] || "",
        name: postCaption.trim().slice(0, 24) || "활동 등록 업체",
        intro: postCaption.trim() || "활동 보드에서 등록한 업체 게시물입니다.",
        eventSummary: categoryEventNone ? "없음" : String(categoryEventText || "").trim(),
        img: postPreviewUrl,
        distance: 0.5,
        popular: 80,
        rating: 4.6,
        likes: 0,
        roomId: "subscribe:soul-cafe",
        phone: "",
        address: postLocation.trim() || "주소 미입력",
        menu: categoryMenuNone ? [] : String(categoryMenuText || "").split(",").map((v) => v.trim()).filter(Boolean),
        priceInfo: categoryPriceNone ? "없음" : String(categoryPriceText || "").trim(),
        ownerKey,
        exposedAt: new Date().toISOString()
      };
      try {
        const raw = localStorage.getItem(CATEGORY_EXPOSE_POSTS_KEY);
        const prev = raw ? JSON.parse(raw) : [];
        const next = [post, ...(Array.isArray(prev) ? prev : []).filter((p) => String(p.ownerKey || "") !== ownerKey)].slice(0, 300);
        localStorage.setItem(CATEGORY_EXPOSE_POSTS_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event("vlue-category-posts-changed"));
      } catch {
        /* ignore */
      }
    }
    if (postPreviewUrl && (postType === "image" || postType === "video")) {
      const post = {
        id: `mp-${Date.now()}`,
        previewUrl: postPreviewUrl,
        caption: postCaption.trim(),
        type: postType,
        createdAt: new Date().toISOString()
      };
      if (postType === "video") post.videoUrl = postPreviewUrl;
      addMyPagePost(post);
    }
    setToast(
      isPaid && alsoShowOnStore
        ? "활동 보드·상점에 게시되었습니다. 활동 미리보기에 반영됩니다."
        : "게시물이 업로드되었습니다. 활동 미리보기에 반영됩니다."
    );
    setPostCaption("");
    setPostPreviewUrl("");
    setPostType("");
    setPostLocation("");
    setPostHashtags("");
    setPostAltText("");
    setTagPeopleNote("");
    setPostAudience("public");
    setAlsoShowOnStore(false);
    setCategoryExposeEnabled(false);
    setCategoryLocationConsent(false);
    setCategoryExposeEditMode(false);
    setCategoryMenuText("");
    setCategoryPriceText("");
    setCategoryEventText("");
    setCategoryMenuNone(false);
    setCategoryPriceNone(false);
    setCategoryEventNone(false);
    setIsComposerOpen(false);
    const postTitle = postCaption.trim() || "새 게시물";
    window.dispatchEvent(
      new CustomEvent(SHOP_OWNER_POSTED, {
        detail: { ownerKey, title: postTitle, shopName: feedName || "VLUE PAGE" }
      })
    );
    setTimeout(() => setToast(""), 2000);
  };

  const openProductUpload = () => {
    if (!isPaid) {
      setToast("상점·상품 판매는 유료 회원 전용입니다.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    if (!isStoreApproved()) {
      setToast("상품 판매는 상점 입점 승인 후 가능합니다. 페이지 관리에서 신청해 주세요.");
      setTimeout(() => setToast(""), 2800);
      onOpenManager?.();
      return;
    }
    onOpenManager?.();
    setToast("페이지 관리 → 상품 등록에서 추가할 수 있습니다.");
    setTimeout(() => setToast(""), 2400);
  };

  return (
    <section ref={pageScrollRef} data-mypage-scroll="1" className="vlue-mypage mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden">
      <ScreenBackHeader title="마이페이지" onBack={onGoMain} />
      <VluerPartnerDashboard layout="compact" onOpenFamilyProtection={onOpenFamilyProtection} />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-3">
        {!isCreated ? (
          <div className={`rounded-2xl p-4 shadow-sm ${isDarkMode ? "border border-white/10 bg-[#151821]" : "border border-gray-100 bg-white"}`}>
            <h2 className={`text-[18px] font-black ${titleCls}`}>MY 페이지 설정</h2>
            <p className={`mt-1 text-[12px] leading-relaxed ${subCls}`}>
              프로필·활동 소개는 <b>페이지 관리</b>에서 설정합니다. 저장하면 이 MY 화면에 바로 반영됩니다.
            </p>
            <button
              type="button"
              onClick={onOpenManager}
              className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
            >
              페이지 관리로 이동
            </button>
            <SocialAccountLinkPanel onToast={setToast} isDarkMode={isDarkMode} />
        <VlueEmailMappingPanel membershipTier={membershipTier} onToast={setToast} isDarkMode={isDarkMode} />
          </div>
        ) : isComposerOpen ? (
          <div className={`rounded-2xl p-4 shadow-sm ${isDarkMode ? "border border-white/10 bg-[#151821]" : "border border-gray-100 bg-white"}`}>
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setCategoryExposeEditMode(false);
                  setIsComposerOpen(false);
                }}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-black text-gray-600"
              >
                취소
              </button>
              <p className="text-[15px] font-black text-gray-900">새 게시물</p>
              <button
                type="button"
                onClick={publishPost}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm"
              >
                공유
              </button>
            </div>

            <div data-mypage-scroll="1" className="max-h-[min(72vh,560px)] space-y-3 overflow-y-auto pr-0.5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-black text-gray-900">미디어</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">사진 또는 동영상 1개 (인스타그램 스타일 확장 폼)</p>
                  </div>
                  <label className="shrink-0 cursor-pointer rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-black text-white active:scale-[0.98]">
                    갤러리
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onPickPostMedia(e.target.files?.[0])} />
                  </label>
                </div>
                <div className="mt-3 aspect-square w-full max-h-52 overflow-hidden rounded-xl bg-black/5">
                  {postPreviewUrl ? (
                    postType === "video" ? (
                      <video src={postPreviewUrl} controls className="h-full w-full object-cover" />
                    ) : (
                      <img src={postPreviewUrl} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 text-[11px] text-gray-400">
                      <span>미리보기</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500">문구</label>
                <div className="mt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const seed = [
                          postCaption.trim(),
                          postLocation.trim() ? `위치: ${postLocation.trim()}` : "",
                          postHashtags.trim() ? `해시태그: ${postHashtags.trim()}` : ""
                        ]
                          .filter(Boolean)
                          .join("\n");
                        const r = await generatePostDescription({
                          message:
                            seed ||
                            "게시물 상세설명을 자연스럽고 정중하게 3~4문장으로 작성해줘. 이모지는 1개 이하로 포함해줘."
                        });
                        const text = String(r?.reply || "").trim();
                        if (text) {
                          setPostCaption(text.slice(0, 2200));
                        }
                      } catch (e) {
                        setToast(
                          e instanceof Error
                            ? e.message
                            : "오늘 제공된 무료 체험 한도를 모두 소모하셨습니다. 월 4,900원 무제한 패키지를 이용해 보세요!"
                        );
                        setTimeout(() => setToast(""), 2400);
                      }
                    }}
                    className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700"
                  >
                    🤖 AI 문구 생성
                  </button>
                </div>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="문구 입력… @언급 · #해시태그"
                  className="mt-1 min-h-[88px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  maxLength={2200}
                />
                <p className="mt-1 text-right text-[10px] text-gray-400">{postCaption.length} / 2200</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-800">
                  <span className="text-[14px]">📍</span>
                  위치
                </label>
                <input
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  placeholder="위치 추가 (예: 서울 강남구)"
                  className="mt-1 w-full border-0 bg-transparent px-0 py-1 text-[13px] outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-800">
                  <span className="text-[14px]">👤</span>
                  함께하는 사람
                </label>
                <input
                  value={tagPeopleNote}
                  onChange={(e) => setTagPeopleNote(e.target.value)}
                  placeholder="사람 태그하기 (@아이디 검색)"
                  className="mt-1 w-full border-0 bg-transparent px-0 py-1 text-[13px] outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <label className="text-[12px] font-semibold text-gray-800"># 해시태그</label>
                <input
                  value={postHashtags}
                  onChange={(e) => setPostHashtags(e.target.value)}
                  placeholder="#VLUE #데일리 (공백으로 구분)"
                  className="mt-1 w-full border-0 bg-transparent px-0 py-1 text-[13px] outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <label className="text-[12px] font-semibold text-gray-800">접근 범위</label>
                <select
                  value={postAudience}
                  onChange={(e) => setPostAudience(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-[13px] outline-none"
                >
                  <option value="public">전체 공개</option>
                  <option value="followers">팔로워만</option>
                  <option value="private">비공개 (나만 보기)</option>
                </select>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-blue-900">
                  <input
                    type="checkbox"
                    checked={categoryExposeEnabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setCategoryExposeEnabled(next);
                      if (!next) {
                        setCategoryLocationConsent(false);
                        setCategoryMenuText("");
                        setCategoryPriceText("");
                        setCategoryEventText("");
                        setCategoryMenuNone(false);
                        setCategoryPriceNone(false);
                        setCategoryEventNone(false);
                      }
                    }}
                  />
                  카테고리 노출 활성화
                </label>
                <p className="mt-1 text-[11px] text-blue-800">체크 시 카테고리 검색 메인에 게시물이 노출됩니다.</p>
                {existingCategoryPost && !categoryExposeEditMode ? (
                  <p className="mt-1 text-[11px] font-bold text-blue-700">현재 카테고리 노출 게시물 1건이 등록되어 있습니다.</p>
                ) : null}
                {categoryExposeEnabled ? (
                  <div className="mt-2 space-y-2">
                    <select
                      value={categoryExposeCategoryId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setCategoryExposeCategoryId(nextId);
                        const nextCat = CATEGORY_EXPOSE_OPTIONS.find((c) => c.id === nextId);
                        setCategoryExposeSubcat(nextCat?.subcats?.[0] || "");
                      }}
                      className="w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-[12px] outline-none"
                    >
                      {CATEGORY_EXPOSE_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={categoryExposeSubcat}
                      onChange={(e) => setCategoryExposeSubcat(e.target.value)}
                      className="w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-[12px] outline-none"
                    >
                      {currentExposeSubcats.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-start gap-2 text-[11px] font-semibold text-blue-900">
                      <input
                        type="checkbox"
                        checked={categoryLocationConsent}
                        onChange={(e) => setCategoryLocationConsent(e.target.checked)}
                        className="mt-0.5"
                      />
                      위치기반 노출 및 카테고리 검색 메인 노출에 동의합니다.
                    </label>
                    <div className="rounded-lg border border-blue-200 bg-white p-2">
                      <label className="text-[11px] font-bold text-gray-800">메뉴</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          value={categoryMenuText}
                          onChange={(e) => setCategoryMenuText(e.target.value)}
                          disabled={categoryMenuNone}
                          placeholder="예: 아메리카노, 카페라떼"
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] outline-none disabled:bg-gray-100"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-600">
                          <input type="checkbox" checked={categoryMenuNone} onChange={(e) => setCategoryMenuNone(e.target.checked)} />
                          없음
                        </label>
                      </div>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-white p-2">
                      <label className="text-[11px] font-bold text-gray-800">가격</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          value={categoryPriceText}
                          onChange={(e) => setCategoryPriceText(e.target.value)}
                          disabled={categoryPriceNone}
                          placeholder="예: 4,500원 / 상담 후 결정 / 미정(예정가 기입)"
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] outline-none disabled:bg-gray-100"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-600">
                          <input type="checkbox" checked={categoryPriceNone} onChange={(e) => setCategoryPriceNone(e.target.checked)} />
                          없음
                        </label>
                      </div>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-white p-2">
                      <label className="text-[11px] font-bold text-gray-800">이벤트</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          value={categoryEventText}
                          onChange={(e) => setCategoryEventText(e.target.value)}
                          disabled={categoryEventNone}
                          placeholder="예: 오픈기념 10% 할인"
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] outline-none disabled:bg-gray-100"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-600">
                          <input type="checkbox" checked={categoryEventNone} onChange={(e) => setCategoryEventNone(e.target.checked)} />
                          없음
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <label className="text-[12px] font-semibold text-gray-800">대체 텍스트 (접근성)</label>
                <input
                  value={postAltText}
                  onChange={(e) => setPostAltText(e.target.value)}
                  placeholder="시각 장애인용 이미지 설명 (선택)"
                  className="mt-1 w-full border-0 bg-transparent px-0 py-1 text-[13px] outline-none placeholder:text-gray-400"
                />
              </div>

              {isPaid && (
                <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/90 to-white p-4">
                  <p className="text-[13px] font-black text-indigo-950">VLUE PAGE · 상점</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/80">
                    {isStoreApproved()
                      ? "상점 승인됨 — 아래 「상품 올리기」 또는 페이지 관리에서 상품을 등록하세요."
                      : "유료 회원은 페이지 관리에서 입점 신청(사업자등록증·입점서·약관) 후 상품 판매가 가능합니다."}
                  </p>
                  {isStoreApproved() && (
                    <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-indigo-200 bg-white/90 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={alsoShowOnStore}
                        onChange={(e) => setAlsoShowOnStore(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-left text-[12px] font-semibold leading-snug text-gray-900">
                        활동 게시물을 상점 쇼케이스에도 노출
                      </span>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={openProductUpload}
                    className="mt-3 w-full rounded-xl border-2 border-indigo-300 bg-white py-3 text-[13px] font-black text-indigo-800 shadow-sm active:scale-[0.99]"
                  >
                    상품 올리기
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-[11px] leading-relaxed text-blue-800">
                팁: 문구 첫 줄이 활동 요약에 더 잘 보입니다. 위치·태그는 검색 노출에 도움이 됩니다.
              </div>
            </div>
            {toast && <p className="mt-3 text-center text-[11px] font-bold text-blue-600">{toast}</p>}
          </div>
        ) : (
          <>
        <div className={`relative ${panelCls}`}>
          <div className="flex items-start gap-3">
            <div className="flex w-16 shrink-0 flex-col items-center">
              <div className="h-16 w-16 rounded-full border border-gray-200 bg-gray-100 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              {canUseStore && (
                <span className="mt-1 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-1.5 py-[2px] text-[9px] font-black leading-none text-violet-700">
                  상점
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className={`truncate text-[16px] font-black ${titleCls}`}>{feedName}</p>
              <p className={`mt-0.5 text-[11px] font-medium ${subCls}`}>{intro}</p>
              {canUseStore && (
                <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black text-violet-800">
                  VLUE 상점
                </span>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {HUB_TABS.map((tab) => {
                  const active = activeHubTab === tab.id;
                  const count = hubCounts[tab.id];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => openHubModal(tab.id)}
                      className={`rounded-lg px-1 py-1.5 transition ${active ? tab.activeClass : hubIdleCls}`}
                    >
                      <b className="block text-[13px] leading-none">{count}</b>
                      <span
                        className={`mt-1 flex items-center justify-center gap-0.5 text-[10px] font-semibold ${
                          active ? "text-white/95" : "text-gray-500"
                        }`}
                      >
                        {tab.id === "favorites" ? <HubHeartIcon filled={active} /> : null}
                        {tab.id === "subscribe" ? (
                          <img
                            src={VLUE_SHIELD_LOGO}
                            alt=""
                            className={`h-3.5 w-3.5 object-contain ${active ? "brightness-0 invert" : ""}`}
                          />
                        ) : null}
                        {tab.id === "notify" ? <HubBellIcon filled={active && hubCounts.notify > 0} /> : null}
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" onClick={onOpenManager} className="rounded-lg bg-gray-900 py-2 text-[11px] font-black text-white">
              페이지 관리
            </button>
            <button type="button" onClick={() => onOpenCalendar?.()} className={btnPostCls}>
              내 일정
            </button>
            <button type="button" onClick={() => setIsComposerOpen(true)} className={btnPostCls}>
              게시물 올리기
            </button>
            <button
              type="button"
              onClick={() => setSecurityVaultOpen(true)}
              className={
                isDarkMode
                  ? "rounded-lg border border-red-400/35 bg-red-500/15 py-2 text-[11px] font-black text-red-200"
                  : "rounded-lg border border-red-300 bg-red-50 py-2 text-[11px] font-black text-red-800"
              }
            >
              🛡️ 보안함
            </button>
          </div>
          {existingCategoryPost ? (
            <button
              type="button"
              onClick={() => {
                setCategoryExposeEnabled(true);
                setCategoryLocationConsent(true);
                setCategoryExposeEditMode(true);
                setCategoryExposeCategoryId(existingCategoryPost.categoryId || "food");
                setCategoryExposeSubcat(existingCategoryPost.subcat || "커피");
                setPostCaption(existingCategoryPost.intro || "");
                setPostLocation(existingCategoryPost.address || "");
                setPostPreviewUrl(existingCategoryPost.img || "");
                setPostType("image");
                const menuJoined = Array.isArray(existingCategoryPost.menu)
                  ? existingCategoryPost.menu.join(", ")
                  : "";
                setCategoryMenuText(menuJoined);
                setCategoryMenuNone(!menuJoined);
                const priceInfo = String(existingCategoryPost.priceInfo || "");
                setCategoryPriceText(priceInfo === "없음" ? "" : priceInfo);
                setCategoryPriceNone(priceInfo === "없음");
                const eventInfo = String(existingCategoryPost.eventSummary || "");
                setCategoryEventText(eventInfo === "없음" ? "" : eventInfo);
                setCategoryEventNone(eventInfo === "없음");
                setIsComposerOpen(true);
              }}
              className={
                isDarkMode
                  ? "mt-2 w-full rounded-lg border border-blue-400/35 bg-blue-600/15 py-2.5 text-[12px] font-black text-blue-100 active:scale-[0.99]"
                  : "mt-2 w-full rounded-lg border border-blue-300 bg-white py-2.5 text-[12px] font-black text-blue-700 active:scale-[0.99]"
              }
            >
              카테고리 게시물 변경
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenCardWallet?.()}
            className={btnWalletCls}
          >
            명함 지갑
          </button>
          <button type="button" onClick={() => onOpenBetaGuide?.()} className={btnGuideCls}>
            베타 운영 가이드
          </button>
          <p className={`mt-2 text-[11px] leading-relaxed ${subCls}`}>{intro}</p>
          {notice ? <p className="mt-1 text-[10px] font-semibold text-blue-700/90">{notice}</p> : null}
          {toast && <p className="mt-2 text-center text-[11px] font-bold text-blue-600">{toast}</p>}
        </div>

        <div className={`mt-4 ${panelCls}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className={`text-[12px] font-black ${titleCls}`}>마이케이스</p>
            <button
              type="button"
              className="text-[11px] font-bold text-blue-600"
              onClick={() => onOpenMycase?.()}
            >
              모두 보기
            </button>
          </div>
          <p className={`text-[11px] leading-relaxed ${subCls}`}>
            인스타그램형 그리드로 쇼케이스 아카이브·메인 송출을 관리합니다.
          </p>
          <button
            type="button"
            onClick={() => onOpenMycase?.()}
            className="mt-3 w-full rounded-xl bg-gray-900 py-2.5 text-[12px] font-black text-white active:scale-[0.99]"
          >
            마이케이스 열기
          </button>
        </div>

        <div className={`mt-4 ${panelCls}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className={`text-[12px] font-black ${titleCls}`}>활동 미리보기</p>
            <button type="button" className="text-[11px] font-bold text-blue-600">모두 보기</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(previewPosts.length >= 6
              ? previewPosts
              : [
                  ...previewPosts,
                  ...DEFAULT_GRID.slice(0, Math.max(0, 6 - previewPosts.length)).map((src) => ({
                    previewUrl: src,
                    type: "image"
                  }))
                ]
            ).map((p, idx) => {
              const src = p.previewUrl || p.thumbUrl;
              const isVideo = p.type === "video";
              return (
                <div key={`${p.id || src}-${idx}`} className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                  {isVideo && src ? (
                    <video src={p.videoUrl || src} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=600&q=80";
                      }}
                    />
                  )}
                  {isVideo ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 text-[9px] font-black text-white">
                      ▶
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {posts === 0 && (
            <div className={`mt-4 rounded-xl py-6 text-center ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
              <p className={`text-[20px] font-black ${titleCls}`}>첫 번째 게시물을 만들어보세요</p>
              <p className={`mt-1 text-[12px] ${subCls}`}>「게시물 올리기」에서 사진·영상과 문구를 작성할 수 있습니다.</p>
            </div>
          )}
        </div>
        <div
          className={
            isDarkMode
              ? "mt-4 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3 shadow-sm"
              : "mt-4 rounded-2xl border border-violet-100 bg-violet-50/80 p-3 shadow-sm"
          }
        >
          <p className={`text-[13px] font-black ${isDarkMode ? "text-violet-200" : "text-violet-950"}`}>사장님 · AI 소싱</p>
          <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? "text-violet-200/80" : "text-violet-900/80"}`}>
            쿠팡·네이버 URL·상품 사진으로 상세 초안을 만들고 보관함에 저장합니다.
          </p>
          <button
            type="button"
            onClick={() => setOwnerSourcingOpen(true)}
            className="mt-3 w-full rounded-xl bg-violet-700 py-2.5 text-[12px] font-black text-white"
          >
            AI 소싱 · 업로드 열기
          </button>
        </div>
        <SocialAccountLinkPanel onToast={setToast} isDarkMode={isDarkMode} />
        <VlueEmailMappingPanel membershipTier={membershipTier} onToast={setToast} isDarkMode={isDarkMode} />
        <DeviceApprovalPanel />
        <PersonalComboPanel membershipTier={membershipTier} onToast={setToast} />
        <EnterpriseMemberManagePanel onToast={setToast} />
        <EnterpriseMemberCredentialsPanel onToast={setToast} />
        <EnterpriseProcurementPanel onToast={setToast} />
        <EnterpriseGroupChatPanel onToast={setToast} />
        <VlueStoreShopSection isPaid={isPaid} onManageProducts={onOpenManager} onToast={setToast} />

        <div className={`mt-4 rounded-2xl p-3 shadow-sm ${isDarkMode ? "border border-white/10 bg-[#151821]" : "border border-blue-100 bg-white"}`}>
          <p className={`text-[14px] font-black ${titleCls}`}>리뷰어 체험단 작성 보드</p>
          <p className={`mt-1 text-[11px] font-semibold ${subCls}`}>
            이 화면에서 바로 캠페인 지원/인증/리뷰 제출/정산 완료 흐름을 진행할 수 있습니다.
          </p>
          <div className="mt-3">
            <ActiveBoard embedded onGoMain={onGoMain} />
          </div>
        </div>
          </>
        )}
      </div>

      <ProfileHubModal open={hubModal === "favorites"} tab="favorites" title="관심상점" onClose={closeHubModal}>
        <p className="text-[12px] text-gray-500">다른 상점을 ♥로 등록한 목록입니다. (본인 상점과 별도)</p>
        {favoriteShopsList.length === 0 ? (
          <p className="mt-4 text-center text-[13px] font-semibold text-gray-500">등록된 관심상점이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {favoriteShopsList.map((shop) => (
              <li key={shop.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <img src={shop.img} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-gray-900">{shop.name}</p>
                  <p className="truncate text-[11px] text-gray-500">{shop.intro}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavoriteShop(shop.id)}
                  className="shrink-0 rounded-lg p-2 text-rose-600"
                  aria-label="관심상점 해제"
                >
                  <HubHeartIcon filled />
                </button>
              </li>
            ))}
          </ul>
        )}
      </ProfileHubModal>

      <ProfileHubModal open={hubModal === "subscribe"} tab="subscribe" title="구독" onClose={closeHubModal}>
        <p className="text-[12px] text-gray-500">업데이트 스토리에서 구독 중인 채널입니다.</p>
        <ul className="mt-3 space-y-2">
          {subscribedStories.map((s) => {
            const subscribed = subscribedShopIds.includes(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <img src={s.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-gray-900">{s.name}</p>
                  <p className="text-[11px] font-semibold text-blue-600">{s.hasNew ? "새 업데이트" : "구독 중"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSubscribedShop(s.id)}
                  className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${
                    subscribed ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {subscribed ? "구독중" : "구독"}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            closeHubModal();
            onOpenUpdateStory?.();
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white"
        >
          업데이트 스토리 보기
        </button>
      </ProfileHubModal>

      <ProfileHubModal open={hubModal === "notify"} tab="notify" title="알림설정 회원" onClose={closeHubModal}>
        <p className="text-[12px] leading-relaxed text-gray-600">
          내 상점·페이지 게시물 알림을 <b>켠 회원</b> 목록입니다. 게시물을 올리면 이 회원들에게만 푸시가 발송됩니다.
          (본인에게는 발송되지 않습니다.)
        </p>
        {pushSubscribers.length === 0 ? (
          <p className="mt-4 text-center text-[13px] font-semibold text-gray-500">
            아직 알림 설정한 회원이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pushSubscribers.map((sub) => (
              <li
                key={`${sub.userId}-${sub.enabledAt}`}
                className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[12px] font-black text-amber-900">
                  {(sub.displayName || "?").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-gray-900">{sub.displayName}</p>
                  <p className="text-[11px] text-gray-500">게시물 알림 ON</p>
                </div>
                <HubBellIcon filled />
              </li>
            ))}
          </ul>
        )}
      </ProfileHubModal>

      {ownerSourcingOpen ? (
        <div className="fixed inset-0 z-[1000003] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-white">
          <AiSourcingUploadScreen onBack={() => setOwnerSourcingOpen(false)} onToast={setToast} />
        </div>
      ) : null}

      <SecurityVaultPanel open={securityVaultOpen} onClose={() => setSecurityVaultOpen(false)} />
    </section>
  );
}

export default MyPage;
