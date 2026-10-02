import { useCallback, useEffect, useRef, useState } from "react";
import AdMobBannerSlot from "../ads/AdMobBannerSlot.jsx";
import { reverseGeocodeLatLng } from "../../lib/activeRegion.js";
import {
  createVmapRoom,
  departVmap,
  arriveVmap,
  exitVmapApi,
  fetchFamilyLocations,
  fetchMapSponsor,
  fetchVmapGuide,
  fetchVmapMessages,
  fetchVmapRoom,
  finishVmapApi,
  joinVmapRoom,
  searchVmapPlaces,
  updateVmapPlace,
  pingVmap,
  postVmapMessage,
  publishPresence,
  publishVmapPresence,
  setNativeVmapSession,
  subscribeVmapPing
} from "../../lib/locationApi.js";
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
import { formatGuideDistance, nextGuideCue } from "../../lib/vmapGuide.js";
import { syncOwnerInboxFromServer } from "../../lib/ownerInboxSync.js";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";

const TILE = 256;
const FAREWELL = "전원 목적지까지 안전하게 도착하셨습니다. 오늘도 즐거운 하루 되십시요";

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

/** 컬러 도로 지도. Esri 도로 타일은 구미 일대 14줌부터 빈 칸이라 OpenStreetMap 을 쓴다. */
function tileUrl(z, x, y) {
  const wrap = 2 ** z;
  const xx = ((x % wrap) + wrap) % wrap;
  const yy = Math.max(0, Math.min(wrap - 1, y));
  return `https://tile.openstreetmap.org/${z}/${xx}/${yy}.png`;
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

function liveOpacity(createdAt, now) {
  const age = now - new Date(createdAt).getTime();
  if (age < 4200) return 1;
  if (age > 7600) return 0;
  return 1 - (age - 4200) / 3400;
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
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = live ? "#2563eb" : "#94a3b8";
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
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.beginPath();
  ctx.roundRect(x - width / 2, boxY, width, 18, 9);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x, boxY + 9);
}

