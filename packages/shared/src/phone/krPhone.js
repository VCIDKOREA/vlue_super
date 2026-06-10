/** 숫자만 E.164 스타일로 (KR 기본 82) — 웹·API 공통 */
export function normalizeKrPhone(phone) {
    if (!phone)
        return undefined;
    const d = phone.replace(/\D/g, "");
    if (d.length < 10)
        return undefined;
    if (d.startsWith("82"))
        return `+${d}`;
    if (d.startsWith("0"))
        return `+82${d.slice(1)}`;
    return `+${d}`;
}
