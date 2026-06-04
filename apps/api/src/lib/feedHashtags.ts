/** 본문에서 #태그 추출 — 공백·# 구분, 소문자 NFC 정규화 */

export function normalizeFeedTag(raw: string): string {
  const t = raw.replace(/^#+/, "").trim().normalize("NFC").toLowerCase();
  return t.slice(0, 120);
}

export function extractHashtagsFromBody(body: string): string[] {
  const text = String(body || "");
  const re = /#([^\s#]+)/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const norm = normalizeFeedTag(m[1]);
    if (norm.length > 0) out.add(norm);
  }
  return [...out];
}
