import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type AnalysisStatus = "SAFE" | "SUSPICIOUS" | "DANGER";

type SmsAnalysis = {
  status: AnalysisStatus;
  dangerScore: number;
  unshortenedUrl: string | null;
  summary: string;
  actionGuide: string;
};

type Body = {
  sender?: string;
  messageText?: string;
  address?: string;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function clipSummary(text: string, max = 180) {
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

const DOMAIN_RE = /\b((?:[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?\.)+(?:com|net|kr|io|me|co|xyz|info|biz|org|cc|tv|app|link|ly|gl))\b/gi;

function extractBareDomains(text: string, urls: string[]) {
  const hosts = new Set(urls.map((url) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }));
  const out: string[] = [];
  for (const match of text.match(DOMAIN_RE) || []) {
    const host = match.toLowerCase();
    if (hosts.has(host) || hosts.has(host.replace(/^www\./, ""))) continue;
    if (!out.includes(host)) out.push(host);
    if (out.length >= 3) break;
  }
  return out;
}

function isAuthMessage(text: string) {
  return /인증번호|인증코드|본인확인|verification code|일회용/i.test(text) && /\d{4,8}/.test(text);
}

function gamblingHint(text: string) {
  return /도박|카지노|슬롯|바카라|리베이트|토토|배팅|환전/i.test(text);
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

/** 단축 URL의 최종 목적지. HEAD 실패 시에만 GET으로 다시 따라가고, 본문은 받지 않는다. */
async function followRedirect(start: string): Promise<string | null> {
  if (!parsePublicHttpUrl(start)) return null;
  const finalFrom = async (method: "HEAD" | "GET") => {
    const res = await fetch(start, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(8000)
    });
    if (method === "GET") {
      await res.body?.cancel().catch(() => undefined);
    }
    const finalUrl = res.url || start;
    return parsePublicHttpUrl(finalUrl) ? finalUrl : null;
  };
  try {
    const head = await finalFrom("HEAD");
    if (head) return head;
  } catch {
    /* HEAD 미지원 단축 URL */
  }
  try {
    return await finalFrom("GET");
  } catch {
    return null;
  }
}

function fallback(status: AnalysisStatus, summary: string, unshortenedUrl: string | null): SmsAnalysis {
  return {
    status,
    dangerScore: status === "DANGER" ? 90 : status === "SUSPICIOUS" ? 55 : 5,
    unshortenedUrl,
    summary: clipSummary(summary),
    actionGuide:
      status === "SAFE"
        ? "링크는 열어 보셔도 됩니다. 결제를 유도하면 중단하세요."
        : "링크를 누르지 마세요. 모르는 번호의 설치·송금·개인정보 요구는 거절하세요."
  };
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
      summary: clipSummary(parsed.summary || "분석 요약을 만들지 못했습니다", status === "SAFE" ? 80 : 180),
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
    if (urls.length === 0 && bareDomains.length === 0) {
      const auth = isAuthMessage(messageText);
      return json(fallback(
        "SAFE",
        auth ? "🟢 안전 / 정상 인증 메시지" : "🟢 안전 / 링크가 없는 일반 문자",
        null
      ));
    }
    let unshortenedUrl: string | null = null;
    const tracked: string[] = [];
    for (const url of urls) {
      const finalUrl = await followRedirect(url);
      const value = finalUrl || url;
      tracked.push(`${url} -> ${value}`);
      if (!unshortenedUrl && finalUrl && finalUrl !== url) unshortenedUrl = finalUrl;
      if (!unshortenedUrl) unshortenedUrl = value;
    }

    const leadHost = bareDomains[0] || (unshortenedUrl ? new URL(unshortenedUrl).hostname.replace(/^www\./, "") : "");
    if (leadHost && gamblingHint(messageText)) {
      return json(fallback(
        "DANGER",
        `🚨 [스미싱 차단] 해외 도박/불법 사이트 유도 링크(${leadHost})가 포함되어 있어 터치를 차단했습니다.`,
        unshortenedUrl || `https://${leadHost}`
      ));
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!apiKey) {
      return json({ ok: false, retry: true, error: "분석을 마치려면 잠시 후 다시 시도해 주세요." }, 200);
    }

    const prompt = [
      "너는 대한민국 통신 보안 분석관이다.",
      "카카오·통신사·은행 인증번호처럼 링크가 없는 본인확인 문자는 SAFE로 판정하라.",
      "단축 링크의 실제 목적지가 피싱, 악성 앱 다운로드, 불법 도박 도메인이면 DANGER로 판정하라.",
      "위험이면 summary를 한글로 쓰고, 영문 상태 태그만 적지 마라.",
      "summary 예: 🚨 [스미싱 차단] 해외 도박/불법 사이트 유도 링크(도메인)가 포함되어 있어 터치를 차단했습니다.",
      "응답은 JSON 객체만 반환하라. status는 SAFE, SUSPICIOUS, DANGER. dangerScore는 0부터 100.",
      `발신번호: ${sender || "알 수 없음"}`,
      `원본 문자: ${messageText}`,
      `추적된 URL: ${tracked.length ? tracked.join(" | ") : "없음"}`,
      `본문 도메인: ${bareDomains.join(", ") || "없음"}`
    ].join("\n");

    const gemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: "application/json"
          }
        })
      }
    );
    const data = await gemini.json().catch(() => ({})) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    const parsed = parseModelJson(raw, unshortenedUrl);
    if (!parsed) {
      return json({ ok: false, retry: true, error: "분석을 완료하지 못했습니다. 다시 시도해 주세요." }, 200);
    }
    if ((parsed.status === "DANGER" || parsed.status === "SUSPICIOUS") && leadHost) {
      parsed.summary = `🚨 [스미싱 차단] 해외 도박/불법 사이트 유도 링크(${leadHost})가 포함되어 있어 터치를 차단했습니다.`;
      parsed.unshortenedUrl = parsed.unshortenedUrl || unshortenedUrl || `https://${leadHost}`;
    }
    if (parsed.status === "SAFE" && isAuthMessage(messageText)) {
      parsed.summary = "🟢 안전 / 정상 인증 메시지";
    }
    return json(parsed);
  } catch {
    return json({ ok: false, retry: true, error: "분석을 완료하지 못했습니다. 다시 시도해 주세요." }, 200);
  }
});
