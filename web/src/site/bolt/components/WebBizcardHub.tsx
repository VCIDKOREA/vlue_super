import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Phone, Building2, User } from 'lucide-react';
import '../../../styles.css';
import { B2bMembershipProvider } from '../../../context/B2bMembershipContext.jsx';
import MyPageDigitalLetteringSection from '../../../components/MyPageDigitalLetteringSection.jsx';
import LetteringBizcardSettingsView from '../../../components/LetteringBizcardSettingsView.jsx';
import LetteringSettingsSection from '../../../components/LetteringSettingsSection.jsx';
import EnterpriseLineManagePanel from '../../../components/EnterpriseLineManagePanel.jsx';
import ShowcaseStyleSettingsSheet from '../../../components/showcase/ShowcaseStyleSettingsSheet.jsx';
import ShowcaseStyleSettingsPanel from '../../../components/showcase/ShowcaseStyleSettingsPanel.jsx';
import WebUserLetteringPreview from './WebUserLetteringPreview';
import {
  readDigitalCardActive,
  readMembershipTier,
  readVcidBroadcastOn,
  syncBizcardAccountFromApi,
  writeVcidBroadcastOn,
} from '../../../lib/bizcardAccountSync.js';
import {
  readLetteringFixedIdentity,
  LETTERING_BIZCARD_CHANGED_EVENT,
  LETTERING_OPEN_BIZCARD_SETTINGS_EVENT,
} from '../../../lib/letteringBizcardStorage.js';
import { fetchDigitalCardMeta } from '../../../lib/digitalCardApi.js';
import { probeEnterpriseSidebarAccess } from '../../../lib/enterpriseLineManageAccess.js';
import { formatPhoneE164ForKoreaDisplay } from '../../../lib/phoneDisplay.js';
import { isPaidLetteringTier } from '../../../lib/letteringMembership.js';
import type { MarketingAuthUser } from './AuthModal';

type TabKey = 'card' | 'lettering' | 'enterprise';
type CardSubview = 'hub' | 'edit';

function BizcardBroadcastToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="mkt-bizcard-toggle-row flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">쇼케이스 송출</p>
        <p className={`text-xs font-semibold mt-0.5 ${on ? 'text-blue-600' : 'text-red-600'}`}>
          {on ? '켜짐 — 통화 중 쇼케이스가 송출됩니다.' : '꺼짐 — 통화 중 쇼케이스 송출이 꺼졌습니다.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="쇼케이스 송출"
        data-on={on ? 'true' : 'false'}
        className="mkt-bizcard-toggle"
        onClick={() => onChange(!on)}
      >
        <span className="mkt-bizcard-toggle__knob" aria-hidden />
      </button>
    </div>
  );
}

