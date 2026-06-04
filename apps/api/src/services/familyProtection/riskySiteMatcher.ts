export type RiskySiteCategory = "gambling" | "adult_restricted" | "vpn_proxy" | "deepweb";

export type RiskySiteMatch = {
  matched: boolean;
  category: RiskySiteCategory | null;
  label: string | null;
};

const GAMBLING_PATTERNS = [
  /casino/i,
  /gambl/i,
  /betting/i,
  /slot/i,
  /baccarat/i,
  /holdem/i,
  /poker/i,
  /토토/i,
  /카지노/i,
  /슬롯/i,
  /배팅/i,
  /사행/i,
  /바카라/i,
  /홀덤/i
];

const ADULT_RESTRICTED_PATTERNS = [
  /porn/i,
  /xxx/i,
  /adult/i,
  /19금/i,
  /성인물/i,
  /미성년/i,
  /청소년출입/i,
  /야동/i,
  /av\./i
];

const VPN_PROXY_PATTERNS = [/vpn/i, /proxy/i, /torbrowser/i, /psiphon/i, /wireguard/i, /openvpn/i];

const DEEPWEB_PATTERNS = [/\.onion/i, /deepweb/i, /darkweb/i, /i2p/i, /freenet/i];

const GAMBLING_HOSTS = ["bet365", "1xbet", "sportsbet", "pinnacle"];

function hostFromUrl(raw: string): string {
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.hostname.toLowerCase();
  } catch {
    return String(raw || "").toLowerCase();
  }
}

/** 사행성·미성년 출입 불가 사이트 입장 경로 탐지 */
export function matchRiskySite(url: string, referrer?: string): RiskySiteMatch {
  const blob = `${url} ${referrer || ""}`.toLowerCase();
  const host = hostFromUrl(url);

  for (const h of GAMBLING_HOSTS) {
    if (host.includes(h)) {
      return { matched: true, category: "gambling", label: "사행성(도박) 사이트" };
    }
  }
  for (const p of GAMBLING_PATTERNS) {
    if (p.test(blob)) {
      return { matched: true, category: "gambling", label: "사행성(도박) 사이트" };
    }
  }
  for (const p of DEEPWEB_PATTERNS) {
    if (p.test(blob) || host.endsWith(".onion")) {
      return { matched: true, category: "deepweb", label: "딥웹·익명망 접속" };
    }
  }
  for (const p of VPN_PROXY_PATTERNS) {
    if (p.test(blob) || p.test(host)) {
      return { matched: true, category: "vpn_proxy", label: "VPN·우회 접속" };
    }
  }
  for (const p of ADULT_RESTRICTED_PATTERNS) {
    if (p.test(blob)) {
      return { matched: true, category: "adult_restricted", label: "유해·성인 사이트" };
    }
  }
  return { matched: false, category: null, label: null };
}
