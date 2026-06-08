import { useCallback, useMemo, useState } from 'react';
import LetteringCallScreenPreview from '../../../components/LetteringCallScreenPreview.jsx';
import { buildUserLetteringCard, withLetteringBizcardPreviewFallback } from '../../../lib/letteringBizcardProfile.js';
import { readLetteringFixedIdentity } from '../../../lib/letteringBizcardStorage.js';
import { isPaidLetteringTier } from '../../../lib/letteringMembership.js';
import { useB2bMembership } from '../../../context/B2bMembershipContext.jsx';
import '../../../styles.css';

type ViewMode = 'push' | 'card';

const DEMO_DURATION_SEC = 4 * 60 + 31;

function ViewTabs({
  view,
  onChange,
  disabledCard,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  disabledCard?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange('push')}
        className={`rounded-full px-4 py-2 text-[11px] font-black ${
          view === 'push' ? 'bg-primary-500 text-white shadow-md' : 'border border-white/20 bg-white/5 text-white/70'
        }`}
      >
        ① 빅푸시
      </button>
      <button
        type="button"
        disabled={disabledCard}
        onClick={() => onChange('card')}
        className={`rounded-full px-4 py-2 text-[11px] font-black ${
          view === 'card' ? 'bg-amber-400 text-gray-900 shadow-md' : 'border border-white/20 bg-white/5 text-white/70 disabled:opacity-35'
        }`}
      >
        ② 디지털인증명함
      </button>
    </div>
  );
}

interface WebUserLetteringPreviewProps {
  membershipTier?: string;
  hasDigitalCertCard?: boolean;
}

export default function WebUserLetteringPreview({
  membershipTier = 'free',
  hasDigitalCertCard = true,
}: WebUserLetteringPreviewProps) {
  const [view, setView] = useState<ViewMode>('push');
  const { resolveDisplayCard } = useB2bMembership();
  const fixed = useMemo(() => readLetteringFixedIdentity(), []);

  const displayPhone = fixed.phone || '—';
  const displayOrg = fixed.organization || '내 기관';
  const displayName = fixed.name || '회원';

  const previewCard = useMemo(() => {
    const base = withLetteringBizcardPreviewFallback(buildUserLetteringCard({ membershipTier }));
    const { card } = resolveDisplayCard(base);
    return card;
  }, [membershipTier, resolveDisplayCard]);

  const tierForPreview = isPaidLetteringTier(membershipTier) ? 'paid' : membershipTier;
  const expanded = view === 'card';
  const setExpanded = (next: boolean) => setView(next ? 'card' : 'push');
  const showToast = useCallback(() => {}, []);

  return (
    <div className="flex w-full flex-col items-center">
      <ViewTabs view={view} onChange={setView} disabledCard={!hasDigitalCertCard} />
      <div className="vlue-marketing-dual w-full">
        {(['android', 'ios'] as const).map((platform) => (
          <div key={platform} className="vlue-marketing-lettering-cell">
            <span className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
              {platform === 'android' ? 'Galaxy' : 'iPhone'}
            </span>
            <LetteringCallScreenPreview
              callUi="native"
              className="vlue-marketing-lettering-scene lettering-call-screen--marketing-demo"
              verified={hasDigitalCertCard}
              membershipTier={tierForPreview}
              platform={platform}
              callPhase="active"
              isRecording={platform === 'android'}
              callDurationSec={DEMO_DURATION_SEC}
              recordingDurationSec={DEMO_DURATION_SEC}
              incomingNumber={displayPhone}
              callScreenNumber={displayPhone}
              card={previewCard}
              expanded={expanded}
              setExpanded={setExpanded}
              interactive
              fitBizcard
              demoQuiet
              showToast={showToast}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-[400px] text-center text-[11px] font-semibold text-white/60" style={{ wordBreak: 'keep-all' }}>
        {view === 'push' ? (
          <>
            내 번호 <strong className="text-white">{displayPhone}</strong> ·{' '}
            <strong className="text-primary-200">{displayOrg}</strong> · {displayName}
          </>
        ) : (
          <>내 디지털인증명함 미리보기</>
        )}
      </p>
    </div>
  );
}
