import { useCallback, useEffect, useState } from 'react';
import VlueEmailSettingsSection from '../../../components/settings/VlueEmailSettingsSection.jsx';
import VlueUnifiedInboxScreen from '../../../components/email/VlueUnifiedInboxScreen.jsx';
import { normalizeMembershipKind } from '../../../lib/membershipBm.js';
import type { View } from '../types';

interface MarketingEmailSettingsPageProps {
  user: { email: string } | null;
  onBack: () => void;
  onNavigate: (view: View) => void;
  onLoginClick: () => void;
}

function readMembershipTier() {
  try {
    const raw =
      localStorage.getItem('vlue_membership_tier') ||
      localStorage.getItem('membershipTier') ||
      'free';
    const k = normalizeMembershipKind(raw);
    return k === 'paid' || k === 'b2b' ? k : 'free';
  } catch {
    return 'free';
  }
}

type MailTab = 'inbox' | 'settings';

export default function MarketingEmailSettingsPage({
  user,
  onBack,
  onNavigate,
  onLoginClick
}: MarketingEmailSettingsPageProps) {
  const [membershipTier, setMembershipTier] = useState(readMembershipTier);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<MailTab>('inbox');

  useEffect(() => {
    setMembershipTier(readMembershipTier());
  }, [user]);

  const companyName = String(localStorage.getItem('vlue_company_locked') || '').trim();

  if (tab === 'inbox' && user) {
    return (
      <VlueUnifiedInboxScreen
        open
        isDarkMode={false}
        onClose={onBack}
        onOpenSettings={() => setTab('settings')}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] pt-[var(--mkt-nav-h,3.75rem)]">
      {user ? (
        <div className="mx-auto flex max-w-lg gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={() => setTab('inbox')}
            className="vlue-promo-card__cta vlue-promo-card__cta--primary flex-1"
          >
            통합 메일함
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className="vlue-promo-card__cta flex-1 border border-[#e8eaed] bg-white"
          >
            메일 설정
          </button>
        </div>
      ) : null}
      {!user ? (
        <div className="mx-auto max-w-lg px-4 pt-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3.5">
            <p className="vlue-type-body text-amber-950">
              로그인 후 가상 메일·통합 메일함을 사용할 수 있습니다.{' '}
              <button
                type="button"
                onClick={onLoginClick}
                className="font-medium text-amber-800 underline underline-offset-2"
              >
                로그인
              </button>
            </p>
          </div>
        </div>
      ) : null}
      {notice ? (
        <p className="vlue-type-caption mx-auto max-w-lg px-4 pt-2 text-center font-medium text-primary-600">
          {notice}
        </p>
      ) : null}
      <div className="mx-auto max-w-lg">
        <VlueEmailSettingsSection
          isDarkMode={false}
          membershipTier={membershipTier}
          companyName={companyName}
          onBack={onBack}
          onOpenUpgrade={() => onNavigate('pricing')}
          showSettingNotice={(msg) => {
            if (!msg) return;
            setNotice(msg);
            window.setTimeout(() => setNotice(''), 2800);
          }}
        />
      </div>
    </main>
  );
}
