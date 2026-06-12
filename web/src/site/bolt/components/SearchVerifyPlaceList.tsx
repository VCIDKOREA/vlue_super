import { MapPin, Navigation, Phone, ExternalLink } from 'lucide-react';
import type { PlaceBranchItem } from './SearchVerifyCrossTabs';

function formatDistance(meters: number | null | undefined) {
  if (meters == null || !Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function shortCategory(raw: string) {
  const parts = String(raw || '')
    .split('>')
    .map((v) => v.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || parts[0] || '';
}

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

type Props = {
  query: string;
  branches: PlaceBranchItem[];
  locationSorted: boolean;
  onSelectBranch?: (placeName: string) => void;
};

export default function SearchVerifyPlaceList({
  query,
  branches,
  locationSorted,
  onSelectBranch,
}: Props) {
  if (!branches.length || (branches.length < 2 && !locationSorted)) return null;

  return (
    <section className="sv-place-section">
      <div className="sv-place-header">
        <div>
          <h3 className="sv-place-title">플레이스</h3>
          <p className="sv-place-sub">
            {locationSorted
              ? '내 위치 기준 가까운 순으로 정렬했습니다.'
              : '전국 등록 지점 목록입니다. 위치 허용 시 가까운 순으로 보여드립니다.'}
          </p>
        </div>
        <span className="sv-place-count">{branches.length}곳</span>
      </div>

      <div className="sv-place-grid">
        {branches.map((branch, index) => {
          const distance = formatDistance(branch.distance_m);
          const category = shortCategory(branch.category);
          const address = branch.road_address || branch.address;
          const mapHref =
            branch.latitude != null && branch.longitude != null
              ? `https://map.kakao.com/link/map/${encodeURIComponent(branch.place_name)},${branch.latitude},${branch.longitude}`
              : branch.place_url || '';

          return (
            <article key={`${branch.place_name}-${index}`} className="sv-place-card">
              <button
                type="button"
                className="sv-place-card-main"
                onClick={() => onSelectBranch?.(branch.place_name)}
              >
                <div className="sv-place-card-top">
                  <div>
                    <strong className="sv-place-name">{branch.place_name}</strong>
                    {category ? <span className="sv-place-category">{category}</span> : null}
                  </div>
                  {distance ? <span className="sv-place-distance">{distance}</span> : null}
                </div>
                {branch.telephone ? (
                  <p className="sv-place-phone">{branch.telephone}</p>
                ) : (
                  <p className="sv-place-phone sv-place-phone--muted">전화번호 미등록</p>
                )}
                {address ? (
                  <p className="sv-place-address">
                    <MapPin className="w-3.5 h-3.5" />
                    {address}
                  </p>
                ) : null}
              </button>
              <div className="sv-place-actions">
                {branch.telephone ? (
                  <a href={telHref(branch.telephone)} className="sv-place-action" aria-label="전화">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                ) : null}
                {mapHref ? (
                  <a href={mapHref} target="_blank" rel="noreferrer" className="sv-place-action" aria-label="지도">
                    <Navigation className="w-3.5 h-3.5" />
                  </a>
                ) : null}
                {branch.place_url ? (
                  <a href={branch.place_url} target="_blank" rel="noreferrer" className="sv-place-action" aria-label="카카오맵">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {branches.length >= 2 ? (
        <p className="sv-place-more">
          <span>{query || '검색어'}</span> 전국 지점 {branches.length}곳 · 카카오 장소 기준
        </p>
      ) : null}
    </section>
  );
}
