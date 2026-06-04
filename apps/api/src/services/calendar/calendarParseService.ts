const CALENDAR_PARSE_INSTRUCTION = `입력된 자연어 일정 텍스트를 분석해서 반드시 아래 JSON만 응답하라. 마크다운·설명 없이 JSON만.
{
  "title": "일정 제목",
  "start_at": "YYYY-MM-DD HH:mm",
  "end_at": "YYYY-MM-DD HH:mm",
  "location": "장소 또는 null",
  "content": "내용 또는 null",
  "is_all_day": false
}`;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalIso(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function mockParse(message: string) {
  const now = new Date();
  const start = new Date(now);
  if (/내일/.test(message)) start.setDate(start.getDate() + 1);
  if (/모레/.test(message)) start.setDate(start.getDate() + 2);
  const pm = /오후|PM/i.test(message);
  const hm = message.match(/(\d{1,2})\s*시/);
  let hour = hm ? Number(hm[1]) : 15;
  if (pm && hour < 12) hour += 12;
  start.setHours(hour, 0, 0, 0);
  const durationH = message.match(/(\d+)\s*시간/);
  const end = new Date(start.getTime() + (durationH ? Number(durationH[1]) : 1) * 60 * 60 * 1000);
  const title = message.replace(/내일|모레|오전|오후|\d{1,2}\s*시|\d+\s*시간/g, "").trim() || "새 일정";
  return {
    title: title.slice(0, 100),
    start_at: toLocalIso(start),
    end_at: toLocalIso(end),
    location: null,
    content: null,
    is_all_day: false
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("PARSE_FAILED");
  }
}

export async function parseCalendarNaturalLanguage(message: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { parsed: mockParse(message), provider: "mock" as const };

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: CALENDAR_PARSE_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0.2 }
    })
  });
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!text) return { parsed: mockParse(message), provider: "mock" as const };
  const parsed = extractJson(text);
  return { parsed, provider: "gemini" as const };
}
