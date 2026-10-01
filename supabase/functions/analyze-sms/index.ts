import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type AnalysisStatus = "SAFE" | "SUSPICIOUS" | "DANGER";

type SmsAnalysis = {
  status: AnalysisStatus;
  dangerScore: number;
  unshortenedUrl: string | null;
  summary: string;
  actionGuide: string;
  senderBadge?: string;
  senderBand?: string;
  senderReason?: string;
};

type SenderContext = {
  ok?: boolean;
  band?: string;
  bandLabel?: string;
  badge?: string;
  escalate?: AnalysisStatus;
  dangerFloor?: number;
  reason?: string;
  impersonation?: boolean;
  smishingUrl?: boolean;
  lookups?: {
    reports?: { total?: number; phishing?: number; reasons?: string[] };
    directory?: { status?: string; name?: string };
    kakao?: { status?: string; name?: string };
    naver?: { status?: string; name?: string };
    publicData?: { status?: string; name?: string };
  };
};

type Body = {
  sender?: string;
  messageText?: string;
  address?: string;
};

type FollowResult = {
  finalUrl: string | null;
  note: string;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const URL_FOLLOW_MS = 2500;
const FILE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "zip", "mp4", "doc", "docx", "html", "htm"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function clipSummary(text: string, max = 400) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return [...clean].slice(0, max).join("");
}

function stripUrlTail(raw: string) {
  return raw.replace(/[),.;!?。]+$/g, "");
}

function parsePublicHttpUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase().replace(/\.+$/, "").replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (isPrivateAddress(host)) return null;
  return parsed;
}

function isPrivateAddress(host: string) {
  if (host === "::1" || host === "0.0.0.0") return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const n = v4.slice(1).map((x) => Number(x));
    if (n.some((x) => x > 255)) return true;
    const [a, b] = n;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  const lower = host.toLowerCase();
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower === "::") return true;
  return false;
}

