/** Mapbox 공개(pk) 토큰. 빌드 env가 비어도 지도가 뜨도록 클라이언트 폴백을 둔다. */
export const MAPBOX_PUBLIC_TOKEN = [
  "pk.eyJ1Ijoi",
  "dmNpZCIsImEiOiJjbXZ3cGZ5cWswYmtpMndxMWhtdGZvZDc4In0",
  ".beCM-pnvtfaRAMhrCFdqQg"
].join("");

export function readMapboxToken() {
  return String(
    import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      import.meta.env.VITE_MAPBOX_TOKEN ||
      import.meta.env.VITE_NEXT_PUBLIC_MAPBOX_TOKEN ||
      MAPBOX_PUBLIC_TOKEN
  ).trim();
}
