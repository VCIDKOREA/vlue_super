import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { fetchNaverMapClientId, loadNaverMaps } from "../../lib/naverMapLoader.js";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { estimateEtaMinutes, haversineMeters } from "../../lib/sunTheme.js";

const ACCENT = "#00D2FF";

const MARKER_W = 148;
const MARKER_H = 78;

function personHtml(name, status, photoUrl, live) {
  const initial = String(name || "?").trim().slice(0, 1) || "?";
  const label = [name, status].filter(Boolean).join(" · ");
  const ring = live ? ACCENT : "#94a3b8";
  const face = photoUrl
    ? `<img src="${String(photoUrl).replace(/"/g, "")}" alt="" draggable="false" style="width:42px;height:42px;object-fit:cover;border-radius:999px;display:block" />`
    : `<div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:#083044;color:#fff;font-weight:700;font-size:16px;border-radius:999px">${initial}</div>`;
  /* Naver HtmlIcon은 root에 position:absolute + size 고정이 있어야 안정적으로 보인다 */
  return `<div style="position:absolute;left:0;top:0;width:${MARKER_W}px;height:${MARKER_H}px;margin:0;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;pointer-events:auto;-webkit-user-select:none;user-select:none">
    <div style="width:48px;height:48px;border-radius:999px;padding:3px;background:${ring};box-shadow:0 0 0 2px #fff,0 8px 20px rgba(0,210,255,0.35);box-sizing:border-box">
      <div style="width:100%;height:100%;border-radius:999px;overflow:hidden;background:#fff">${face}</div>
    </div>
    <div style="margin-top:3px;padding:2px 8px;border-radius:999px;background:rgba(4,18,26,0.92);border:1px solid rgba(0,210,255,0.55);color:#fff;font-size:11px;font-weight:700;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis">${label}</div>
  </div>`;
}

