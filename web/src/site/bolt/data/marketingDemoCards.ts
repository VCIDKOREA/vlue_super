import { resolveLetteringDemoLogoUrl } from '../../../lib/letteringDemoAssets.js';

export type MarketingDemoCard = {
  organization: string;
  name: string;
  title: string;
  department: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  logoUrl: string;
  companyIntro: string;
  roleLine: string;
};

export const MARKETING_DEMO_CARDS = {
  police112: {
    organization: '경찰청',
    name: '112',
    title: '긴급신고',
    department: '국가공공기관 · VLUE 인증',
    phone: '112',
    fax: '02-3150-3114',
    email: '112@police.go.kr',
    website: 'police.go.kr',
    logoUrl: '',
    companyIntro:
      '국가공공 긴급신고 112입니다. VLUE 인증 명함으로 수신 화면 위 빅푸시에 기관이 확인됩니다.',
    roleLine: '긴급신고 / 112',
  },
  fss1332: {
    organization: '금융감독원',
    name: '',
    title: '금융민원',
    department: '대표번호 · VLUE 인증',
    phone: '1332',
    fax: '02-3145-8000',
    email: '1332@fss.or.kr',
    website: 'fss.or.kr',
    logoUrl: '',
    companyIntro:
      '금융감독원 금융민원센터 1332입니다. 유료 인증 기관은 Lettering 골드 톤으로 강조됩니다.',
    roleLine: '금융민원',
  },
} as const satisfies Record<string, MarketingDemoCard>;

export type PushExampleId = keyof typeof MARKETING_DEMO_CARDS;

export const LETTERING_UNVERIFIED_SPOOF_NUMBER = '010-0123-4567';

export const MARKETING_DEMO_META: Record<
  PushExampleId,
  { orgName: string; callDisplayNumber: string; label: string }
> = {
  police112: { orgName: '경찰청', callDisplayNumber: '112', label: '112 경찰청' },
  fss1332: { orgName: '금융감독원', callDisplayNumber: '1332', label: '1332 금융감독원' },
};

/** www 데모 → 앱 LetteringIncomingNotification card */
export function toLetteringAppCard(demo: MarketingDemoCard, id: PushExampleId) {
  const org = demo.organization;
  const name = demo.name.trim() || org;
  const base = {
    organization: org,
    name,
    displayName: name,
    title: demo.title,
    department: demo.department,
    phone: demo.phone,
    fax: demo.fax,
    email: demo.email,
    website: demo.website,
    photoUrl: '',
    companyIntro: demo.companyIntro,
    membershipTier: 'premium',
    feedId: `marketing-${id}`,
    feedType: 'company' as const,
    verificationItems: [
      'VLUE 명함 승인',
      '전화번호 일치 확인',
      '사업자 정보 확인',
    ],
  };
  return {
    ...base,
    logoUrl: resolveLetteringDemoLogoUrl(base),
  };
}
