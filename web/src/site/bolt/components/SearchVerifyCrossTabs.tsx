import { useState } from 'react';
import {
  Phone,
  MapPin,
  ExternalLink,
  Hash,
  Briefcase,
  User,
  ShieldCheck,
  Info,
  Navigation,
  Crown,
  AlertTriangle,
  Sparkles,
  Store,
  Share2,
} from 'lucide-react';
import { navigateToVluePartnerStore } from '../../../lib/vluePartnerStoreNav.js';
import { shareCrossVerify, SOURCE_LABELS } from '../../../lib/searchVerifyKakaoShare.js';
import {
  KakaoSourceLogo,
  NaverSourceLogo,
  PublicSourceLogo,
  VlueSourceLogo,
} from './SearchVerifySourceLogos';

export type KakaoSourceData = {
  place_name: string;
  telephone: string;
  address: string;
  road_address?: string;
  category?: string;
  place_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  unavailable_reason?: string;
};

export type NaverSourceData = {
  title: string;
  address: string;
  road_address?: string;
  link?: string;
  category?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PublicBusinessCandidate = {
  store_name: string;
  business_number: string;
  ceo_name: string;
  business_status: string;
  biz_type: string;
  biz_item: string;
  address: string;
  telephone: string;
  source?: string;
};

export type PublicSourceData = {
  matched: boolean;
  store_name: string;
  category: string;
  business_status: string;
  business_number: string;
  biz_type: string;
  biz_item: string;
  ceo_name: string;
  telephone: string;
  address: string;
  fail_safe_message: string;
  candidates: PublicBusinessCandidate[];
};

export type PlaceBranchItem = {
  place_name: string;
  category: string;
  telephone: string;
  address: string;
  road_address: string;
  place_url: string;
  latitude: number | null;
  longitude: number | null;
  distance_m: number | null;
};

export type VlueAuthData = {
  status_text: string;
  safety_score: number;
  partner_name?: string;
  partner_id?: string;
  store_id?: string;
  cert_number?: string;
  category?: string;
  phone?: string;
  address?: string;
};

export type CrossVerifyData = {
  query: string;
  is_registered: boolean;
  kakao: KakaoSourceData;
  naver: NaverSourceData;
  public: PublicSourceData;
  vlue_auth: VlueAuthData;
  place_branches?: PlaceBranchItem[];
  location_sorted?: boolean;
};

type TabKey = 'kakao' | 'naver' | 'public' | 'vlue';

const TABS: {
  key: TabKey;
  label: string;
  accent: string;
  Logo: typeof KakaoSourceLogo;
}[] = [
  { key: 'kakao', label: '카카오 인증', accent: 'sv-tab--kakao', Logo: KakaoSourceLogo },
  { key: 'naver', label: '네이버 인증', accent: 'sv-tab--naver', Logo: NaverSourceLogo },
  { key: 'public', label: '공공·국세청', accent: 'sv-tab--public', Logo: PublicSourceLogo },
  { key: 'vlue', label: 'VLUE 인증', accent: 'sv-tab--vlue', Logo: VlueSourceLogo },
];

function buildMapEmbed(lat: number, lng: number) {
  const pad = 0.006;
  const bbox = `${lng - pad},${lat - pad * 0.8},${lng + pad},${lat + pad * 0.8}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

function maskCeoName(raw: string) {
  const name = String(raw || '').trim();
  if (!name || name === '미확인') return name;
  const first = [...name][0];
  return first ? `${first}**` : '미확인';
}

function isActiveBusinessStatus(status: string) {
  return /계속|정상|영업/.test(status);
}

function FieldRow({
  icon: Icon,
  label,
  value,
  href,
  highlight,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  const body = (
    <div className={`sv-cross-field${highlight ? ' sv-cross-field--highlight' : ''}`}>
      <Icon className="w-4 h-4 sv-cross-field-icon" />
      <div>
        <span className="sv-cross-label">{label}</span>
        <p className="sv-cross-value">{value}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="sv-cross-field-link" target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
        {body}
      </a>
    );
  }
  return body;
}

function SafetyScoreRing({ score, premium }: { score: number; premium: boolean }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className={`sv-score-ring${premium ? ' sv-score-ring--premium' : ''}`}>
      <svg viewBox="0 0 120 120" className="sv-score-svg">
        <circle cx="60" cy="60" r="52" className="sv-score-track" />
        <circle
          cx="60"
          cy="60"
          r="52"
          className="sv-score-progress"
          style={{ strokeDasharray: `${pct * 3.27} 327` }}
        />
      </svg>
      <div className="sv-score-center">
        <span className="sv-score-num">{score}</span>
        <span className="sv-score-unit">안심지수</span>
      </div>
    </div>
  );
}

function KakaoPanel({ data }: { data: KakaoSourceData }) {
  if (!data.place_name && data.unavailable_reason) {
    return (
      <div className="sv-cross-panel sv-cross-panel--enter">
        <p className="sv-cross-source">출처: 카카오 로컬 API</p>
        <div className="sv-cross-failsafe">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>{data.unavailable_reason}</p>
        </div>
      </div>
    );
  }

  const phone = data.telephone?.trim() || '';
  const coords = data.latitude != null && data.longitude != null ? { lat: data.latitude, lng: data.longitude } : null;

  return (
    <div className="sv-cross-panel sv-cross-panel--enter">
      <p className="sv-cross-source">출처: 카카오 로컬 API</p>
      <h3 className="sv-cross-title">{data.place_name}</h3>
      {data.category ? <p className="sv-cross-sub">{data.category}</p> : null}
      {coords ? (
        <div className="sv-cross-map">
          <iframe title="카카오 위치" src={buildMapEmbed(coords.lat, coords.lng)} className="sv-cross-map-frame" loading="lazy" />
        </div>
      ) : null}
      <div className="sv-cross-fields">
        <FieldRow icon={Phone} label="전화번호" value={phone || '미등록'} href={telHref(phone) || undefined} highlight={Boolean(phone)} />
        <FieldRow icon={MapPin} label="주소" value={data.road_address || data.address} />
        {data.place_url ? (
          <a href={data.place_url} target="_blank" rel="noreferrer" className="sv-cross-action">
            <ExternalLink className="w-4 h-4" />
            카카오맵에서 보기
          </a>
        ) : null}
        {coords ? (
          <a
            href={`https://map.kakao.com/link/map/${encodeURIComponent(data.place_name)},${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noreferrer"
            className="sv-cross-action sv-cross-action--route"
          >
            <Navigation className="w-4 h-4" />
            길찾기
          </a>
        ) : null}
      </div>
    </div>
  );
}