function AccountSummaryCard({
  user,
  membershipTier,
  businessCards,
}: {
  user: MarketingAuthUser;
  membershipTier: string;
  businessCards: Array<{ kind?: string; phone_e164?: string; display_name?: string }>;
}) {
  const fixed = readLetteringFixedIdentity();
  const displayName = fixed.name || user.legalName || user.email;
  const org = fixed.organization || '—';
  const phone = fixed.phone || '—';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-black text-slate-900">내 계정 정보</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400">성명</p>
            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400">기관·회사</p>
            <p className="text-sm font-bold text-slate-900 truncate">{org}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400">대표 번호</p>
            <p className="text-sm font-bold text-slate-900 tabular-nums">{phone}</p>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        등급 <span className="font-bold text-slate-700">{membershipTier}</span>
        {user.loginId ? (
          <>
            {' '}
            · ID <span className="font-bold text-slate-700">@{user.loginId}</span>
          </>
        ) : null}
      </p>
      {businessCards.length > 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-[11px] font-black text-slate-700 mb-2">등록된 발신 번호</p>
          <ul className="space-y-1.5">
            {businessCards.map((c) => (
              <li key={c.phone_e164 || c.kind} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-slate-800 tabular-nums">
                  {formatPhoneE164ForKoreaDisplay(c.phone_e164 || '') || '—'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{c.kind || 'line'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function WebBizcardHubInner({
  user,
  autoOpenShowcase = false,
}: {
  user: MarketingAuthUser;
  autoOpenShowcase?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('card');
  const [cardSubview, setCardSubview] = useState<CardSubview>('hub');
  const [showcaseSheetOpen, setShowcaseSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [syncTick, setSyncTick] = useState(0);

  const [membershipTier, setMembershipTier] = useState(() => readMembershipTier());
  const [digitalCardActive, setDigitalCardActive] = useState(() => readDigitalCardActive());
  const [digitalCardIssued, setDigitalCardIssued] = useState(true);
  const [isVCIDOn, setIsVCIDOn] = useState(() => readVcidBroadcastOn());
  const [businessCards, setBusinessCards] = useState<Array<{ kind?: string; phone_e164?: string; display_name?: string }>>([]);
  const [enterpriseAccess, setEnterpriseAccess] = useState<{ canManage: boolean; isEnterprise: boolean }>({
    canManage: false,
    isEnterprise: false,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2800);
  }, []);

  const floatingToast =
    toast ? (
      <div
        className="pointer-events-none fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[400] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl bg-slate-900/95 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg"
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    ) : null;

  const refreshAccount = useCallback(async () => {
    setLoading(true);
    try {
      const result = await syncBizcardAccountFromApi();
      setMembershipTier(result.membershipTier || readMembershipTier());
      setBusinessCards(result.businessCards || []);
      const meta = result.digitalMeta;
      setDigitalCardIssued(meta?.issued !== false);
      if (meta?.issued) setDigitalCardActive(readDigitalCardActive());
      const access = await probeEnterpriseSidebarAccess(result.membershipTier);
      setEnterpriseAccess({
        canManage: Boolean(access?.canManage),
        isEnterprise: Boolean(access?.isEnterpriseMember),
      });
      setSyncTick((n) => n + 1);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '계정 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  useEffect(() => {
    const onVcid = () => setIsVCIDOn(readVcidBroadcastOn());
    const onCard = () => {
      setDigitalCardActive(readDigitalCardActive());
      void fetchDigitalCardMeta().then((meta) => setDigitalCardIssued(meta.issued !== false));
      setSyncTick((n) => n + 1);
    };
    const onBizcard = () => setSyncTick((n) => n + 1);
    const onOpenBizcardSettings = () => {
      setCardSubview('edit');
      showToast('디지털인증명함 설정으로 이동합니다. 프로필 사진·연락처는 여기서 저장해야 미리보기에 반영됩니다.');
    };
    window.addEventListener('vlue-vcid-changed', onVcid);
    window.addEventListener('vlue-digital-card-changed', onCard);
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, onBizcard);
    window.addEventListener(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT, onOpenBizcardSettings);
    return () => {
      window.removeEventListener('vlue-vcid-changed', onVcid);
      window.removeEventListener('vlue-digital-card-changed', onCard);
      window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, onBizcard);
      window.removeEventListener(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT, onOpenBizcardSettings);
    };
  }, [showToast]);

  const hasDigitalCertCard = useMemo(
    () => Boolean(digitalCardActive) && digitalCardIssued !== false,
    [digitalCardActive, digitalCardIssued]
  );

  const handleToggleBroadcast = (next: boolean) => {
    writeVcidBroadcastOn(next);
    setIsVCIDOn(next);
    showToast(next ? '통화 중 쇼케이스가 송출됩니다.' : '통화 중 쇼케이스 송출이 꺼졌습니다.');
  };

  const handleApplyDigitalCard = () => {
    if (!isPaidLetteringTier(membershipTier)) {
      showToast('디지털인증명함은 유료 회원만 신청할 수 있습니다. 등급 변경 페이지로 이동해 주세요.');
      window.location.assign('/pricing');
      return;
    }
    setCardSubview('edit');
  };

  const tabs = useMemo(() => {
    const base: { key: TabKey; label: string }[] = [
      { key: 'card', label: '디지털인증명함' },
      { key: 'lettering', label: '레터링 서비스' },
    ];
    if (enterpriseAccess.canManage) {
      base.push({ key: 'enterprise', label: '기업 회선 관리' });
    }
    return base;
  }, [enterpriseAccess.canManage]);

  if (loading && syncTick === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        내 명함 정보 불러오는 중…
      </div>
    );
  }

  if (cardSubview === 'edit') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[70vh]">
        <LetteringBizcardSettingsView
          membershipTier={membershipTier}
          isDarkMode={false}
          isFirstApply={!hasDigitalCertCard}
          onBack={() => {
            setCardSubview('hub');
            void refreshAccount();
          }}
          onApplied={() => {
            setDigitalCardActive(readDigitalCardActive());
            setDigitalCardIssued(true);
            void refreshAccount();
          }}
        />
      </div>
    );
  }

  /* www #showcase — 미리보기|설정 2열. 명함 설정(edit)은 위에서 처리 */
  if (autoOpenShowcase) {
    return (
      <div className="space-y-4">
        {floatingToast}
        <ShowcaseStyleSettingsPanel
          layout="webDesk"
          membershipTier={membershipTier}
          isDarkMode={false}
          hideHeader
          onOpenUpgrade={() => window.location.assign('/pricing')}
          onToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {floatingToast}

      <div className="mkt-pill-row--wrap flex flex-wrap border-b border-gray-200">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 sm:px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === key ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'card' && (
        <div className="space-y-4">
          <AccountSummaryCard user={user} membershipTier={membershipTier} businessCards={businessCards} />

          <BizcardBroadcastToggle
            on={isVCIDOn}
            onChange={handleToggleBroadcast}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-900">디지털인증명함</p>
              <button
                type="button"
                onClick={handleApplyDigitalCard}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-cyan-800 hover:bg-slate-200"
              >
                <Pencil className="w-3 h-3" />
                {hasDigitalCertCard ? '수정' : '신청'}
              </button>
            </div>
            <MyPageDigitalLetteringSection
              key={syncTick}
              membershipTier={membershipTier}
              digitalCardActive={digitalCardActive}
              digitalCardIssued={digitalCardIssued}
              isVCIDOn={isVCIDOn}
              isDarkMode={false}
              onApplyDigitalCard={handleApplyDigitalCard}
              onEditLettering={() => setCardSubview('edit')}
              onOpenShowcaseStyle={() => setShowcaseSheetOpen(true)}
              onToast={showToast}
            />
          </div>

          {enterpriseAccess.isEnterprise && !enterpriseAccess.canManage ? (
            <p className="text-xs text-slate-500 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              기업 회선 추가·수정은 대표(MASTER) 또는 대리인(MANAGER) 계정에서만 가능합니다.
            </p>
          ) : null}
        </div>
      )}

      {activeTab === 'lettering' && (
        <div className="space-y-4">
          <AccountSummaryCard user={user} membershipTier={membershipTier} businessCards={businessCards} />

          <div className="overflow-visible rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-5 sm:p-8">
            <p className="text-center text-sm text-white/70 mb-4" style={{ wordBreak: 'keep-all' }}>
              내 번호·기관명 기준 — 통화 화면에 표시되는 <strong className="text-white">실제 레터링</strong> 미리보기
            </p>
            <WebUserLetteringPreview membershipTier={membershipTier} hasDigitalCertCard={hasDigitalCertCard} />
          </div>

          <LetteringSettingsSection isDarkMode={false} onNotice={showToast} variant="web" />
        </div>
      )}

      {activeTab === 'enterprise' && enterpriseAccess.canManage && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[60vh] web-bizcard-enterprise">
          <EnterpriseLineManagePanel
            isDarkMode={false}
            onBack={() => setActiveTab('card')}
            onToast={showToast}
          />
        </div>
      )}

      <ShowcaseStyleSettingsSheet
        open={showcaseSheetOpen}
        onClose={() => setShowcaseSheetOpen(false)}
        membershipTier={membershipTier}
        isDarkMode={false}
        onOpenUpgrade={() => {
          setShowcaseSheetOpen(false);
          window.location.assign('/pricing');
        }}
        onToast={showToast}
      />
    </div>
  );
}

export default function WebBizcardHub({
  user,
  autoOpenShowcase = false,
}: {
  user: MarketingAuthUser;
  autoOpenShowcase?: boolean;
}) {
  return (
    <B2bMembershipProvider enabled>
      <WebBizcardHubInner user={user} autoOpenShowcase={autoOpenShowcase} />
    </B2bMembershipProvider>
  );
}
