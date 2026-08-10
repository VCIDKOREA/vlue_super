/** 주소록 초성 인덱스 — ㄱ~ㅎ 다음 EN (영문) */
export const CONTACT_CHOSUNG_INDEX = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
  "EN"
];

const CHOSUNG_RAW = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ"
];

const DOUBLE_TO_SINGLE = {
  ㄲ: "ㄱ",
  ㄸ: "ㄷ",
  ㅃ: "ㅂ",
  ㅆ: "ㅅ",
  ㅉ: "ㅈ"
};

function normalizeCho(ch) {
  return DOUBLE_TO_SINGLE[ch] || ch;
}

/** 표시용 이름에서 초성 버킷 (ㄱ~ㅎ | EN | #) */
export function contactNameBucket(name) {
  const raw = String(name || "").trim();
  if (!raw) return "#";
  /* "ㄱ.이름" 형태면 초성 접두 사용 */
  const prefixed = raw.match(/^([ㄱ-ㅎ])\./);
  if (prefixed) return normalizeCho(prefixed[1]);

  let ch = raw[0];
  /* 앞의 기호·공백 스킵 */
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (/[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/.test(c)) {
      ch = c;
      break;
    }
  }

  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const cho = Math.floor((code - 0xac00) / (21 * 28));
    return normalizeCho(CHOSUNG_RAW[cho] || "#");
  }
  if (code >= 0x3131 && code <= 0x314e) {
    return normalizeCho(ch);
  }
  if (/[A-Za-z]/.test(ch)) return "EN";
  return "#";
}

export function contactBucketRank(bucket) {
  const i = CONTACT_CHOSUNG_INDEX.indexOf(bucket);
  if (i >= 0) return i;
  return CONTACT_CHOSUNG_INDEX.length; /* # 등 맨 뒤 */
}

export function compareContactNames(aName, bName) {
  const aB = contactNameBucket(aName);
  const bB = contactNameBucket(bName);
  const d = contactBucketRank(aB) - contactBucketRank(bB);
  if (d !== 0) return d;
  return String(aName || "").localeCompare(String(bName || ""), "ko");
}
