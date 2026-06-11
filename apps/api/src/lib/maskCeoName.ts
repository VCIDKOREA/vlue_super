/** 대표자명 보안 마스킹 — 예: 박지숙 → 박** */
export function maskCeoName(raw: string): string {
  const name = String(raw || "").trim();
  if (!name || name === "미확인") return name;

  const first = [...name][0];
  if (!first) return "미확인";
  return `${first}**`;
}
