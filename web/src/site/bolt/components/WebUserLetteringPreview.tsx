import { useMemo } from 'react';
import CallBigPushPreviewSection from '../../../components/CallBigPushPreviewSection.jsx';
import { readLetteringFixedIdentity } from '../../../lib/letteringBizcardStorage.js';
import '../../../components/showcase/showcase-web-desk.css';
import '../../../styles.css';

interface WebUserLetteringPreviewProps {
  membershipTier?: string;
  hasDigitalCertCard?: boolean;
}

/**
 * 마이 쇼케이스 · 레터링 — 앱 실송출과 동일 UI
 * (CallBigPushPreviewSection = 빅푸시 접힘 + DCC + 풀 쇼케이스)
 */
export default function WebUserLetteringPreview({
  membershipTier = 'free',
}: WebUserLetteringPreviewProps) {
  const fixed = useMemo(() => readLetteringFixedIdentity(), []);
  const displayPhone = fixed.phone || '—';
  const displayOrg = fixed.organization || '내 기관';
  const displayName = fixed.name || '회원';

  return (
    <div className="flex w-full flex-col items-center">
      <div className="showcase-web-desk w-full max-w-md">
        <CallBigPushPreviewSection
          membershipTier={membershipTier}
          isDarkMode
          expandMode="inline"
          defaultExpanded
          suppressExpandGuide
        />
      </div>
      <p className="mt-4 max-w-[400px] text-center text-[11px] font-semibold text-white/60" style={{ wordBreak: 'keep-all' }}>
        내 번호 <strong className="text-white">{displayPhone}</strong> ·{' '}
        <strong className="text-primary-200">{displayOrg}</strong> · {displayName}
      </p>
    </div>
  );
}
