/**
 * 종이 명함 OCR 텍스트 → 연락처 필드 휴리스틱 파서
 * @param {string} ocrText
 * @returns {{
 *   name: string,
 *   organization: string,
 *   title: string,
 *   phone: string,
 *   fax: string,
 *   email: string,
 *   website: string,
 *   address: string,
 *   rawText: string
 * }}
 */
export function parseBizcardFromText(ocrText) {
  const rawText = String(ocrText || "");
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const urlRe = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/\S*)?/i;
  const phoneRe =
    /(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|(?:\+?82[-\s]?)?0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/;
  const faxLabelRe = /(?:팩스|fax|F\.?\s*A\.?\s*X)/i;
  const phoneLabelRe = /(?:휴대|모바일|mobile|cell|전화|tel|T\.|phone)/i;
  const addrLabelRe = /(?:주소|addr|address)/i;

  let email = "";
  let website = "";
  let phone = "";
  let fax = "";
  let address = "";
  let organization = "";
  let title = "";
  let name = "";

  const used = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const em = line.match(emailRe);
    if (em && !email) {
      email = em[0];
      used.add(i);
      continue;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const line = lines[i];
    if (email && line.includes(email)) {
      used.add(i);
      continue;
    }
    const url = line.match(urlRe);
    if (url && !website && !line.includes("@")) {
      let u = url[0];
      if (!/^https?:\/\//i.test(u)) u = u.replace(/^www\./i, "");
      website = u;
      used.add(i);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const line = lines[i];
    const phones = line.match(
      /(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|(?:\+?82[-\s]?)?0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g
    );
    if (!phones?.length) continue;
    if (faxLabelRe.test(line) && !fax) {
      fax = normalizePhone(phones[0]);
      used.add(i);
      continue;
    }
    if (phoneLabelRe.test(line) && !phone) {
      phone = normalizePhone(phones[0]);
      if (phones[1] && !fax) fax = normalizePhone(phones[1]);
      used.add(i);
      continue;
    }
    for (const p of phones) {
      const n = normalizePhone(p);
      if (isMobilePhone(n) && !phone) {
        phone = n;
        used.add(i);
      } else if (!isMobilePhone(n) && !fax && faxLabelRe.test(line)) {
        fax = n;
        used.add(i);
      } else if (!isMobilePhone(n) && !phone) {
        phone = n;
        used.add(i);
      } else if (!isMobilePhone(n) && phone && !fax) {
        fax = n;
        used.add(i);
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const line = lines[i];
    if (addrLabelRe.test(line) || looksLikeAddress(line)) {
      const cleaned = line.replace(addrLabelRe, "").replace(/^[:\s]+/, "").trim() || line;
      address = address ? `${address} ${cleaned}` : cleaned;
      used.add(i);
      /* 다음 줄이 주소 연속이면 병합 */
      if (i + 1 < lines.length && !used.has(i + 1) && looksLikeAddressContinuation(lines[i + 1])) {
        address = `${address} ${lines[i + 1]}`;
        used.add(i + 1);
      }
    }
  }

  const leftover = lines.filter((_, i) => !used.has(i));
  const nameCandidates = leftover.filter((l) => looksLikePersonName(l));
  const orgCandidates = leftover.filter((l) => looksLikeOrganization(l) && !looksLikePersonName(l));
  const titleCandidates = leftover.filter((l) => looksLikeTitle(l));

  name = nameCandidates[0] || "";
  organization = orgCandidates[0] || "";
  title = titleCandidates[0] || "";

  if (!name && leftover.length) {
    const short = leftover.find((l) => l.length >= 2 && l.length <= 12 && !phoneRe.test(l));
    if (short) name = short;
  }
  if (!organization && leftover.length >= 2) {
    const longish = leftover.find((l) => l !== name && l.length >= 2 && (l.includes(" ") || l.length >= 4));
    if (longish) organization = longish;
  }

  return {
    name: name.trim(),
    organization: organization.trim(),
    title: title.trim(),
    phone: phone.trim(),
    fax: fax.trim(),
    email: email.trim(),
    website: website.trim(),
    address: address.trim(),
    rawText
  };
}

function normalizePhone(raw) {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+82")) {
    return `0${d.slice(3)}`.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  }
  if (d.startsWith("82") && d.length >= 10) {
    return `0${d.slice(2)}`.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  }
  const digits = d.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (digits.length === 10) return digits.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  if (digits.length === 9) return digits.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3");
  return digits;
}

function isMobilePhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  return /^01[016789]/.test(d);
}

function looksLikeAddress(line) {
  return (
    /(?:시|군|구|로|길|동|읍|면|리)\s*\d*/.test(line) ||
    /\d{1,4}(?:번지|호)/.test(line) ||
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/.test(line)
  );
}

function looksLikeAddressContinuation(line) {
  return looksLikeAddress(line) || /^\d/.test(line) || /호$|층$|빌딩|타워/.test(line);
}

function looksLikePersonName(line) {
  const s = String(line || "").trim();
  if (s.length < 2 || s.length > 8) return false;
  if (/[0-9@.]/.test(s)) return false;
  if (/주식회사|유한회사|Inc|Ltd|Co\.|Corp|그룹|병원|의원|학원|카페|커피/i.test(s)) return false;
  if (/대표|이사|과장|부장|팀장|매니저|CEO|CTO|원장|실장|주임|사원/i.test(s)) return false;
  return /^[가-힣]{2,4}$/.test(s) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(s);
}

function looksLikeOrganization(line) {
  const s = String(line || "").trim();
  if (s.length < 2 || s.length > 40) return false;
  if (/[0-9]{3,}/.test(s) || s.includes("@")) return false;
  return (
    /(?:주식회사|유한회사|\(주\)|Inc|Ltd|Co\.|Corp|그룹|병원|의원|학원|스튜디오|랩|센터|카페)/i.test(s) ||
    (s.length >= 4 && !looksLikePersonName(s) && !looksLikeTitle(s))
  );
}

function looksLikeTitle(line) {
  return /(?:대표|이사|과장|부장|팀장|매니저|CEO|CTO|CFO|원장|실장|주임|사원|디자이너|엔지니어|변호사|회계사)/i.test(
    String(line || "")
  );
}
