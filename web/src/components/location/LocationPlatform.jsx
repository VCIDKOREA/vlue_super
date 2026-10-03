import { useCallback, useEffect, useRef, useState } from "react";
import AdMobBannerSlot from "../ads/AdMobBannerSlot.jsx";
import MemberSafetyDetail from "./MemberSafetyDetail.jsx";
import { reverseGeocodeLatLng } from "../../lib/activeRegion.js";
import {
  createVmapRoom,
  departVmap,
  arriveVmap,
  exitVmapApi,
  fetchFamilyLocations,
  fetchFamilyLocationMessages,
  fetchMapSponsor,
  fetchVmapGuide,
  fetchVmapMessages,
  fetchVmapRoom,
  finishVmapApi,
  joinVmapRoom,
  searchVmapPlaces,
  updateVmapPlace,
  pingVmap,
  postFamilyLocationMessage,
  postVmapMessage,
  publishPresence,
  publishVmapPresence,
  setNativeVmapSession,
  setMapKeepScreenOn,
  setNativeVmapMiniOverlay,
  updateNativeVmapMiniOverlay,
  subscribeVmapPing,
  startFamilyNavigate,
  watchVmapCreateAd
} from "../../lib/locationApi.js";
import { canUseV1PaidFeatures } from "../../lib/effectiveMembership.js";
import { isPaidMembershipKind, isB2bMembershipKind, normalizeMembershipKind } from "../../lib/membershipBm.js";
import { readMembershipTier } from "../../lib/bizcardAccountSync.js";
import {
  dismissLocation,
  exitVmapRoom,
  getLocationSession,
  openLocation,
  patchLocationSession,
  restoreLocation,
  setMapThemePreference,
  subscribeLocationSession
} from "../../lib/locationSession.js";
import { getProfileHeaderName } from "../../lib/memberCardStorage.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { estimateEtaMinutes, haversineMeters, resolveMapTheme } from "../../lib/sunTheme.js";
import { formatGuideDistance, maneuverGlyph, nextGuideCue } from "../../lib/vmapGuide.js";
import { bindMapTapFeedback, mapTapFeedback } from "../../lib/mapTapFeedback.js";
import { syncOwnerInboxFromServer } from "../../lib/ownerInboxSync.js";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { readLastGeo, writeLastGeo } from "../../lib/lastGeoCache.js";
import VmapNaverSurface from "./VmapNaverSurface.jsx";
import VmapFriendInviteSheet from "./VmapFriendInviteSheet.jsx";
import VMapChatOverlay from "./VMapChatOverlay.jsx";

const TILE = 256;
const ACCENT = "#00D2FF";
const AD_BANNER_PX = 56;
/** 수동 도착 완료는 이 거리 안에 들어와야 한다. */
const MANUAL_ARRIVE_METERS = 180;
const MINI_KEY = "vlue_vmap_mini_pos_v1";
const FAREWELL = "전원 목적지까지 안전하게 도착하셨습니다. 오늘도 즐거운 하루 되십시요";
const VMAP_CHAT_NEED_PEERS = "입장된 인원이 없습니다. 초대를 통해 회원간 소통이 가능합니다.";
const FAMILY_PLAN_TOAST = "해당 기능을 사용하기 위해 가족보호플랜을 사용하세요.";

function localHasCyanBadge() {
  return canUseV1PaidFeatures();
}

function localCanUseFamilyLocation() {
  return canUseV1PaidFeatures();
}

function localIsPaidForAds() {
  const kind = normalizeMembershipKind(readMembershipTier());
  return isPaidMembershipKind(kind) || isB2bMembershipKind(kind) || canUseV1PaidFeatures();
}

function readMiniPos() {
  try {
    const raw = sessionStorage.getItem(MINI_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (!Number.isFinite(pos?.x) || !Number.isFinite(pos?.y)) return null;
    return { x: pos.x, y: pos.y };
  } catch {
    return null;
  }
}

function writeMiniPos(pos) {
  try {
    sessionStorage.setItem(MINI_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function hideLocationAds() {
  try {
    window.dispatchEvent(new Event("vlue-hide-all-ads"));
    const bridge = window.VlueLettering || window.Android;
    bridge?.hideBannerAd?.("location_map");
    bridge?.hideBannerAd?.("bottom");
    bridge?.hideBannerAd?.("ribbon");
  } catch {
    /* ignore */
  }
}

function zoomForMeters(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return 15;
  if (value <= 150) return 18;
  if (value <= 400) return 17;
  if (value <= 900) return 16;
  if (value <= 2000) return 15;
  if (value <= 5000) return 14;
  if (value <= 12000) return 13;
  return 12;
}

/** 배민/네이버처럼 연회색 파스텔 — Carto Positron */
function tileUrl(z, x, y) {
  const wrap = 2 ** z;
  const xx = ((x % wrap) + wrap) % wrap;
  const yy = Math.max(0, Math.min(wrap - 1, y));
  const host = ["a", "b", "c", "d"][(xx + yy) % 4];
  return `https://${host}.basemaps.cartocdn.com/light_all/${z}/${xx}/${yy}.png`;
}

function worldX(lng, z) {
  return ((lng + 180) / 360) * 2 ** z;
}

function worldY(lat, z) {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z;
}

function unproject(x, y, view, width, height) {
  const zoom = view.zoom;
  const centerX = worldX(view.lng, zoom) * TILE;
  const centerY = worldY(view.lat, zoom) * TILE;
  const wx = (centerX - width / 2 + x) / TILE;
  const wy = (centerY - height / 2 + y) / TILE;
  const lng = (wx / 2 ** zoom) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * wy) / 2 ** zoom;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function latFromWorldY(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** 화면 좌표가 같은 지점을 가리키도록 줌만 바꾼다. */
function zoomAt(view, nextZoom, sx, sy, width, height) {
  const zoom = Math.max(3, Math.min(19, nextZoom));
  const geo = unproject(sx, sy, view, width, height);
  const geoX = worldX(geo.lng, zoom) * TILE;
  const geoY = worldY(geo.lat, zoom) * TILE;
  const centerX = geoX - (sx - width / 2);
  const centerY = geoY - (sy - height / 2);
  const lng = (centerX / TILE / 2 ** zoom) * 360 - 180;
  const lat = latFromWorldY(centerY / TILE, zoom);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return view;
  return { ...view, zoom, lat: Math.max(-80, Math.min(80, lat)), lng, placed: true };
}

function rememberTile(cache, z, x, y) {
  const wrap = 2 ** z;
  const xx = ((x % wrap) + wrap) % wrap;
  const yy = Math.max(0, Math.min(wrap - 1, y));
  const key = `${z}/${xx}/${yy}`;
  let image = cache.get(key);
  if (image) {
    cache.delete(key);
    cache.set(key, image);
  } else {
    image = new Image();
    image.decoding = "async";
    image.src = tileUrl(z, xx, yy);
    cache.set(key, image);
    while (cache.size > 240) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined || oldest === key) break;
      cache.delete(oldest);
    }
  }
  return image.complete && image.naturalWidth ? image : null;
}

function paintTile(ctx, cache, z, x, y, dx, dy, size) {
  const image = rememberTile(cache, z, x, y);
  if (image) {
    ctx.drawImage(image, dx, dy, size, size);
    return;
  }
  if (z <= 2) return;
  const wrap = 2 ** z;
  const wrapped = ((x % wrap) + wrap) % wrap;
  const parent = rememberTile(cache, z - 1, Math.floor(wrapped / 2), Math.floor(y / 2));
  if (!parent || y < 0) return;
  ctx.drawImage(parent, (wrapped % 2) * 128, (y % 2) * 128, 128, 128, dx, dy, size, size);
}

function readBattery() {
  const battery = navigator.getBattery?.();
  return battery && typeof battery.then === "function" ? battery : Promise.resolve(null);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("음성 변환 실패"));
    reader.readAsDataURL(blob);
  });
}

function roundImage(cache, url) {
  const src = String(url || "").trim();
  if (!src) return null;
  let image = cache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    cache.set(src, image);
  }
  return image.complete && image.naturalWidth ? image : null;
}

function drawPerson(ctx, x, y, image, name, live) {
  const radius = 22;
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = live ? ACCENT : "rgba(255,255,255,0.85)";
  ctx.shadowColor = live ? "rgba(0, 210, 255, 0.55)" : "rgba(15, 23, 42, 0.25)";
  ctx.shadowBlur = live ? 14 : 6;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, radius + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = live ? "#083044" : "#94a3b8";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(name || "?").trim().slice(0, 1) || "?", x, y + 1);
  }
  ctx.restore();
  if (!live) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.fill();
    ctx.restore();
  }
  const label = String(name || "").trim();
  if (!label) return;
  ctx.font = "700 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = Math.ceil(ctx.measureText(label).width) + 14;
  const boxY = y + radius + 8;
  ctx.fillStyle = "rgba(4, 18, 26, 0.88)";
  ctx.beginPath();
  ctx.roundRect(x - width / 2, boxY, width, 18, 9);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 210, 255, 0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x, boxY + 9);
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3.2 11.1 20.4 4.2c.8-.4 1.6.5 1.2 1.3L15 21.2c-.4 1-1.7.9-2-.1l-2.1-6.4-6.6-2.2c-1-.4-1-1.7-.1-2.4Z" />
    </svg>
  );
}

