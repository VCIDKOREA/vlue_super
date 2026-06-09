/**
 * POS 마감 빌지 OCR 텍스트 파서 (클라이언트·서버 동일 휴리스틱)
 * @param {string} ocrText
 */
export function parsePosBillFromText(ocrText) {
  const text = String(ocrText || "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const parseKrw = (raw) => {
    const n = String(raw || "").replace(/[^\d]/g, "");
    return Math.max(0, Math.floor(Number(n) || 0));
  };

  let saleDate = "";
  const dateMatch = text.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (dateMatch) {
    saleDate = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, "0")}-${String(dateMatch[3]).padStart(2, "0")}`;
  } else {
    saleDate = new Date().toISOString().slice(0, 10);
  }

  const pick = (patterns) => {
    for (const line of lines) {
      for (const re of patterns) {
        const m = line.match(re);
        if (m?.[1]) return parseKrw(m[1]);
      }
    }
    return 0;
  };

  const totalKrw = pick([
    /(?:총\s*매출|합\s*계|총\s*액|total)[^\d]*([\d,]+)/i,
    /(?:매출\s*합계)[^\d]*([\d,]+)/i
  ]);
  const cardKrw = pick([/(?:카드|신용|체크)[^\d]*([\d,]+)/i]);
  const cashKrw = pick([/(?:현금)[^\d]*([\d,]+)/i]);
  const vatKrw = pick([/(?:부가세|VAT)[^\d]*([\d,]+)/i]);

  return {
    saleDate,
    totalKrw: totalKrw || cardKrw + cashKrw,
    cardKrw,
    cashKrw,
    vatKrw,
    confidence: totalKrw > 0 ? "medium" : "low"
  };
}
