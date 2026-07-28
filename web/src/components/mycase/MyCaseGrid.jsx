/**
 * 마이케이스 — 인스타그램 프로필형 레이아웃 (기본 라이트모드)
 * VLUE: 메인 송출 슬롯 = 하이라이트 / 핀 배지, 아카이브 = 3열 그리드
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Grid3X3, MoreHorizontal, Pin } from "lucide-react";
import {
  archiveShowcaseToMycase,
  deleteMycase,
  fetchMycaseDetail,
  fetchMyMycaseList,
  fetchUserMycase,
  formatCooldownHint,
  setMycaseBroadcast
} from "../../lib/mycaseApi.js";
import { fetchFollowCounts } from "../../lib/followApi.js";
import { fetchPeerShowcaseStyleBundle } from "../../lib/showcase/showcaseStyleApi.js";
import { readShowcaseStyle, readLiveShowcaseStyle, writeShowcaseStyle, SHOWCASE_OPEN_SETTINGS_EVENT, SHOWCASE_STYLE_CHANGED_EVENT, createDefaultShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
import {
  applyMycaseItemToLiveBroadcast,
  clearLiveBroadcastMeta,
  hydrateLiveBroadcastFromServer,
  readLiveBroadcastMeta
} from "../../lib/showcase/syncMycaseLiveBroadcast.js";
import {
  extractShowcaseArchiveTitle,
  extractShowcaseCoverUrl
} from "../../lib/showcase/showcaseCover.js";
import { slimShowcaseStyleForPersist } from "../../lib/showcase/slimShowcaseStyleForPersist.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { readDigitalCardActive } from "../../lib/bizcardAccountSync.js";
import {
  isBroadcastStoryUnseen,
  markBroadcastStorySeen
} from "../../lib/mycaseStoryRing.js";
import FollowActionButton from "../follow/FollowActionButton.jsx";
import ShowcaseBgmTrackChip from "../showcase/ShowcaseBgmTrackChip.jsx";
import ShowcaseBgmTransport from "../showcase/ShowcaseBgmTransport.jsx";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import {
  createEmptyShowcaseBgm,
  hasPlayableShowcaseBgm,
  hasShowcaseBgmConfigured,
  showcaseBgmIdentityKey
} from "../../lib/showcase/showcaseBgmPresets.js";
import { SHOWCASE_BGM_OWNER_RELEASED_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import "./my-case-grid.css";

function readSelfProfile() {
  let handle = "";
  let name = "";
  try {
    handle = String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
    name = String(localStorage.getItem("vlue_legal_name") || "").trim();
  } catch {
    /* ignore */
  }
  const avatarUrl = readProfilePhotoAvatar();
  let userId = "";
  try {
    userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    /* ignore */
  }
  return { handle: handle || "mycase", name: name || handle || "나", avatarUrl, userId };
}

function formatCount(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return String(v);
}

/**
 * @param {{
 *   mode?: 'mine'|'user',
 *   ownerUserId?: string|null,
 *   onBack?: () => void,
 *   onOpenDetail?: (item: object, detail: object|null) => void,
 *   onOpenDigitalCard?: () => void,
 *   onToast?: (msg: string) => void,
 *   onBroadcastChanged?: (item: object, policy: object|null) => void,
 *   bgmEnabled?: boolean,
 *   isDarkMode?: boolean,
 *   className?: string
 * }} props
 */
