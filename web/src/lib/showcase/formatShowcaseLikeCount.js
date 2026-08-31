/** 인스타그램형 좋아요 수 — 17.5만 / 4.9천 */
export function formatShowcaseLikeCountKo(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v >= 10000) {
    const man = v / 10000;
    const text = man >= 10 ? String(Math.round(man)) : String(Number(man.toFixed(1)));
    return `${text}만`;
  }
  if (v >= 1000) {
    const cheon = v / 1000;
    const text = cheon >= 10 ? String(Math.round(cheon)) : String(Number(cheon.toFixed(1)));
    return `${text}천`;
  }
  return String(v);
}
