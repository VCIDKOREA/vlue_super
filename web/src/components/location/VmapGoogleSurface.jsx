import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { fetchGoogleMapsApiKey, loadGoogleMaps } from "../../lib/googleMapLoader.js";
import { getLocalVlueUserId } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";

const ACCENT = "#00D2FF";

function toLatLngNum(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isOverseasMember(member) {
  return Boolean(member?.isOverseas ?? member?.is_overseas);
}

function personLabel(member) {
  const place = [member.cityName || member.city_name, member.countryName || member.country_name]
    .filter(Boolean)
    .join(", ");
  return place ? `${member.displayName || "가족"} · ${place}` : member.displayName || "가족";
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
    onSelectMember,
    onReady,
    onError
  },
  ref
) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const mapsApiRef = useRef(null);
  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelectMember);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const selfRef = useRef(self);

  onSelectRef.current = onSelectMember;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  selfRef.current = self;

  useImperativeHandle(ref, () => ({
    zoomBy(delta) {
      const map = mapRef.current;
      if (!map) return;
      map.setZoom(Math.max(2, Math.min(20, (map.getZoom() || 12) + delta)));
    },
    panTo(lat, lng, zoom) {
      const map = mapRef.current;
      const g = mapsApiRef.current;
      if (!map || !g || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      map.panTo({ lat, lng });
      if (Number.isFinite(zoom)) map.setZoom(zoom);
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
          clickableIcons: false
        });
        mapRef.current = map;
        onReadyRef.current?.();
      } catch (error) {
        if (!cancelled) onErrorRef.current?.(error);
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => {
        try {
          marker.setMap(null);
        } catch {
          /* ignore */
        }
      });
      markersRef.current.clear();
      mapRef.current = null;
      mapsApiRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    const g = mapsApiRef.current;
    if (!active || !map || !g) return;

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
      let marker = markersRef.current.get(id);
      const title = personLabel(member);
      if (!marker) {
        marker = new g.Marker({
          map,
          position: { lat: member.lat, lng: member.lng },
          title,
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: ACCENT,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3
          }
        });
        marker.addListener("click", () => onSelectRef.current?.(member));
        markersRef.current.set(id, marker);
      } else {
        marker.setPosition({ lat: member.lat, lng: member.lng });
        marker.setTitle(title);
        marker.setMap(map);
      }
    }
    markersRef.current.forEach((marker, id) => {
      if (keep.has(id)) return;
      marker.setMap(null);
      markersRef.current.delete(id);
    });
  }, [active, members, self]);

  useEffect(() => {
    if (!active || !flyTo?.lat || !flyTo?.lng) return;
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    if ((map.getZoom() || 0) < 10) map.setZoom(11);
  }, [active, flyTo?.lat, flyTo?.lng, flyTo?.at]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" />;
});

export default VmapGoogleSurface;
