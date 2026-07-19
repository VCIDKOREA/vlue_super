import { Phone, ShieldCheck, Info } from "lucide-react";

function maskCeoName(name) {
  const s = String(name || "").trim();
  if (!s) return "";
  if (s.includes("*")) return s;
  if (s.length === 1) return s;
  return `${s[0]}${"*".repeat(Math.min(2, s.length - 1))}`;
}

function isActiveBusinessStatus(value) {
  return /계속|정상|운영/.test(String(value || ""));
}

function telHref(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  return d ? `tel:${d}` : "";
}

function BiznoRow({ label, value, emphasis, note, alwaysShow }) {
  const displayValue = String(value || "").trim() || "미확인";
  if (!alwaysShow && displayValue === "미확인") return null;
  const active = emphasis && isActiveBusinessStatus(displayValue);
  return (
    <div className="home-public-bizno-row">
      <div className="home-public-bizno-label">{label}</div>
      <div className="home-public-bizno-value">
        <span
          className={
            active || (emphasis && displayValue !== "미확인") ? "home-public-bizno-emphasis" : undefined
          }
        >
          {displayValue}
        </span>
        {note && active ? <span className="home-public-bizno-note">{note}</span> : null}
      </div>
    </div>
  );
}

/**
 * 공공데이터 사업자 조회 결과 — 검증 포탈 공공·국세청 탭과 동일 계열 UI
 */
export default function PublicBusinessInfoCard({
  matched,
  message,
  primary,
  candidates = [],
  selectedIndex = 0,
  onSelectCandidate,
  loading
}) {
  if (loading) {
    return (
      <div className="home-public-biz-card">
        <p className="home-public-biz-card__source">출처: 소상공인 상가정보 · 금융위 기업기본정보 · 국세청</p>
        <div className="home-public-biz-card__banner">
          <Info className="h-4 w-4 shrink-0" />
          <p>사업자 정보를 조회하는 중…</p>
        </div>
      </div>
    );
  }

  if (!matched || !primary) {
    return (
      <div className="home-public-biz-card">
        <p className="home-public-biz-card__source">출처: 소상공인 상가정보 · 금융위 기업기본정보 · 국세청</p>
        <div className="home-public-biz-card__banner home-public-biz-card__banner--warn">
          <Info className="h-4 w-4 shrink-0" />
          <p>{message || "등록되지 않은 사업자입니다"}</p>
        </div>
      </div>
    );
  }

  const active = candidates[selectedIndex] || primary;
  const ceoDisplay = active.ceo_name ? maskCeoName(active.ceo_name) : "미확인";

  return (
    <div className="home-public-biz-card">
      <p className="home-public-biz-card__source">출처: 소상공인 상가정보 · 금융위 기업기본정보 · 국세청</p>
      <div className="home-public-biz-card__banner home-public-biz-card__banner--ok">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <p>{message || "공공데이터에서 사업자 정보를 확인했습니다."}</p>
      </div>

      {active.store_name ? (
        <div className="home-public-biz-card__head">
          <h3>{active.store_name}</h3>
        </div>
      ) : null}

      <div className="home-public-bizno-table">
        <BiznoRow label="상호" value={active.store_name} alwaysShow />
        <BiznoRow label="업태" value={active.biz_item} />
        <BiznoRow label="업종" value={active.biz_type} />
        <BiznoRow label="전화번호" value={active.telephone} />
        <BiznoRow
          label="과세유형"
          value={/과세|면세|일반/.test(String(active.biz_type || "")) ? active.biz_type : ""}
        />
        <BiznoRow label="대표자명" value={ceoDisplay} alwaysShow />
        <BiznoRow
          label="사업자 현재 상태"
          value={active.business_status}
          emphasis
          alwaysShow
          note="※국세청 홈택스 실시간 정보제공"
        />
        <div className="home-public-bizno-divider" />
        <BiznoRow label="사업자등록번호" value={active.business_number} emphasis alwaysShow />
        <BiznoRow label="회사주소" value={active.address} />
      </div>

      {active.telephone ? (
        <a href={telHref(active.telephone)} className="home-public-biz-card__call">
          <Phone className="h-4 w-4" />
          {active.telephone}
        </a>
      ) : null}

      {candidates.length > 1 ? (
        <div className="home-public-biz-candidates">
          <p className="home-public-biz-candidates__title">
            동일·유사 상호 검색 결과 <span>{candidates.length}건</span>
          </p>
          <div className="home-public-biz-candidates__list">
            {candidates.map((item, index) => {
              const isActive = index === selectedIndex;
              return (
                <button
                  key={`${item.business_number}-${index}`}
                  type="button"
                  className={`home-public-biz-candidates__item${isActive ? " is-active" : ""}`}
                  onClick={() => onSelectCandidate?.(index)}
                >
                  <div className="home-public-biz-candidates__head">
                    <strong>{item.store_name}</strong>
                    {item.biz_type && item.biz_type !== "미확인" ? <span>{item.biz_type}</span> : null}
                  </div>
                  {item.telephone ? <p>{item.telephone}</p> : null}
                  {item.address ? <p className="home-public-biz-candidates__addr">{item.address}</p> : null}
                  <div className="home-public-biz-candidates__meta">
                    <span>사업자 {item.business_number}</span>
                    {item.ceo_name ? <span>대표 {maskCeoName(item.ceo_name)}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
