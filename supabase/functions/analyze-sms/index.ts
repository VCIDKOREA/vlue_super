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

function clipSummary(text: string) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return [...clean].slice(0, 40).join("");
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
      summary: clipSummary(parsed.summary || "분석 요약을 만들지 못했습니다"),
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
    let unshortenedUrl: string | null = null;
    const tracked: string[] = [];
    for (const url of urls) {
      const finalUrl = await followRedirect(url);
      const value = finalUrl || url;
      tracked.push(`${url} -> ${value}`);
      if (!unshortenedUrl && finalUrl && finalUrl !== url) unshortenedUrl = finalUrl;
      if (!unshortenedUrl) unshortenedUrl = value;
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!apiKey) {
      return json(fallback(
        urls.length ? "SUSPICIOUS" : "SAFE",
        urls.length ? "링크는 있으나 AI 키가 없어 안전을 단정하지 못함" : "분석 키가 없어 본문만 확인함",
        unshortenedUrl
      ));
    }

    const prompt = [
      "너는 대한민국 통신 보안 분석관이다.",
      "단축 링크의 실제 목적지가 피싱, 악성 앱 다운로드, 불법 도메인으로 보이면 DANGER로 판정하라.",
      "본문을 가리지 말고, 링크를 눌러도 되는지만 판정하라.",
      "응답은 JSON 객체만 반환하라. 마크다운과 코드펜스는 쓰지 마라.",
      "status는 SAFE, SUSPICIOUS, DANGER 중 하나. dangerScore는 0부터 100.",
      "summary는 최대 40자. unshortenedUrl은 추적된 최종 URL 또는 null.",
      `발신번호: ${sender || "알 수 없음"}`,
      `원본 문자: ${messageText}`,
      `추적된 URL: ${tracked.length ? tracked.join(" | ") : "없음"}`
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
      return json(fallback("SUSPICIOUS", "AI 응답을 확인하지 못해 링크를 열지 않는 편이 안전함", unshortenedUrl));
    }
    return json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "analyze_failed";
    return json({ error: message }, 500);
  }
});