const DOMAIN_RE = /\b((?:[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?\.)+[a-z]{2,24})\b/gi;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractBareDomains(text: string, urls: string[]) {
  const hosts = new Set(urls.map(hostOf).filter(Boolean));
  const out: string[] = [];
  for (const match of text.match(DOMAIN_RE) || []) {
    const host = match.toLowerCase();
    const tld = host.split(".").pop() || "";
    if (FILE_EXT.has(tld)) continue;
    if (hosts.has(host) || hosts.has(host.replace(/^www\./, ""))) continue;
    if (!out.includes(host)) out.push(host);
    if (out.length >= 3) break;
  }
  return out;
}

function isOfficialHost(host: string) {
  const h = host.toLowerCase().replace(/^www\./, "");
  return h.endsWith(".go.kr") ||
    h.endsWith(".or.kr") ||
    h.endsWith(".korea.kr") ||
    h === "go.kr" ||
    h === "epost.kr" ||
    h.endsWith(".epost.kr") ||
    h.endsWith(".gov") ||
    h.endsWith(".bank") ||
    h.endsWith(".kftc.or.kr");
}

function isAuthMessage(text: string) {
  return /인증번호|인증코드|본인확인|verification code|일회용/i.test(text) && /\d{4,8}/.test(text);
}

function impersonationHint(text: string) {
  return /우체국|경찰청|경찰|국민건강|건강보험|택배|배송조회|청첩장|과태료|법원|국세청|검찰|관세청|모바일\s*청첩/i.test(text);
}

function gamblingHint(text: string) {
  return /도박|카지노|슬롯|바카라|리베이트|토토|배팅|환전|대박캐시백|wego\s*88|wego88/i.test(text);
}

function extractUrls(text: string) {
  const found = text.match(URL_RE) || [];
  const out: string[] = [];
  for (const raw of found) {
    const cleaned = stripUrlTail(raw);
    if (!parsePublicHttpUrl(cleaned)) continue;
    if (!out.includes(cleaned)) out.push(cleaned);
    if (out.length >= 3) break;
  }
  return out;
}

/** 단축 URL 최종 주소. 실패·타임아웃이어도 예외를 던지지 않는다. */
async function followRedirect(start: string): Promise<FollowResult> {
  if (!parsePublicHttpUrl(start)) {
    return { finalUrl: null, note: "URL 접속 불가/응답 없음" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URL_FOLLOW_MS);
  try {
    const res = await fetch(start, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal
    });
    await res.body?.cancel().catch(() => undefined);
    const finalUrl = res.url || start;
    if (!parsePublicHttpUrl(finalUrl)) {
      return { finalUrl: null, note: "URL 접속 불가/응답 없음" };
    }
    return { finalUrl, note: "" };
  } catch {
    return { finalUrl: null, note: "URL 접속 불가/응답 없음" };
  } finally {
    clearTimeout(timer);
  }
}

function optOutDigits(text: string): string | null {
  const labeled = text.match(/(?:무료\s*)?수신\s*거부\s*[:：]?\s*(0\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
  const raw = labeled?.[1] || text.match(/\b080[-\s]?\d{3,4}[-\s]?\d{4}\b/)?.[0] || "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function formatKrPhone(digits: string) {
  if (digits.startsWith("080") && digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.startsWith("080") && digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

function linkFact(urls: string[], tracked: string[], finalUrl: string | null) {
  const shown = urls[0] || "";
  const shortHost = shown ? hostOf(shown) : "";
  const missed = tracked.some((row) => row.includes("접속 불가"));
  if (missed && shown) {
    return `링크 ${shown} 는 응답이 없어 도착 주소를 확인하지 못했습니다.`;
  }
  if (finalUrl) {
    const finalHost = hostOf(finalUrl);
    if (shown && finalUrl.replace(/\/$/, "") !== shown.replace(/\/$/, "") && finalHost && finalHost !== shortHost) {
      return `링크 ${shortHost || shown} 는 ${finalHost} 로 이어집니다.`;
    }
    return `링크 주소는 ${finalHost || finalUrl} 입니다.`;
  }
  return "";
}

function optOutFact(digits: string | null) {
  if (!digits) return "";
  const phone = formatKrPhone(digits);
  if (digits.startsWith("080")) {
    return `수신거부 ${phone} 는 광고 수신거부 번호라 상담·결제 전화가 아닙니다.`;
  }
  return `수신거부 ${phone} 는 본문에 적힌 거부 번호입니다. 금전 안내는 그 번호로 하지 마세요.`;
}

function localSenderBand(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  const trimmed = String(raw || "").trim();
  if (/^(00[1235678]|00700)/.test(digits) || (trimmed.startsWith("+") && !trimmed.startsWith("+82"))) {
    const known = ["001", "002", "003", "005", "006", "007", "008"].find((item) => digits.startsWith(item));
    return { band: "international", label: known ? `국제전화 ${known} 대역` : "국외발신 대역" };
  }
  if (digits.startsWith("070")) return { band: "internet", label: "070 인터넷전화" };
  if (digits.startsWith("050")) return { band: "virtual", label: "050 안심·가상번호" };
  if (/^01[016789]/.test(digits)) return { band: "mobile", label: "일반 010 이동전화" };
  return { band: "other", label: digits ? "일반 발신번호" : "발신번호 없음" };
}

async function loadSenderContext(sender: string, messageText: string): Promise<SenderContext | null> {
  const base = (Deno.env.get("VLUE_API_BASE") || "https://api.vlue.kr").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/lettering/sms-sender-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4500),
      body: JSON.stringify({ phone: sender, messageText: messageText.slice(0, 1500) })
    });
    const data = await res.json().catch(() => null) as SenderContext | null;
    if (!res.ok || !data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

function contextFacts(ctx: SenderContext | null, sender: string) {
  const local = localSenderBand(sender);
  if (!ctx) return `발신 유형: ${local.label}`;
  const hit = (name: string, row?: { status?: string; name?: string }) => {
    if (!row || row.status === "unavailable") return `${name} 조회 불가`;
    if (row.status === "matched" && row.name) return `${name} 일치: ${row.name}`;
    return `${name} 번호 불일치`;
  };
  const reports = ctx.lookups?.reports;
  const reportLine = reports?.phishing
    ? `VLUÉ 스미싱·사기 신고 ${reports.phishing}건`
    : reports?.total
      ? `VLUÉ 신고 ${reports.total}건`
      : "VLUÉ 신고 이력 없음";
  return [
    `발신 유형: ${ctx.bandLabel || local.label}`,
    reportLine,
    hit("공공 디렉터리", ctx.lookups?.directory),
    hit("카카오", ctx.lookups?.kakao),
    hit("네이버", ctx.lookups?.naver),
    hit("공공데이터 상가", ctx.lookups?.publicData),
    ctx.reason ? `대조 메모: ${ctx.reason}` : ""
  ].filter(Boolean).join("\n");
}

function applySenderContext(parsed: SmsAnalysis, ctx: SenderContext | null, sender: string): SmsAnalysis {
  const local = localSenderBand(sender);
  const impersonation = Boolean(ctx?.impersonation);
  const personal = impersonation && (local.band === "mobile" || local.band === "international" || ctx?.band === "mobile" || ctx?.band === "international");
  const floor = personal ? 98 : Math.max(0, Number(ctx?.dangerFloor) || 0);
  const elevate = personal ? "DANGER" : ctx?.escalate;
  if (elevate === "DANGER" && parsed.status !== "DANGER") {
    parsed.status = "DANGER";
    parsed.dangerScore = Math.max(parsed.dangerScore, floor || 90);
  } else if (elevate === "SUSPICIOUS" && parsed.status === "SAFE") {
    parsed.status = "SUSPICIOUS";
    parsed.dangerScore = Math.max(parsed.dangerScore, floor || 58);
  } else if (floor > parsed.dangerScore && elevate && elevate !== "SAFE") {
    parsed.dangerScore = floor;
  }
  if (ctx?.reason && !parsed.summary.includes(ctx.reason.slice(0, 16))) {
    parsed.summary = clipSummary(`${parsed.summary}\n${ctx.reason}`, 400);
  }
  parsed.senderBadge = ctx?.badge || (parsed.status === "DANGER" ? "phishing" : parsed.status === "SUSPICIOUS" ? "suspect" : "safe");
  parsed.senderBand = ctx?.bandLabel || local.label;
  parsed.senderReason = ctx?.reason || "";
  return parsed;
}

function briefSummary(verdict: string, messageText: string, urls: string[], tracked: string[], finalUrl: string | null) {
  const lines = [verdict, linkFact(urls, tracked, finalUrl), optOutFact(optOutDigits(messageText))]
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
  return lines.join("\n");
}

function fallback(status: AnalysisStatus, summary: string, unshortenedUrl: string | null): SmsAnalysis {
  return {
    status,
    dangerScore: status === "DANGER" ? 92 : status === "SUSPICIOUS" ? 55 : 5,
    unshortenedUrl,
    summary: clipSummary(summary),
    actionGuide:
      status === "SAFE"
        ? "일반 안내로 보입니다. 결제를 요구하면 중단하세요."
        : "링크를 누르지 마세요. 기관 안내는 공식 주소에서만 확인하세요."
  };
}

function localVerdict(text: string, hosts: string[]): SmsAnalysis | null {
  const suspiciousHost = hosts.find((host) => host && !isOfficialHost(host)) || "";
  const officialOnly = hosts.length > 0 && hosts.every(isOfficialHost);
  if (isAuthMessage(text) && !suspiciousHost) {
    return fallback("SAFE", "🟢 [안전] 정상 인증 메시지입니다.", null);
  }
  if (!suspiciousHost && hosts.length === 0) {
    return fallback(
      "SAFE",
      isAuthMessage(text) ? "🟢 [안전] 정상 인증 메시지입니다." : "🟢 [안전] 링크가 없는 일반 문자입니다.",
      null
    );
  }
  if (impersonationHint(text) && suspiciousHost && !officialOnly) {
    return fallback(
      "DANGER",
      `🚨 [기관 사칭 스미싱] 우체국·택배·공공기관 안내를 사칭한 주소(${suspiciousHost})입니다. 공식 기관 도메인과 달라 터치를 차단했습니다.`,
      `https://${suspiciousHost}`
    );
  }
  if (gamblingHint(text) && suspiciousHost) {
    return fallback(
      "DANGER",
      `🚨 [스미싱 차단] 해외 불법 도박 사이트 유도 링크(${suspiciousHost})가 포함되어 있습니다.`,
      `https://${suspiciousHost}`
    );
  }
  return null;
}

function parseModelJson(raw: string, unshortenedUrl: string | null): SmsAnalysis | null {
  const text = raw.replace(/```json|```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<SmsAnalysis>;
    const status = parsed.status;
    if (status !== "SAFE" && status !== "SUSPICIOUS" && status !== "DANGER") return null;
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.dangerScore) || 0)));
    const url = typeof parsed.unshortenedUrl === "string" && parsed.unshortenedUrl.trim()
      ? parsed.unshortenedUrl.trim()
      : unshortenedUrl;
    const safeUrl = url && parsePublicHttpUrl(url) ? url : unshortenedUrl;
    return {
      status,
      dangerScore: score,
      unshortenedUrl: safeUrl,
      summary: clipSummary(parsed.summary || "분석 요약을 만들지 못했습니다", 400),
      actionGuide: String(parsed.actionGuide || "").trim().slice(0, 180) ||
        (status === "SAFE" ? "일반 안내로 보입니다." : "링크를 열지 마세요.")
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const sender = String(body.sender || body.address || "").trim().slice(0, 40);
    const messageText = String(body.messageText || "").trim().slice(0, 4000);
    if (!messageText) return json({ error: "messageText_required" }, 400);

    const urls = extractUrls(messageText);
    const bareDomains = extractBareDomains(messageText, urls);
    const hosts = [
      ...bareDomains,
      ...urls.map(hostOf)
    ].filter((host, index, all) => host && all.indexOf(host) === index);

    const tracked: string[] = [];
    let unshortenedUrl: string | null = null;
    for (const url of urls) {
      const followed = await followRedirect(url);
      if (followed.finalUrl) {
        tracked.push(`${url} -> ${followed.finalUrl}`);
        const host = hostOf(followed.finalUrl);
        if (host && !hosts.includes(host)) hosts.push(host);
        if (!unshortenedUrl) unshortenedUrl = followed.finalUrl;
      } else {
        tracked.push(`${url} -> URL 접속 불가/응답 없음`);
        if (!unshortenedUrl) unshortenedUrl = url;
      }
    }
    for (const host of bareDomains) {
      if (!unshortenedUrl) unshortenedUrl = `https://${host}`;
    }

    const senderContext = await loadSenderContext(sender, messageText);
    const local = localVerdict(messageText, hosts);
    const senderEscalates = senderContext?.escalate === "DANGER" || senderContext?.escalate === "SUSPICIOUS";
    if (local && local.status === "SAFE" && urls.length === 0 && bareDomains.length === 0 && !senderEscalates) {
      return json(applySenderContext(local, senderContext, sender));
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!apiKey) {
      if (local) return json(applySenderContext(local, senderContext, sender));
      if (senderContext?.escalate === "DANGER" || senderContext?.escalate === "SUSPICIOUS") {
        return json(applySenderContext(
          fallback(senderContext.escalate, senderContext.reason || "발신번호 대조에서 위험 징후가 있습니다.", unshortenedUrl),
          senderContext,
          sender
        ));
      }
      return json({ ok: false, retry: true, error: "분석을 마치려면 잠시 후 다시 시도해 주세요." }, 200);
    }

    const prompt = [
      "너는 대한민국 스미싱 정밀 분석관이다. 문자 본문, URL 추적, 발신번호 대조 결과를 함께 보고 JSON만 반환하라.",
      "판정 규칙:",
      "① 기관/택배 사칭: 우체국, 경찰청, 국민건강보험, 택배 배송, 모바일 청첩장, 과태료 안내를 말하면서 공식 도메인(go.kr, epost.go.kr, or.kr, korea.kr)이 아닌 불분명한 주소가 있으면 status=DANGER. summary는 한글로 🚨 [기관 사칭 스미싱]으로 시작하고, 사칭한 기관과 차단한 주소를 적을 것.",
      "② 해외 도박/스팸: WEGO88, 카지노, 대박캐시백, 리베이트처럼 불법 도박 유도 문구나 그런 주소가 있으면 status=DANGER. summary는 🚨 [스미싱 차단] 해외 불법 도박 사이트 유도 링크(주소)가 포함되어 있습니다. 형태.",
      "③ 정상 인증/안내: 카카오, 통신사, 은행의 인증번호이거나 공식 주소만 있으면 status=SAFE. summary는 🟢 [안전]으로 시작. 링크가 없는 본문만으로 DANGER를 내리지 말 것. 단, 아래 발신번호 대조가 위험이면 이 예외를 적용하지 말 것.",
      "④ 기관·택배·금융 사칭 문자가 010 개인번호나 001·002·006 등 국제전화, 070·050 인터넷전화로 오면 status=DANGER, dangerScore는 98 이상. summary에 그 발신 유형을 적을 것.",
      "⑤ VLUÉ 신고 이력이 있거나 스미싱 URL이 있으면 경고다. 신고가 사기·스미싱이거나 URL과 사칭이 같이 있으면 status=DANGER. summary에 신고 이력과 URL 사실을 한 문장으로 적을 것. KISA 신고라고 쓰지 말고 VLUÉ 신고라고만 적을 것.",
      "URL 추적 결과가 'URL 접속 불가/응답 없음'이어도 분석을 포기하지 말고 본문과 발신번호 대조로 판정하라.",
      "summary는 한글 2~3줄만. 1줄은 판정과 주의(금전·개인정보에는 응하지 말고 직접 확인). 2줄은 링크가 어디로 이어지는지, 응답이 없으면 그 사실을. 3줄은 수신거부 번호가 있으면 광고 수신거부 번호인지. status는 SAFE, SUSPICIOUS, DANGER. dangerScore는 0부터 100.",
      `발신번호: ${sender || "알 수 없음"}`,
      contextFacts(senderContext, sender),
      `원본 문자: ${messageText}`,
      `추적된 URL: ${tracked.length ? tracked.join(" | ") : "없음"}`,
      `본문 도메인: ${hosts.join(", ") || "없음"}`
    ].join("\n");

    let parsed: SmsAnalysis | null = null;
    try {
      const gemini = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 400,
              responseMimeType: "application/json"
            }
          })
        }
      );
      const data = await gemini.json().catch(() => ({})) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      parsed = parseModelJson(raw, unshortenedUrl);
    } catch {
      parsed = null;
    }

    if (!parsed) {
      if (local) return json(applySenderContext(local, senderContext, sender));
      const ordinary = fallback(
        "SAFE",
        briefSummary(
          "🟢 [안전] 광고·안내 문자입니다. 금전 요구나 개인정보에는 응하지 마시고, 필요하면 업체를 직접 확인하세요.",
          messageText,
          urls,
          tracked,
          unshortenedUrl
        ),
        unshortenedUrl
      );
      if (!gamblingHint(messageText) && !impersonationHint(messageText) && !senderEscalates) return json(applySenderContext(ordinary, senderContext, sender));
      if (senderContext?.reason) {
        return json(applySenderContext(
          fallback(senderContext.escalate === "SAFE" ? "SUSPICIOUS" : (senderContext.escalate || "SUSPICIOUS"), senderContext.reason, unshortenedUrl),
          senderContext,
          sender
        ));
      }
      return json({ ok: false, retry: true, error: "분석을 완료하지 못했습니다. 다시 시도해 주세요." }, 200);
    }

    if (local?.status === "DANGER" && parsed.status === "SAFE") {
      parsed.status = "DANGER";
      parsed.dangerScore = Math.max(parsed.dangerScore, local.dangerScore);
      parsed.summary = local.summary;
      parsed.unshortenedUrl = parsed.unshortenedUrl || local.unshortenedUrl;
    } else if (local?.status === "SAFE" && isAuthMessage(messageText) && hosts.every(isOfficialHost)) {
      parsed.status = "SAFE";
      parsed.dangerScore = Math.min(parsed.dangerScore, 10);
      parsed.summary = local.summary;
    }
    if (!parsed.unshortenedUrl) parsed.unshortenedUrl = unshortenedUrl;
    applySenderContext(parsed, senderContext, sender);
    const facts = [linkFact(urls, tracked, parsed.unshortenedUrl), optOutFact(optOutDigits(messageText))]
      .filter((line) => line && !parsed.summary.includes(line.slice(0, 12)));
    if (facts.length) {
      parsed.summary = clipSummary(`${parsed.summary}\n${facts.join("\n")}`, 400);
    }
    return json(parsed);
  } catch {
    return json({ ok: false, retry: true, error: "분석을 완료하지 못했습니다. 다시 시도해 주세요." }, 200);
  }
});