function drawPlacePin(ctx, x, y, ready) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = ready ? "#2563eb" : "#f59e0b";
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
  const [self, setSelf] = useState(null);
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
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [farewell, setFarewell] = useState("");
  const pinDragRef = useRef(null);
  const pinDirtyRef = useRef(false);
  const canvasRef = useRef(null);
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

  useEffect(() => subscribeLocationSession(setSession), []);
  roomRef.current = room;
  membersRef.current = members;
  sessionRef.current = session;
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
    const onOpen = (event) => openLocation(event?.detail?.mode || "family");
    window.addEventListener("vlue-open-location", onOpen);
    return () => window.removeEventListener("vlue-open-location", onOpen);
  }, []);

  const theme = resolveMapTheme(session.theme, self?.lat, self?.lng);
  const visible = session.open || session.minimized;
  const tracking = session.open || (session.mode === "vmap" && Boolean(session.roomId));

  const pushNotice = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const refreshFamily = useCallback(async () => {
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
    const send = async (coords, online) => {
      const lat = coords?.latitude;
      const lng = coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      let addressLabel = "";
      try {
        const region = await reverseGeocodeLatLng(lat, lng);
        addressLabel = region.displayName || region.label;
      } catch {
        addressLabel = "";
      }
      let batteryPct = null;
      try {
        const battery = await readBattery();
        if (battery && Number.isFinite(battery.level)) batteryPct = Math.round(battery.level * 100);
      } catch {
        batteryPct = null;
      }
      const next = { lat, lng, addressLabel, batteryPct, online, displayName: name };
      setSelf(next);
      const liveRoom = roomRef.current;
      const selfRow = membersRef.current.find((member) => member.userId === getLocalVlueUserId());
      const navigating =
        session.mode === "vmap" &&
        session.departed &&
        !selfRow?.arrived &&
        liveRoom?.placeReady &&
        !dragRef.current &&
        !pinDragRef.current;
      if (navigating) {
        viewRef.current = {
          lat,
          lng,
          zoom: zoomForMeters(haversineMeters(lat, lng, liveRoom.placeLat, liveRoom.placeLng)),
          placed: true
        };
      } else if (!viewRef.current.placed) {
        viewRef.current = { ...viewRef.current, lat, lng, placed: true };
      }
      if (session.mode === "family") {
        publishPresence(next).then(refreshFamily).catch(() => {});
      } else if (session.roomId && session.departed) {
        publishVmapPresence(session.roomId, { lat, lng, online, displayName: name })
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
    if (!session.roomId || !session.open) return undefined;
    const pull = async () => {
      try {
        const data = await fetchVmapMessages(session.roomId, afterRef.current);
        const rows = data.messages || [];
        if (!rows.length) return;
        afterRef.current = rows[rows.length - 1].createdAt;
        setMessages((prev) => [...prev, ...rows].slice(-40));
        rows.filter((row) => row.kind === "voice" && row.userId !== getLocalVlueUserId()).forEach((row) => {
          if (seenVoice.current.has(row.id)) return;
          seenVoice.current.add(row.id);
          const audio = new Audio(row.body);
          audio.play().catch(() => {});
        });
      } catch {
        /* 방 입장 전 */
      }
    };
    pull();
    const timer = window.setInterval(pull, 2500);
    return () => window.clearInterval(timer);
  }, [session.roomId, session.open]);

  const departedKey = members
    .filter((member) => member.departed && member.lat != null)
    .map((member) => `${member.userId}:${Number(member.lat).toFixed(3)}:${Number(member.lng).toFixed(3)}`)
    .join("|");

  useEffect(() => {
    if (!session.roomId || session.mode !== "vmap") return undefined;
    const timer = window.setInterval(() => setLiveNow(Date.now()), 400);
    return () => window.clearInterval(timer);
  }, [session.roomId, session.mode]);

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
            toLng: room.placeLng
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
  }, [session.mode, room?.placeReady, room?.placeLat, room?.placeLng, departedKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return undefined;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    const cache = new Map();
    const faces = new Map();
    const paint = () => {
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
      const centerX = worldX(view.lng, zoom) * TILE;
      const centerY = worldY(view.lat, zoom) * TILE;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#dbe4ee";
      ctx.fillRect(0, 0, width, height);
      const left = Math.floor((centerX - width / 2) / TILE);
      const top = Math.floor((centerY - height / 2) / TILE);
      const right = Math.ceil((centerX + width / 2) / TILE);
      const bottom = Math.ceil((centerY + height / 2) / TILE);
      for (let tx = left; tx <= right; tx += 1) {
        for (let ty = top; ty <= bottom; ty += 1) {
          const key = `${zoom}/${tx}/${ty}`;
          let image = cache.get(key);
          if (!image) {
            image = new Image();
            image.src = tileUrl(zoom, tx, ty);
            cache.set(key, image);
          }
          const dx = tx * TILE - (centerX - width / 2);
          const dy = ty * TILE - (centerY - height / 2);
          if (image.complete && image.naturalWidth) ctx.drawImage(image, dx, dy, TILE, TILE);
        }
      }
      const project = (lat, lng) => ({
        x: width / 2 + (worldX(lng, zoom) * TILE - centerX),
        y: height / 2 + (worldY(lat, zoom) * TILE - centerY)
      });
      canvas.__project = project;
      if (room && session.mode === "vmap") {
        const hostView = room.hostUserId === getLocalVlueUserId();
        const pinSource = hostView && draftPin ? draftPin : room.placeReady ? room : null;
        if (pinSource?.lat != null) {
          const pin = project(pinSource.lat, pinSource.lng);
          drawPlacePin(ctx, pin.x, pin.y, Boolean(room.placeReady));
        }
        if (room.placeReady) {
          const mineId = getLocalVlueUserId();
          const lines = members.filter((member) => member.departed && member.lat != null);
          lines.sort((a, b) => Number(a.userId === mineId) - Number(b.userId === mineId));
          lines.forEach((member) => {
            const guided = routes[member.userId];
            if (!guided?.points?.length) return;
            const own = member.userId === mineId;
            ctx.strokeStyle = own ? "#f97316" : "#2563eb";
            ctx.lineWidth = own ? 5 : 4;
            ctx.beginPath();
            guided.points.forEach((pair, index) => {
              const point = project(pair[1], pair[0]);
              if (index === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          });
        }
      }
      const plotted = [...members];
      const selfPhoto = readProfilePhotoAvatar();
      if (self?.lat != null && session.mode === "family" && !plotted.some((member) => member.self || member.userId === getLocalVlueUserId())) {
        plotted.push({ ...self, userId: getLocalVlueUserId(), displayName: self.displayName || "나", photoUrl: selfPhoto, grayscale: self.online === false, online: self.online });
      }
      if (self?.lat != null && session.mode === "vmap" && session.departed && !plotted.some((member) => member.userId === getLocalVlueUserId() && member.lat != null)) {
        plotted.push({ ...self, userId: getLocalVlueUserId(), displayName: self.displayName || "나", photoUrl: selfPhoto, departed: true, online: true });
      }
      plotted.filter((member) => member.lat != null && member.lng != null && (session.mode === "family" || member.departed)).forEach((member) => {
        const point = project(member.lat, member.lng);
        const dead = session.mode === "family" && (member.grayscale || member.online === false || member.batteryPct === 0);
        const mine = member.self || member.userId === getLocalVlueUserId();
        const face = roundImage(faces, mine && selfPhoto ? selfPhoto : member.photoUrl);
        const status =
          session.mode === "vmap" && member.departed && room
            ? member.arrived
              ? "도착"
              : member.dropout
                ? "이탈"
                : `${estimateEtaMinutes(haversineMeters(member.lat, member.lng, room.placeLat, room.placeLng))}분`
            : "";
        drawPerson(ctx, point.x, point.y, face, [member.displayName || "멤버", status].filter(Boolean).join(" · "), !dead);
      });
    };
    const loop = () => {
      paint();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [visible, theme, members, room, session.mode, session.departed, self, routes, draftPin]);

  useEffect(() => {
    const target = session.flyTo;
    if (!target?.lat) return undefined;
    const start = { ...viewRef.current };
    const begun = performance.now();
    let frame = 0;
    const step = (now) => {
      const t = Math.min(1, (now - begun) / 700);
      const ease = 1 - (1 - t) ** 3;
      viewRef.current = {
        ...viewRef.current,
        lat: start.lat + (target.lat - start.lat) * ease,
        lng: start.lng + (target.lng - start.lng) * ease
      };
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [session.flyTo]);

  const onPointerDown = (event) => {
    const canvas = canvasRef.current;
    const project = canvas?.__project;
    const hostPin = room?.hostUserId === getLocalVlueUserId() ? draftPin : null;
    if (project && hostPin && session.mode === "vmap") {
      const rect = canvas.getBoundingClientRect();
      const pin = project(hostPin.lat, hostPin.lng);
      if (Math.hypot(pin.x - (event.clientX - rect.left), pin.y - (event.clientY - rect.top)) < 28) {
        pinDragRef.current = true;
        return;
      }
    }
    dragRef.current = { x: event.clientX, y: event.clientY, lat: viewRef.current.lat, lng: viewRef.current.lng };
  };
  const onPointerMove = (event) => {
    if (pinDragRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const next = unproject(event.clientX - rect.left, event.clientY - rect.top, viewRef.current, rect.width, rect.height);
      if (Number.isFinite(next.lat) && Number.isFinite(next.lng)) {
        pinDirtyRef.current = true;
        setDraftPin((prev) => ({ ...(prev || {}), lat: next.lat, lng: next.lng, ready: false }));
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const zoom = viewRef.current.zoom;
    const scale = (360 / (2 ** zoom)) / TILE;
    viewRef.current = {
      ...viewRef.current,
      lng: drag.lng - (event.clientX - drag.x) * scale,
      lat: Math.max(-80, Math.min(80, drag.lat + (event.clientY - drag.y) * scale * 0.7))
    };
  };
  const onPointerUp = (event) => {
    if (pinDragRef.current) {
      pinDragRef.current = false;
      return;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) return;
    const canvas = canvasRef.current;
    const project = canvas?.__project;
    if (!project) return;
    const rect = canvas.getBoundingClientRect();
    const hit = members.find((member) => {
      if (member.lat == null) return false;
      const point = project(member.lat, member.lng);
      return Math.hypot(point.x - (event.clientX - rect.left), point.y - (event.clientY - rect.top)) < 22;
    });
    setSelected(hit || null);
  };

  const makeRoom = async () => {
    if (!self?.lat) {
      pushNotice("현재 위치를 아직 못 받았습니다.");
      return;
    }
    const data = await createVmapRoom({
      placeLat: self.lat,
      placeLng: self.lng,
      placeLabel: self.addressLabel || "약속 장소",
      displayName: getProfileHeaderName() || "나",
      title: "V-Map 약속"
    });
    patchLocationSession({ mode: "vmap", roomId: data.room.id, departed: false, open: true, minimized: false });
    setRoom(data.room);
  };

  const joinRoom = async () => {
    const roomId = joinCode.trim();
    if (!roomId) return;
    await joinVmapRoom(roomId, { displayName: getProfileHeaderName() || "참여자" });
    patchLocationSession({ mode: "vmap", roomId, departed: false, open: true, minimized: false });
  };

  const leaveForGood = async () => {
    if (session.roomId) await exitVmapApi(session.roomId).catch(() => {});
    syncOwnerInboxFromServer().catch(() => {});
    setNativeVmapSession(false);
    setRoom(null);
    setMessages([]);
    exitVmapRoom();
  };

  const startVoice = async (event) => {
    event.preventDefault();
    if (!session.roomId || recording) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      pushNotice("마이크를 허용해 주세요.");
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
      const sent = await postVmapMessage(session.roomId, { kind: "voice", body: dataUrl }).catch((error) => {
        pushNotice(error.message);
        return null;
      });
      if (sent?.message) {
        seenVoice.current.add(sent.message.id);
        pingVmap(session.roomId);
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
    if (!text || !session.roomId) return;
    setDraft("");
    const sent = await postVmapMessage(session.roomId, { kind: "text", body: text });
    setMessages((prev) => [...prev, sent.message]);
    pingVmap(session.roomId);
  };

  if (!visible) return null;

  if (session.minimized && !session.open) {
    return (
      <button
        type="button"
        onClick={restoreLocation}
        className="fixed right-3 top-16 z-[520] h-24 w-32 overflow-hidden rounded-2xl border border-white/40 shadow-xl"
        aria-label="V-Map 열기"
      >
        <canvas ref={canvasRef} className="h-full w-full" />
        <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">V-Map</span>
      </button>
    );
  }

  const locationOn = self?.online !== false && self?.lat != null;
  const isHost = Boolean(room?.hostUserId) && room.hostUserId === getLocalVlueUserId();
  const selfMember = members.find((member) => member.userId === getLocalVlueUserId());
  const selfArrived = Boolean(selfMember?.arrived);
  const cue = guideOn && session.mode === "vmap" && session.departed && !selfArrived ? nextGuideCue(routes[getLocalVlueUserId()]?.steps) : null;
  const liveComments = messages.filter((row) => liveNow - new Date(row.createdAt).getTime() < 7600).slice(-5);
  const people = members.length ? members : self?.lat ? [{ ...self, userId: getLocalVlueUserId(), self: true, displayName: self.displayName || "나", grayscale: !locationOn }] : [];

  const sheet = theme === "dark" ? "bg-[#121826] text-white" : "bg-white text-slate-900";
  return (
    <section className={`fixed inset-0 z-[530] flex flex-col ${theme === "dark" ? "bg-[#0f141c] text-white" : "bg-[#f4f7fb] text-slate-900"}`}>
      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { dragRef.current = null; pinDragRef.current = false; }}
        />
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button type="button" onClick={dismissLocation} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/80 text-lg text-white shadow" aria-label="닫기">×</button>
          <div className="flex min-w-0 flex-1 rounded-full bg-black/80 p-1 text-white shadow">
            <button type="button" className={`min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-black ${session.mode === "family" ? "bg-white text-slate-900" : ""}`} onClick={() => { setSelected(null); setRoutes({}); setGuideOn(false); setMembers([]); patchLocationSession({ mode: "family" }); }}>가족</button>
            <button type="button" className={`min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-black ${session.mode === "vmap" ? "bg-white text-slate-900" : ""}`} onClick={() => { setSelected(null); setRoutes({}); setGuideOn(false); patchLocationSession({ mode: "vmap" }); }}>V-Map</button>
          </div>
          {session.mode === "vmap" && !session.roomId ? (
            <button type="button" className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-[12px] font-black text-white shadow" onClick={() => void makeRoom()}>방 만들기</button>
          ) : null}
          <button type="button" onClick={() => { setMembersOpen(false); setSettingsOpen((open) => !open); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/80 text-white shadow" aria-label="화면 설정">☼</button>
        </div>
        <p className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-semibold text-slate-700/80">© OpenStreetMap</p>
        {session.mode === "vmap" && guideOn && cue ? (
          <div className="absolute left-1/2 bottom-24 z-10 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-2 text-[13px] font-black text-white shadow">
            {formatGuideDistance(cue.distanceM)} 앞 {cue.instruction}
          </div>
        ) : null}
        {farewell ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-8 text-center">
            <p className="text-[18px] font-black leading-snug text-white">{farewell}</p>
          </div>
        ) : null}
        {selected ? (
          <article className={`absolute bottom-3 left-3 right-3 rounded-3xl p-4 shadow-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              {session.mode === "family" ? (
                <div>
                  <p className="text-[15px] font-black">{selected.displayName}</p>
                  <p className="mt-1 text-[12px] leading-snug opacity-80">{selected.addressLabel || "도로명 주소를 확인 중입니다."}</p>
                  <p className="mt-1 text-[12px] font-bold">{selected.online === false ? "접속 끊김" : "접속 중"} · 배터리 {selected.batteryPct == null ? "—" : `${selected.batteryPct}%`}</p>
                  {/* TODO: 1일 1회 VLUÉ 안심패치 — 가족 위치에만 자리를 둔다 */}
                  <span className="mt-2 inline-flex rounded-full border border-dashed px-2 py-1 text-[10px] font-bold opacity-60">안심패치 예정</span>
                </div>
              ) : (
                <div>
                  <p className="text-[15px] font-black">{selected.displayName}</p>
                  <p className="mt-1 text-[13px] font-bold">
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
                  <p className="mt-1 text-[12px] opacity-70">소통은 아래 채팅과 음성만 됩니다.</p>
                </div>
              )}
              <button type="button" onClick={() => setSelected(null)} aria-label="닫기">×</button>
            </div>
          </article>
        ) : null}
        {session.mode === "vmap" && isHost && session.roomId ? (
          <div className={`absolute inset-x-3 top-[calc(68px+env(safe-area-inset-top))] z-10 space-y-2 rounded-3xl p-3 shadow-lg ${sheet}`}>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                searchVmapPlaces(placeQuery).then((data) => setPlaceHits(data.places || [])).catch((error) => pushNotice(error.message));
              }}
            >
              <input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="주소·장소 검색" className="min-w-0 flex-1 rounded-full border bg-white/90 px-3 py-2 text-[13px] text-slate-900" />
              <button type="submit" className="rounded-full bg-white/90 px-3 text-[12px] font-black text-slate-900">검색</button>
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
                className="rounded-full bg-blue-600 px-3 py-1.5 text-[12px] font-black text-white shadow"
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
        ) : null}
        {session.mode === "vmap" && session.roomId ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex flex-col justify-end px-3">
            <div className="mb-2 flex max-h-[7.5rem] flex-col justify-end gap-1 overflow-hidden">
              {liveComments.map((row) => (
                <p
                  key={row.id}
                  className="w-fit max-w-[88%] rounded-2xl bg-black/45 px-3 py-1 text-[13px] font-bold text-white"
                  style={{ opacity: liveOpacity(row.createdAt, liveNow) }}
                >
                  <span className="mr-1 font-black">{row.displayName}</span>
                  {row.kind === "voice" ? "음성" : row.body}
                </p>
              ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              {session.departed ? (
                selfArrived ? (
                  <span className="rounded-full bg-orange-500 px-3 py-2 text-[12px] font-black text-white shadow">도착함</span>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-pressed={guideOn}
                      onClick={() => setGuideOn((on) => !on)}
                      className={`rounded-full px-3 py-2 text-[12px] font-black shadow ${guideOn ? "bg-orange-500 text-white" : "bg-white/85 text-slate-900"}`}
                    >
                      길안내
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-orange-500 px-3 py-2 text-[12px] font-black text-white shadow"
                      onClick={() => {
                        arriveVmap(session.roomId).then((data) => {
                          setMembers((prev) => prev.map((member) => (member.userId === getLocalVlueUserId() ? { ...member, arrived: true } : member)));
                          if (data?.closingAt) setRoom((prev) => (prev ? { ...prev, closingAt: data.closingAt, closingReason: "arrived" } : prev));
                          refreshRoom(session.roomId);
                        }).catch((error) => pushNotice(error.message));
                      }}
                    >
                      도착 완료
                    </button>
                  </>
                )
              ) : (
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-3 py-2 text-[12px] font-black text-white shadow"
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
              <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(event) => { event.preventDefault(); void sendText(); }}>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="대화를 시작하세요." className="min-w-0 flex-1 rounded-full border border-white/30 bg-black/35 px-3 py-2 text-[13px] text-white placeholder:text-white/70" />
                <button type="button" onPointerDown={startVoice} onPointerUp={stopVoice} onPointerCancel={stopVoice} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${recording ? "bg-rose-500" : "bg-black/55"}`} aria-label="음성 메시지">🎤</button>
              </form>
            </div>
          </div>
        ) : null}
        {session.mode === "vmap" && !session.roomId ? (
          <form className="absolute inset-x-3 bottom-3 z-10 flex gap-2" onSubmit={(event) => { event.preventDefault(); void joinRoom(); }}>
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="약속 코드로 입장" className="min-w-0 flex-1 rounded-full border bg-white/90 px-3 py-2 text-[13px] text-slate-900" />
            <button type="submit" className="rounded-full bg-slate-900 px-3 text-[12px] font-black text-white">입장</button>
          </form>
        ) : null}
      </div>

      <div className="px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
        {sponsor ? (
          <a href={sponsor.linkUrl || undefined} target="_blank" rel="noreferrer" className="flex h-[52px] items-center gap-3 overflow-hidden rounded-xl bg-amber-50 px-3 text-slate-900">
            {sponsor.imageUrl ? <img src={sponsor.imageUrl} alt="" className="h-9 w-16 rounded object-cover" /> : null}
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black">{sponsor.title}</span>
              <span className="block truncate text-[10px]">{sponsor.body}</span>
            </span>
          </a>
        ) : sponsorReady ? (
          <AdMobBannerSlot slotId="location_map" heightPx={52} preferredSize="ADAPTIVE" />
        ) : (
          <div className="h-[52px]" />
        )}
      </div>

      {settingsOpen ? (
        <div className="absolute inset-0 z-30 bg-black/40" onClick={() => setSettingsOpen(false)}>
          <div className={`absolute inset-x-0 bottom-0 rounded-t-[28px] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-2xl ${sheet}`} onClick={(event) => event.stopPropagation()}>
            <div className={`mx-auto mb-3 h-1 w-10 rounded-full ${theme === "dark" ? "bg-white/20" : "bg-slate-200"}`} />
            <p className="text-[16px] font-black">화면</p>
            <p className={`mt-1 text-[12px] ${theme === "dark" ? "text-white/60" : "text-slate-500"}`}>지도는 컬러 도로지도로 두고, 버튼과 패널만 밝기를 바꿉니다.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["auto", "시간"],
                ["light", "라이트"],
                ["dark", "다크"]
              ].map(([item, label]) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-2xl px-2 py-3 text-[13px] font-black ${session.theme === item ? "bg-blue-600 text-white" : theme === "dark" ? "bg-white/10" : "bg-slate-100"}`}
                  onClick={() => setMapThemePreference(item)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className={`mt-3 block w-full rounded-2xl px-3 py-3 text-left text-[14px] font-black ${theme === "dark" ? "bg-white/10" : "bg-slate-100"}`} onClick={() => { setMembersOpen(true); setSettingsOpen(false); }}>
              함께 있는 사람
            </button>
            {session.mode === "vmap" && session.roomId ? (
              <button type="button" className="mt-2 block w-full rounded-2xl bg-rose-500 px-3 py-3 text-[14px] font-black text-white" onClick={() => void leaveForGood()}>
                {isHost ? "방 삭제" : "나가기"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {membersOpen ? (
        <div className="absolute inset-0 z-20 bg-black/40" onClick={() => setMembersOpen(false)}>
          <div className={`absolute inset-x-0 bottom-0 rounded-t-3xl p-4 ${theme === "dark" ? "bg-slate-900" : "bg-white"}`} onClick={(event) => event.stopPropagation()}>
            <p className="text-[14px] font-black">멤버</p>
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
      {notice ? <p className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-black px-3 py-1 text-[12px] text-white">{notice}</p> : null}
    </section>
  );
}
