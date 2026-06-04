export const MEMO_BG_COLORS = [
  { id: "white", label: "흰색", light: "bg-white", dark: "dark:bg-slate-800" },
  { id: "yellow", label: "노란색", light: "bg-amber-50", dark: "dark:bg-amber-950/50" },
  { id: "green", label: "초록색", light: "bg-emerald-50", dark: "dark:bg-emerald-950/50" },
  { id: "blue", label: "파란색", light: "bg-blue-50", dark: "dark:bg-blue-950/50" },
  { id: "pink", label: "분홍색", light: "bg-pink-50", dark: "dark:bg-pink-950/50" }
];

export const MEMO_FILTER_TABS = [
  { id: "all", label: "전체" },
  { id: "pinned", label: "고정" },
  { id: "link", label: "링크" },
  { id: "image", label: "이미지" },
  { id: "share", label: "공유받음" }
];

const SOURCE_ICONS = {
  chrome: "🌐",
  safari: "🧭",
  youtube: "▶️",
  instagram: "📷",
  naver: "N",
  kakao: "💬",
  twitter: "𝕏",
  default: "📤"
};

export function sourceAppIcon(name) {
  const key = String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  if (key.includes("chrome") || key.includes("크롬")) return SOURCE_ICONS.chrome;
  if (key.includes("safari") || key.includes("사파리")) return SOURCE_ICONS.safari;
  if (key.includes("youtube") || key.includes("유튜브")) return SOURCE_ICONS.youtube;
  if (key.includes("instagram") || key.includes("인스타")) return SOURCE_ICONS.instagram;
  if (key.includes("naver") || key.includes("네이버")) return SOURCE_ICONS.naver;
  if (key.includes("kakao") || key.includes("카카오")) return SOURCE_ICONS.kakao;
  if (key.includes("twitter") || key.includes("트위터") || key.includes("x")) return SOURCE_ICONS.twitter;
  return SOURCE_ICONS.default;
}

export function memoCardTitle(memo) {
  const t = String(memo?.title || "").trim();
  if (t) return t;
  const line = String(memo?.content || "")
    .split("\n")[0]
    .trim();
  return line || "메모";
}

export function memoPreviewLine(memo) {
  if (memo?.aiSummary) return memo.aiSummary.split("\n")[0];
  const c = String(memo?.content || "").trim();
  return c.length > 120 ? `${c.slice(0, 120)}…` : c;
}

export function formatMemoDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function bgClasses(bgColor, isDarkMode) {
  const found = MEMO_BG_COLORS.find((c) => c.id === bgColor) || MEMO_BG_COLORS[0];
  return `${found.light} ${isDarkMode ? found.dark : ""}`;
}

export function splitHighlightParts(text, query) {
  const q = String(query || "").trim();
  if (!q || q.startsWith("#")) return [{ text: String(text), hit: false }];
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return String(text)
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, hit: part.toLowerCase() === q.toLowerCase() }));
}