function NaverPanel({ data }: { data: NaverSourceData }) {
  if (!data.title) {
    return <p className="sv-cross-empty">네이버 지역 검색 결과가 없습니다.</p>;
  }
  const coords = data.latitude != null && data.longitude != null ? { lat: data.latitude, lng: data.longitude } : null;
  const mapUrl = data.link || `https://map.naver.com/v5/search/${encodeURIComponent(data.road_address || data.address || data.title)}`;

  return (
    <div className="sv-cross-panel sv-cross-panel--enter">
      <p className="sv-cross-source">출처: 네이버 지역 검색 API</p>
      <h3 className="sv-cross-title">{data.title}</h3>
      {data.category ? <p className="sv-cross-sub">{data.category}</p> : null}
      {coords ? (
        <div className="sv-cross-map">
          <iframe title="네이버 위치" src={buildMapEmbed(coords.lat, coords.lng)} className="sv-cross-map-frame" loading="lazy" />
        </div>
      ) : null}
      <div className="sv-cross-fields">
        <FieldRow icon={MapPin} label="도로명 주소" value={data.road_address || data.address} />
        <FieldRow icon={MapPin} label="지번 주소" value={data.address !== data.road_address ? data.address : ''} />
        <a href={mapUrl} target="_blank" rel="noreferrer" className="sv-cross-action sv-cross-action--naver">
          <ExternalLink className="w-4 h-4" />
          네이버 지도에서 보기
        </a>
      </div>
      <p className="sv-cross-note">네이버 Open API는 정책상 전화번호를 제공하지 않습니다.</p>
    </div>
  );
}

