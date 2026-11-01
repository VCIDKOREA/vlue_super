import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { estimateEtaMinutes, haversineMeters } from "../../lib/sunTheme.js";
import { MAPBOX_PUBLIC_TOKEN, readMapboxToken } from "../../lib/mapboxToken.js";
import { CHASE_COMPOSER_INSET_PX, chaseLookAheadMeters, lerpHeading, lookAheadLatLng } from "../../lib/vmapGuide.js";
import { userHasVerifiedBadge, verifiedSealSvgHtml } from "../UserBadgeLabel.jsx";

const ACCENT = "#00D2FF";
const CHASE_TILT = 0;
const CHASE_ZOOM = 16.8;
const ZERO_PAD = { top: 0, bottom: 0, left: 0, right: 0 };
const STYLE_URL = "mapbox://styles/mapbox/streets-v12";

function bearingDegrees(fromLat, fromLng, toLat, toLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(fromLat);
  const φ2 = toRad(toLat);
  const Δλ = toRad(toLng - fromLng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function toLatLngNum(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function personHtml(name, status, photoUrl, live, verified = false) {
  const initial = String(name || "?").trim().slice(0, 1) || "?";
  const namePart = escapeHtml(name || "멤버");
  const statusPart = status ? ` · ${escapeHtml(status)}` : "";
  const badge = verified ? verifiedSealSvgHtml(12) : "";
  const ring = live ? ACCENT : "#94a3b8";
  const face = photoUrl
    ? `<img src="${String(photoUrl).replace(/"/g, "")}" alt="" draggable="false" style="width:42px;height:42px;object-fit:cover;border-radius:999px;display:block" />`
    : `<div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:#083044;color:#fff;font-weight:700;font-size:16px;border-radius:999px">${escapeHtml(initial)}</div>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;-webkit-user-select:none;user-select:none">
    <div style="width:48px;height:48px;border-radius:999px;padding:3px;background:${ring};box-shadow:0 0 0 2px #fff,0 8px 20px rgba(0,210,255,0.35);box-sizing:border-box">
      <div style="width:100%;height:100%;border-radius:999px;overflow:hidden;background:#fff">${face}</div>
    </div>
    <div style="margin-top:3px;padding:2px 8px;border-radius:999px;background:rgba(4,18,26,0.92);border:1px solid rgba(0,210,255,0.55);color:#fff;font-size:11px;font-weight:700;white-space:nowrap;max-width:180px;display:inline-flex;align-items:center;gap:3px">
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${namePart}</span>${badge}${statusPart}
    </div>
  </div>`;
}

function pinHtml(ready) {
  const color = ready ? ACCENT : "#f59e0b";
  return `<div style="width:22px;height:32px">
    <svg width="22" height="32" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 0C5.5 0 1 4.5 1 10c0 7.5 10 22 10 22s10-14.5 10-22C21 4.5 16.5 0 11 0z" fill="${color}"/>
      <circle cx="11" cy="10" r="4.5" fill="#fff"/>
    </svg>
  </div>`;
}

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
      cyanBadgeActive: Boolean(self.cyanBadgeActive || prev.cyanBadgeActive),
      isPaidUser: Boolean(self.isPaidUser || prev.isPaidUser),
      isVerified: Boolean(self.isVerified || prev.isVerified),
      vlueVerifiedBadge: Boolean(self.vlueVerifiedBadge || prev.vlueVerifiedBadge),
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

function chaseCenter(map, cam = {}) {
  const lat = Number(cam.lat);
  const lng = Number(cam.lng);
  if (Boolean(cam.arrived) || cam.anchor === "center" || cam.lookAheadM === 0) return { lat, lng };
  const heading = Number.isFinite(cam.heading) ? cam.heading : map.getBearing();
  const zoom = Number.isFinite(cam.zoom) ? cam.zoom : CHASE_ZOOM;
  const height = map.getContainer()?.clientHeight || window.innerHeight || 640;
  const overlay = Number.isFinite(cam.overlayBottomPx) ? cam.overlayBottomPx : CHASE_COMPOSER_INSET_PX;
  const meters = Number.isFinite(cam.lookAheadM)
    ? cam.lookAheadM
    : chaseLookAheadMeters(lat, zoom, height, undefined, overlay);
  if (!(meters > 0) || !Number.isFinite(heading)) return { lat, lng };
  return lookAheadLatLng(lat, lng, heading, meters);
}

function applyChaseCamera(map, cam = {}, { force = false } = {}) {
  if (!map) return;
  const lat = Number(cam.lat);
  const lng = Number(cam.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const pitch = Number.isFinite(cam.tilt) ? Math.max(0, cam.tilt) : CHASE_TILT;
  const zoom = Number.isFinite(cam.zoom) ? cam.zoom : CHASE_ZOOM;
  const targetH = Number.isFinite(cam.heading) ? ((cam.heading % 360) + 360) % 360 : map.getBearing();
  const prevH = map.__vmapChase?.heading;
  const bearing = force || !Number.isFinite(prevH) ? targetH : lerpHeading(prevH, targetH, 0.3);
  const center = chaseCenter(map, { ...cam, heading: bearing });
  const nowCenter = map.getCenter();
  const moved = haversineMeters(nowCenter.lat, nowCenter.lng, center.lat, center.lng);
  const yaw = Math.abs((((map.getBearing() - bearing) % 360) + 540) % 360 - 180);
  if (!force && moved < 1.1 && yaw < 1.4 && Math.abs(map.getPitch() - pitch) < 0.8) {
    map.__vmapChase = { lat, lng, heading: bearing, tilt: pitch, zoom, arrived: Boolean(cam.arrived) };
    return;
  }
  map.__vmapChase = { lat, lng, heading: bearing, tilt: pitch, zoom, arrived: Boolean(cam.arrived) };
  map.easeTo({
    center: [center.lng, center.lat],
    zoom,
    pitch,
    bearing,
    duration: force ? 560 : 360,
    essential: true,
    padding: ZERO_PAD
  });
}

function emptyRouteCollection() {
  return { type: "FeatureCollection", features: [] };
}

function routesToGeojson(routes, mineId) {
  const features = [];
  Object.entries(routes || {}).forEach(([userId, guided]) => {
    const pts = Array.isArray(guided?.points) ? guided.points : [];
    if (pts.length < 2) return;
    const coords = pts
      .map((pair) => [Number(pair[0]), Number(pair[1])])
      .filter((pair) => Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
    if (coords.length < 2) return;
    features.push({
      type: "Feature",
      properties: { own: userId === mineId ? 1 : 0 },
      geometry: { type: "LineString", coordinates: coords }
    });
  });
  return { type: "FeatureCollection", features };
}

const VmapMapboxSurface = forwardRef(function VmapMapboxSurface(
  {
    active,
    members = [],
    self = null,
    room = null,
    draftPin = null,
    destPin = null,
    routes = {},
    mode = "family",
    departed = false,
    guideFollow = false,
    flyTo = null,
    previewTarget = null,
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
  const overlaysRef = useRef({ people: new Map(), pin: null });
  const gestureAtRef = useRef(0);
  const guideFollowRef = useRef(guideFollow);
  const followTargetRef = useRef(null);
  const pendingNavRef = useRef(null);
  const programmaticRef = useRef(0);
  const onSelectRef = useRef(onSelectMember);
  const onPinRef = useRef(onDraftPinChange);
  const onGestureRef = useRef(onUserGesture);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const selfRef = useRef(self);
  const peopleRef = useRef([]);
  const previewTargetRef = useRef(previewTarget);
  const [mapEpoch, setMapEpoch] = useState(0);

  guideFollowRef.current = guideFollow;
  previewTargetRef.current = previewTarget;
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
      map.zoomTo(Math.max(2, Math.min(20, map.getZoom() + delta)), { duration: 180 });
    },
    panTo(lat, lng, zoom) {
      const map = mapRef.current;
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      gestureAtRef.current = performance.now();
      map.easeTo({
        center: [lng, lat],
        zoom: Number.isFinite(zoom) ? zoom : map.getZoom(),
        duration: 280,
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    },
    setNavCamera({ lat, lng, heading, tilt, zoom, force = false, arrived = false, lookAheadM, anchor, overlayBottomPx } = {}) {
      const cam = {
        lat,
        lng,
        heading: Number.isFinite(heading) ? heading : null,
        tilt: Number.isFinite(tilt) ? tilt : CHASE_TILT,
        arrived: Boolean(arrived),
        lookAheadM: Number.isFinite(lookAheadM) ? lookAheadM : undefined,
        overlayBottomPx: Number.isFinite(overlayBottomPx) ? overlayBottomPx : CHASE_COMPOSER_INSET_PX,
        anchor,
        zoom: Number.isFinite(zoom) ? zoom : CHASE_ZOOM
      };
      pendingNavRef.current = cam;
      followTargetRef.current = cam;
      const map = mapRef.current;
      if (force && map) map.__vmapChasePausedUntil = 0;
      if (!map) return;
      if (!force && map.__vmapChasePausedUntil && Date.now() < map.__vmapChasePausedUntil) return;
      programmaticRef.current += 1;
      applyChaseCamera(map, cam, { force });
      window.setTimeout(() => {
        programmaticRef.current = Math.max(0, programmaticRef.current - 1);
      }, force ? 800 : 200);
    },
    resetNavCamera() {
      const map = mapRef.current;
      pendingNavRef.current = null;
      followTargetRef.current = null;
      if (!map) return;
      map.__vmapChase = null;
      map.__vmapChasePausedUntil = 0;
      try {
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 400,
          padding: ZERO_PAD
        });
      } catch {
        /* ignore */
      }
    },
    fitBounds(points = []) {
      const map = mapRef.current;
      if (!map || !points.length) return;
      const bounds = new mapboxgl.LngLatBounds();
      let any = false;
      points.forEach((p) => {
        if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) return;
        bounds.extend([p.lng, p.lat]);
        any = true;
      });
      if (!any) return;
      map.__vmapChase = null;
      map.fitBounds(bounds, { padding: 72, duration: 500, pitch: 0, bearing: 0, maxZoom: 16 });
    },
    getCenter() {
      const c = mapRef.current?.getCenter?.();
      if (!c) return null;
      return { lat: c.lat, lng: c.lng, zoom: mapRef.current.getZoom() };
    },
    resize() {
      try {
        mapRef.current?.resize?.();
      } catch {
        /* ignore */
      }
    }
  }));

  useEffect(() => {
    if (!active || !hostRef.current) return undefined;
    const token = readMapboxToken() || MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      onErrorRef.current?.(new Error("Mapbox 토큰이 없습니다. NEXT_PUBLIC_MAPBOX_TOKEN을 설정하세요."));
      return undefined;
    }
    let cancelled = false;
    mapboxgl.accessToken = token;
    const seed = selfRef.current;
    const seedLat = toLatLngNum(seed?.lat) ?? 36.119;
    const seedLng = toLatLngNum(seed?.lng) ?? 128.344;
    const map = new mapboxgl.Map({
      container: hostRef.current,
      style: STYLE_URL,
      center: [seedLng, seedLat],
      zoom: toLatLngNum(seed?.lat) != null ? 15.5 : 12,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      logoPosition: "bottom-left"
    });
    mapRef.current = map;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            try {
              map.resize();
            } catch {
              /* ignore */
            }
          })
        : null;
    if (resizeObserver && hostRef.current) resizeObserver.observe(hostRef.current);

    const markGesture = () => {
      if (programmaticRef.current > 0) return;
      gestureAtRef.current = performance.now();
      if (map.__vmapChase) map.__vmapChasePausedUntil = Date.now() + 8000;
      onGestureRef.current?.();
    };
    map.on("dragstart", markGesture);
    map.on("zoomstart", markGesture);
    map.on("rotatestart", markGesture);
    map.on("pitchstart", markGesture);

    const followTimer = window.setInterval(() => {
      const live = mapRef.current;
      const target = followTargetRef.current;
      if (!live || !guideFollowRef.current || !target) return;
      if (previewTargetRef.current) return;
      if (live.__vmapChasePausedUntil && Date.now() < live.__vmapChasePausedUntil) return;
      applyChaseCamera(live, target, { force: false });
    }, 480);

    map.on("load", () => {
      if (cancelled) return;
      if (!map.getSource("vmap-route")) {
        map.addSource("vmap-route", { type: "geojson", data: emptyRouteCollection() });
        map.addLayer({
          id: "vmap-route-halo",
          type: "line",
          source: "vmap-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ffffff", "line-width": 12, "line-opacity": 0.9 }
        });
        map.addLayer({
          id: "vmap-route-core",
          type: "line",
          source: "vmap-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": ACCENT,
            "line-width": ["case", ["==", ["get", "own"], 1], 7, 5],
            "line-opacity": 1
          }
        });
      }
      const pending = pendingNavRef.current;
      if (pending) applyChaseCamera(map, pending, { force: true });
      setMapEpoch((n) => n + 1);
      onReadyRef.current?.();
    });
    map.on("error", (event) => {
      const message = event?.error?.message || "Mapbox 지도를 불러오지 못했습니다.";
      onErrorRef.current?.(new Error(message));
    });

    return () => {
      cancelled = true;
      window.clearInterval(followTimer);
      try {
        resizeObserver?.disconnect();
      } catch {
        /* ignore */
      }
      overlaysRef.current.people.forEach((entry) => {
        try {
          entry.marker.remove();
        } catch {
          /* ignore */
        }
      });
      overlaysRef.current.people.clear();
      try {
        overlaysRef.current.pin?.marker?.remove();
      } catch {
        /* ignore */
      }
      overlaysRef.current.pin = null;
      try {
        map.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!previewTarget?.lat || !map) return;
    programmaticRef.current += 1;
    map.__vmapChasePausedUntil = Date.now() + 86400000;
    map.easeTo({
      center: [previewTarget.lng, previewTarget.lat],
      zoom: Number.isFinite(previewTarget.zoom) ? previewTarget.zoom : 17,
      bearing: 0,
      pitch: 0,
      duration: 420
    });
    const t = window.setTimeout(() => {
      programmaticRef.current = Math.max(0, programmaticRef.current - 1);
    }, 500);
    return () => {
      window.clearTimeout(t);
      if (mapRef.current) mapRef.current.__vmapChasePausedUntil = 0;
    };
  }, [previewTarget?.lat, previewTarget?.lng, previewTarget?.at, previewTarget?.zoom]);

  useEffect(() => {
    if (!flyTo?.lat || !mapRef.current) return;
    if (previewTargetRef.current) return;
    if (mapRef.current.__vmapChase) return;
    mapRef.current.easeTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: Number.isFinite(flyTo.zoom) ? flyTo.zoom : mapRef.current.getZoom(),
      duration: 280
    });
  }, [flyTo?.lat, flyTo?.lng, flyTo?.at, flyTo?.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active || mapEpoch < 1) return;
    const mineId = getLocalVlueUserId();
    const selfPhoto = readProfilePhotoAvatar();
    const visiblePeople = buildVisiblePeople({ members, self, mode, departed, mineId, selfPhoto });
    peopleRef.current = visiblePeople;
    const keep = new Set();

    visiblePeople.forEach((member) => {
      const id = String(member.userId || member.displayName);
      keep.add(id);
      const dead =
        mode === "family" &&
        (member.grayscale || member.online === false || member.batteryPct === 0 || member.lastKnownLocation);
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
      const html = personHtml(
        member.displayName || "멤버",
        status,
        mine && selfPhoto ? selfPhoto : member.photoUrl,
        !dead,
        userHasVerifiedBadge(member) || (mine && userHasVerifiedBadge(self))
      );
      let entry = overlaysRef.current.people.get(id);
      if (!entry) {
        const el = document.createElement("div");
        el.innerHTML = html;
        el.addEventListener("click", () => {
          const latest = peopleRef.current.find((row) => String(row.userId || row.displayName) === id);
          onSelectRef.current?.(latest || member);
        });
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([member.lng, member.lat])
          .addTo(map);
        entry = { marker, el, html, lat: member.lat, lng: member.lng };
        overlaysRef.current.people.set(id, entry);
      } else {
        if (entry.html !== html) {
          entry.el.innerHTML = html;
          entry.html = html;
        }
        const moved =
          entry.lat == null ||
          entry.lng == null ||
          haversineMeters(entry.lat, entry.lng, member.lat, member.lng) >= 2.5;
        if (moved) {
          entry.marker.setLngLat([member.lng, member.lat]);
          entry.lat = member.lat;
          entry.lng = member.lng;
        }
      }
      if (mine && !guideFollow && !previewTarget && performance.now() - gestureAtRef.current > 1400) {
        const cur = map.getCenter();
        if (haversineMeters(cur.lat, cur.lng, member.lat, member.lng) > 35) {
          programmaticRef.current += 1;
          map.easeTo({ center: [member.lng, member.lat], duration: 400 });
          window.setTimeout(() => {
            programmaticRef.current = Math.max(0, programmaticRef.current - 1);
          }, 120);
        }
      }
      if (mine && guideFollow) {
        const locked = pendingNavRef.current;
        const destLat = mode === "family" ? toLatLngNum(destPin?.lat) : room?.placeReady ? room.placeLat : null;
        const destLng = mode === "family" ? toLatLngNum(destPin?.lng) : room?.placeReady ? room.placeLng : null;
        const lockedHeading = locked?.heading;
        followTargetRef.current = {
          lat: Number.isFinite(locked?.lat) ? locked.lat : member.lat,
          lng: Number.isFinite(locked?.lng) ? locked.lng : member.lng,
          zoom: Number.isFinite(locked?.zoom) ? locked.zoom : CHASE_ZOOM,
          tilt: Number.isFinite(locked?.tilt) ? locked.tilt : CHASE_TILT,
          arrived: Boolean(locked?.arrived || member.arrived),
          lookAheadM: Number.isFinite(locked?.lookAheadM) ? locked.lookAheadM : member.arrived ? 0 : undefined,
          overlayBottomPx: Number.isFinite(locked?.overlayBottomPx) ? locked.overlayBottomPx : CHASE_COMPOSER_INSET_PX,
          anchor: locked?.anchor || (member.arrived ? "center" : undefined),
          heading: Number.isFinite(lockedHeading)
            ? lockedHeading
            : destLat != null && destLng != null
              ? bearingDegrees(member.lat, member.lng, destLat, destLng)
              : map.getBearing()
        };
      }
    });

    overlaysRef.current.people.forEach((entry, id) => {
      if (keep.has(id)) return;
      entry.marker.remove();
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
      const ready = mode === "family" ? true : Boolean(room?.placeReady && draftPin?.ready !== false);
      const html = pinHtml(ready);
      if (!overlaysRef.current.pin) {
        const el = document.createElement("div");
        el.innerHTML = html;
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([pinSource.lng, pinSource.lat])
          .addTo(map);
        overlaysRef.current.pin = { marker, el, html, lat: pinSource.lat, lng: pinSource.lng };
      } else {
        const pin = overlaysRef.current.pin;
        if (pin.html !== html) {
          pin.el.innerHTML = html;
          pin.html = html;
        }
        if (pin.lat !== pinSource.lat || pin.lng !== pinSource.lng) {
          pin.marker.setLngLat([pinSource.lng, pinSource.lat]);
          pin.lat = pinSource.lat;
          pin.lng = pinSource.lng;
        }
      }
    } else if (overlaysRef.current.pin) {
      overlaysRef.current.pin.marker.remove();
      overlaysRef.current.pin = null;
    }

    const source = map.getSource("vmap-route");
    if (source) {
      const drawRoutes =
        (mode === "vmap" && room?.placeReady) || (mode === "family" && Object.keys(routes || {}).length > 0);
      source.setData(drawRoutes ? routesToGeojson(routes, mineId) : emptyRouteCollection());
    }

    if (!guideFollow) followTargetRef.current = null;
  }, [active, mapEpoch, members, self, room, draftPin, destPin, routes, mode, departed, guideFollow, pinEditable, previewTarget]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" />;
});

export default VmapMapboxSurface;
