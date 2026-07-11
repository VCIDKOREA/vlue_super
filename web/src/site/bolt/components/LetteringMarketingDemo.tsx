import { useCallback, useState } from 'react';
import LetteringIncomingNotification from '../../../components/LetteringIncomingNotification.jsx';
import {
  MARKETING_DEMO_CARDS,
  MARKETING_DEMO_META,
  LETTERING_UNVERIFIED_SPOOF_NUMBER,
  toLetteringAppCard,
  type PushExampleId,
} from '../data/marketingDemoCards';
import { VLUE_SHOWCASE_DEMO_RECORDING_SEC } from '../../../lib/vlueShowcaseCard.js';

/** 접힘 바 vs 풀 쇼케이스 펼침 */
export type MarketingViewMode = 'push' | 'card';

export type ShowcaseDemoGrade = PushExampleId | 'unverified';

export const PUSH_EXAMPLES = MARKETING_DEMO_META;
export { LETTERING_UNVERIFIED_SPOOF_NUMBER };

export const BIG_PUSH_FLOW_STEPS = [
  { step: '1', title: '쇼케이스 바', desc: '통화 화면 위 VLUE 쇼케이스 요약.' },
  { step: '2', title: '풀 쇼케이스', desc: '앱과 동일 — 디지털인증명함·배너 캐러셀.' },
  { step: '3', title: 'Galaxy · iPhone', desc: 'OS별 동일 UX.' },
] as const;

export const SHOWCASE_FLOW_STEPS = BIG_PUSH_FLOW_STEPS;

const DEMO_DURATION_SEC = VLUE_SHOWCASE_DEMO_RECORDING_SEC;

function MarketingViewTabs({
  view,
  onChange,
}: {
  view: MarketingViewMode;
  onChange: (v: MarketingViewMode) => void;
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
        ① 쇼케이스 바
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`rounded-full px-4 py-2 text-[11px] font-black ${
          view === 'card' ? 'bg-amber-400 text-gray-900 shadow-md' : 'border border-white/20 bg-white/5 text-white/70'
        }`}
      >
        ② 풀 쇼케이스
      </button>
    </div>
  );
}

/**
 * 앱 CallBigPushPreviewSection 펼침과 동일 — Midnight Glass 풀 쇼케이스
 * (마케팅용: fixed 전체화면 대신 폰 프레임에 임베드)
 */
function MarketingAppShowcasePhone({
  platform,
  verified,
  card,
  incomingNumber,
  expanded,
  setExpanded,
}: {
  platform: 'android' | 'ios';
  verified: boolean;
  card?: Record<string, unknown> | null;
  incomingNumber: string;
  expanded: boolean;
  setExpanded: (next: boolean) => void;
}) {
  const showToast = useCallback(() => {}, []);
  const isPaid = verified && Boolean(card);

  return (
    <div
      className="vlue-marketing-showcase-phone"
      data-platform={platform}
      data-expanded={expanded ? 'true' : 'false'}
    >
      <span className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
        {platform === 'android' ? 'Galaxy' : 'iPhone'}
      </span>
      <div className="lettering-showcase-fs lettering-showcase-fs--marketing-embed">
        <div className="lettering-showcase-fs__shell">
          <LetteringIncomingNotification
            className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent"
            previewMode
            verified={verified}
            callPhase={isPaid || expanded ? 'connected' : 'ringing'}
            platform={platform}
            isRecording={isPaid}
            callDurationSec={isPaid ? DEMO_DURATION_SEC : 0}
            recordingDurationSec={isPaid ? DEMO_DURATION_SEC : 0}
            incomingNumber={incomingNumber}
            savedContactName=""
            isKnownContact={verified}
            card={card || undefined}
            expanded={expanded}
            onExpandedChange={setExpanded}
            onEndCall={() => setExpanded(false)}
            onToast={showToast}
            hideUnverifiedFooter
          />
        </div>
      </div>
    </div>
  );
}

function MarketingShowcaseDual({
  verified,
  card,
  incomingNumber,
  expanded,
  setExpanded,
}: {
  verified: boolean;
  card?: Record<string, unknown> | null;
  incomingNumber: string;
  expanded: boolean;
  setExpanded: (next: boolean) => void;
}) {
  return (
    <div className="vlue-marketing-dual">
      {(['android', 'ios'] as const).map((platform) => (
        <div key={platform} className="vlue-marketing-lettering-cell">
          <MarketingAppShowcasePhone
            platform={platform}
            verified={verified}
            card={card}
            incomingNumber={incomingNumber}
            expanded={expanded}
            setExpanded={setExpanded}
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

/** 112 · 1332 — 앱과 동일 풀 쇼케이스(글래스) */
export function LetteringBigPushMarketingPreview({
  exampleId,
  view: viewProp,
  defaultView = 'card',
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
      <MarketingShowcaseDual
        verified
        card={card}
        incomingNumber={meta.callDisplayNumber}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <p className="mt-4 max-w-[360px] text-center text-[11px] font-semibold text-white/55" style={{ wordBreak: 'keep-all' }}>
        {view === 'push' ? (
          <>
            쇼케이스 바 · <strong className="text-white">{meta.callDisplayNumber}</strong> ·{' '}
            <strong className="text-primary-200">{meta.orgName}</strong>
          </>
        ) : (
          <>풀 쇼케이스 · 디지털인증명함 · {meta.label} (앱과 동일)</>
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
      <MarketingShowcaseDual
        verified={false}
        card={null}
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

/** 인증신청 — 112 / 1332 / 미인증자 (앱 풀 쇼케이스 UI) */
export function ShowcaseMarketingPreview({
  grade,
  view: viewProp,
  defaultView = 'card',
  onViewChange,
}: {
  grade: ShowcaseDemoGrade;
  view?: MarketingViewMode;
  defaultView?: MarketingViewMode;
  onViewChange?: (v: MarketingViewMode) => void;
}) {
  if (grade === 'unverified') {
    return (
      <LetteringUnverifiedBigPushPreview
        view={viewProp}
        defaultView={viewProp ? undefined : 'push'}
        onViewChange={onViewChange}
      />
    );
  }
  return (
    <LetteringBigPushMarketingPreview
      exampleId={grade}
      view={viewProp}
      defaultView={defaultView}
      onViewChange={onViewChange}
    />
  );
}

export function LetteringMarketingComparePanel({
  tab,
  onTabChange,
}: {
  tab: ShowcaseDemoGrade;
  onTabChange: (t: ShowcaseDemoGrade) => void;
}) {
  const tabs: { id: ShowcaseDemoGrade; label: string }[] = [
    { id: 'police112', label: '112 경찰청' },
    { id: 'fss1332', label: '1332 금융감독원' },
    { id: 'unverified', label: `미인증자 ${LETTERING_UNVERIFIED_SPOOF_NUMBER}` },
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
      <ShowcaseMarketingPreview grade={tab} defaultView="card" />
    </div>
  );
}