function PublicBiznoRow({
  label,
  value,
  emphasis,
  note,
  alwaysShow,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  note?: string;
  alwaysShow?: boolean;
}) {
  const displayValue = value?.trim() || '미확인';
  if (!alwaysShow && displayValue === '미확인') return null;
  const active = emphasis && isActiveBusinessStatus(displayValue);
  return (
    <div className="sv-public-bizno-row">
      <div className="sv-public-bizno-label">{label}</div>
      <div className="sv-public-bizno-value">
        <span className={active || (emphasis && displayValue !== '미확인') ? 'sv-public-bizno-emphasis' : undefined}>
          {displayValue}
        </span>
        {note && active ? <span className="sv-public-bizno-note">{note}</span> : null}
      </div>
    </div>
  );
}

function PublicPanel({ data }: { data: PublicSourceData }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const candidates = data.candidates?.length
    ? data.candidates
    : data.matched
      ? [{
          store_name: data.address ? '선택된 사업자' : '조회 결과',
          business_number: data.business_number,
          ceo_name: data.ceo_name,
          business_status: data.business_status,
          biz_type: data.biz_type,
          biz_item: data.biz_item,
          address: data.address,
          telephone: data.telephone,
        }]
      : [];

  const active = candidates[selectedIndex] || null;
  const display = active
    ? {
        store_name: active.store_name || data.store_name,
        category: data.category,
        business_status: active.business_status,
        business_number: active.business_number,
        biz_type: active.biz_type,
        biz_item: active.biz_item,
        ceo_name: active.ceo_name,
        telephone: active.telephone || data.telephone,
        address: active.address || data.address,
      }
    : {
        store_name: data.store_name,
        category: data.category,
        business_status: data.business_status,
        business_number: data.business_number,
        biz_type: data.biz_type,
        biz_item: data.biz_item,
        ceo_name: data.ceo_name,
        telephone: data.telephone,
        address: data.address,
      };

  const ceoDisplay = display.ceo_name ? maskCeoName(display.ceo_name) : '미확인';

  if (!data.matched && candidates.length === 0) {
    return (
      <div className="sv-cross-panel sv-cross-panel--enter">
        <p className="sv-cross-source">출처: 소상공인 상가정보 · 금융위 기업기본정보 · 국세청</p>
        <div className="sv-cross-failsafe">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>{data.fail_safe_message || '등록되지 않은 사업자입니다'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-cross-panel sv-cross-panel--enter">
      <p className="sv-cross-source">출처: 소상공인 상가정보 · 금융위 기업기본정보 · 국세청</p>
      <div className={`sv-cross-failsafe${data.matched ? ' sv-cross-failsafe--ok' : ''}`}>
        {data.matched ? <ShieldCheck className="w-4 h-4 flex-shrink-0" /> : <Info className="w-4 h-4 flex-shrink-0" />}
        <p>{data.fail_safe_message}</p>
      </div>
      {display.store_name ? (
        <div className="sv-public-store-head">
          <h3 className="sv-public-store-name">{display.store_name}</h3>
          {display.category ? <p className="sv-public-store-category">{display.category}</p> : null}
        </div>
      ) : null}
      <div className="sv-public-bizno-table">
        <PublicBiznoRow label="상호" value={display.store_name} alwaysShow />
        <PublicBiznoRow label="업태" value={display.biz_item} />
        <PublicBiznoRow label="업종" value={display.biz_type} />
        <PublicBiznoRow label="전화번호" value={display.telephone} />
        <PublicBiznoRow
          label="과세유형"
          value={/과세|면세|일반/.test(display.biz_type) ? display.biz_type : ''}
        />
        <PublicBiznoRow label="대표자명" value={ceoDisplay} alwaysShow />
        <PublicBiznoRow
          label="사업자 현재 상태"
          value={display.business_status}
          emphasis
          alwaysShow
          note="※국세청 홈택스 실시간 정보제공"
        />
        <div className="sv-public-bizno-divider" />
        <PublicBiznoRow label="사업자등록번호" value={display.business_number} emphasis alwaysShow />
        <PublicBiznoRow label="회사주소" value={display.address} />
      </div>
      {display.telephone ? (
        <a href={telHref(display.telephone)} className="sv-cross-action sv-cross-action--route">
          <Phone className="w-4 h-4" />
          {display.telephone}
        </a>
      ) : null}

      {candidates.length > 1 ? (
        <div className="sv-public-candidates">
          <p className="sv-public-candidates-title">동일·유사 상호 검색 결과 <span>{candidates.length}건</span></p>
          <div className="sv-public-candidate-list">
            {candidates.map((item, index) => {
              const activeCard = index === selectedIndex;
              return (
                <button
                  key={`${item.business_number}-${index}`}
                  type="button"
                  className={`sv-public-candidate-card${activeCard ? ' sv-public-candidate-card--active' : ''}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="sv-public-candidate-head">
                    <strong>{item.store_name}</strong>
                    {item.biz_type && item.biz_type !== '미확인' ? <span>{item.biz_type}</span> : null}
                  </div>
                  {item.telephone ? <p className="sv-public-candidate-phone">{item.telephone}</p> : null}
                  {item.address ? <p className="sv-public-candidate-address">{item.address}</p> : null}
                  <div className="sv-public-candidate-meta">
                    <span>사업자 {item.business_number}</span>
                    {item.ceo_name ? <span>대표 {maskCeoName(item.ceo_name)}</span> : null}
                    {item.business_status && item.business_status !== '미확인' ? <span>{item.business_status}</span> : null}
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

function VluePanel({ data, isRegistered }: { data: CrossVerifyData; isRegistered: boolean }) {
  const auth = data.vlue_auth;

  if (isRegistered) {
    return (
      <div className="sv-cross-panel sv-cross-panel--enter">
        <div className="sv-premium-badge">
          <Crown className="w-4 h-4" />
          VLUE PREMIUM PARTNER
        </div>
        <p className="sv-cross-source">출처: VLUE 보이스피싱 예방 센터</p>
        <h3 className="sv-cross-title sv-cross-title--premium">{auth.partner_name || data.query}</h3>
        {auth.category ? <p className="sv-cross-sub">{auth.category}</p> : null}
        <div className="sv-premium-hero">
          <SafetyScoreRing score={auth.safety_score} premium />
          <div className="sv-premium-copy">
            <div className="sv-premium-trust">
              <Sparkles className="w-4 h-4" />
              ✓ 안전성 검증 완료
            </div>
            <p>
              VLUE 보이스피싱 예방 센터의 사칭 유선 패턴 분석 알고리즘을 100% 통과하고 공식 신원 확인 서류 검증이 완료된 클린 파트너 기관입니다. 안심하고 통화 및 거래하셔도 좋습니다.
            </p>
          </div>
        </div>
        <div className="sv-cross-fields">
          <FieldRow icon={ShieldCheck} label="상태" value={auth.status_text} />
          <FieldRow icon={Hash} label="VLUE 인증번호" value={auth.cert_number || ''} />
          <FieldRow icon={Phone} label="공식 연락처" value={auth.phone || ''} href={telHref(auth.phone || '') || undefined} highlight />
          <FieldRow icon={MapPin} label="등록 주소" value={auth.address || ''} />
        </div>
        {auth.store_id ? (
          <button
            type="button"
            className="sv-cross-action sv-cross-action--vlue-store"
            onClick={() => navigateToVluePartnerStore(auth.store_id!)}
          >
            <Store className="w-4 h-4" />
            VLUE 인증 상점 방문하기
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sv-cross-panel sv-cross-panel--enter">
      <div className="sv-unregistered-badge">
        <AlertTriangle className="w-4 h-4" />
        VLUE 미등록 상태
      </div>
      <p className="sv-cross-source">출처: VLUE 예방 센터 교차 검증</p>
      <div className="sv-standard-hero">
        <SafetyScoreRing score={auth.safety_score} premium={false} />
        <div>
          <p className="sv-cross-sub">{auth.status_text}</p>
          <p className="sv-standard-desc">
            본 기관은 카카오/네이버/공공·국세청의 통합 정보 요약본만 제공되는 &apos;미등록&apos; 대상입니다. 사업자번호·대표자명은 [공공·국세청] 탭에서 확인해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function CrossVerifyShareBar({
  data,
  activeTab,
}: {
  data: CrossVerifyData;
  activeTab: TabKey;
}) {
  const [busy, setBusy] = useState<TabKey | null>(null);
  const [msg, setMsg] = useState('');

  const onShare = async (tab: TabKey) => {
    setBusy(tab);
    setMsg('');
    try {
      const res = await shareCrossVerify(data, tab);
      if (res.ok) {
        setMsg(res.message || (tab === 'kakao' ? '카카오톡 공유 창이 열렸습니다.' : '공유가 완료되었습니다.'));
        window.setTimeout(() => setMsg(''), 3200);
      } else if (!res.cancelled) {
        setMsg(res.error || '공유에 실패했습니다.');
        window.setTimeout(() => setMsg(''), 4200);
      }
    } catch (e) {
      const text = (e as Error)?.message || '공유에 실패했습니다.';
      setMsg(text);
      window.setTimeout(() => setMsg(''), 4200);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sv-cross-share">
      <p className="sv-cross-share-title">
        <Share2 className="w-4 h-4" aria-hidden />
        VLUE 교차검증 결과 공유
      </p>
      <p className="sv-cross-share-hint">
        카카오는 카카오톡, 나머지는 기기 공유(또는 복사)로 VLUE 검증 정보를 전달합니다.
      </p>
      <div className="sv-cross-share-grid">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const loading = busy === tab.key;
          const accentClass =
            tab.key === 'kakao'
              ? 'sv-cross-share-btn--kakao'
              : tab.key === 'naver'
                ? 'sv-cross-share-btn--naver'
                : tab.key === 'public'
                  ? 'sv-cross-share-btn--public'
                  : 'sv-cross-share-btn--vlue';
          return (
            <button
              key={tab.key}
              type="button"
              disabled={Boolean(busy)}
              className={`sv-cross-share-btn ${accentClass}${isActive ? ' sv-cross-share-btn--current' : ''}`}
              onClick={() => onShare(tab.key)}
            >
              <tab.Logo className="sv-cross-share-btn-logo" />
              <span className="sv-cross-share-btn-label">
                {loading
                  ? '공유 중…'
                  : tab.key === 'kakao'
                    ? `${SOURCE_LABELS[tab.key]} 카톡`
                    : `${SOURCE_LABELS[tab.key]} 공유`}
              </span>
            </button>
          );
        })}
      </div>
      {msg ? <p className="sv-cross-share-msg">{msg}</p> : null}
    </div>
  );
}

export default function SearchVerifyCrossTabs({ data }: { data: CrossVerifyData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('kakao');
  const isPremium = data.is_registered;

  return (
    <div className={`sv-cross${isPremium ? ' sv-cross--premium' : ' sv-cross--standard'}`}>
      <div className="sv-cross-tabs sv-cross-tabs--4" role="tablist" aria-label="VLUE 통합 교차검증">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const Logo = tab.Logo;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`sv-tab ${tab.accent}${active ? ' sv-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="sv-tab-inner">
                <Logo className="sv-tab-logo" />
                <span>{tab.label}</span>
              </span>
              {tab.key === 'kakao' && data.kakao.telephone ? <span className="sv-tab-dot sv-tab-dot--kakao" /> : null}
              {tab.key === 'vlue' && isPremium ? <span className="sv-tab-dot sv-tab-dot--premium" /> : null}
            </button>
          );
        })}
      </div>

      <div className="sv-cross-body" role="tabpanel">
        {activeTab === 'kakao' ? <KakaoPanel data={data.kakao} /> : null}
        {activeTab === 'naver' ? <NaverPanel data={data.naver} /> : null}
        {activeTab === 'public' ? <PublicPanel key={`public-${data.query}-${data.public.candidates?.length || 0}`} data={data.public} /> : null}
        {activeTab === 'vlue' ? <VluePanel data={data} isRegistered={isPremium} /> : null}
        <CrossVerifyShareBar data={data} activeTab={activeTab} />
      </div>
    </div>
  );
}
