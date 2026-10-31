/** Mapbox 공개 토큰. Vite는 NEXT_PUBLIC_ / VITE_ 둘 다 받는다. */
export function readMapboxToken() {
  return String(
    import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      import.meta.env.VITE_MAPBOX_TOKEN ||
      import.meta.env.VITE_NEXT_PUBLIC_MAPBOX_TOKEN ||
      ""
  ).trim();
}
