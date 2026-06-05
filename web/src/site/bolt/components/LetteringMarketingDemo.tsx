import { useCallback, useState } from 'react';
import LetteringCallScreenPreview from '../../../components/LetteringCallScreenPreview.jsx';
import {
  MARKETING_DEMO_CARDS,
  MARKETING_DEMO_META,
  LETTERING_UNVERIFIED_SPOOF_NUMBER,
  toLetteringAppCard,
  type PushExampleId,
} from '../data/marketingDemoCards';

export type MarketingViewMode = 'push' | 'card';

export const PUSH_EXAMPLES = MARKETING_DEMO_META;
export { LETTERING_UNVERIFIED_SPOOF_NUMBER };

export const BIG_PUSH_FLOW_STEPS = [
  { step: '1', title: '빅푸시', desc: '통화 화면 번호 + VLUE 상단 패널.' },
  { step: '2', title: '디지털인증명함', desc: '앱과 동일 명함·애니메이션.' },
  { step: '3', title: 'Galaxy · iPhone', desc: 'OS별 동일 UX.' },
] as const;

const DEMO_DURATION_SEC = 4 * 60 + 31;

function MarketingViewTabs({
  view,
  onChange,
  disabledCard,
}: {
  view: MarketingViewMode;
  onChange: (v: MarketingViewMode) => void;
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

function MarketingLetteringDualScene({
  verified,
  cardOverride,
  incomingNumber,
  expanded,
  setExpanded,
}: {
  verified: boolean;
  cardOverride?: Record<string, unknown> | null;
  incomingNumber: string;
  expanded: boolean;
  setExpanded: (next: boolean) => void;
}) {
  const showToast = useCallback(() => {}, []);

  return (
    <div className="vlue-marketing-dual">
      {(['android', 'ios'] as const).map((platform) => (
        <div key={platform} className="vlue-marketing-lettering-cell">
          <span className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
            {platform === 'android' ? 'Galaxy' : 'iPhone'}
          </span>
          <LetteringCallScreenPreview
            callUi="native"
            className="vlue-marketing-lettering-scene"
            verified={verified}
            membershipTier="premium"
            platform={platform}
            callPhase="active"
            isRecording={platform === 'android'}
            callDurationSec={DEMO_DURATION_SEC}
            recordingDurationSec={DEMO_DURATION_SEC}
            incomingNumber={incomingNumber}
            callScreenNumber={incomingNumber}
            card={cardOverride}
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
  );
}

type PreviewProps = {
  exampleId: PushExampleId;
  view?: MarketingViewMode;
  defaultView?: MarketingViewMode;
  onViewChange?: (v: MarketingViewMode) => void;
};

export function LetteringBigPushMarketingPreview({
  exampleId,
  view: viewProp,
  defaultView = 'push',
  onViewChange,
}: PreviewProps) {
  const [viewInternal, setViewInternal] = useState<MarketingViewMode>(defaultView);
  const view = viewProp ?? viewInternal;
  const setView = (v: MarketingViewMode) => {
    if (viewProp === undefined) setViewInternal(v);
    onViewChange?.(v);
  };
  const expanded = view === 'card';
  const setExpanded = (next: boolean) => setView(next ? 'card' : 'push');
  const meta = MARKETING_DEMO_META[exampleId];
  const demo = MARKETING_DEMO_CARDS[exampleId];
  const card = toLetteringAppCard(demo, exampleId);

  return (
    <div className="flex w-full flex-col items-center">
      <MarketingViewTabs view={view} onChange={setView} />
      <MarketingLetteringDualScene
        verified
        cardOverride={card}
        incomingNumber={meta.callDisplayNumber}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <p className="mt-4 max-w-[360px] text-center text-[11px] font-semibold text-white/55" style={{ wordBreak: 'keep-all' }}>
        {view === 'push' ? (
          <>
            통화 화면 <strong className="text-white">{meta.callDisplayNumber}</strong> ·{' '}
            <strong className="text-primary-200">{meta.orgName}</strong>
          </>
        ) : (
          <>디지털인증명함 · {meta.label}</>
        )}
      </p>
    </div>
  );
}

export function LetteringUnverifiedBigPushPreview({
  view: viewProp,
  defaultView = 'push',
  onViewChange,
}: {
  view?: MarketingViewMode;
  defaultView?: MarketingViewMode;
  onViewChange?: (v: MarketingViewMode) => void;
} = {}) {
  const [viewInternal, setViewInternal] = useState<MarketingViewMode>(defaultView);
  const view = viewProp ?? viewInternal;
  const setView = (v: MarketingViewMode) => {
    if (viewProp === undefined) setViewInternal(v);
    onViewChange?.(v);
  };
  const expanded = view === 'card';

  return (
    <div className="flex w-full flex-col items-center">
      <MarketingViewTabs view={view} onChange={setView} />
      <MarketingLetteringDualScene
        verified={false}
        incomingNumber={LETTERING_UNVERIFIED_SPOOF_NUMBER}
        expanded={expanded}
        setExpanded={(next) => setView(next ? 'card' : 'push')}
      />
      <p className="mt-4 max-w-[360px] text-center text-[11px] font-semibold text-red-200/80" style={{ wordBreak: 'keep-all' }}>
        VLUE 미등록 · <strong className="text-white">{LETTERING_UNVERIFIED_SPOOF_NUMBER}</strong>
      </p>
    </div>
  );
}

export function LetteringMarketingComparePanel({
  tab,
  onTabChange,
}: {
  tab: 'unverified' | PushExampleId;
  onTabChange: (t: 'unverified' | PushExampleId) => void;
}) {
  const tabs: { id: 'unverified' | PushExampleId; label: string }[] = [
    { id: 'unverified', label: `미인증자 ${LETTERING_UNVERIFIED_SPOOF_NUMBER}` },
    { id: 'police112', label: '112 경찰청' },
    { id: 'fss1332', label: '1332 금융감독원' },
  ];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`rounded-full px-4 py-2 text-[11px] font-black ${
              tab === t.id
                ? t.id === 'unverified'
                  ? 'bg-red-500/90 text-white'
                  : t.id === 'fss1332'
                    ? 'bg-amber-400 text-gray-900'
                    : 'bg-primary-500 text-white'
                : 'border border-white/15 bg-white/5 text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'unverified' ? (
        <LetteringUnverifiedBigPushPreview />
      ) : (
        <LetteringBigPushMarketingPreview exampleId={tab} />
      )}
    </div>
  );
}
