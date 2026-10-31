import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { fetchGoogleMapsApiKey, loadGoogleMaps } from "../../lib/googleMapLoader.js";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { userHasVerifiedBadge, verifiedSealSvgHtml } from "../UserBadgeLabel.jsx";

const ACCENT = "#00D2FF";

function toLatLngNum(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isOverseasMember(member) {
  return Boolean(member?.isOverseas ?? member?.is_overseas);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAvatarElement(g, member) {
  const name = member.displayName || "가족";
  const initial = String(name).trim().slice(0, 1) || "?";
  const photo = String(member.photoUrl || "").trim();
  const verified = userHasVerifiedBadge(member);
  const place = [member.cityName || member.city_name, member.countryName || member.country_name]
    .filter(Boolean)
    .join(", ");
  const badge = verified ? verifiedSealSvgHtml(12) : "";
  const statusHtml = place ? ` · ${escapeHtml(place)}` : "";
  const face = photo
    ? `<img src="${escapeHtml(photo)}" alt="" draggable="false" style="width:42px;height:42px;object-fit:cover;border-radius:999px;display:block" />`
    : `<div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:#083044;color:#fff;font-weight:700;font-size:16px;border-radius:999px">${escapeHtml(initial)}</div>`;
  const root = document.createElement("div");
  root.style.cssText =
    "display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;pointer-events:auto";
  root.innerHTML = `
    <div style="width:48px;height:48px;border-radius:999px;padding:3px;background:${ACCENT};box-shadow:0 0 0 2px #fff,0 8px 20px rgba(0,210,255,0.35);box-sizing:border-box">
      <div style="width:100%;height:100%;border-radius:999px;overflow:hidden;background:#fff">${face}</div>
    </div>
    <div style="margin-top:3px;padding:2px 8px;border-radius:999px;background:rgba(4,18,26,0.92);border:1px solid rgba(0,210,255,0.55);color:#fff;font-size:11px;font-weight:700;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;display:inline-flex;align-items:center;gap:2px">${escapeHtml(name)}${badge}${statusHtml}</div>
  `;
  return root;
}

/**
 * 해외 구성원 전용 Google Maps 표면.
 * 가족위치확인에서만 쓰이며, 국내 복귀 시 언마운트된다.
 */
const VmapGoogleSurface = forwardRef(function VmapGoogleSurface(
  {
    active,
    members = [],
    self = null,
    flyTo = null,
    guideFollow = false,
    navCamera = null,
    onSelectMember,
    onReady,
    onError
  },
  ref
) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const mapsApiRef = useRef(null);
  const overlaysRef = useRef(new Map());
  const OverlayClassRef = useRef(null);
  const onSelectRef = useRef(onSelectMember);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const selfRef = useRef(self);
  const flyToRef = useRef(flyTo);
  const mapReadyRef = useRef(false);
  const guideFollowRef = useRef(guideFollow);

  onSelectRef.current = onSelectMember;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  selfRef.current = self;
  flyToRef.current = flyTo;
  guideFollowRef.current = guideFollow;

  const applyFlyTo = (target) => {
    const map = mapRef.current;
    if (!map || !target?.lat || !target?.lng) return;
    map.panTo({ lat: Number(target.lat), lng: Number(target.lng) });
    const z = Number.isFinite(target.zoom) ? target.zoom : map.getZoom() || 11;
    if ((map.getZoom() || 0) < 10 || Number.isFinite(target.zoom)) map.setZoom(Math.max(z, 11));
  };

  useImperativeHandle(ref, () => ({
    zoomBy(delta) {
      const map = mapRef.current;
      if (!map) return;
      map.setZoom(Math.max(2, Math.min(20, (map.getZoom() || 12) + delta)));
    },
    panTo(lat, lng, zoom) {
      const map = mapRef.current;
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      map.panTo({ lat, lng });
      if (Number.isFinite(zoom)) map.setZoom(zoom);
    },
    setNavCamera({ lat, lng, heading, tilt, zoom } = {}) {
      const map = mapRef.current;
      if (!map) return;
      if (Number.isFinite(lat) && Number.isFinite(lng)) map.panTo({ lat, lng });
      if (Number.isFinite(heading) && typeof map.setHeading === "function") map.setHeading(heading);
      if (Number.isFinite(tilt) && typeof map.setTilt === "function") map.setTilt(tilt);
      if (Number.isFinite(zoom)) map.setZoom(zoom);
    },
    resetNavCamera() {
      const map = mapRef.current;
      if (!map) return;
      try {
        if (typeof map.setHeading === "function") map.setHeading(0);
        if (typeof map.setTilt === "function") map.setTilt(0);
      } catch {
        /* ignore */
      }
    },
    fitBounds(points = []) {
      const map = mapRef.current;
      const g = mapsApiRef.current;
      if (!map || !g || !points.length) return;
      const bounds = new g.LatLngBounds();
      points.forEach((p) => {
        if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) bounds.extend({ lat: p.lat, lng: p.lng });
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 64);
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

    (async () => {
      try {
        const key = await fetchGoogleMapsApiKey();
        if (!key) throw new Error("GOOGLE_MAPS_API_KEY가 없습니다.");
        const maps = await loadGoogleMaps(key);
        if (cancelled || !hostRef.current) return;
        mapsApiRef.current = maps;

        class AvatarOverlay extends maps.OverlayView {
          constructor(position, member, onClick) {
            super();
            this.position = position;
            this.member = member;
            this.onClick = onClick;
            this.div = null;
          }
          onAdd() {
            this.div = buildAvatarElement(maps, this.member);
            this.div.addEventListener("click", (event) => {
              event.stopPropagation();
              this.onClick?.(this.member);
            });
            const panes = this.getPanes();
            panes?.overlayMouseTarget?.appendChild(this.div);
          }
          draw() {
            if (!this.div) return;
            const projection = this.getProjection();
            if (!projection) return;
            const point = projection.fromLatLngToDivPixel(this.position);
            if (!point) return;
            this.div.style.left = `${point.x}px`;
            this.div.style.top = `${point.y}px`;
            this.div.style.position = "absolute";
          }
          onRemove() {
            this.div?.parentNode?.removeChild(this.div);
            this.div = null;
          }
          setMember(member) {
            this.member = member;
            if (!this.div) return;
            const next = buildAvatarElement(maps, member);
            this.div.innerHTML = next.innerHTML;
          }
          setPosition(latLng) {
            this.position = latLng;
            this.draw();
          }
        }
        OverlayClassRef.current = AvatarOverlay;

        const seed = selfRef.current;
        const seedLat = toLatLngNum(seed?.lat);
        const seedLng = toLatLngNum(seed?.lng);
        const map = new maps.Map(hostRef.current, {
          center:
            seedLat != null && seedLng != null
              ? { lat: seedLat, lng: seedLng }
              : { lat: 37.5665, lng: 126.978 },
          zoom: seedLat != null ? 11 : 3,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          heading: 0,
          tilt: 0
        });
        mapRef.current = map;
        mapReadyRef.current = true;
        const pending = flyToRef.current;
        if (pending?.lat != null && pending?.lng != null) applyFlyTo(pending);
        onReadyRef.current?.();
      } catch (error) {
        if (!cancelled) onErrorRef.current?.(error);
      }
    })();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      overlaysRef.current.forEach((overlay) => {
        try {
          overlay.setMap(null);
        } catch {
          /* ignore */
        }
      });
      overlaysRef.current.clear();
      mapRef.current = null;
      mapsApiRef.current = null;
      OverlayClassRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    const g = mapsApiRef.current;
    const OverlayClass = OverlayClassRef.current;
    if (!active || !map || !g || !OverlayClass) return;

    const mineId = getLocalVlueUserId();
    const selfPhoto = readProfilePhotoAvatar() || "";
    const byId = new Map();
    for (const member of members || []) {
      if (!isOverseasMember(member)) continue;
      const lat = toLatLngNum(member.lat);
      const lng = toLatLngNum(member.lng);
      if (lat == null || lng == null) continue;
      byId.set(String(member.userId), { ...member, lat, lng });
    }
    const selfLat = toLatLngNum(self?.lat);
    const selfLng = toLatLngNum(self?.lng);
    if (selfLat != null && selfLng != null && isOverseasMember(self)) {
      const id = String(mineId || "__local_self__");
      byId.set(id, {
        ...(byId.get(id) || {}),
        userId: id,
        self: true,
        displayName: self.displayName || "나",
        photoUrl: selfPhoto,
        lat: selfLat,
        lng: selfLng,
        isOverseas: true,
        countryName: self.countryName || self.country_name,
        cityName: self.cityName || self.city_name
      });
    }

    const keep = new Set();
    for (const member of byId.values()) {
      const id = String(member.userId);
      keep.add(id);
      const latLng = new g.LatLng(member.lat, member.lng);
      let overlay = overlaysRef.current.get(id);
      if (!overlay) {
        overlay = new OverlayClass(latLng, member, (m) => onSelectRef.current?.(m));
        overlay.setMap(map);
        overlaysRef.current.set(id, overlay);
      } else {
        overlay.setMember(member);
        overlay.setPosition(latLng);
      }
    }
    overlaysRef.current.forEach((overlay, id) => {
      if (keep.has(id)) return;
      overlay.setMap(null);
      overlaysRef.current.delete(id);
    });
  }, [active, members, self]);

  useEffect(() => {
    if (!active || !flyTo?.lat || !flyTo?.lng) return;
    if (!mapReadyRef.current || !mapRef.current) {
      flyToRef.current = flyTo;
      return;
    }
    applyFlyTo(flyTo);
  }, [active, flyTo?.lat, flyTo?.lng, flyTo?.at, flyTo?.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!active || !map || !navCamera) return;
    if (!guideFollow) return;
    if (Number.isFinite(navCamera.lat) && Number.isFinite(navCamera.lng)) {
      map.panTo({ lat: navCamera.lat, lng: navCamera.lng });
    }
    if (Number.isFinite(navCamera.heading) && typeof map.setHeading === "function") {
      map.setHeading(navCamera.heading);
    }
    if (Number.isFinite(navCamera.tilt) && typeof map.setTilt === "function") {
      map.setTilt(navCamera.tilt);
    }
    if (Number.isFinite(navCamera.zoom)) map.setZoom(navCamera.zoom);
  }, [active, guideFollow, navCamera?.lat, navCamera?.lng, navCamera?.heading, navCamera?.tilt, navCamera?.zoom, navCamera?.at]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" />;
});

export default VmapGoogleSurface;
