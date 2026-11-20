import { apiUrl } from "../apiBase.js";
import { vlueAuthHeaders } from "../vlueAuthHeaders.js";
import { directionCue } from "./analyzeFrame.js";

export function localSpaceGuide(input) {
  const cue = directionCue(input.hotspot, input.zoom || 1);
  if (input.needZoom) return `${cue.text} 포착은 유지됐지만 줌인 재검증이 남았습니다.`.slice(0, 180);
  const radio = input.radioNote ? ` 전파 참고: ${input.radioNote}` : "";
  const audio = input.audioNote ? ` 음향 참고: ${input.audioNote}` : "";
  return `${cue.text}${radio}${audio} 결과는 보조이며 판단은 사용자에게 있습니다.`.slice(0, 180);
}

/** 프레임마다 호출하지 않는다. 잠금·스냅샷·사용자 요청에서만. */
export async function requestSpaceGuide(input, signal) {
  const fallback = localSpaceGuide(input);
  try {
    const res = await fetch(apiUrl("/api/v1/space/guide"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
      body: JSON.stringify({
        palette: input.palette,
        zoom: input.zoom,
        stability: input.stability,
        hotspot: input.hotspot,
        radioNote: input.radioNote || "",
        audioNote: input.audioNote || "",
        mode: input.mode
      }),
      signal
    });
    if (!res.ok) return { text: fallback, source: "local" };
    const data = await res.json().catch(() => ({}));
    const text = String(data.guide || "").trim();
    if (!text) return { text: fallback, source: "local" };
    return { text: text.slice(0, 180), source: "gemini" };
  } catch {
    return { text: fallback, source: "local" };
  }
}
