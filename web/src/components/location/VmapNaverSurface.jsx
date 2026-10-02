import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { fetchNaverMapClientId, loadNaverMaps } from "../../lib/naverMapLoader.js";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { estimateEtaMinutes, haversineMeters } from "../../lib/sunTheme.js";

const ACCENT = "#00D2FF";

function personHtml(name, status, photoUrl, live) {
  const initial = String(name || "?").trim().slice(0, 1) || "?";
  const label = [name, status].filter(Boolean).join(" · ");
  const ring = live ? ACCENT : "#94a3b8";
  const face = photoUrl
    ? `<img src="${photoUrl.replace(/"/g, "")}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:999px" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#083044;color:#fff;font-weight:700;font-size:16px;border-radius:999px">${initial}</div>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)">
    <div style="width:48px;height:48px;border-radius:999px;padding:3px;background:${ring};box-shadow:0 0 0 2px #fff,0 8px 20px rgba(0,210,255,0.35)">
      <div style="width:100%;height:100%;border-radius:999px;overflow:hidden;background:#fff">${face}</div>
    </div>
    <div style="margin-top:4px;padding:2px 8px;border-radius:999px;background:rgba(4,18,26,0.88);border:1px solid rgba(0,210,255,0.55);color:#fff;font-size:11px;font-weight:700;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis">${label}</div>
  </div>`;
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

  guideFollowRef.current = guideFollow;
  pinEditableRef.current = pinEditable;
  onSelectRef.current = onSelectMember;
  onPinRef.current = onDraftPinChange;
  onGestureRef.current = onUserGesture;

  useImperativeHandle(ref, () => ({
    zoomBy(delta) {
      const map = mapRef.current;
      if (!map) return;
      gestureAtRef.current = performance.now();
      onGestureRef.current?.();
      map.setZoom(Math.max(5, Math.min(21, map.getZoom() + delta)), true);
    },
    panTo(lat, lng, zoom) {
      const map = mapRef.current;
      const naver = mapsApiRef.current;
      if (!map || !naver || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      map.panTo(new naver.LatLng(lat, lng));
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
    let idleTimer = 0;

    (async () => {
      try {
        const clientId = await fetchNaverMapClientId();
        if (!clientId) throw new Error("네이버 지도 Client ID가 없습니다. NAVER_MAP_CLIENT_ID를 확인하세요.");
        const naverMaps = await loadNaverMaps(clientId);
        if (cancelled || !hostRef.current) return;
        mapsApiRef.current = naverMaps;
        const center = new naverMaps.LatLng(36.119, 128.344);
        const map = new naverMaps.Map(hostRef.current, {
          center,
          zoom: 15,
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
        naverMaps.Event.addListener(map, "dragend", markGesture);

        idleTimer = window.setInterval(() => {
          const target = followTargetRef.current;
          if (!guideFollowRef.current || !target || !mapRef.current) return;
          if (performance.now() - gestureAtRef.current < 1400) return;
          const cur = mapRef.current.getCenter();
          const lat = cur.lat() + (target.lat - cur.lat()) * 0.22;
          const lng = cur.lng() + (target.lng - cur.lng()) * 0.22;
          mapRef.current.panTo(new naverMaps.LatLng(lat, lng));
          if (Number.isFinite(target.zoom)) {
            const z = mapRef.current.getZoom();
            mapRef.current.setZoom(z + (target.zoom - z) * 0.15);
          }
        }, 320);

        onReady?.();
      } catch (error) {
        onError?.(error);
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(idleTimer);
      const naver = mapsApiRef.current;
      if (naver && dragListener) naver.Event.removeListener(dragListener);
      if (naver && zoomListener) naver.Event.removeListener(zoomListener);
      overlaysRef.current.people.forEach((item) => item.setMap(null));
      overlaysRef.current.people.clear();
      overlaysRef.current.lines.forEach((line) => line.setMap(null));
      overlaysRef.current.lines.clear();
      overlaysRef.current.pin?.setMap(null);
      overlaysRef.current.pin = null;
      try {
        if (hostRef.current) hostRef.current.innerHTML = "";
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, [active, onReady, onError]);

  useEffect(() => {
    if (!flyTo?.lat || !mapRef.current || !mapsApiRef.current) return;
    gestureAtRef.current = performance.now();
    mapRef.current.panTo(new mapsApiRef.current.LatLng(flyTo.lat, flyTo.lng));
  }, [flyTo]);

  useEffect(() => {
    const map = mapRef.current;
    const naver = mapsApiRef.current;
    if (!map || !naver || !active) return;

    const mineId = getLocalVlueUserId();
    const selfPhoto = readProfilePhotoAvatar();
    const plotted = [...members];
    if (self?.lat != null && mode === "family" && !plotted.some((m) => m.self || m.userId === mineId)) {
      plotted.push({ ...self, userId: mineId, displayName: self.displayName || "나", photoUrl: selfPhoto, online: self.online });
    }
    if (self?.lat != null && mode === "vmap" && departed && !plotted.some((m) => m.userId === mineId && m.lat != null)) {
      plotted.push({ ...self, userId: mineId, displayName: self.displayName || "나", photoUrl: selfPhoto, departed: true, online: true });
    }

    const visiblePeople = plotted.filter((m) => m.lat != null && m.lng != null && (mode === "family" || m.departed));
    const keep = new Set();

    visiblePeople.forEach((member) => {
      const id = String(member.userId || member.displayName);
      keep.add(id);
      const dead = mode === "family" && (member.grayscale || member.online === false || member.batteryPct === 0);
      const mine = member.self || member.userId === mineId;
      const status =
        mode === "vmap" && member.departed && room
          ? member.arrived
            ? "도착"
            : member.dropout
              ? "이탈"
              : `${estimateEtaMinutes(haversineMeters(member.lat, member.lng, room.placeLat, room.placeLng))}분`
          : "";
      const html = personHtml(member.displayName || "멤버", status, mine && selfPhoto ? selfPhoto : member.photoUrl, !dead);
      let overlay = overlaysRef.current.people.get(id);
      if (!overlay) {
        overlay = new naver.Marker({
          position: new naver.LatLng(member.lat, member.lng),
          map,
          icon: {
            content: html,
            size: new naver.Size(48, 72),
            anchor: new naver.Point(24, 54)
          },
          zIndex: mine ? 120 : 100
        });
        naver.Event.addListener(overlay, "click", () => onSelectRef.current?.(member));
        overlaysRef.current.people.set(id, overlay);
      } else {
        overlay.setPosition(new naver.LatLng(member.lat, member.lng));
        overlay.setIcon({ content: html, size: new naver.Size(48, 72), anchor: new naver.Point(24, 54) });
      }
      if (mine && guideFollow && !member.arrived) {
        followTargetRef.current = {
          lat: member.lat,
          lng: member.lng,
          zoom:
            room?.placeReady
              ? Math.max(12, Math.min(18, 16 - Math.log2(Math.max(150, haversineMeters(member.lat, member.lng, room.placeLat, room.placeLng)) / 400)))
              : null
        };
      }
    });

    overlaysRef.current.people.forEach((overlay, id) => {
      if (keep.has(id)) return;
      overlay.setMap(null);
      overlaysRef.current.people.delete(id);
    });

    const hostView = Boolean(room?.hostUserId) && room.hostUserId === mineId;
    const pinSource = hostView && draftPin ? draftPin : room?.placeReady ? room : null;
    if (mode === "vmap" && pinSource?.lat != null) {
      const ready = Boolean(room?.placeReady && draftPin?.ready !== false);
      const html = pinHtml(ready);
      if (!overlaysRef.current.pin) {
        overlaysRef.current.pin = new naver.Marker({
          position: new naver.LatLng(pinSource.lat, pinSource.lng),
          map,
          icon: { content: html, size: new naver.Size(22, 32), anchor: new naver.Point(11, 32) },
          draggable: Boolean(pinEditableRef.current && hostView),
          zIndex: 90
        });
        naver.Event.addListener(overlaysRef.current.pin, "dragend", (event) => {
          const coord = event?.coord || overlaysRef.current.pin.getPosition();
          onPinRef.current?.({
            lat: coord.lat(),
            lng: coord.lng(),
            label: draftPin?.label || room?.placeLabel || "",
            ready: false
          });
          onGestureRef.current?.();
        });
      } else {
        overlaysRef.current.pin.setPosition(new naver.LatLng(pinSource.lat, pinSource.lng));
        overlaysRef.current.pin.setIcon({ content: html, size: new naver.Size(22, 32), anchor: new naver.Point(11, 32) });
        overlaysRef.current.pin.setDraggable(Boolean(pinEditableRef.current && hostView));
      }
    } else if (overlaysRef.current.pin) {
      overlaysRef.current.pin.setMap(null);
      overlaysRef.current.pin = null;
    }

    const lineKeep = new Set();
    if (mode === "vmap" && room?.placeReady) {
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
  }, [active, members, self, room, draftPin, routes, mode, departed, guideFollow, pinEditable]);

  return <div ref={hostRef} className="h-full w-full bg-[#eef2f5]" />;
});

export default VmapNaverSurface;
