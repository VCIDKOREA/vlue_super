import { useState } from 'react';
import {
  Phone,
  MapPin,
  ExternalLink,
  Hash,
  Briefcase,
  ShieldCheck,
  Info,
  Navigation,
  Crown,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

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

export type PublicSourceData = {
  matched: boolean;
  business_status: string;
  business_number: string;
  biz_type: string;
  biz_item: string;
  telephone: string;
  address: string;
  fail_safe_message: string;
};

export type VlueAuthData = {
  status_text: string;
  safety_score: number;
  partner_name?: string;
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
};

type TabKey = 'kakao' | 'naver' | 'public' | 'vlue';

const TABS: { key: TabKey; label: string; accent: string }[] = [
  { key: 'kakao', label: '카카오 인증', accent: 'sv-tab--kakao' },
  { key: 'naver', label: '네이버 인증', accent: 'sv-tab--naver' },
  { key: 'public', label: '공공·국세청', accent: 'sv-tab--public' },
  { key: 'vlue', label: 'VLUE 독자검증', accent: 'sv-tab--vlue' },
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

function PublicPanel({ data }: { data: PublicSourceData }) {
  return (
    <div className="sv-cross-panel sv-cross-panel--enter">
      <p className="sv-cross-source">출처: 소상공인 상가정보 · 국세청 사업자상태</p>
      <div className={`sv-cross-failsafe${data.matched ? ' sv-cross-failsafe--ok' : ''}`}>
        {data.matched ? <ShieldCheck className="w-4 h-4 flex-shrink-0" /> : <Info className="w-4 h-4 flex-shrink-0" />}
        <p>{data.fail_safe_message}</p>
      </div>
      <div className="sv-cross-fields">
        <FieldRow icon={ShieldCheck} label="검증 상태" value={data.business_status} />
        <FieldRow icon={Hash} label="사업자등록번호" value={data.business_number} />
        <FieldRow icon={Briefcase} label="업종" value={data.biz_type} />
        <FieldRow icon={Briefcase} label="업태" value={data.biz_item} />
        <FieldRow icon={Phone} label="전화번호" value={data.telephone} href={telHref(data.telephone) || undefined} highlight={Boolean(data.telephone)} />
        <FieldRow icon={MapPin} label="주소" value={data.address} />
      </div>
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
        <h3 className="sv-cross-title sv-cross-title--gold">{auth.partner_name || data.query}</h3>
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
            본 기관은 카카오/네이버/공공데이터의 통합 정보 요약본만 제공되는 &apos;미등록&apos; 대상입니다. 허위 사칭 차단 및 전용 골드 배지 활성화를 위해 정식 파트너십 인증을 권장합니다.
          </p>
        </div>
      </div>
      <a href="#pricing" className="sv-partner-cta">
        VLUE 파트너십 신청하기
      </a>
    </div>
  );
}

export default function SearchVerifyCrossTabs({ data }: { data: CrossVerifyData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('kakao');
  const isPremium = data.is_registered;

  return (
    <div className={`sv-cross${isPremium ? ' sv-cross--premium' : ' sv-cross--standard'}`}>
      <div className="sv-cross-tabs sv-cross-tabs--4" role="tablist" aria-label="4사 교차 검증">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`sv-tab ${tab.accent}${active ? ' sv-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === 'kakao' && data.kakao.telephone ? <span className="sv-tab-dot" /> : null}
              {tab.key === 'vlue' && isPremium ? <span className="sv-tab-dot sv-tab-dot--gold" /> : null}
            </button>
          );
        })}
      </div>

      <div className="sv-cross-body" role="tabpanel">
        {activeTab === 'kakao' ? <KakaoPanel data={data.kakao} /> : null}
        {activeTab === 'naver' ? <NaverPanel data={data.naver} /> : null}
        {activeTab === 'public' ? <PublicPanel data={data.public} /> : null}
        {activeTab === 'vlue' ? <VluePanel data={data} isRegistered={isPremium} /> : null}
      </div>
    </div>
  );
}
