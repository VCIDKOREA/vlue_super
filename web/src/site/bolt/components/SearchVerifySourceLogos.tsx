import { VlueNavLogoMark } from '../../../components/VlueNavLogoMark.jsx';

type LogoProps = { className?: string };

export function KakaoSourceLogo({ className = 'sv-source-logo' }: LogoProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <rect width="20" height="20" rx="5" fill="#FEE500" />
      <path
        d="M10 4.5c-3.59 0-6.5 2.28-6.5 5.1 0 1.66 1.1 3.12 2.76 3.95l-.55 2.05 2.36-1.55c.58.09 1.18.14 1.93.14 3.59 0 6.5-2.28 6.5-5.1S13.59 4.5 10 4.5Z"
        fill="#3B1E1E"
      />
    </svg>
  );
}

export function NaverSourceLogo({ className = 'sv-source-logo' }: LogoProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <rect width="20" height="20" rx="5" fill="#03C75A" />
      <path
        d="M6.2 5.5h2.45l3.15 4.55V5.5H14v9H11.6L8.4 10v4.5H6.2V5.5Z"
        fill="#fff"
      />
    </svg>
  );
}

export function PublicSourceLogo({ className = 'sv-source-logo' }: LogoProps) {
  const flagClass = ['sv-source-logo--flag', className].filter(Boolean).join(' ');

  return (
    <img
      src="/kr-taegeukgi.png"
      alt=""
      className={flagClass}
      aria-hidden
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}

export function VlueSourceLogo({ className = 'sv-source-logo' }: LogoProps) {
  return (
    <span className={`sv-source-logo-vlue ${className}`} aria-hidden>
      <VlueNavLogoMark size={16} />
    </span>
  );
}

export function SearchVerifySourceList({ compact = false }: { compact?: boolean }) {
  const items = [
    { key: 'kakao', label: '카카오', Logo: KakaoSourceLogo },
    { key: 'naver', label: '네이버', Logo: NaverSourceLogo },
    { key: 'public', label: '공공·국세청', Logo: PublicSourceLogo },
    { key: 'vlue', label: 'VLUE 독자검증', Logo: VlueSourceLogo },
  ] as const;

  return (
    <div className={`sv-source-list${compact ? ' sv-source-list--compact' : ''}`}>
      {items.map(({ key, label, Logo }) => (
        <span key={key} className="sv-source-chip">
          <Logo />
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