function drawPlacePin(ctx, x, y, ready) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = ready ? ACCENT : "#f59e0b";
  ctx.beginPath();
  ctx.arc(0, -16, 11, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -16, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function LocationPlatform() {
  const [session, setSession] = useState(getLocationSession);
  const [members, setMembers] = useState([]);
  const [room, setRoom] = useState(null);
  const [self, setSelf] = useState(() => {
    const cached = readLastGeo();
    if (!cached) return null;
    return {
      lat: cached.lat,
      lng: cached.lng,
      addressLabel: "",
      batteryPct: null,
      online: true,
      displayName: getProfileHeaderName() || "나"
    };
  });
  const [sponsor, setSponsor] = useState(null);
  const [sponsorReady, setSponsorReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState("");
  const [guideOn, setGuideOn] = useState(false);
  const [routes, setRoutes] = useState({});
  const [draftPin, setDraftPin] = useState(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState([]);
  const [farewell, setFarewell] = useState("");
  const [arriveState, setArriveState] = useState("idle");
  const [sending, setSending] = useState(false);
  const [chatExpandToken, setChatExpandToken] = useState(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [searchOpen, setSearchOpen] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState("");
  const [miniPos, setMiniPos] = useState(() => readMiniPos() || { x: null, y: null });
  const [roomBusy, setRoomBusy] = useState("");
  const [routeMode, setRouteMode] = useState("recommend");
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [nativeMini, setNativeMini] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  /** 가족방에서 상대 위치로 이동 중 — V-Map 모드로 전환하지 않음 */
  const [familyNavTarget, setFamilyNavTarget] = useState(null);
  const [familyNavBusy, setFamilyNavBusy] = useState(false);
  const familyNavRef = useRef(null);
  const pinDragRef = useRef(null);
  const pinDirtyRef = useRef(false);
  const canvasRef = useRef(null);
  const mapSurfaceRef = useRef(null);
  const roomRef = useRef(null);
  const membersRef = useRef([]);
  const sessionRef = useRef(session);
  const arrivalLock = useRef(false);
  const endSessionRef = useRef(() => {});
  const viewRef = useRef({ lat: 36.119, lng: 128.344, zoom: 15 });
  const dragRef = useRef(null);
  const mediaRef = useRef(null);
  const seenVoice = useRef(new Set());
  const afterRef = useRef("");
  const tileCacheRef = useRef(new Map());
  const faceCacheRef = useRef(new Map());
  const sceneRef = useRef({});
  const paintRef = useRef(() => {});
  const followRef = useRef(null);
  const userZoomedRef = useRef(false);
  const gestureAtRef = useRef(0);
  const flyingRef = useRef(false);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const sendLock = useRef(false);
  const arriveLock = useRef(false);
  const lastTapRef = useRef(0);
  const wakeLockRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const miniDragRef = useRef(null);
  const leaveLock = useRef(false);
  const guideOnRef = useRef(false);
  const routeModeRef = useRef("recommend");
  guideOnRef.current = guideOn;
  routeModeRef.current = routeMode;

  useEffect(() => subscribeLocationSession(setSession), []);
  roomRef.current = room;
  membersRef.current = members;
  sessionRef.current = session;
  familyNavRef.current = familyNavTarget;
  sceneRef.current = { members, room, self, routes, draftPin, mode: session.mode, departed: session.departed };
  endSessionRef.current = () => {
    setFarewell("");
    setNativeVmapSession(false);
    setRoom(null);
    setMessages([]);
    setMembers([]);
    exitVmapRoom();
    syncOwnerInboxFromServer().catch(() => {});
  };

  useEffect(() => {
    const onOpen = (event) => {
      const mode = event?.detail?.mode || "family";
      const roomId = String(event?.detail?.roomId || "").trim();
      const shouldJoin = Boolean(event?.detail?.join && roomId);
      const expandChat = Boolean(event?.detail?.expandChat);
      const familyPaywall = Boolean(event?.detail?.familyPaywall);
      const nextMode = mode === "vmap" || roomId ? "vmap" : "family";
      openLocation(nextMode);
      if (expandChat) {
        window.setTimeout(() => setChatExpandToken((n) => n + 1), 500);
      }
      if (shouldJoin) {
        void (async () => {
          try {
            await joinVmapRoom(roomId, { displayName: getProfileHeaderName() || "참여자" });
            patchLocationSession({
              mode: "vmap",
              roomId,
              departed: false,
              open: true,
              minimized: false
            });
            setJoinCode("");
            const data = await fetchVmapRoom(roomId);
            setRoom(data.room || null);
            setMembers(Array.isArray(data.members) ? data.members : []);
            setNotice("V-Map에 입장했습니다.");
            window.setTimeout(() => setNotice(""), 2400);
            if (expandChat) setChatExpandToken((n) => n + 1);
          } catch (error) {
            patchLocationSession({ mode: "vmap", open: true, minimized: false });
            setJoinCode(roomId);
            setNotice(error?.message || "초대 방에 입장하지 못했습니다.");
            window.setTimeout(() => setNotice(""), 2400);
          }
        })();
      } else if (roomId) {
        patchLocationSession({ mode: "vmap", roomId, open: true, minimized: false });
      } else if (nextMode === "family") {
        /* 탭(가족/V-Map)은 유지. 무료는 토스트만 — 가족 위치 데이터는 아래에서 게이트 */
        patchLocationSession({ mode: "family", open: true, minimized: false });
        if (familyPaywall || !localCanUseFamilyLocation()) {
          window.setTimeout(() => {
            setNotice(FAMILY_PLAN_TOAST);
            window.setTimeout(() => setNotice(""), 2800);
          }, 120);
        }
      }
    };
    const onRestore = () => restoreLocation();
    window.addEventListener("vlue-open-location", onOpen);
    window.addEventListener("vlue-restore-vmap", onRestore);
    return () => {
      window.removeEventListener("vlue-open-location", onOpen);
      window.removeEventListener("vlue-restore-vmap", onRestore);
    };
  }, []);

  const theme = resolveMapTheme(session.theme, self?.lat, self?.lng);
  const visible = session.open || session.minimized;
  const tracking = session.open || (session.mode === "vmap" && Boolean(session.roomId));

  const pushNotice = (text) => {
    setNotice(text);
    const ms = String(text || "").length > 36 ? 3600 : 2400;
    window.setTimeout(() => setNotice(""), ms);
  };

  const refreshFamily = useCallback(async () => {
    if (!localCanUseFamilyLocation()) {
      setMembers([]);
      return;
    }
    try {
      const data = await fetchFamilyLocations();
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch {
      /* 로그인 전 */
    }
  }, []);

  const refreshRoom = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      const data = await fetchVmapRoom(roomId);
      if (data.dissolved) {
        if (data.reason === "arrived") {
          if (!arrivalLock.current) {
            arrivalLock.current = true;
            setFarewell(FAREWELL);
            window.setTimeout(() => endSessionRef.current(), 5000);
          }
          return;
        }
        endSessionRef.current();
        return;
      }
      setRoom(data.room);
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (error) {
      pushNotice(error.message);
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    fetchMapSponsor().then((banner) => {
      setSponsor(banner);
      setSponsorReady(true);
    });
    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!tracking) return undefined;
    let watchId = 0;
    const name = getProfileHeaderName() || "나";
    /* 지도 열자마자 마지막 GPS로 본인 마커를 먼저 올린다 */
    const cached = readLastGeo();
    if (cached) {
      setSelf((prev) => {
        if (prev?.lat != null && prev?.lng != null) return prev;
        return {
          lat: cached.lat,
          lng: cached.lng,
          addressLabel: prev?.addressLabel || "",
          batteryPct: prev?.batteryPct ?? null,
          online: true,
          displayName: name
        };
      });
    }
    const send = async (coords, online) => {
      const lat = coords?.latitude;
      const lng = coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      writeLastGeo(lat, lng);
      /* 주소/배터리 조회가 느려도 프로필 마커는 즉시 올리기 */
      const next = { lat, lng, addressLabel: "", batteryPct: null, online, displayName: name };
      setSelf(next);
      try {
        const region = await reverseGeocodeLatLng(lat, lng);
        next.addressLabel = region.detailedAddress || region.displayName || region.label || "";
      } catch {
        next.addressLabel = "";
      }
      try {
        const battery = await readBattery();
        if (battery && Number.isFinite(battery.level)) next.batteryPct = Math.round(battery.level * 100);
      } catch {
        next.batteryPct = null;
      }
      setSelf({ ...next });
      const liveRoom = roomRef.current;
      const selfRow = membersRef.current.find((member) => member.userId === getLocalVlueUserId());
      const familyDest = familyNavRef.current;
      const navigatingVmap =
        session.mode === "vmap" &&
        session.departed &&
        guideOnRef.current &&
        !selfRow?.arrived &&
        liveRoom?.placeReady &&
        !dragRef.current &&
        !pinDragRef.current;
      const navigatingFamily =
        session.mode === "family" &&
        guideOnRef.current &&
        familyDest?.lat != null &&
        familyDest?.lng != null &&
        !dragRef.current;
      if (!viewRef.current.placed) {
        viewRef.current = { lat, lng, zoom: 16, placed: true };
      }
      if (navigatingVmap) {
        followRef.current = {
          lat,
          lng,
          zoom: userZoomedRef.current
            ? null
            : zoomForMeters(haversineMeters(lat, lng, liveRoom.placeLat, liveRoom.placeLng))
        };
      } else if (navigatingFamily) {
        followRef.current = {
          lat,
          lng,
          zoom: userZoomedRef.current
            ? null
            : zoomForMeters(haversineMeters(lat, lng, familyDest.lat, familyDest.lng))
        };
      } else {
        followRef.current = null;
      }
      if (session.mode === "family") {
        if (localCanUseFamilyLocation()) {
          publishPresence(next).then(refreshFamily).catch(() => {});
        }
      } else if (session.roomId && session.departed) {
        publishVmapPresence(session.roomId, {
          lat,
          lng,
          online,
          displayName: name,
          batteryPct: next.batteryPct
        })
          .then((data) => {
            if (data?.member?.arrived) {
              setMembers((prev) => prev.map((member) => (member.userId === getLocalVlueUserId() ? { ...member, arrived: true } : member)));
            }
            if (data?.closingAt) {
              setRoom((prev) => (prev ? { ...prev, closingAt: data.closingAt, closingReason: "arrived" } : prev));
              pingVmap(session.roomId);
            }
            return refreshRoom(session.roomId);
          })
          .catch(() => {});
      }
    };
    if (!navigator.geolocation) {
      setSelf((prev) => ({ ...(prev || {}), online: false }));
      return undefined;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void send(pos.coords, true),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
    );
    watchId = navigator.geolocation.watchPosition(
      (pos) => void send(pos.coords, true),
      () => setSelf((prev) => (prev ? { ...prev, online: false } : { online: false, lat: null, lng: null })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking, session.mode, session.roomId, session.departed, refreshFamily, refreshRoom]);

  useEffect(() => {
    if (!tracking || session.mode !== "family") return undefined;
    refreshFamily();
    const timer = window.setInterval(refreshFamily, 8000);
    return () => window.clearInterval(timer);
  }, [tracking, session.mode, refreshFamily]);

  useEffect(() => {
    if (!session.roomId || session.mode !== "vmap") return undefined;
    setNativeVmapSession(true);
    refreshRoom(session.roomId);
    const stopPing = subscribeVmapPing(session.roomId, () => refreshRoom(session.roomId));
    const timer = window.setInterval(() => refreshRoom(session.roomId), 6000);
    return () => {
      window.clearInterval(timer);
      stopPing();
    };
  }, [session.roomId, session.mode, refreshRoom]);

  useEffect(() => {
    const stamp = room?.closingAt;
    if (!stamp || arrivalLock.current) return undefined;
    arrivalLock.current = true;
    setFarewell(FAREWELL);
    const timer = window.setTimeout(() => {
      const roomId = sessionRef.current.roomId;
      const done = roomId ? finishVmapApi(roomId).catch(() => null) : Promise.resolve(null);
      done.finally(() => endSessionRef.current());
    }, 5000);
    return undefined;
  }, [room?.closingAt]);

  useEffect(() => {
    afterRef.current = "";
    setMessages([]);
    seenVoice.current = new Set();
  }, [session.mode, session.roomId]);

  useEffect(() => {
    if (!session.open) return undefined;
    const canVmap = session.mode === "vmap" && Boolean(session.roomId);
    const canFamily = session.mode === "family";
    if (!canVmap && !canFamily) return undefined;
    const pull = async () => {
      try {
        const data = canVmap
          ? await fetchVmapMessages(session.roomId, afterRef.current)
          : await fetchFamilyLocationMessages(afterRef.current);
        const rows = data.messages || [];
        if (!rows.length) return;
        afterRef.current = rows[rows.length - 1].createdAt;
        setMessages((prev) => {
          const known = new Set(prev.map((row) => row.id));
          const fresh = rows.filter((row) => !known.has(row.id));
          return fresh.length ? [...prev, ...fresh].slice(-80) : prev;
        });
        rows.filter((row) => row.kind === "voice" && row.userId !== getLocalVlueUserId()).forEach((row) => {
          if (seenVoice.current.has(row.id)) return;
          seenVoice.current.add(row.id);
          const audio = new Audio(row.body);
          audio.play().catch(() => {});
        });
      } catch {
        /* 방 입장 전 / 가족 미연결 */
      }
    };
    pull();
    const timer = window.setInterval(pull, 2500);
    return () => window.clearInterval(timer);
  }, [session.roomId, session.open, session.mode]);

  const departedKey = members
    .filter((member) => member.departed && member.lat != null)
    .map((member) => `${member.userId}:${Number(member.lat).toFixed(3)}:${Number(member.lng).toFixed(3)}`)
    .join("|");

  useEffect(() => {
    if (!room || pinDirtyRef.current) return;
    setDraftPin({
      lat: room.placeLat,
      lng: room.placeLng,
      label: room.placeLabel || "",
      ready: Boolean(room.placeReady)
    });
  }, [room]);

  useEffect(() => {
    if (session.mode !== "vmap" || !room?.placeReady || !departedKey) {
      return undefined;
    }
    let cancelled = false;
    const movers = members.filter((member) => member.departed && member.lat != null && member.lng != null);
    (async () => {
      const next = {};
      for (const member of movers) {
        try {
          const data = await fetchVmapGuide({
            fromLat: member.lat,
            fromLng: member.lng,
            toLat: room.placeLat,
            toLng: room.placeLng,
            mode: routeModeRef.current
          });
          if (data?.ok && Array.isArray(data.points)) next[member.userId] = data;
        } catch {
          /* 도로 경로를 못 받으면 선을 그리지 않는다 */
        }
      }
      if (!cancelled) setRoutes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.mode, room?.placeReady, room?.placeLat, room?.placeLng, departedKey, routeMode]);

  /* 가족방 이동 안내 — 내 GPS → 상대 위치 경로 갱신 */
  const familyNavKey = familyNavTarget
    ? `${familyNavTarget.userId}:${Number(familyNavTarget.lat).toFixed(4)}:${Number(familyNavTarget.lng).toFixed(4)}`
    : "";
  const selfNavKey =
    self?.lat != null ? `${Number(self.lat).toFixed(4)}:${Number(self.lng).toFixed(4)}` : "";
  useEffect(() => {
    if (session.mode !== "family" || !familyNavTarget || !guideOn || self?.lat == null || self?.lng == null) {
      return undefined;
    }
    let cancelled = false;
    const mineId = getLocalVlueUserId();
    (async () => {
      try {
        const data = await fetchVmapGuide({
          fromLat: self.lat,
          fromLng: self.lng,
          toLat: familyNavTarget.lat,
          toLng: familyNavTarget.lng,
          mode: routeModeRef.current
        });
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.points)) {
          setRoutes({ [mineId]: data });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.mode, familyNavKey, selfNavKey, guideOn, routeMode, familyNavTarget, self?.lat, self?.lng]);

  useEffect(() => {
    if (session.mode !== "family") {
      setFamilyNavTarget(null);
      if (session.mode === "vmap") {
        /* vmap routes handled separately */
      } else {
        setGuideOn(false);
      }
    }
  }, [session.mode]);

  paintRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const follow = followRef.current;
    const guideFollow = Boolean(guideOnRef.current);
    const busy = dragRef.current || pinDragRef.current || pinchRef.current || flyingRef.current || performance.now() - gestureAtRef.current < 1400;
    if (follow && guideFollow && !busy) {
      const view = viewRef.current;
      const lat = view.lat + (follow.lat - view.lat) * 0.18;
      const lng = view.lng + (follow.lng - view.lng) * 0.18;
      const zoom = follow.zoom == null || userZoomedRef.current ? view.zoom : view.zoom + (follow.zoom - view.zoom) * 0.12;
      viewRef.current = { ...view, lat, lng, zoom, placed: true };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scene = sceneRef.current;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const view = viewRef.current;
    const zoom = view.zoom;
    const z = Math.max(0, Math.min(19, Math.round(zoom)));
    const base = TILE * 2 ** (zoom - z);
    const centerX = worldX(view.lng, zoom) * TILE;
    const centerY = worldY(view.lat, zoom) * TILE;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#eef2f5";
    ctx.fillRect(0, 0, width, height);
    const cache = tileCacheRef.current;
    const left = Math.floor((centerX - width / 2) / base) - 1;
    const top = Math.floor((centerY - height / 2) / base) - 1;
    const right = Math.ceil((centerX + width / 2) / base) + 1;
    const bottom = Math.ceil((centerY + height / 2) / base) + 1;
    for (let tx = left; tx <= right; tx += 1) {
      for (let ty = top; ty <= bottom; ty += 1) {
        if (ty < 0 || ty >= 2 ** z) continue;
        paintTile(ctx, cache, z, tx, ty, tx * base - (centerX - width / 2), ty * base - (centerY - height / 2), base + 0.5);
      }
    }
    const project = (lat, lng) => ({
      x: width / 2 + (worldX(lng, zoom) * TILE - centerX),
      y: height / 2 + (worldY(lat, zoom) * TILE - centerY)
    });
    canvas.__project = project;
    const { members: plottedMembers, room: liveRoom, self: liveSelf, routes: liveRoutes, draftPin: livePin, mode, departed } = scene;
    const markers = Array.isArray(plottedMembers) ? plottedMembers : [];
    if (liveRoom && mode === "vmap") {
      const hostView = liveRoom.hostUserId === getLocalVlueUserId();
      const pinSource = hostView && livePin ? livePin : liveRoom.placeReady ? liveRoom : null;
      if (pinSource?.lat != null) {
        const pin = project(pinSource.lat, pinSource.lng);
        drawPlacePin(ctx, pin.x, pin.y, Boolean(liveRoom.placeReady && livePin?.ready !== false));
      }
      if (liveRoom.placeReady) {
        const mineId = getLocalVlueUserId();
        const lines = markers.filter((member) => member.departed && member.lat != null);
        lines.sort((a, b) => Number(a.userId === mineId) - Number(b.userId === mineId));
        lines.forEach((member) => {
          const guided = liveRoutes?.[member.userId];
          if (!guided?.points?.length) return;
          const own = member.userId === mineId;
          ctx.save();
          ctx.strokeStyle = own ? "rgba(0, 210, 255, 0.35)" : "rgba(56, 189, 248, 0.28)";
          ctx.lineWidth = own ? 10 : 8;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.beginPath();
          guided.points.forEach((pair, index) => {
            const point = project(pair[1], pair[0]);
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
          ctx.strokeStyle = own ? ACCENT : "#38bdf8";
          ctx.lineWidth = own ? 5 : 4;
          ctx.beginPath();
          guided.points.forEach((pair, index) => {
            const point = project(pair[1], pair[0]);
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
          ctx.restore();
        });
      }
    }
    const plotted = [...markers];
    const selfPhoto = readProfilePhotoAvatar();
    if (liveSelf?.lat != null && mode === "family" && !plotted.some((member) => member.self || member.userId === getLocalVlueUserId())) {
      plotted.push({ ...liveSelf, userId: getLocalVlueUserId(), displayName: liveSelf.displayName || "나", photoUrl: selfPhoto, grayscale: liveSelf.online === false, online: liveSelf.online });
    }
    if (liveSelf?.lat != null && mode === "vmap" && departed && !plotted.some((member) => member.userId === getLocalVlueUserId() && member.lat != null)) {
      plotted.push({ ...liveSelf, userId: getLocalVlueUserId(), displayName: liveSelf.displayName || "나", photoUrl: selfPhoto, departed: true, online: true });
    }
    plotted.filter((member) => member.lat != null && member.lng != null && (mode === "family" || member.departed)).forEach((member) => {
      const point = project(member.lat, member.lng);
      const dead = mode === "family" && (member.grayscale || member.online === false || member.batteryPct === 0);
      const mine = member.self || member.userId === getLocalVlueUserId();
      const face = roundImage(faceCacheRef.current, mine && selfPhoto ? selfPhoto : member.photoUrl);
      const status =
        mode === "vmap" && member.departed && liveRoom
          ? member.arrived
            ? "도착"
            : member.dropout
              ? "이탈"
              : `${estimateEtaMinutes(haversineMeters(member.lat, member.lng, liveRoom.placeLat, liveRoom.placeLng))}분`
          : "";
      drawPerson(ctx, point.x, point.y, face, [member.displayName || "멤버", status].filter(Boolean).join(" · "), !dead);
    });
  };

  useEffect(() => {
    /* 네이버 SDK 지도 사용 — 캔버스 페인트 루프는 끈다 */
    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!session.open) {
      viewRef.current.naverPlaced = false;
      setMapReady(false);
    }
  }, [session.open]);

  useEffect(() => {
    if (!mapReady || !Number.isFinite(self?.lat) || !Number.isFinite(self?.lng) || viewRef.current.naverPlaced) return;
    viewRef.current.naverPlaced = true;
    mapSurfaceRef.current?.panTo?.(self.lat, self.lng, 16);
  }, [mapReady, self?.lat, self?.lng]);

  useEffect(() => {
    const target = session.flyTo;
    if (!target?.lat) return undefined;
    /* 실제 이동은 VmapNaverSurface flyTo effect 한 곳에서만 — 이중 panTo 끊김 방지 */
    userZoomedRef.current = true;
    markGesture();
    return undefined;
  }, [session.flyTo]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height);
      setKeyboardInset(overlap > 80 ? Math.round(overlap) : 0);
    };
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    if (!session.open) return undefined;
    let cancelled = false;
    const claim = async () => {
      try {
        if (!navigator.wakeLock?.request) return;
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener("release", () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
        });
      } catch {
        /* 권한·절전 모드에서는 실패할 수 있다 */
      }
    };
    claim();
    setMapKeepScreenOn(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") claim();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
      setMapKeepScreenOn(false);
    };
  }, [session.open]);

  useEffect(() => {
    if (!(session.minimized && !session.open && session.mode === "vmap" && session.roomId)) {
      setNativeVmapMiniOverlay(false);
      setNativeMini(false);
      return undefined;
    }
    const mine = membersRef.current.find((member) => member.userId === getLocalVlueUserId()) || self;
    const liveRoom = roomRef.current;
    const eta =
      mine?.lat != null && liveRoom?.placeReady
        ? `약 ${estimateEtaMinutes(haversineMeters(mine.lat, mine.lng, liveRoom.placeLat, liveRoom.placeLng))}분`
        : "";
    const ok = setNativeVmapMiniOverlay(true, {
      label: getProfileHeaderName() || "V-Map",
      eta,
      place: liveRoom?.placeLabel || "",
      lat: mine?.lat,
      lng: mine?.lng
    });
    setNativeMini(Boolean(ok));
    return undefined;
  }, [session.minimized, session.open, session.mode, session.roomId, self]);

  useEffect(() => {
    if (!(session.minimized && !session.open && nativeMini)) return undefined;
    const mine = members.find((member) => member.userId === getLocalVlueUserId()) || self;
    const eta =
      mine?.lat != null && room?.placeReady
        ? `약 ${estimateEtaMinutes(haversineMeters(mine.lat, mine.lng, room.placeLat, room.placeLng))}분`
        : "";
    updateNativeVmapMiniOverlay({
      label: getProfileHeaderName() || "V-Map",
      eta,
      place: room?.placeLabel || "",
      lat: mine?.lat,
      lng: mine?.lng
    });
    return undefined;
  }, [session.minimized, session.open, nativeMini, members, self, room]);

  useEffect(() => {
    if (session.open) {
      setNativeVmapMiniOverlay(false);
      setNativeMini(false);
    }
  }, [session.open]);

  useEffect(() => {
    if (settingsOpen || membersOpen || keyboardInset > 80) hideLocationAds();
  }, [settingsOpen, membersOpen, keyboardInset]);

  useEffect(() => {
    if (room?.placeReady && !pinDirtyRef.current) setSearchOpen(false);
  }, [room?.placeReady, room?.placeLat, room?.placeLng]);

  useEffect(() => {
    arriveLock.current = false;
    setArriveState("idle");
    setSearchOpen(true);
  }, [session.roomId]);

  const markGesture = () => {
    gestureAtRef.current = performance.now();
  };

  const nudgeZoom = (dir) => {
    userZoomedRef.current = true;
    markGesture();
    mapSurfaceRef.current?.zoomBy?.(dir);
  };

  const onPointerDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    markGesture();
    if (pointersRef.current.size >= 2) {
      dragRef.current = null;
      pinDragRef.current = false;
      const pts = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1 };
      return;
    }
    const project = canvas.__project;
    const scene = sceneRef.current;
    const hostPin = scene.room?.hostUserId === getLocalVlueUserId() ? scene.draftPin : null;
    if (project && hostPin && scene.mode === "vmap") {
      const rect = canvas.getBoundingClientRect();
      const pin = project(hostPin.lat, hostPin.lng);
      if (Math.hypot(pin.x - (event.clientX - rect.left), pin.y - (event.clientY - rect.top)) < 28) {
        pinDragRef.current = true;
        return;
      }
    }
    dragRef.current = { x: event.clientX, y: event.clientY, lat: viewRef.current.lat, lng: viewRef.current.lng, zoom: viewRef.current.zoom };
  };
  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const ratio = dist / pinchRef.current.dist;
      pinchRef.current.dist = dist;
      if (ratio > 0 && Number.isFinite(ratio) && Math.abs(ratio - 1) > 0.004) {
        const rect = canvas.getBoundingClientRect();
        userZoomedRef.current = true;
        markGesture();
        viewRef.current = zoomAt(
          viewRef.current,
          viewRef.current.zoom + Math.log2(ratio),
          (pts[0].x + pts[1].x) / 2 - rect.left,
          (pts[0].y + pts[1].y) / 2 - rect.top,
          rect.width,
          rect.height
        );
      }
      return;
    }
    if (pinDragRef.current) {
      const rect = canvas.getBoundingClientRect();
      const next = unproject(event.clientX - rect.left, event.clientY - rect.top, viewRef.current, rect.width, rect.height);
      if (Number.isFinite(next.lat) && Number.isFinite(next.lng)) {
        pinDirtyRef.current = true;
        const nextPin = { ...(sceneRef.current.draftPin || {}), lat: next.lat, lng: next.lng, ready: false };
        sceneRef.current = { ...sceneRef.current, draftPin: nextPin };
        setDraftPin(nextPin);
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const z = drag.zoom;
    /* 손가락을 민 방향으로 지도 내용이 따라온다 (카카오·네이버와 동일). */
    const wx = worldX(drag.lng, z) - (event.clientX - drag.x) / TILE;
    const wy = worldY(drag.lat, z) + (event.clientY - drag.y) / TILE;
    viewRef.current = {
      ...viewRef.current,
      lng: (wx / 2 ** z) * 360 - 180,
      lat: Math.max(-80, Math.min(80, latFromWorldY(wy, z))),
      placed: true
    };
  };
  const onPointerUp = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pinDragRef.current) {
      pinDragRef.current = false;
      return;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) return;
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        userZoomedRef.current = true;
        markGesture();
        viewRef.current = zoomAt(viewRef.current, Math.round(viewRef.current.zoom) + 1, event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
      }
      return;
    }
    lastTapRef.current = now;
    const canvas = canvasRef.current;
    const project = canvas?.__project;
    if (!project) return;
    const rect = canvas.getBoundingClientRect();
    const hit = (sceneRef.current.members || []).find((member) => {
      if (member.lat == null) return false;
      const point = project(member.lat, member.lng);
      return Math.hypot(point.x - (event.clientX - rect.left), point.y - (event.clientY - rect.top)) < 26;
    });
    setSelected(hit || null);
    if (hit?.lat != null) {
      userZoomedRef.current = true;
      markGesture();
      patchLocationSession({ flyTo: { lat: hit.lat, lng: hit.lng, at: Date.now() } });
    }
  };

  const stopFamilyNavigate = () => {
    setFamilyNavTarget(null);
    setGuideOn(false);
    setRoutePickerOpen(false);
    setRoutes({});
    pushNotice("이동 안내를 종료했습니다.");
  };

  const startFamilyMove = async (member) => {
    if (familyNavBusy || !member) return;
    if (!localCanUseFamilyLocation()) {
      pushNotice(FAMILY_PLAN_TOAST);
      return;
    }
    const mineId = getLocalVlueUserId();
    if (!member.userId || member.userId === mineId || member.self) {
      pushNotice("다른 가족 위치를 선택해 주세요.");
      return;
    }
    if (member.lat == null || member.lng == null) {
      pushNotice("상대 위치를 아직 받지 못했습니다.");
      return;
    }
    if (self?.lat == null || self?.lng == null) {
      pushNotice("현재 위치를 받은 뒤에 이동할 수 있습니다.");
      return;
    }
    setFamilyNavBusy(true);
    pushNotice("경로를 안내합니다…");
    try {
      const actorName = getProfileHeaderName() || self.displayName || "나";
      const targetName = member.displayName || "가족";
      const notified = await startFamilyNavigate({
        targetUserId: member.userId,
        displayName: actorName,
        targetDisplayName: targetName
      });
      if (notified?.message) {
        setMessages((prev) => [...prev, notified.message].slice(-80));
      }
      const data = await fetchVmapGuide({
        fromLat: self.lat,
        fromLng: self.lng,
        toLat: member.lat,
        toLng: member.lng,
        mode: routeModeRef.current
      });
      if (!data?.ok || !Array.isArray(data.points)) {
        throw new Error(data?.error || "경로를 찾지 못했습니다.");
      }
      const dest = {
        userId: member.userId,
        name: targetName,
        lat: member.lat,
        lng: member.lng
      };
      setFamilyNavTarget(dest);
      setRoutes({ [mineId]: data });
      setGuideOn(true);
      userZoomedRef.current = false;
      mapSurfaceRef.current?.panTo?.(
        self.lat,
        self.lng,
        zoomForMeters(haversineMeters(self.lat, self.lng, member.lat, member.lng))
      );
      const etaMin = data.durationSec
        ? Math.max(1, Math.round(data.durationSec / 60))
        : estimateEtaMinutes(haversineMeters(self.lat, self.lng, member.lat, member.lng));
      pushNotice(`${targetName}님께 이동 · 약 ${etaMin}분`);
    } catch (error) {
      pushNotice(error?.message || "이동을 시작하지 못했습니다.");
    } finally {
      setFamilyNavBusy(false);
    }
  };

  const makeRoom = async () => {
    if (roomBusy || leaveLock.current) return;
    if (!self?.lat) {
      pushNotice("현재 위치를 아직 못 받았습니다.");
      return;
    }
    setRoomBusy("create");
    try {
      if (!localIsPaidForAds()) {
        pushNotice("광고 시청 후 방을 개설합니다…");
        await watchVmapCreateAd();
      }
      pushNotice("방개설중...");
      const data = await createVmapRoom({
        placeLat: self.lat,
        placeLng: self.lng,
        placeLabel: self.addressLabel || "약속 장소",
        displayName: getProfileHeaderName() || "나",
        title: "V-Map 약속"
      });
      patchLocationSession({ mode: "vmap", roomId: data.room.id, departed: false, open: true, minimized: false });
      setRoom(data.room);
      pushNotice("방이 열렸습니다.");
    } catch (error) {
      pushNotice(error.message || "방을 만들지 못했습니다.");
    } finally {
      setRoomBusy("");
    }
  };

  const joinRoom = async () => {
    if (roomBusy) return;
    const roomId = joinCode.trim();
    if (!roomId) return;
    setRoomBusy("join");
    pushNotice("입장 중...");
    try {
      await joinVmapRoom(roomId, { displayName: getProfileHeaderName() || "참여자" });
      patchLocationSession({ mode: "vmap", roomId, departed: false, open: true, minimized: false });
    } catch (error) {
      pushNotice(error.message || "입장하지 못했습니다.");
    } finally {
      setRoomBusy("");
    }
  };

  const leaveForGood = async () => {
    if (leaveLock.current || roomBusy === "leave") return;
    leaveLock.current = true;
    setRoomBusy("leave");
    hideLocationAds();
    setSettingsOpen(false);
    setMembersOpen(false);
    const roomId = session.roomId;
    const host = Boolean(roomRef.current?.hostUserId) && roomRef.current.hostUserId === getLocalVlueUserId();
    pushNotice(host ? "방삭제중..." : "방 나가는 중...");
    setNativeVmapMiniOverlay(false);
    setNativeMini(false);
    setNativeVmapSession(false);
    setRoom(null);
    setMessages([]);
    setMembers([]);
    exitVmapRoom();
    try {
      if (roomId) await exitVmapApi(roomId);
    } catch (error) {
      const msg = String(error?.message || "");
      if (!/종료|없|참여|404|이미/.test(msg)) {
        pushNotice(msg || (host ? "방 삭제를 완료하지 못했습니다." : "나가기에 실패했습니다."));
      }
    } finally {
      syncOwnerInboxFromServer().catch(() => {});
      leaveLock.current = false;
      setRoomBusy("");
      pushNotice(host ? "방이 삭제되었습니다." : "방에서 나갔습니다.");
    }
  };

  const playVoice = (row) => {
    if (!row?.body) return;
    try {
      voiceAudioRef.current?.pause?.();
    } catch {
      /* ignore */
    }
    const audio = new Audio(row.body);
    voiceAudioRef.current = audio;
    setPlayingVoiceId(row.id);
    audio.onended = () => setPlayingVoiceId((id) => (id === row.id ? "" : id));
    audio.onerror = () => {
      setPlayingVoiceId((id) => (id === row.id ? "" : id));
      pushNotice("음성을 재생하지 못했습니다.");
    };
    audio.play().catch(() => {
      setPlayingVoiceId("");
      pushNotice("음성을 재생하지 못했습니다.");
    });
  };

  const vmapHasPeers = () => {
    const mine = getLocalVlueUserId();
    return membersRef.current.some((member) => member.userId && member.userId !== mine);
  };

  const assertCanSendChat = () => {
    if (session.mode === "family") {
      if (!localCanUseFamilyLocation()) {
        pushNotice(FAMILY_PLAN_TOAST);
        return false;
      }
      return true;
    }
    if (session.mode === "vmap") {
      if (!session.roomId || !vmapHasPeers()) {
        pushNotice(VMAP_CHAT_NEED_PEERS);
        return false;
      }
      return true;
    }
    return false;
  };

  const startVoice = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (recording) return;
    if (!assertCanSendChat()) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      pushNotice("이 기기에서는 마이크를 쓸 수 없습니다. 보내기 버튼으로 메시지를 전송하세요.");
      return;
    }
    try {
      const perm = await navigator.permissions?.query?.({ name: "microphone" });
      if (perm?.state === "denied") {
        pushNotice("마이크 권한이 꺼져 있습니다. 설정에서 허용하거나, 보내기 버튼으로 전송하세요.");
        return;
      }
    } catch {
      /* 권한 조회를 지원하지 않는 브라우저는 바로 요청한다 */
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      pushNotice("마이크 권한이 필요합니다. 허용 창에서 허용하거나, 글은 보내기 버튼으로 전송하세요.");
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (item) => chunks.push(item.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      new Audio(url).play().catch(() => {});
      const dataUrl = await blobToDataUrl(blob);
      const payload = { kind: "voice", body: dataUrl, displayName: getProfileHeaderName() || "나" };
      const sent =
        session.mode === "family"
          ? await postFamilyLocationMessage(payload).catch((error) => {
              pushNotice(error.message);
              return null;
            })
          : await postVmapMessage(session.roomId, payload).catch((error) => {
              pushNotice(error.message);
              return null;
            });
      if (sent?.message) {
        seenVoice.current.add(sent.message.id);
        if (session.mode === "vmap") pingVmap(session.roomId);
      }
    };
    mediaRef.current = recorder;
    recorder.start();
    setRecording(true);
  };

  const stopVoice = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    setRecording(false);
  };

  const sendText = async () => {
    const text = draft.trim();
    if (!text || sendLock.current) return;
    if (!assertCanSendChat()) return;
    sendLock.current = true;
    setSending(true);
    setDraft("");
    const localId = `local-${Date.now()}`;
    const pending = {
      id: localId,
      kind: "text",
      body: text,
      displayName: getProfileHeaderName() || "나",
      createdAt: new Date().toISOString(),
      userId: getLocalVlueUserId(),
      cyanBadgeActive: localHasCyanBadge()
    };
    setMessages((prev) => [...prev, pending].slice(-80));
    try {
      const sent =
        session.mode === "family"
          ? await postFamilyLocationMessage({
              kind: "text",
              body: text,
              displayName: getProfileHeaderName() || "나"
            })
          : await postVmapMessage(session.roomId, { kind: "text", body: text });
      if (sent?.message) {
        afterRef.current = sent.message.createdAt || afterRef.current;
        setMessages((prev) => prev.map((row) => (row.id === localId ? sent.message : row)));
        if (session.mode === "vmap") pingVmap(session.roomId);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((row) => row.id !== localId));
      setDraft(text);
      pushNotice(error.message || "메시지를 보내지 못했습니다.");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const completeArrival = async () => {
    if (!session.roomId || arriveState === "pending" || arriveLock.current) return;
    const mine = membersRef.current.find((member) => member.userId === getLocalVlueUserId());
    if (mine?.arrived) return;
    const place = roomRef.current;
    const here = self?.lat != null ? self : mine;
    if (!place?.placeReady || here?.lat == null || here?.lng == null) {
      pushNotice("현재 위치를 확인한 뒤에 도착 완료를 눌러 주세요.");
      return;
    }
    const meters = haversineMeters(here.lat, here.lng, place.placeLat, place.placeLng);
    if (meters > MANUAL_ARRIVE_METERS) {
      pushNotice(`아직 도착지에서 약 ${Math.round(meters)}m 떨어져 있습니다. ${MANUAL_ARRIVE_METERS}m 안에 들어오면 도착 완료를 누를 수 있습니다.`);
      return;
    }
    arriveLock.current = true;
    setArriveState("pending");
    try {
      const data = await arriveVmap(session.roomId);
      setArriveState("done");
      setMembers((prev) => prev.map((member) => (member.userId === getLocalVlueUserId() ? { ...member, arrived: true } : member)));
      if (data?.closingAt) setRoom((prev) => (prev ? { ...prev, closingAt: data.closingAt, closingReason: "arrived" } : prev));
      pushNotice("도착으로 표시했습니다.");
      refreshRoom(session.roomId);
    } catch (error) {
      arriveLock.current = false;
      setArriveState("idle");
      pushNotice(error.message || "도착 처리를 하지 못했습니다.");
    }
  };

  if (!visible) return null;

  if (session.minimized && !session.open) {
    if (nativeMini) return null;
    const miniW = 148;
    const miniH = 168;
    const left = Number.isFinite(miniPos.x) ? miniPos.x : Math.max(12, (typeof window !== "undefined" ? window.innerWidth : 360) - miniW - 12);
    const top = Number.isFinite(miniPos.y) ? miniPos.y : 72;
    const onMiniDown = (event) => {
      event.preventDefault();
      mapTapFeedback("light");
      miniDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: left,
        originY: top,
        moved: false
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onMiniMove = (event) => {
      const drag = miniDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      const maxX = Math.max(8, window.innerWidth - miniW - 8);
      const maxY = Math.max(8, window.innerHeight - miniH - 8);
      const next = {
        x: Math.min(maxX, Math.max(8, drag.originX + dx)),
        y: Math.min(maxY, Math.max(8, drag.originY + dy))
      };
      setMiniPos(next);
    };
    const onMiniUp = (event) => {
      const drag = miniDragRef.current;
      miniDragRef.current = null;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.moved) {
        const maxX = Math.max(8, window.innerWidth - miniW - 8);
        const maxY = Math.max(8, window.innerHeight - miniH - 8);
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const next = {
          x: Math.min(maxX, Math.max(8, drag.originX + dx)),
          y: Math.min(maxY, Math.max(8, drag.originY + dy))
        };
        setMiniPos(next);
        writeMiniPos(next);
        return;
      }
      mapTapFeedback("heavy");
      restoreLocation();
    };
    return (
      <div
        role="button"
        tabIndex={0}
        data-map-tap
        aria-label="V-Map 미니맵 — 끌어 이동, 탭하면 확대"
        className="fixed z-[520] overflow-hidden rounded-[22px] border-2 border-[#00D2FF] bg-[#04121a] shadow-[0_12px_36px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,210,255,0.35)]"
        style={{ left, top, width: miniW, height: miniH, touchAction: "none" }}
        onPointerDown={onMiniDown}
        onPointerMove={onMiniMove}
        onPointerUp={onMiniUp}
        onPointerCancel={() => { miniDragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            mapTapFeedback("heavy");
            restoreLocation();
          }
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-[#04121a]/95 to-transparent px-2 pb-4 pt-1.5">
          <span className="rounded-full bg-[#00D2FF] px-2 py-0.5 text-[10px] font-black tracking-tight text-[#04121a]">V-Map</span>
          <span className="text-[10px] font-semibold text-white/75">탭=확대</span>
        </div>
        <div className="pointer-events-none absolute inset-0">
          <VmapNaverSurface
            active
            members={members}
            self={self}
            room={room}
            draftPin={draftPin}
            routes={routes}
            mode={session.mode}
            departed={session.departed}
            guideFollow={false}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#04121a]/90 to-transparent px-2 pb-1.5 pt-5">
          <span className="block text-center text-[10px] font-medium text-white/70">끌어서 이동</span>
        </div>
      </div>
    );
  }

  const locationOn = self?.online !== false && self?.lat != null;
  const isHost = Boolean(room?.hostUserId) && room.hostUserId === getLocalVlueUserId();
  const selfMember = members.find((member) => member.userId === getLocalVlueUserId());
  const selfArrived = Boolean(selfMember?.arrived);
  const familyGuiding = session.mode === "family" && guideOn && Boolean(familyNavTarget);
  const cue =
    guideOn &&
    ((session.mode === "vmap" && session.departed && !selfArrived) || familyGuiding)
      ? nextGuideCue(routes[getLocalVlueUserId()]?.steps)
      : null;
  const familyRoute = familyGuiding ? routes[getLocalVlueUserId()] : null;
  const familyEtaMin = familyRoute?.durationSec
    ? Math.max(1, Math.round(familyRoute.durationSec / 60))
    : familyNavTarget && self?.lat != null
      ? estimateEtaMinutes(haversineMeters(self.lat, self.lng, familyNavTarget.lat, familyNavTarget.lng))
      : null;
  const metersToFamily =
    familyNavTarget && self?.lat != null
      ? haversineMeters(self.lat, self.lng, familyNavTarget.lat, familyNavTarget.lng)
      : null;
  const people = members.length ? members : self?.lat ? [{ ...self, userId: getLocalVlueUserId(), self: true, displayName: self.displayName || "나", grayscale: !locationOn }] : [];
  const chatReady =
    session.open && ((session.mode === "vmap" && Boolean(session.roomId)) || session.mode === "family");

  const dark = theme === "dark";
  const glass = dark
    ? "border border-white/10 bg-[#0c1220]/80 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
    : "border border-black/[0.06] bg-white/82 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-2xl";
  const tabOn = dark ? "bg-white text-[#0c1220] shadow-[0_0_0_1px_#00D2FF]" : "bg-[#0c1220] text-white shadow-[0_0_0_1px_#00D2FF]";
  const accentBtn = "rounded-full bg-[#00D2FF] px-3.5 py-2 text-[12px] font-semibold tracking-tight text-[#04121a] shadow-[0_8px_22px_rgba(0,210,255,0.32)] disabled:opacity-60";
  const quietBtn = dark
    ? "rounded-full border border-white/12 bg-white/10 px-3.5 py-2 text-[12px] font-semibold tracking-tight text-white"
    : "rounded-full border border-black/10 bg-white px-3.5 py-2 text-[12px] font-semibold tracking-tight text-slate-800";
  const arrivedNow = selfArrived || arriveState === "done";
  const metersToPlace =
    self?.lat != null && room?.placeReady
      ? haversineMeters(self.lat, self.lng, room.placeLat, room.placeLng)
      : null;
  const nearArrive = metersToPlace != null && metersToPlace <= MANUAL_ARRIVE_METERS;
  const sheetLift = `calc(${AD_BANNER_PX + 12}px + env(safe-area-inset-bottom, 0px))`;
  return (
    <section
      className={`fixed inset-x-0 top-0 z-[530] flex flex-col overflow-hidden ${dark ? "bg-[#0b1018] text-white" : "bg-[#f6f8fb] text-slate-900"}`}
      style={{ bottom: keyboardInset }}
      onPointerDownCapture={bindMapTapFeedback}
    >
      <div className="relative min-h-0 flex-1">
        <VmapNaverSurface
          ref={mapSurfaceRef}
          active={session.open}
          members={members}
          self={self}
          room={room}
          draftPin={draftPin}
          destPin={
            familyNavTarget
              ? { lat: familyNavTarget.lat, lng: familyNavTarget.lng, label: familyNavTarget.name }
              : null
          }
          routes={routes}
          mode={session.mode}
          departed={session.departed}
          guideFollow={
            (guideOn && session.mode === "vmap" && session.departed && !selfArrived) || familyGuiding
          }
          flyTo={session.flyTo}
          pinEditable={Boolean(room?.hostUserId === getLocalVlueUserId())}
          onSelectMember={(member) => {
            setSelected(member || null);
            if (member?.lat != null) {
              userZoomedRef.current = true;
              markGesture();
              patchLocationSession({ flyTo: { lat: member.lat, lng: member.lng, at: Date.now() } });
            }
          }}
          onDraftPinChange={(next) => {
            pinDirtyRef.current = true;
            setDraftPin((prev) => ({ ...(prev || {}), ...next, ready: false }));
          }}
          onUserGesture={() => {
            userZoomedRef.current = true;
            markGesture();
          }}
          onReady={() => {
            setMapReady(true);
            setMapError("");
          }}
          onError={(error) => {
            setMapReady(false);
            setMapError(error?.message || "네이버 지도를 불러오지 못했습니다.");
            pushNotice(error?.message || "네이버 지도를 불러오지 못했습니다.");
          }}
        />
        {mapError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#eef2f5] px-6 text-center">
            <p className="text-[14px] font-semibold text-slate-700">{mapError}</p>
          </div>
        ) : null}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button type="button" onClick={dismissLocation} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg backdrop-blur-xl ${dark ? "border border-white/10 bg-[#0c1220]/75 text-white" : "border border-black/5 bg-white/85 text-slate-900"}`} aria-label="닫기">×</button>
          <div className={`flex min-w-0 flex-1 rounded-full p-1 backdrop-blur-xl ${dark ? "border border-white/10 bg-[#0c1220]/75 text-white" : "border border-black/5 bg-white/85 text-slate-700"}`}>
            <button
              type="button"
              className={`min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-semibold tracking-tight ${session.mode === "family" ? tabOn : ""}`}
              onClick={() => {
                setSelected(null);
                setFamilyNavTarget(null);
                setRoutes({});
                setGuideOn(false);
                setMembers([]);
                patchLocationSession({ mode: "family" });
                if (!localCanUseFamilyLocation()) {
                  pushNotice(FAMILY_PLAN_TOAST);
                }
              }}
            >
              가족
            </button>
            <button
              type="button"
              className={`min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-semibold tracking-tight ${session.mode === "vmap" ? tabOn : ""}`}
              onClick={() => {
                setSelected(null);
                setFamilyNavTarget(null);
                setRoutes({});
                setGuideOn(false);
                patchLocationSession({ mode: "vmap" });
              }}
            >
              V-Map
            </button>
          </div>
          {session.mode === "vmap" && !session.roomId ? (
            <button type="button" className={`shrink-0 ${accentBtn}`} disabled={Boolean(roomBusy)} onClick={() => void makeRoom()}>
              {roomBusy === "create" ? "방개설중..." : "방 만들기"}
            </button>
          ) : null}
          <button type="button" onClick={() => { setMembersOpen(false); hideLocationAds(); setSettingsOpen((open) => !open); }} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full backdrop-blur-xl ${dark ? "border border-white/10 bg-[#0c1220]/75 text-white" : "border border-black/5 bg-white/85 text-slate-900"}`} aria-label="화면 설정">☼</button>
        </div>
        {guideOn && cue && (session.mode === "vmap" || familyGuiding) ? (
          <div className="absolute right-3 top-[calc(64px+env(safe-area-inset-top))] z-30 w-[10.5rem] overflow-hidden rounded-[26px] border-2 border-[#00D2FF] bg-[#04121a]/95 text-white shadow-[0_18px_50px_rgba(0,210,255,0.35)]">
            <div className="flex items-center justify-center bg-gradient-to-b from-[#00D2FF] to-[#38bdf8] px-2 py-4 text-[42px] font-black leading-none text-[#04121a]">
              {maneuverGlyph(cue.instruction)}
            </div>
            <div className="px-3 py-3 text-center">
              <p className="text-[22px] font-black tracking-tight text-[#00D2FF]">{formatGuideDistance(cue.distanceM)}</p>
              <p className="mt-1 text-[13px] font-bold leading-snug text-white">{cue.instruction}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[#00D2FF]/80">
                {familyGuiding
                  ? familyEtaMin != null
                    ? `약 ${familyEtaMin}분`
                    : "가족 이동"
                  : routeMode === "free"
                    ? "무료도로"
                    : routeMode === "highway"
                      ? "고속도로"
                      : "추천경로"}
              </p>
            </div>
          </div>
        ) : null}
        {!keyboardInset ? (
          <div className={`absolute bottom-3 right-3 z-20 flex flex-col overflow-hidden rounded-2xl backdrop-blur-xl ${dark ? "border border-white/10 bg-[#0c1220]/75" : "border border-black/5 bg-white/85"}`}>
            <button type="button" className="h-11 w-11 text-[20px] font-medium leading-none text-[#00D2FF]" onClick={() => nudgeZoom(1)} aria-label="확대">+</button>
            <div className={dark ? "h-px bg-white/10" : "h-px bg-black/10"} />
            <button type="button" className="h-11 w-11 text-[20px] font-medium leading-none text-[#00D2FF]" onClick={() => nudgeZoom(-1)} aria-label="축소">−</button>
          </div>
        ) : null}
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 text-[10px] font-semibold text-slate-600/80">© NAVER Map</p>
        {farewell ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-8 text-center">
            <p className="text-[18px] font-black leading-snug text-white">{farewell}</p>
          </div>
        ) : null}
        {session.mode === "vmap" && isHost && session.roomId ? (
          searchOpen ? (
            <div className={`absolute inset-x-3 top-[calc(68px+env(safe-area-inset-top))] z-10 space-y-2 rounded-[28px] p-3 ${glass}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold tracking-tight opacity-70">도착지 검색</p>
                <button type="button" className={quietBtn} onClick={() => { setSearchOpen(false); setPlaceHits([]); }}>접기</button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  searchVmapPlaces(placeQuery).then((data) => setPlaceHits(data.places || [])).catch((error) => pushNotice(error.message));
                }}
              >
                <input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="주소·장소 검색" className="min-w-0 flex-1 rounded-full border bg-white/90 px-3 py-2 text-[13px] text-slate-900" />
                <button type="submit" className={accentBtn}>검색</button>
              </form>
              {placeHits.length ? (
                <ul className="max-h-36 overflow-y-auto rounded-2xl bg-white/95 text-slate-900 shadow">
                  {placeHits.map((place) => (
                    <li key={`${place.lat}-${place.lng}`}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-[12px]"
                        onClick={() => {
                          pinDirtyRef.current = true;
                          setDraftPin({ lat: place.lat, lng: place.lng, label: place.label, ready: false });
                          viewRef.current = { ...viewRef.current, lat: place.lat, lng: place.lng, placed: true };
                          mapSurfaceRef.current?.panTo?.(place.lat, place.lng, 17);
                          setPlaceHits([]);
                        }}
                      >
                        <b>{place.label}</b>
                        <span className="block opacity-70">{place.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={accentBtn}
                  onClick={() => {
                    if (!draftPin) return;
                    pinDirtyRef.current = false;
                    updateVmapPlace(session.roomId, {
                      placeLat: draftPin.lat,
                      placeLng: draftPin.lng,
                      placeLabel: draftPin.label || placeQuery || "도착지"
                    }).then((data) => {
                      setRoom(data.room);
                      setRoutes({});
                      setSearchOpen(false);
                      pushNotice("도착 핀을 저장했습니다.");
                    }).catch((error) => pushNotice(error.message));
                  }}
                >
                  {room?.placeReady ? "핀 수정 저장" : "도착 핀 꽂기"}
                </button>
                <span className={`min-w-0 flex-1 truncate rounded-full px-3 py-1.5 text-[11px] font-bold ${theme === "dark" ? "bg-white/10" : "bg-slate-100"}`}>
                  {room?.placeReady ? room.placeLabel || "도착지" : "지도를 끌거나 검색으로 핀을 놓으세요"}
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`absolute left-3 top-[calc(68px+env(safe-area-inset-top))] z-10 max-w-[70%] truncate rounded-full px-3 py-2 text-[12px] font-semibold ${glass}`}
              onClick={() => setSearchOpen(true)}
            >
              ✎ {room?.placeLabel || "도착지 수정"}
            </button>
          )
        ) : null}
        {chatReady ? (
          <VMapChatOverlay
            messages={messages}
            dark={dark}
            playingVoiceId={playingVoiceId}
            onPlayVoice={playVoice}
            expandToken={chatExpandToken}
            bottomOffset={4}
          />
        ) : null}
      </div>

      <div className="relative z-30 shrink-0 space-y-2 px-3 pb-1 pt-2">
        {selected ? (
          <article className={`rounded-[24px] px-4 py-3 ${glass}`}>
            <div className="flex items-start justify-between gap-3">
              {session.mode === "family" ? (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{selected.displayName}</p>
                    {!selected.self &&
                    selected.userId !== getLocalVlueUserId() &&
                    selected.lat != null &&
                    selected.lng != null ? (
                      <button
                        type="button"
                        className={`${accentBtn} shrink-0 !px-2.5 !py-1 text-[11px]`}
                        disabled={familyNavBusy}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void startFamilyMove(selected);
                        }}
                      >
                        {familyNavBusy && familyNavTarget?.userId === selected.userId
                          ? "안내중…"
                          : familyNavTarget?.userId === selected.userId && guideOn
                            ? "안내중"
                            : "이동"}
                      </button>
                    ) : null}
                  </div>
                  <MemberSafetyDetail member={selected} roomId={session.roomId || ""} dark={dark} />
                  <p className="mt-1 text-[12px] font-medium">
                    {selected.online === false ? "접속 끊김" : "접속 중"}
                  </p>
                  {familyNavTarget?.userId === selected.userId && guideOn ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full bg-[#00D2FF]/15 px-2.5 py-1 text-[11px] font-semibold ${dark ? "text-[#00D2FF]" : "text-[#0e7490]"}`}>
                        {familyEtaMin != null ? `도착 약 ${familyEtaMin}분` : "경로 안내 중"}
                        {metersToFamily != null ? ` · ${Math.round(metersToFamily)}m` : ""}
                      </span>
                      <button type="button" className={quietBtn} onClick={stopFamilyNavigate}>
                        안내 종료
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="text-[15px] font-semibold tracking-tight">{selected.displayName}</p>
                  <p className={`mt-2 inline-flex rounded-full bg-[#00D2FF]/15 px-2.5 py-1 text-[12px] font-semibold ${dark ? "text-[#00D2FF]" : "text-[#0e7490]"}`}>
                    {selected.arrived
                      ? "도착 완료"
                      : selected.dropout
                        ? "미도착 이탈자"
                        : selected.departed && selected.lat != null && room?.placeReady
                          ? `도착 예상 ${routes[selected.userId]?.durationSec ? Math.max(1, Math.round(routes[selected.userId].durationSec / 60)) : estimateEtaMinutes(haversineMeters(selected.lat, selected.lng, room.placeLat, room.placeLng))}분`
                          : selected.departed
                            ? "도착지가 정해지면 예상 시간이 나옵니다"
                            : "출발 전"}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold">
                    🔋 {(() => {
                      const mine = selected.self || selected.userId === getLocalVlueUserId();
                      const battery = mine ? (self?.batteryPct ?? selected.batteryPct) : selected.batteryPct;
                      return battery == null ? "—" : `${battery}%`;
                    })()}
                  </p>
                </div>
              )}
              <button type="button" onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg" aria-label="닫기">×</button>
            </div>
          </article>
        ) : null}
        {session.mode === "vmap" ? (
          <div className={`space-y-2 rounded-[24px] p-2.5 ${glass}`}>
            {session.roomId ? (
              <div className="flex items-center gap-2">
                {session.departed ? (
                  arrivedNow ? (
                    <span className="rounded-full bg-[#00D2FF]/15 px-3 py-2 text-[12px] font-semibold text-[#00D2FF]">도착함</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-pressed={guideOn}
                        onClick={() => {
                          if (guideOn) {
                            setGuideOn(false);
                            setRoutePickerOpen(false);
                            return;
                          }
                          setRoutePickerOpen(true);
                        }}
                        className={guideOn ? accentBtn : quietBtn}
                      >
                        길안내
                      </button>
                      <button
                        type="button"
                        className={nearArrive ? accentBtn : quietBtn}
                        disabled={arriveState === "pending"}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void completeArrival();
                        }}
                      >
                        {arriveState === "pending"
                          ? "처리 중…"
                          : nearArrive
                            ? "도착 완료"
                            : metersToPlace == null
                              ? "도착 완료"
                              : `도착까지 ${Math.round(metersToPlace)}m`}
                      </button>
                    </>
                  )
                ) : (
                  <button
                    type="button"
                    className={accentBtn}
                    onClick={() => {
                      if (!room?.placeReady) {
                        pushNotice("방장이 도착 핀을 꽂은 뒤에 출발할 수 있습니다.");
                        return;
                      }
                      if (self?.lat == null) {
                        pushNotice("현재 위치를 받은 뒤에 출발할 수 있습니다.");
                        return;
                      }
                      departVmap(session.roomId, { lat: self.lat, lng: self.lng, online: true, displayName: self.displayName }).then(() => {
                        userZoomedRef.current = false;
                        patchLocationSession({ departed: true });
                        viewRef.current = {
                          ...viewRef.current,
                          lat: self.lat,
                          lng: self.lng,
                          zoom: zoomForMeters(haversineMeters(self.lat, self.lng, room.placeLat, room.placeLng)),
                          placed: true
                        };
                        setNativeVmapSession(true);
                        refreshRoom(session.roomId);
                      }).catch((error) => pushNotice(error.message));
                    }}
                  >
                    출발
                  </button>
                )}
                <button
                  type="button"
                  className={quietBtn}
                  onClick={() => {
                    hideLocationAds();
                    setInviteOpen(true);
                  }}
                >
                  친구 초대
                </button>
              </div>
            ) : null}
            {session.roomId && routePickerOpen ? (
              <div className={`rounded-2xl p-2 ${dark ? "bg-white/5" : "bg-slate-50"}`}>
                <p className="mb-2 px-1 text-[11px] font-semibold opacity-70">경로 선택 · 카카오 길찾기</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    ["recommend", "추천경로"],
                    ["free", "무료도로"],
                    ["highway", "고속도로"]
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={routeMode === mode && guideOn ? accentBtn : quietBtn}
                      onClick={() => {
                        setRouteMode(mode);
                        routeModeRef.current = mode;
                        userZoomedRef.current = false;
                        setGuideOn(true);
                        setRoutePickerOpen(false);
                        setRoutes({});
                        pushNotice(`${label}로 길안내를 시작합니다.`);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <form className={`flex min-w-0 items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 ${dark ? "border-white/10 bg-white/10" : "border-black/10 bg-slate-100/80"}`} onSubmit={(event) => { event.preventDefault(); void sendText(); }}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void sendText();
                  }
                }}
                placeholder="메시지를 입력하세요"
                className={`min-w-0 flex-1 bg-transparent py-2 text-[13px] font-medium outline-none ${dark ? "text-white placeholder:text-white/45" : "text-slate-900 placeholder:text-slate-400"}`}
              />
              <button type="submit" aria-label="보내기" disabled={sending} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${draft.trim() ? "bg-[#00D2FF] text-[#04121a]" : dark ? "bg-white/10 text-white/35" : "bg-slate-200 text-slate-400"}`}>
                <SendIcon />
              </button>
              <button type="button" onPointerDown={startVoice} onPointerUp={stopVoice} onPointerCancel={stopVoice} className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[14px] ${recording ? "bg-rose-500 text-white" : dark ? "bg-white/10 text-white/80" : "bg-slate-200 text-slate-700"}`} aria-label="길게 눌러 음성 메시지">
                {recording ? (
                  <span className="flex h-5 items-end gap-[2px]" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-[2px] rounded-full bg-white"
                        style={{
                          height: "100%",
                          animation: `vmap-voice-wave 0.9s ease-in-out ${i * 0.08}s infinite`,
                          transformOrigin: "bottom"
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  "🎤"
                )}
              </button>
            </form>
          </div>
        ) : null}
        {session.mode === "family" ? (
          <div className={`space-y-2 rounded-[24px] p-2.5 ${glass}`}>
            <form
              className={`flex min-w-0 items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 ${dark ? "border-white/10 bg-white/10" : "border-black/10 bg-slate-100/80"}`}
              onSubmit={(event) => {
                event.preventDefault();
                void sendText();
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void sendText();
                  }
                }}
                placeholder="가족에게 메시지"
                className={`min-w-0 flex-1 bg-transparent py-2 text-[13px] font-medium outline-none ${dark ? "text-white placeholder:text-white/45" : "text-slate-900 placeholder:text-slate-400"}`}
              />
              <button
                type="submit"
                aria-label="보내기"
                disabled={sending}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${draft.trim() ? "bg-[#00D2FF] text-[#04121a]" : dark ? "bg-white/10 text-white/35" : "bg-slate-200 text-slate-400"}`}
              >
                <SendIcon />
              </button>
              <button
                type="button"
                onPointerDown={startVoice}
                onPointerUp={stopVoice}
                onPointerCancel={stopVoice}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[14px] ${recording ? "bg-rose-500 text-white" : dark ? "bg-white/10 text-white/80" : "bg-slate-200 text-slate-700"}`}
                aria-label="길게 눌러 음성 메시지"
              >
                {recording ? (
                  <span className="flex h-5 items-end gap-[2px]" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-[2px] rounded-full bg-white"
                        style={{
                          height: "100%",
                          animation: `vmap-voice-wave 0.9s ease-in-out ${i * 0.08}s infinite`,
                          transformOrigin: "bottom"
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  "🎤"
                )}
              </button>
            </form>
          </div>
        ) : null}
        {session.mode === "vmap" && !session.roomId ? (
          <form className={`flex gap-2 rounded-[24px] p-2 ${glass}`} onSubmit={(event) => { event.preventDefault(); void joinRoom(); }}>
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="약속 코드로 입장" className={`min-w-0 flex-1 rounded-full border px-3 py-2 text-[13px] ${dark ? "border-white/10 bg-white/10 text-white placeholder:text-white/40" : "border-black/10 bg-white text-slate-900"}`} />
            <button type="submit" className={accentBtn}>입장</button>
          </form>
        ) : null}
      </div>

      <div className="shrink-0 px-3 pt-2" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {settingsOpen || membersOpen || keyboardInset > 80 ? (
          <div style={{ height: AD_BANNER_PX }} aria-hidden />
        ) : sponsor ? (
          <a href={sponsor.linkUrl || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-3 overflow-hidden rounded-xl bg-amber-50 px-3 text-slate-900" style={{ height: AD_BANNER_PX }}>
            {sponsor.imageUrl ? <img src={sponsor.imageUrl} alt="" className="h-9 w-16 rounded object-cover" /> : null}
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold">{sponsor.title}</span>
              <span className="block truncate text-[10px]">{sponsor.body}</span>
            </span>
          </a>
        ) : sponsorReady ? (
          <AdMobBannerSlot slotId="location_map" heightPx={AD_BANNER_PX} preferredSize="BANNER" enabled />
        ) : (
          <div style={{ height: AD_BANNER_PX }} />
        )}
      </div>

      {settingsOpen ? (
        <div className="absolute inset-0 z-[90] bg-black/55 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <div
            className={`absolute inset-x-0 rounded-t-[28px] px-4 pt-3 shadow-2xl ${dark ? "bg-[#0c1220] text-white" : "bg-white text-slate-900"}`}
            style={{ bottom: sheetLift, paddingBottom: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`mx-auto mb-3 h-1 w-10 rounded-full ${dark ? "bg-white/20" : "bg-slate-200"}`} />
            <p className="text-[16px] font-semibold tracking-tight">화면</p>
            <p className={`mt-1 text-[12px] ${dark ? "text-white/60" : "text-slate-500"}`}>지도는 컬러 도로지도로 두고, 버튼과 패널만 밝기를 바꿉니다.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["auto", "시간"],
                ["light", "라이트"],
                ["dark", "다크"]
              ].map(([item, label]) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-2xl px-2 py-3 text-[13px] font-semibold ${session.theme === item ? "bg-[#00D2FF] text-[#04121a]" : dark ? "bg-white/10" : "bg-slate-100"}`}
                  onClick={() => setMapThemePreference(item)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className={`mt-3 block w-full rounded-2xl px-3 py-3 text-left text-[14px] font-semibold ${dark ? "bg-white/10" : "bg-slate-100"}`} onClick={() => { setMembersOpen(true); setSettingsOpen(false); hideLocationAds(); }}>
              함께 있는 사람
            </button>
            {session.mode === "vmap" && session.roomId ? (
              <button
                type="button"
                className="mt-2 block w-full rounded-2xl bg-rose-500 px-3 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                disabled={roomBusy === "leave"}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void leaveForGood();
                }}
              >
                {roomBusy === "leave" ? (isHost ? "방삭제중..." : "나가는 중...") : isHost ? "방 삭제" : "방 나가기"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {membersOpen ? (
        <div className="absolute inset-0 z-[90] bg-black/55 backdrop-blur-sm" onClick={() => setMembersOpen(false)}>
          <div
            className={`absolute inset-x-0 rounded-t-[28px] p-4 ${dark ? "bg-[#0c1220] text-white" : "bg-white text-slate-900"}`}
            style={{ bottom: sheetLift, paddingBottom: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[15px] font-semibold tracking-tight">함께 있는 사람</p>
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {people.map((member) => (
                <li key={member.userId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left"
                    onClick={() => {
                      if (member.lat != null) patchLocationSession({ flyTo: { lat: member.lat, lng: member.lng, at: Date.now() } });
                      setSelected(member);
                      setMembersOpen(false);
                    }}
                  >
                    <span className="font-bold">{member.displayName}</span>
                    <span className="text-[11px] opacity-70">
                      {session.mode === "vmap"
                        ? member.arrived
                          ? "도착 완료"
                          : member.dropout
                            ? "미도착 이탈자"
                            : member.departed && member.lat != null && room?.placeReady
                              ? `도착 약 ${estimateEtaMinutes(haversineMeters(member.lat, member.lng, room.placeLat, room.placeLng))}분`
                              : "출발 전"
                        : member.lat == null
                          ? "위치 없음"
                          : member.grayscale
                            ? "마지막 위치"
                            : "실시간"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {notice ? (
        <p className="pointer-events-none absolute left-1/2 top-[4.6rem] z-[80] max-w-[92%] -translate-x-1/2 rounded-2xl border border-[#00D2FF]/40 bg-[#04121a] px-4 py-2.5 text-center text-[12px] font-medium leading-snug text-white shadow-lg">
          {notice}
        </p>
      ) : null}
      <VmapFriendInviteSheet
        open={inviteOpen && Boolean(session.roomId)}
        roomId={session.roomId}
        placeLabel={room?.placeLabel || room?.title || ""}
        dark={dark}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          pushNotice("초대를 보냈습니다.");
        }}
        onError={(message) => pushNotice(message)}
      />
      <style>{`
        @keyframes vmap-voice-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.7; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
