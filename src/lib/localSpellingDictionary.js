/**
 * Layer 1 — 로컬 맞춤법 딕셔너리 (비용 0원)
 */

/** @type {Array<{ pattern: RegExp, to: string, reason: string }>} */
const SPELLING_RULES = [
  { pattern: /안되요/g, to: "안 돼요", reason: "안 돼요 띄어쓰기" },
  { pattern: /안돼요/g, to: "안 돼요", reason: "안 돼요 띄어쓰기" },
  { pattern: /안되는/g, to: "안 되는", reason: "안 되는 띄어쓰기" },
  { pattern: /안되/g, to: "안 되", reason: "안 되 띄어쓰기" },
  { pattern: /됬/g, to: "됐", reason: "됐 표기" },
  { pattern: /되요/g, to: "돼요", reason: "돼요 표기" },
  { pattern: /되나요/g, to: "되나요", reason: "되나요 유지" },
  { pattern: /됫/g, to: "됐", reason: "됐 표기" },
  { pattern: /왠지/g, to: "웬지", reason: "웬지 표기" },
  { pattern: /어떻해/g, to: "어떻게", reason: "어떻게 표기" },
  { pattern: /왜이래/g, to: "왜 이래", reason: "띄어쓰기" },
  { pattern: /할께/g, to: "할게", reason: "할게 표기" },
  { pattern: /할께요/g, to: "할게요", reason: "할게요 표기" },
  { pattern: /갈께/g, to: "갈게", reason: "갈게 표기" },
  { pattern: /해줬/g, to: "해줬", reason: "유지" },
  { pattern: /해써/g, to: "했어", reason: "했어 표기" },
  { pattern: /했써/g, to: "했어", reason: "했어 표기" },
  { pattern: /않되/g, to: "안 되", reason: "안 되 표기" },
  { pattern: /않돼/g, to: "안 돼", reason: "안 돼 표기" },
  { pattern: /깨끗히/g, to: "깨끗이", reason: "깨끗이 표기" },
  { pattern: /빠릿히/g, to: "빠르게", reason: "빠르게 표기" },
  { pattern: /틀린것/g, to: "틀린 것", reason: "띄어쓰기" },
  { pattern: /맞는것/g, to: "맞는 것", reason: "띄어쓰기" },
  { pattern: /하는것/g, to: "하는 것", reason: "띄어쓰기" },
  { pattern: /할수/g, to: "할 수", reason: "할 수 띄어쓰기" },
  { pattern: /할수있/g, to: "할 수 있", reason: "할 수 있 띄어쓰기" },
  { pattern: /수있/g, to: "수 있", reason: "수 있 띄어쓰기" },
  { pattern: /것같/g, to: "것 같", reason: "것 같 띄어쓰기" },
  { pattern: /것같아/g, to: "것 같아", reason: "것 같아 띄어쓰기" },
  { pattern: /때문에/g, to: "때문에", reason: "유지" },
  { pattern: /어의없/g, to: "어이없", reason: "어이없 표기" },
  { pattern: /어의 없/g, to: "어이 없", reason: "어이 없 표기" },
  { pattern: /금새/g, to: "금세", reason: "금세 표기" },
  { pattern: /낳았/g, to: "낳았", reason: "유지" },
  { pattern: /나았/g, to: "나았", reason: "유지" }
];

const REMAINING_ERROR_MARKERS = [
  /안되/,
  /안돼/,
  /되요/,
  /됬/,
  /됫/,
  /왠지/,
  /어떻해/,
  /할께/,
  /할수/,
  /것같/,
  /깨끗히/,
  /빠릿히/,
  /어의없/
];

export function applyLocalSpellingDictionary(text) {
  const original = String(text || "");
  let out = original;
  const corrections = [];

  for (const rule of SPELLING_RULES) {
    const before = out;
    out = out.replace(rule.pattern, rule.to);
    if (before !== out) {
      corrections.push({ from: rule.pattern.source, to: rule.to, reason: rule.reason });
    }
  }

  const fullyResolved = !REMAINING_ERROR_MARKERS.some((re) => re.test(out));

  return {
    text: out,
    original,
    corrections,
    fullyResolved,
    source: "local-spelling"
  };
}