function toLatLngNum(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** API 행에 lat=null 본인이 있어도 로컬 GPS로 덮어써 프로필이 보이게 한다 */
function buildVisiblePeople({ members, self, mode, departed, mineId, selfPhoto }) {
  const byId = new Map();
  for (const member of members || []) {
    const id = String(member.userId || "").trim();
    if (!id) continue;
    byId.set(id, { ...member, userId: id });
  }

  const selfLat = toLatLngNum(self?.lat);
  const selfLng = toLatLngNum(self?.lng);
  if (selfLat != null && selfLng != null) {
    const id = String(mineId || "").trim() || "__local_self__";
    const prev = byId.get(id) || {};
    byId.set(id, {
      ...prev,
      userId: id,
      self: true,
      displayName: self.displayName || prev.displayName || "나",
      photoUrl: selfPhoto || prev.photoUrl || "",
      lat: selfLat,
      lng: selfLng,
      online: self.online !== false,
      grayscale: false,
      departed: mode === "vmap" ? Boolean(departed || prev.departed) : prev.departed
    });
  }

  return [...byId.values()].filter((member) => {
    const lat = toLatLngNum(member.lat);
    const lng = toLatLngNum(member.lng);
    if (lat == null || lng == null) return false;
    member.lat = lat;
    member.lng = lng;
    if (mode === "family") return true;
    if (member.self || (mineId && member.userId === mineId)) return true;
    return Boolean(member.departed);
  });
}

function pinHtml(ready) {
  const color = ready ? ACCENT : "#f59e0b";
  return `<div style="width:22px;height:32px;transform:translateY(-8px)">
    <svg width="22" height="32" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 0C5.5 0 1 4.5 1 10c0 7.5 10 22 10 22s10-14.5 10-22C21 4.5 16.5 0 11 0z" fill="${color}"/>
      <circle cx="11" cy="10" r="4.5" fill="#fff"/>
    </svg>
  </div>`;
}

function clearOverlays(store) {
  store.people.forEach((item) => {
    try {
      item.marker.setMap(null);
    } catch {
      /* ignore */
    }
  });
  store.people.clear();
  store.lines.forEach((line) => {
    try {
      line.setMap(null);
    } catch {
      /* ignore */
    }
  });
  store.lines.clear();
  if (store.pin?.marker) {
    try {
      store.pin.marker.setMap(null);
    } catch {
      /* ignore */
    }
  }
  store.pin = null;
}

/**
 * 네이버 Dynamic Map 표면.
 * LocationPlatform의 세션/채팅은 그대로 두고 지도 렌더만 담당한다.
 */
const VmapNaverSurface = forwardRef(function VmapNaverSurface(
  {
    active,
    members = [],
    self = null,
    room = null,
    draftPin = null,
    /** 가족 이동 목적지 핀 { lat, lng, label } — family 모드 전용 */
    destPin = null,
    routes = {},
    mode = "family",
    departed = false,
    guideFollow = false,
    flyTo = null,
    pinEditable = false,
    onSelectMember,
    onDraftPinChange,
    onUserGesture,
    onReady,
    onError
  },
  ref
) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const mapsApiRef = useRef(null);
  const overlaysRef = useRef({ people: new Map(), pin: null, lines: new Map() });
  const gestureAtRef = useRef(0);
  const guideFollowRef = useRef(guideFollow);
  const followTargetRef = useRef(null);
  const pinEditableRef = useRef(pinEditable);
  const onSelectRef = useRef(onSelectMember);
  const onPinRef = useRef(onDraftPinChange);
  const onGestureRef = useRef(onUserGesture);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const selfRef = useRef(self);
  const centeredSelfRef = useRef(false);
  const [mapEpoch, setMapEpoch] = useState(0);

  guideFollowRef.current = guideFollow;
  pinEditableRef.current = pinEditable;
  onSelectRef.current = onSelectMember;
  onPinRef.current = onDraftPinChange;
  onGestureRef.current = onUserGesture;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  selfRef.current = self;

  useImperativeHandle(ref, () => ({
    zoomBy(delta) {
      const map = mapRef.current;
      if (!map) return;
      gestureAtRef.current = performance.now();
      onGestureRef.current?.();
      map.setZoom(Math.max(5, Math.min(21, map.getZoom() + delta)), true);
    },
    /** 프로필/핀 포커스 — 짧고 부드럽게 (기본 panTo보다 끊김 적음) */
    panTo(lat, lng, zoom) {
      const map = mapRef.current;
      const naver = mapsApiRef.current;
      if (!map || !naver || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      gestureAtRef.current = performance.now();
      const coord = new naver.LatLng(lat, lng);
      const nextZoom = Number.isFinite(zoom) ? zoom : map.getZoom();
      try {
        if (typeof map.morph === "function") {
          map.morph(coord, nextZoom, { duration: 260, easing: "easeOutCubic" });
          return;
        }
      } catch {
        /* fall through */
      }
      map.panTo(coord);
      if (Number.isFinite(zoom)) map.setZoom(zoom, true);
    },
    getCenter() {
      const c = mapRef.current?.getCenter?.();
      if (!c) return null;
      return { lat: c.lat(), lng: c.lng(), zoom: mapRef.current.getZoom() };
    }
  }));

  useEffect(() => {
    if (!active || !hostRef.current) return undefined;
    let cancelled = false;
    let dragListener = null;
    let zoomListener = null;
    let dragEndListener = null;
    let idleTimer = 0;
    let resizeObserver = null;
    centeredSelfRef.current = false;

    (async () => {
      try {
        const clientId = await fetchNaverMapClientId();
        if (!clientId) throw new Error("네이버 지도 Client ID가 없습니다. NAVER_MAP_CLIENT_ID를 확인하세요.");
        const naverMaps = await loadNaverMaps(clientId);
        if (cancelled || !hostRef.current) return;
        mapsApiRef.current = naverMaps;
        const seed = selfRef.current;
        const seedLat = toLatLngNum(seed?.lat);
        const seedLng = toLatLngNum(seed?.lng);
        const center =
          seedLat != null && seedLng != null
            ? new naverMaps.LatLng(seedLat, seedLng)
            : new naverMaps.LatLng(36.119, 128.344);
        if (seedLat != null && seedLng != null) centeredSelfRef.current = true;
        const map = new naverMaps.Map(hostRef.current, {
          center,
          zoom: seedLat != null ? 16 : 15,
          minZoom: 5,
          maxZoom: 21,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: true,
          mapDataControl: false,
          disableKineticPan: false
        });
        mapRef.current = map;

        const markGesture = () => {
          gestureAtRef.current = performance.now();
          onGestureRef.current?.();
        };
        dragListener = naverMaps.Event.addListener(map, "dragstart", markGesture);
        zoomListener = naverMaps.Event.addListener(map, "zoom_changed", markGesture);
        dragEndListener = naverMaps.Event.addListener(map, "dragend", markGesture);

        const relayout = () => {
          const live = mapRef.current;
          const host = hostRef.current;
          if (!live || !host) return;
          try {
            if (typeof live.autoResize === "function") live.autoResize();
            else if (typeof live.setSize === "function") {
              live.setSize(new naverMaps.Size(host.clientWidth, host.clientHeight));
            }
          } catch {
            /* ignore */
          }
          overlaysRef.current.people.forEach((entry) => {
            try {
              entry.marker.setMap(live);
            } catch {
              /* ignore */
            }
          });
          if (overlaysRef.current.pin?.marker) {
            try {
              overlaysRef.current.pin.marker.setMap(live);
            } catch {
              /* ignore */
            }
          }
        };
        relayout();
        window.setTimeout(relayout, 80);
        window.setTimeout(relayout, 320);
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => relayout());
          resizeObserver.observe(hostRef.current);
        }

        /* 길안내 추적: 잦은 setCenter(뚝뚝) 대신 임계값+ morph 1회 */
        idleTimer = window.setInterval(() => {
          const target = followTargetRef.current;
          const liveMap = mapRef.current;
          const naver = mapsApiRef.current;
          if (!guideFollowRef.current || !target || !liveMap || !naver) return;
          if (performance.now() - gestureAtRef.current < 900) return;
          const cur = liveMap.getCenter();
          const dLat = target.lat - cur.lat();
          const dLng = target.lng - cur.lng();
          const dist = Math.hypot(dLat, dLng);
          if (dist < 0.00004) return;
          const coord = new naver.LatLng(target.lat, target.lng);
          const nextZoom = Number.isFinite(target.zoom) ? target.zoom : liveMap.getZoom();
          try {
            if (typeof liveMap.morph === "function") {
              liveMap.morph(coord, nextZoom, { duration: 320, easing: "easeOutCubic" });
              gestureAtRef.current = performance.now();
              return;
            }
          } catch {
            /* fall through */
          }
          liveMap.panTo(coord);
          if (Number.isFinite(target.zoom) && Math.abs(liveMap.getZoom() - target.zoom) > 0.2) {
            liveMap.setZoom(target.zoom, true);
          }
          gestureAtRef.current = performance.now();
        }, 700);

        setMapEpoch((n) => n + 1);
        onReadyRef.current?.();
      } catch (error) {
        onErrorRef.current?.(error);
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(idleTimer);
      try {
        resizeObserver?.disconnect?.();
      } catch {
        /* ignore */
      }
      const naver = mapsApiRef.current;
      if (naver && dragListener) naver.Event.removeListener(dragListener);
      if (naver && zoomListener) naver.Event.removeListener(zoomListener);
      if (naver && dragEndListener) naver.Event.removeListener(dragEndListener);
      clearOverlays(overlaysRef.current);
      try {
        mapRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      try {
        if (hostRef.current) hostRef.current.innerHTML = "";
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      centeredSelfRef.current = false;
    };
  }, [active]);

  useEffect(() => {
    if (!flyTo?.lat || !mapRef.current || !mapsApiRef.current) return;
    const map = mapRef.current;
    const naver = mapsApiRef.current;
    gestureAtRef.current = performance.now();
    const coord = new naver.LatLng(flyTo.lat, flyTo.lng);
    const zoom = Number.isFinite(flyTo.zoom) ? flyTo.zoom : map.getZoom();
    try {
      if (typeof map.morph === "function") {
        map.morph(coord, zoom, { duration: 260, easing: "easeOutCubic" });
        return;
      }
    } catch {
      /* fall through */
    }
    map.panTo(coord);
  }, [flyTo]);

  useEffect(() => {
    const map = mapRef.current;
    const naver = mapsApiRef.current;
    if (!map || !naver || !active || mapEpoch < 1) return;

    const mineId = getLocalVlueUserId();
    const selfPhoto = readProfilePhotoAvatar();
    const visiblePeople = buildVisiblePeople({ members, self, mode, departed, mineId, selfPhoto });
    const keep = new Set();
    const iconSize = new naver.Size(MARKER_W, MARKER_H);
    const iconAnchor = new naver.Point(MARKER_W / 2, 54);

    visiblePeople.forEach((member) => {
      const id = String(member.userId || member.displayName);
      keep.add(id);
      const dead = mode === "family" && (member.grayscale || member.online === false || member.batteryPct === 0 || member.lastKnownLocation);
      const mine = Boolean(member.self) || (mineId && member.userId === mineId);
      const status =
        mode === "vmap" && member.departed && room
          ? member.arrived
            ? "도착"
            : member.dropout
              ? "이탈"
              : `${estimateEtaMinutes(haversineMeters(member.lat, member.lng, room.placeLat, room.placeLng))}분`
          : mode === "family" && member.lastKnownLocation
            ? "📍 마지막 확인 위치"
            : "";
      const html = personHtml(member.displayName || "멤버", status, mine && selfPhoto ? selfPhoto : member.photoUrl, !dead);
      let entry = overlaysRef.current.people.get(id);
      const nextPos = new naver.LatLng(member.lat, member.lng);
      if (!entry) {
        const marker = new naver.Marker({
          position: nextPos,
          map,
          title: member.displayName || "멤버",
          icon: {
            content: html,
            size: iconSize,
            anchor: iconAnchor
          },
          zIndex: mine ? 120 : 100
        });
        naver.Event.addListener(marker, "click", () => onSelectRef.current?.(member));
        entry = { marker, html, lat: member.lat, lng: member.lng };
        overlaysRef.current.people.set(id, entry);
      } else {
        if (entry.html !== html) {
          entry.marker.setIcon({ content: html, size: iconSize, anchor: iconAnchor });
          entry.html = html;
        }
        if (entry.lat !== member.lat || entry.lng !== member.lng) {
          entry.marker.setPosition(nextPos);
          entry.lat = member.lat;
          entry.lng = member.lng;
        }
      }
      if (mine && guideFollow && !member.arrived) {
        const destLat = mode === "family" ? toLatLngNum(destPin?.lat) : room?.placeReady ? room.placeLat : null;
        const destLng = mode === "family" ? toLatLngNum(destPin?.lng) : room?.placeReady ? room.placeLng : null;
        followTargetRef.current = {
          lat: member.lat,
          lng: member.lng,
          zoom:
            destLat != null && destLng != null
              ? Math.max(
                  12,
                  Math.min(18, 16 - Math.log2(Math.max(150, haversineMeters(member.lat, member.lng, destLat, destLng)) / 400))
                )
              : null
        };
      }
    });

    overlaysRef.current.people.forEach((entry, id) => {
      if (keep.has(id)) return;
      entry.marker.setMap(null);
      overlaysRef.current.people.delete(id);
    });

    const hostView = Boolean(room?.hostUserId) && room.hostUserId === mineId;
    const pinSource =
      mode === "family"
        ? destPin?.lat != null
          ? destPin
          : null
        : hostView && draftPin
          ? draftPin
          : room?.placeReady
            ? room
            : null;
    if ((mode === "vmap" || mode === "family") && pinSource?.lat != null) {
      const ready =
        mode === "family"
          ? true
          : Boolean(room?.placeReady && draftPin?.ready !== false);
      const html = pinHtml(ready);
      const nextPos = new naver.LatLng(pinSource.lat, pinSource.lng);
      const canDragPin = mode === "vmap" && Boolean(pinEditableRef.current && hostView);
      if (!overlaysRef.current.pin) {
        const marker = new naver.Marker({
          position: nextPos,
          map,
          icon: { content: html, size: new naver.Size(22, 32), anchor: new naver.Point(11, 32) },
          draggable: canDragPin,
          zIndex: 90
        });
        naver.Event.addListener(marker, "dragend", (event) => {
          const coord = event?.coord || overlaysRef.current.pin?.marker?.getPosition?.();
          if (!coord) return;
          onPinRef.current?.({
            lat: coord.lat(),
            lng: coord.lng(),
            label: draftPin?.label || room?.placeLabel || "",
            ready: false
          });
          onGestureRef.current?.();
        });
        overlaysRef.current.pin = { marker, html, lat: pinSource.lat, lng: pinSource.lng };
      } else {
        const pin = overlaysRef.current.pin;
        if (pin.html !== html) {
          pin.marker.setIcon({ content: html, size: new naver.Size(22, 32), anchor: new naver.Point(11, 32) });
          pin.html = html;
        }
        if (pin.lat !== pinSource.lat || pin.lng !== pinSource.lng) {
          pin.marker.setPosition(nextPos);
          pin.lat = pinSource.lat;
          pin.lng = pinSource.lng;
        }
        pin.marker.setDraggable(canDragPin);
      }
    } else if (overlaysRef.current.pin) {
      overlaysRef.current.pin.marker.setMap(null);
      overlaysRef.current.pin = null;
    }

    const lineKeep = new Set();
    const drawRoutes =
      (mode === "vmap" && room?.placeReady) ||
      (mode === "family" && Object.keys(routes || {}).length > 0);
    if (drawRoutes) {
      Object.entries(routes || {}).forEach(([userId, guided]) => {
        if (!guided?.points?.length) return;
        lineKeep.add(userId);
        const path = guided.points.map((pair) => new naver.LatLng(pair[1], pair[0]));
        const own = userId === mineId;
        let line = overlaysRef.current.lines.get(userId);
        if (!line) {
          line = new naver.Polyline({
            map,
            path,
            strokeColor: own ? ACCENT : "#38bdf8",
            strokeWeight: own ? 6 : 5,
            strokeOpacity: 0.95,
            strokeLineCap: "round",
            strokeLineJoin: "round",
            zIndex: own ? 80 : 70
          });
          overlaysRef.current.lines.set(userId, line);
        } else {
          line.setPath(path);
          line.setOptions({ strokeColor: own ? ACCENT : "#38bdf8", strokeWeight: own ? 6 : 5 });
        }
      });
    }
    overlaysRef.current.lines.forEach((line, id) => {
      if (lineKeep.has(id)) return;
      line.setMap(null);
      overlaysRef.current.lines.delete(id);
    });

    if (!guideFollow) followTargetRef.current = null;

    const selfLat = toLatLngNum(self?.lat);
    const selfLng = toLatLngNum(self?.lng);
    if (!centeredSelfRef.current && selfLat != null && selfLng != null && !guideFollow) {
      centeredSelfRef.current = true;
      map.setCenter(new naver.LatLng(selfLat, selfLng));
      if (map.getZoom() < 14) map.setZoom(16);
    }
  }, [active, mapEpoch, members, self, room, draftPin, destPin, routes, mode, departed, guideFollow, pinEditable]);

  return <div ref={hostRef} className="h-full w-full bg-[#eef2f5]" />;
});

export default VmapNaverSurface;