export default function MyCaseGrid({
  mode = "mine",
  ownerUserId = null,
  onBack,
  onOpenDetail,
  onOpenDigitalCard,
  onToast,
  onBroadcastChanged,
  bgmEnabled = true,
  isDarkMode = false,
  className = ""
}) {
  const isMine = mode === "mine";
  const self = useMemo(() => readSelfProfile(), []);

  const [items, setItems] = useState([]);
  const [mainBroadcast, setMainBroadcast] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [peerLiveStyle, setPeerLiveStyle] = useState(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [accessDenied, setAccessDenied] = useState(false);
  const [denyReason, setDenyReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [storySeenTick, setStorySeenTick] = useState(0);
  const sentinelRef = useRef(null);
  const toastRef = useRef(onToast);
  const initialLoadDoneRef = useRef(false);
  const { bindStyleConfig, setPlaybackPhase } = useShowcaseBgm();
  const [styleTick, setStyleTick] = useState(0);
  const hasDigitalCard = isMine
    ? readDigitalCardActive()
    : Boolean(remoteProfile?.digitalCardIssued);

  useEffect(() => {
    toastRef.current = onToast;
  }, [onToast]);

  const toast = useCallback((msg) => {
    const fn = toastRef.current;
    if (fn) fn(msg);
    else if (typeof window !== "undefined") window.alert?.(msg);
  }, []);

  const displayHandle = isMine
    ? self.handle
    : String(remoteProfile?.profile?.publicHandle || "").replace(/^@/, "") || "member";
  const displayName = isMine
    ? self.name
    : String(
        remoteProfile?.cardExport?.name ||
          remoteProfile?.profile?.displayName ||
          remoteProfile?.profile?.legalName ||
          ""
      ).trim() || displayHandle;
  const avatarUrl = isMine
    ? self.avatarUrl
    : String(
        remoteProfile?.profile?.avatarUrl ||
          remoteProfile?.profile?.photoUrl ||
          remoteProfile?.photoUrl ||
          remoteProfile?.cardExport?.photoUrl ||
          mainBroadcast[0]?.thumbnailUrl ||
          ""
      ).trim();
  const storyOwnerId = isMine ? self.userId : String(ownerUserId || "").trim();
  const hasLiveBroadcast = !accessDenied && mainBroadcast.length > 0;

  const loadFirst = useCallback(async () => {
    const showFullLoading = !initialLoadDoneRef.current;
    if (showFullLoading) setLoading(true);
    try {
      if (isMine) {
        const data = await fetchMyMycaseList({ limit: 30 });
        if (!data.ok) {
          toast(data.message || "마이케이스를 불러오지 못했습니다.");
          if (showFullLoading) setItems([]);
          return;
        }
        setItems(data.items || []);
        setNextCursor(data.nextCursor || null);
        setPolicy(data.policy || null);
        setAccessDenied(false);
        setMainBroadcast((data.items || []).filter((x) => x.isMainBroadcast));
        if (self.userId) {
          const c = await fetchFollowCounts(self.userId);
          if (c.ok && c.counts) setFollowCounts(c.counts);
        }
        /* 라이브 스타일 동기화는 CallBigPush/오버레이 hydrate 에 맡김.
           여기서 apply 하면 STYLE 이벤트로 목록이 재귀 갱신될 수 있음. */
      } else {
        if (!ownerUserId) return;
        const data = await fetchUserMycase(ownerUserId, { limit: 30 });
        if (!data.ok) {
          toast(data.message || "케이스함을 불러오지 못했습니다.");
          return;
        }
        setRemoteProfile(data.profile || null);
        setAccessDenied(Boolean(data.accessDenied));
        setDenyReason(data.reason || null);
        let mains = data.mainBroadcast || [];
        let list = data.items || [];
        let liveStyle = null;
        const styleRes = await fetchPeerShowcaseStyleBundle(ownerUserId);
        if (styleRes.ok && styleRes.live && typeof styleRes.live === "object") {
          liveStyle = styleRes.live;
        }
        setPeerLiveStyle(liveStyle);
        /* 아카이브가 비어도 라이브 송출 스타일이 있으면 본인 마이케이스와 같이 보이게 */
        if (!data.accessDenied && mains.length === 0 && list.length === 0 && liveStyle) {
          const cover = extractShowcaseCoverUrl(liveStyle);
          const title = extractShowcaseArchiveTitle(liveStyle);
          const synthetic = {
            id: `live-style-${ownerUserId}`,
            ownerUserId,
            title: title || "쇼케이스",
            thumbnailUrl: cover || "",
            payloadJson: { style: liveStyle },
            isPublic: true,
            isMainBroadcast: true,
            isLiveStyle: true,
            slotIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          mains = [synthetic];
          list = [synthetic];
        }
        setMainBroadcast(mains);
        setItems(list);
        setNextCursor(data.nextCursor || null);
        const counts = data.profile?.follow?.counts;
        if (counts) setFollowCounts(counts);
        else {
          const c = await fetchFollowCounts(ownerUserId);
          if (c.ok && c.counts) setFollowCounts(c.counts);
        }
      }
      initialLoadDoneRef.current = true;
    } finally {
      if (showFullLoading) setLoading(false);
    }
  }, [isMine, ownerUserId, self.userId, toast]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  useEffect(() => {
    if (!isMine) return undefined;
    const onChanged = () => {
      /* STYLE_CHANGED 시 목록 재 GET 금지 — 로컬 BGM/하이라이트만 갱신.
         아카이브·삭제·메인변경은 각 핸들러가 loadFirst 호출 */
      setStyleTick((n) => n + 1);
    };
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onChanged);
    };
  }, [isMine]);

  const caseStyleConfig = useMemo(() => {
    if (isMine) {
      try {
        const editor = readShowcaseStyle();
        const live = readLiveShowcaseStyle();
        /* 재생 URL 우선 — 제목만 있는 편집 설정보다 라이브 audioUrl 을 씀 */
        if (hasPlayableShowcaseBgm(editor)) return editor;
        if (live && hasPlayableShowcaseBgm(live)) {
          return { ...editor, bgm: live.bgm };
        }
        if (hasShowcaseBgmConfigured(editor)) return editor;
        if (live && hasShowcaseBgmConfigured(live)) {
          return { ...editor, bgm: live.bgm };
        }
        return editor;
      } catch {
        return createDefaultShowcaseStyle();
      }
    }
    const src = mainBroadcast[0] || items[0];
    const payload = src?.payloadJson && typeof src.payloadJson === "object" ? src.payloadJson : {};
    const fromStyle = payload.style && typeof payload.style === "object" ? payload.style : null;
    const base = fromStyle
      ? { ...createDefaultShowcaseStyle(), ...fromStyle }
      : peerLiveStyle
        ? { ...createDefaultShowcaseStyle(), ...peerLiveStyle }
        : null;
    if (!base) return null;
    /* 아카이브에 BGM 메타가 비면 라이브 송출 BGM 사용 */
    const caseBgm = base.bgm;
    const liveBgm = peerLiveStyle?.bgm;
    const caseConfigured = hasShowcaseBgmConfigured({ bgm: caseBgm });
    if (!caseConfigured && liveBgm && hasShowcaseBgmConfigured({ bgm: liveBgm })) {
      return { ...base, bgm: liveBgm };
    }
    return base;
  }, [isMine, mainBroadcast, items, styleTick, peerLiveStyle]);

  const caseHasBgm = hasShowcaseBgmConfigured(caseStyleConfig);
  const hasLiveStyleContent = useMemo(() => {
    const style = caseStyleConfig;
    if (!style) return false;
    if (extractShowcaseCoverUrl(style)) return true;
    if (Array.isArray(style.pages) && style.pages.length > 0) return true;
    return hasShowcaseBgmConfigured(style);
  }, [caseStyleConfig]);
  /** 아카이브 송출 슬롯 또는(본인) 현재 라이브 쇼케이스 */
  const canOpenLiveStory =
    !accessDenied && (hasLiveBroadcast || (isMine && hasLiveStyleContent));
  const storyUnseen = useMemo(() => {
    void storySeenTick;
    return canOpenLiveStory && isBroadcastStoryUnseen(storyOwnerId, mainBroadcast);
  }, [canOpenLiveStory, storyOwnerId, mainBroadcast, storySeenTick]);
  const caseBgmFingerprint = useMemo(
    () => showcaseBgmIdentityKey(caseStyleConfig?.bgm),
    [caseStyleConfig]
  );

  const caseBgmFpRef = useRef("");
  const setPlaybackPhaseRef = useRef(setPlaybackPhase);
  const bindStyleConfigRef = useRef(bindStyleConfig);
  setPlaybackPhaseRef.current = setPlaybackPhase;
  bindStyleConfigRef.current = bindStyleConfig;

  /* 케이스함 프로필 BGM — 게시물 열람/삭제와 독립. fingerprint 변경 시에만 재시작.
     setPlaybackPhase 를 deps 에 넣지 않음 — 콜백 신원 변경 시 idle cleanup 으로 음악이 끊기던 주원인 */
  useEffect(() => {
    if (!bgmEnabled || !caseHasBgm || !caseStyleConfig) {
      setPlaybackPhaseRef.current("idle", { fade: true, owner: "casebox" });
      caseBgmFpRef.current = "";
      return undefined;
    }
    const fp = caseBgmFingerprint;
    const changed = caseBgmFpRef.current !== fp;
    caseBgmFpRef.current = fp;
    setPlaybackPhaseRef.current("preview", {
      forceRestart: changed,
      owner: "casebox",
      styleConfig: caseStyleConfig
    });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caseStyleConfig는 fingerprint로 추적
  }, [bgmEnabled, caseHasBgm, caseBgmFingerprint]);

  /* 케이스함 화면을 떠날 때만 idle — setPlaybackPhase deps 금지 */
  useEffect(() => {
    return () => {
      setPlaybackPhaseRef.current("idle", { fade: true, owner: "casebox" });
    };
  }, []);

  /* 설정 시트 종료 후 케이스함 BGM 재개 */
  useEffect(() => {
    const onReleased = () => {
      if (!bgmEnabled || !caseHasBgm || !caseStyleConfig) return;
      setPlaybackPhaseRef.current("preview", {
        forceRestart: false,
        owner: "casebox",
        styleConfig: caseStyleConfig
      });
    };
    window.addEventListener(SHOWCASE_BGM_OWNER_RELEASED_EVENT, onReleased);
    return () => window.removeEventListener(SHOWCASE_BGM_OWNER_RELEASED_EVENT, onReleased);
  }, [bgmEnabled, caseHasBgm, caseStyleConfig]);

  useEffect(() => {
    if (!bgmEnabled || !caseHasBgm) return undefined;
    bindStyleConfigRef.current(caseStyleConfig, { owner: "casebox" });
    return undefined;
  }, [bgmEnabled, caseHasBgm, caseStyleConfig]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      if (isMine) {
        const data = await fetchMyMycaseList({ limit: 30, cursor: nextCursor });
        if (!data.ok) return;
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const added = (data.items || []).filter((x) => x?.id && !seen.has(x.id));
          return [...prev, ...added];
        });
        setNextCursor(data.nextCursor || null);
        if (data.policy) setPolicy(data.policy);
      } else if (ownerUserId) {
        const data = await fetchUserMycase(ownerUserId, { limit: 30, cursor: nextCursor });
        if (!data.ok || data.accessDenied) return;
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const added = (data.items || []).filter((x) => x?.id && !seen.has(x.id));
          return [...prev, ...added];
        });
        setNextCursor(data.nextCursor || null);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [isMine, ownerUserId, nextCursor, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "160px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, nextCursor]);

  const openItem = async (item) => {
    if (manageMode && isMine) return;
    if (!onOpenDetail) return;
    const caseId = String(item?.id || "").trim();
    if (!caseId) {
      toast("게시물 정보가 올바르지 않습니다.");
      return;
    }
    /* 라이브 스타일 합성 항목 — API detail 없이 바로 열기 */
    if (item?.isLiveStyle || caseId.startsWith("live-style-")) {
      const peerMeta = {
        userId: String(ownerUserId || item.ownerUserId || "").trim(),
        name: displayName,
        handle: displayHandle,
        phone: String(remoteProfile?.profile?.phoneE164 || "").trim(),
        organization: String(
          remoteProfile?.profile?.companyName || remoteProfile?.cardExport?.organization || ""
        ).trim(),
        photoUrl: avatarUrl,
        logoUrl: String(remoteProfile?.cardExport?.logoUrl || "").trim(),
        membershipTier: String(
          remoteProfile?.membershipTier || remoteProfile?.profile?.membershipTier || "premium"
        ),
        digitalCardIssued: Boolean(remoteProfile?.digitalCardIssued),
        feedItems: items,
        startIndex: Math.max(
          0,
          items.findIndex((x) => x.id === item.id)
        )
      };
      onOpenDetail(item, { item, ok: true, isOwner: false }, peerMeta);
      return;
    }
    const detail = await fetchMycaseDetail(caseId);
    if (!detail.ok) {
      toast(detail.message || "마이케이스를 열 수 없습니다.");
      if (detail.error === "not_found") void loadFirst();
      return;
    }
    onOpenDetail(item, detail, {
      userId: storyOwnerId,
      name: displayName,
      handle: displayHandle,
      phone: String(remoteProfile?.profile?.phoneE164 || "").trim(),
      organization: String(
        remoteProfile?.profile?.companyName || remoteProfile?.cardExport?.organization || ""
      ).trim(),
      photoUrl: avatarUrl,
      logoUrl: String(remoteProfile?.cardExport?.logoUrl || "").trim(),
      membershipTier: String(
        remoteProfile?.membershipTier || remoteProfile?.profile?.membershipTier || "premium"
      ),
      digitalCardIssued: Boolean(remoteProfile?.digitalCardIssued),
      feedItems: items,
      startIndex: Math.max(
        0,
        items.findIndex((x) => String(x.id) === caseId)
      )
    });
  };

  const openLiveBroadcastStory = async () => {
    if (manageMode) return;
    if (typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
      window.__vlueUnlockShowcaseBgm();
    }

    /* 본인: 현재 송출 중인 라이브 쇼케이스(+DDC)를 우선 표시 */
    if (isMine) {
      let style = null;
      try {
        style = readShowcaseStyle();
      } catch {
        style = null;
      }
      const cover = style ? extractShowcaseCoverUrl(style) : "";
      const title = style ? extractShowcaseArchiveTitle(style) : "";
      const archived = mainBroadcast[0] || null;
      if (!style && !archived) {
        toast("송출 중인 쇼케이스가 없습니다.");
        return;
      }
      if (
        style &&
        !cover &&
        !(Array.isArray(style.pages) && style.pages.length > 0) &&
        !hasShowcaseBgmConfigured(style) &&
        !archived
      ) {
        toast("송출 중인 쇼케이스가 없습니다. 블루 쇼케이스에서 먼저 꾸며 주세요.");
        return;
      }
      const liveItem = {
        id: archived?.id || `live-style-${self.userId || "me"}`,
        ownerUserId: self.userId || "",
        title: title || archived?.title || "쇼케이스",
        thumbnailUrl: cover || archived?.thumbnailUrl || "",
        payloadJson: style
          ? { style, source: "live_avatar" }
          : archived?.payloadJson || {},
        isPublic: true,
        isMainBroadcast: true,
        /* 라이브 스타일을 실었으면 API detail 대신 payload 사용 */
        isLiveStyle: Boolean(style) || !archived || Boolean(archived.isLiveStyle),
        slotIndex: archived?.slotIndex ?? 0,
        createdAt: archived?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      markBroadcastStorySeen(storyOwnerId, mainBroadcast.length ? mainBroadcast : [liveItem]);
      setStorySeenTick((n) => n + 1);
      await openItem(liveItem);
      return;
    }

    if (!hasLiveBroadcast) return;
    const item = mainBroadcast[0];
    if (!item) return;
    markBroadcastStorySeen(storyOwnerId, mainBroadcast);
    setStorySeenTick((n) => n + 1);
    await openItem(item);
  };

  const toggleBroadcast = async (item, e) => {
    e?.stopPropagation?.();
    if (!isMine) return;
    const caseId = String(item?.id || "").trim();
    if (!caseId) {
      toast("게시물 정보가 올바르지 않습니다.");
      return;
    }
    const next = !item.isMainBroadcast;
    setBusyId(caseId);
    try {
      const res = await setMycaseBroadcast(caseId, next);
      if (!res.ok) {
        if (res.error === "not_found") {
          toast("게시물을 찾을 수 없습니다. 목록을 새로고침합니다.");
          await loadFirst();
          return;
        }
        toast(res.message || "송출 설정을 변경할 수 없습니다.");
        return;
      }
      if (res.policy) setPolicy(res.policy);
      setItems((prev) => prev.map((x) => (x.id === caseId ? { ...x, ...res.item } : x)));
      setMainBroadcast((prev) => {
        if (next) return [...prev.filter((x) => x.id !== caseId), res.item];
        return prev.filter((x) => x.id !== caseId);
      });
      if (next) {
        const applied = applyMycaseItemToLiveBroadcast(res.item);
        if (!applied) {
          toast("송출은 켜졌지만 쇼케이스 내용이 비어 있습니다. 블루 쇼케이스에서 다시 저장해 주세요.");
        } else {
          toast("메인 송출 ON · 통화 미리보기에 반영됨");
        }
      } else {
        preserveCaseboxBgmBeforeClearLive();
        clearLiveBroadcastMeta();
        toast("메인 송출 OFF");
      }
      onBroadcastChanged?.(res.item, res.policy || null);
    } finally {
      setBusyId(null);
    }
  };

  /** 통화용 라이브 비우기 직전 — 재생 URL이 라이브에만 있으면 편집 설정으로 보존 */
  const preserveCaseboxBgmBeforeClearLive = () => {
    try {
      const editor = readShowcaseStyle();
      if (hasPlayableShowcaseBgm(editor)) return;
      const live = readLiveShowcaseStyle();
      if (live && hasPlayableShowcaseBgm(live)) {
        writeShowcaseStyle({ ...editor, bgm: live.bgm }, { skipSync: true, silent: true });
      }
    } catch {
      /* ignore */
    }
  };

  const removeItem = async (item, e) => {
    e?.stopPropagation?.();
    if (!isMine) return;
    if (!window.confirm("모든 기록이 삭제됩니다.")) return;
    const caseId = String(item?.id || "").trim();
    if (!caseId) {
      toast("게시물 정보가 올바르지 않습니다.");
      return;
    }
    const liveMeta = readLiveBroadcastMeta();
    const touchingLive =
      Boolean(item.isMainBroadcast) || String(liveMeta?.caseId || "") === caseId;
    setBusyId(caseId);
    try {
      const res = await deleteMycase(caseId);
      if (!res.ok) {
        if (res.error === "not_found") {
          toast("이미 삭제된 게시물입니다. 목록을 새로고침합니다.");
          if (touchingLive) {
            preserveCaseboxBgmBeforeClearLive();
            clearLiveBroadcastMeta();
            await hydrateLiveBroadcastFromServer();
          }
          await loadFirst();
          return;
        }
        toast(res.message || "삭제에 실패했습니다.");
        return;
      }
      if (res.policy) setPolicy(res.policy);
      setItems((prev) => prev.filter((x) => x.id !== caseId));
      setMainBroadcast((prev) => prev.filter((x) => x.id !== caseId));
      /* 송출 게시물 삭제 → 통화 미리보기만 비움. 케이스함 BGM(편집 설정)은 유지 */
      if (touchingLive) {
        preserveCaseboxBgmBeforeClearLive();
        clearLiveBroadcastMeta();
        await hydrateLiveBroadcastFromServer();
      }
      toast("삭제되었습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const openShowcaseSettings = () => {
    window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
  };

  /** 새로 만들기 / 쇼케이스 저장 → 블루 쇼케이스 설정(3번) */
  const goCreateOrEditShowcase = () => {
    if (!isMine) return;
    openShowcaseSettings();
  };

  /** 현재 로컬 쇼케이스를 바로 아카이브에 남김 (설정 적용과 동일)
   * 게시물에는 음원을 넣지 않음 — 케이스함 BGM과 분리 */
  const saveCurrentToArchive = async () => {
    if (!isMine) return;
    const style = readShowcaseStyle();
    const cover = extractShowcaseCoverUrl(style);
    const title = extractShowcaseArchiveTitle(style);
    if (!cover && !(style?.pages?.length > 0)) {
      toast("먼저 블루 쇼케이스에서 사진을 추가해 주세요.");
      openShowcaseSettings();
      return;
    }
    setBusyId("archive");
    try {
      const archiveStyle = slimShowcaseStyleForPersist({
        ...style,
        bgm: createEmptyShowcaseBgm()
      });
      const res = await archiveShowcaseToMycase({
        title,
        thumbnailUrl: cover || null,
        payloadJson: { style: archiveStyle, source: "mycase_save" },
        isPublic: style?.privacyMode !== "friend_only"
      });
      if (!res.ok) {
        toast(res.message || "저장에 실패했습니다.");
        return;
      }
      toast("마이케이스에 저장되었습니다.");
      await loadFirst();
    } finally {
      setBusyId(null);
    }
  };

  const postsCount = items.length;
  const policyLine = isMine && policy ? formatCooldownHint(policy) : "";
  const highlightItems = mainBroadcast;

  return (
    <section
      className={`ig-mycase${isDarkMode ? " ig-mycase--dark" : " ig-mycase--light"} ${className}`.trim()}
      aria-label="마이케이스"
      data-theme={isDarkMode ? "dark" : "light"}
    >
      <div className="ig-mycase__hero">
        {avatarUrl ? (
          <>
            <div className="ig-mycase__hero-bg" aria-hidden>
              <img src={avatarUrl} alt="" />
            </div>
            <div className="ig-mycase__hero-fade" aria-hidden />
          </>
        ) : null}
        <header className="ig-mycase__topbar">
          <button type="button" className="ig-mycase__icon-btn" onClick={onBack} aria-label="뒤로">
            <ChevronLeft size={26} strokeWidth={2} />
          </button>
          <h1 className="ig-mycase__username">{displayHandle}</h1>
          {isMine ? (
            <button
              type="button"
              className={`ig-mycase__icon-btn${manageMode ? " is-active" : ""}`}
              aria-label={manageMode ? "송출 관리 종료" : "송출 관리"}
              aria-pressed={manageMode}
              title="송출 관리"
              onClick={() => setManageMode((v) => !v)}
            >
              <MoreHorizontal size={22} strokeWidth={2} />
            </button>
          ) : (
            <span className="ig-mycase__icon-btn ig-mycase__icon-btn--spacer" aria-hidden />
          )}
        </header>

        <div className="ig-mycase__profile">
          <div className="ig-mycase__profile-row">
            <div
              className={`ig-mycase__avatar-wrap${
                canOpenLiveStory ? (storyUnseen ? " is-story-unseen" : " is-story-seen") : ""
              }`}
            >
              {canOpenLiveStory ? (
                <button
                  type="button"
                  className="ig-mycase__avatar-btn"
                  onClick={() => void openLiveBroadcastStory()}
                  aria-label={
                    storyUnseen
                      ? "현재 송출 쇼케이스 보기 (새 업데이트)"
                      : "현재 송출 쇼케이스 보기"
                  }
                >
                  {avatarUrl ? (
                    <img className="ig-mycase__avatar" src={avatarUrl} alt="" />
                  ) : (
                    <span className="ig-mycase__avatar ig-mycase__avatar--ph">
                      {(displayName || "?").slice(0, 1)}
                    </span>
                  )}
                </button>
              ) : avatarUrl ? (
                <img className="ig-mycase__avatar" src={avatarUrl} alt="" />
              ) : (
                <span className="ig-mycase__avatar ig-mycase__avatar--ph">
                  {(displayName || "?").slice(0, 1)}
                </span>
              )}
            </div>
            <div className="ig-mycase__stats" role="group" aria-label="통계">
              <div className="ig-mycase__stat">
                <b>{formatCount(postsCount)}</b>
                <span>게시물</span>
              </div>
              <div className="ig-mycase__stat">
                <b>{formatCount(followCounts.followers)}</b>
                <span>팔로워</span>
              </div>
              <div className="ig-mycase__stat">
                <b>{formatCount(followCounts.following)}</b>
                <span>팔로잉</span>
              </div>
            </div>
          </div>

          <div className="ig-mycase__bio">
            <div className="ig-mycase__bio-head">
              <p className="ig-mycase__name">{displayName}</p>
              {!isMine ? (
                <div className="ig-mycase__bio-actions">
                  <FollowActionButton targetUserId={ownerUserId} className="ig-mycase__follow-btn" />
                </div>
              ) : null}
            </div>
            <div className="ig-mycase__bio-meta">
              {isMine ? (
                <p className="ig-mycase__bio-text">
                  {policy
                    ? `${policy.tier === "pro" ? "Pro" : "Free"} · 송출중 ${
                        (policy.usedMainSlots || 0) +
                        (hasDigitalCard &&
                        policy.tier === "pro" &&
                        (policy.usedMainSlots || 0) <= mainBroadcast.length
                          ? 1
                          : 0)
                      }/${policy.maxMainSlots}`
                    : "쇼케이스 아카이브"}
                  {policyLine && !policy?.canChangeBroadcast
                    ? ` · ${policyLine
                        .replace(/^메인 송출 \d+\/\d+ · /, "")
                        .replace(/^송출중 \d+\/\d+ · /, "")}`
                    : ""}
                </p>
              ) : remoteProfile?.profile?.companyName || remoteProfile?.cardExport?.organization ? (
                <p className="ig-mycase__bio-text">
                  {remoteProfile?.profile?.companyName || remoteProfile?.cardExport?.organization}
                </p>
              ) : (
                <p className="ig-mycase__bio-text">공개 케이스함</p>
              )}
              {hasDigitalCard ? (
                <button
                  type="button"
                  className="ig-mycase__btn ig-mycase__btn--card"
                  onClick={() => onOpenDigitalCard?.()}
                >
                  디지털인증명함
                </button>
              ) : null}
            </div>
          </div>

          {bgmEnabled && caseHasBgm ? (
            <div className="ig-mycase__bgm" aria-label="쇼케이스 배경음악">
              <ShowcaseBgmTrackChip
                styleConfig={caseStyleConfig}
                placement="inline"
                className="ig-mycase__bgm-chip"
              />
              <ShowcaseBgmTransport
                className="ig-mycase__bgm-transport"
                styleConfig={caseStyleConfig}
              />
            </div>
          ) : null}

          {isMine ? (
            <div className="ig-mycase__actions">
              <button
                type="button"
                className="ig-mycase__btn ig-mycase__btn--secondary"
                disabled={busyId === "archive"}
                onClick={saveCurrentToArchive}
              >
                아카이브 저장
              </button>
              <button
                type="button"
                className={`ig-mycase__btn ig-mycase__btn--secondary${manageMode ? " is-active" : ""}`}
                onClick={() => setManageMode((v) => !v)}
              >
                {manageMode ? "완료" : "송출 관리"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!accessDenied ? (
        <div className="ig-mycase__highlights" aria-label="메인 송출 하이라이트">
          {isMine ? (
            <button
              type="button"
              className="ig-mycase__hl ig-mycase__hl--new"
              onClick={goCreateOrEditShowcase}
            >
              <span className="ig-mycase__hl-ring ig-mycase__hl-ring--dashed">
                <span className="ig-mycase__hl-plus">+</span>
              </span>
              <span className="ig-mycase__hl-label">새로 만들기</span>
            </button>
          ) : null}
          {highlightItems.map((item) => (
            <button
              key={`hl-${item.id}`}
              type="button"
              className="ig-mycase__hl"
              onClick={() => openItem(item)}
            >
              <span className="ig-mycase__hl-ring">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" />
                ) : (
                  <span className="ig-mycase__hl-ph" />
                )}
              </span>
              <span className="ig-mycase__hl-label">{item.title || "송출"}</span>
            </button>
          ))}
          {!isMine && highlightItems.length === 0 ? (
            <p className="ig-mycase__hl-empty">메인 송출 중인 케이스가 없습니다</p>
          ) : null}
        </div>
      ) : null}

      <div className="ig-mycase__tabs" role="tablist">
        <button type="button" className="ig-mycase__tab is-active" role="tab" aria-selected>
          <Grid3X3 size={22} strokeWidth={2} aria-hidden />
          <span className="sr-only">그리드</span>
        </button>
      </div>

      {accessDenied ? (
        <div className="ig-mycase__locked">
          <p className="ig-mycase__locked-title">비공개 계정</p>
          <p className="ig-mycase__locked-desc">
            {denyReason === "private_followers_only"
              ? "팔로워만 이 회원의 케이스함을 볼 수 있습니다."
              : "열람 권한이 없습니다."}
          </p>
        </div>
      ) : loading ? (
        <p className="ig-mycase__empty">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="ig-mycase__empty-block">
          <p className="ig-mycase__empty-title">
            {isMine ? "아직 게시물이 없습니다" : "공개된 케이스가 없습니다"}
          </p>
          {isMine ? (
            <p className="ig-mycase__empty-desc">
              「새로 만들기」로 블루 쇼케이스를 편집한 뒤 「적용하기」하면 여기에 쌓입니다.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="ig-mycase__grid">
          {items.map((item) => (
            <li key={item.id} className="ig-mycase__cell">
              <button
                type="button"
                className="ig-mycase__thumb"
                onClick={() => {
                  if (!manageMode) openItem(item);
                }}
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const ph = e.currentTarget.nextElementSibling;
                      if (ph) ph.classList.add("is-visible");
                    }}
                  />
                ) : null}
                <span
                  className={`ig-mycase__thumb-ph${item.thumbnailUrl ? "" : " is-visible"}`}
                  aria-hidden
                />
                {item.isMainBroadcast ? (
                  <span className="ig-mycase__pin" title="메인 송출">
                    <Pin size={14} strokeWidth={2.5} fill="currentColor" />
                  </span>
                ) : null}
              </button>
              {manageMode && isMine ? (
                <div className="ig-mycase__manage">
                  <button
                    type="button"
                    className={`ig-mycase__manage-btn${item.isMainBroadcast ? " is-on" : ""}`}
                    disabled={busyId === item.id}
                    onClick={(e) => toggleBroadcast(item, e)}
                  >
                    {item.isMainBroadcast ? "메인 송출 끄기" : "메인 송출 켜기"}
                  </button>
                  <button
                    type="button"
                    className="ig-mycase__manage-del"
                    disabled={busyId === item.id}
                    onClick={(e) => removeItem(item, e)}
                  >
                    삭제
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {nextCursor && !accessDenied ? (
        <div ref={sentinelRef} className="ig-mycase__sentinel">
          {loadingMore ? "더 불러오는 중…" : ""}
        </div>
      ) : null}
    </section>
  );
}
