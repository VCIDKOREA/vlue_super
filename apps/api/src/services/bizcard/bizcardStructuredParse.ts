export type BizcardFields = {
  name: string | null;
  company: string | null;
  department: string | null;
  position: string | null;
  mobile: string | null;
  tel: string | null;
  fax: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
};

const EMPTY: BizcardFields = {
  name: null,
  company: null,
  department: null,
  position: null,
  mobile: null,
  tel: null,
  fax: null,
  email: null,
  address: null,
  website: null
};

const SYSTEM_PROMPT = [
  "너는 종이 명함 OCR/이미지에서 연락처만 추출하는 구조화 파서다.",
  "명함마다 레이아웃과 디자인이 달라도 문맥으로 필드를 구분한다.",
  "T. Tel. 전화 대표번호는 유선(tel), M. Mobile C.P H.P 휴대는 휴대폰(mobile), F. Fax 팩스는 fax다.",
  "국문과 영문이 같이 있으면 사람 이름은 한글을 우선하고, 회사명·직책은 명함에 적힌 표기를 유지한다.",
  "오탈자와 잘못된 띄어쓰기는 문맥으로 고친다. 이름 공백은 한글 인명에서 제거한다.",
  "회사명에는 (주), 주식회사, 유한회사 표기를 지우지 않는다.",
  "주소에서 우편번호는 빼되 도로명·지번·건물명은 남긴다.",
  "없는 값은 null이다. 추측으로 번호를 만들지 않는다.",
  "설명, 마크다운, 코드펜스 없이 지정된 JSON 객체만 반환한다."
].join("\n");

function digits(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

export function formatKrPhone(raw: string | null | undefined): string | null {
  let d = digits(String(raw || ""));
  if (!d) return null;
  if (d.startsWith("82") && d.length >= 10) d = `0${d.slice(2)}`;
  if (/^1[568]\d{6}$/.test(d)) return d.replace(/(\d{4})(\d{4})/, "$1-$2");
  if (d.startsWith("02")) {
    if (d.length === 9) return d.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3");
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
  }
  if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (d.length === 10) return d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  if (d.length === 8) return d.replace(/(\d{4})(\d{4})/, "$1-$2");
  return null;
}

function cleanText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).replace(/\s+/g, " ").trim();
  if (!s || /^null$/i.test(s) || s === "-") return null;
  return s;
}

function cleanName(value: unknown): string | null {
  const s = cleanText(value);
  if (!s) return null;
  if (/[가-힣]/.test(s) && !/[A-Za-z]/.test(s)) return s.replace(/\s/g, "");
  return s;
}

function cleanAddress(value: unknown): string | null {
  const s = cleanText(value);
  if (!s) return null;
  return s.replace(/^\d{5}\s*/, "").replace(/우편번호\s*\d{5}/, "").trim() || null;
}

function cleanEmail(value: unknown): string | null {
  const s = cleanText(value)?.replace(/\s/g, "") || "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

function cleanWebsite(value: unknown): string | null {
  const s = cleanText(value)?.replace(/\s/g, "") || "";
  if (!s || s.includes("@")) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(s)) return s.replace(/^www\./i, "");
  return null;
}

export function normalizeBizcardFields(raw: Partial<BizcardFields> | null | undefined): BizcardFields {
  const src = raw || {};
  const mobile = formatKrPhone(src.mobile);
  let tel = formatKrPhone(src.tel);
  let fax = formatKrPhone(src.fax);
  if (mobile && tel === mobile) tel = null;
  if (fax && (fax === mobile || fax === tel)) fax = null;
  if (tel && /^01[016789]/.test(digits(tel)) && !mobile) {
    return {
      ...EMPTY,
      name: cleanName(src.name),
      company: cleanText(src.company),
      department: cleanText(src.department),
      position: cleanText(src.position),
      mobile: tel,
      tel: null,
      fax,
      email: cleanEmail(src.email),
      address: cleanAddress(src.address),
      website: cleanWebsite(src.website)
    };
  }
  return {
    name: cleanName(src.name),
    company: cleanText(src.company),
    department: cleanText(src.department),
    position: cleanText(src.position),
    mobile: mobile && /^01[016789]/.test(digits(mobile)) ? mobile : null,
    tel,
    fax,
    email: cleanEmail(src.email),
    address: cleanAddress(src.address),
    website: cleanWebsite(src.website)
  };
}

function extractJsonObject(raw: string): Partial<BizcardFields> | null {
  const text = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Partial<BizcardFields>;
  } catch {
    return null;
  }
}

export async function parseBizcardWithGemini(input: {
  text: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<{ fields: BizcardFields; provider: "gemini" } | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const schemaHint = JSON.stringify(EMPTY, null, 2);
  const parts: Array<Record<string, unknown>> = [
    {
      text: [
        "아래 명함 OCR 텍스트와 이미지가 있으면 이미지를 우선해 필드를 채워라.",
        "반드시 이 키만 가진 JSON 객체를 반환하라.",
        schemaHint,
        "",
        "OCR:",
        String(input.text || "").slice(0, 6000) || "(텍스트 없음)"
      ].join("\n")
    }
  ];
  const image = String(input.imageBase64 || "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (image && image.length < 1_800_000) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || "image/jpeg",
        data: image
      }
    });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(18000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
        responseMimeType: "application/json"
      }
    })
  });
  if (!res.ok) {
    console.warn("[bizcard] gemini http", res.status);
    return null;
  }
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = extractJsonObject(raw);
  if (!parsed) return null;
  return { fields: normalizeBizcardFields(parsed), provider: "gemini" };
}
