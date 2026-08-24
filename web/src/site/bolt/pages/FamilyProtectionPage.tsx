import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  acceptFamilyProtectionLink,
  createFamilyProtectionLink,
  fetchFamilyProtection,
  lookupFamilyInviteCandidates,
  revokeFamilyProtectionLink,
} from '../../../lib/familyProtectionApi.js';
import { requestGuardianPassImpUid } from '../../../lib/parentalConsentApi.js';
import type { MarketingAuthUser } from '../components/AuthModal';
import type { View } from '../types';

const AFTER_LOGIN_KEY = 'vlue_after_login_view';

type FamilyLink = {
  id: string;
  status: string;
  familyRelation?: string;
  ward?: { publicHandle?: string; legalName?: string };
  guardian?: { publicHandle?: string; legalName?: string };
};

type FamilyData = {
  asGuardian?: FamilyLink[];
  asWard?: FamilyLink[];
  memberSlots?: {
    memberCount?: number;
    maxMembers?: number;
    baseMaxMembers?: number;
    isPaid?: boolean;
    canInvite?: boolean;
    extraMemberPackActive?: boolean;
  };
  canInviteFamily?: boolean;
  inviteBlockReason?: string | null;
  guide?: { summary?: string; steps?: string[] };
};

function displayUser(u?: { publicHandle?: string; legalName?: string }) {
  if (!u) return '회원';
  return u.legalName || (u.publicHandle ? `@${u.publicHandle.replace(/^@+/, '')}` : '') || '회원';
}

type Props = {
  user: MarketingAuthUser | null;
  onLoginClick: () => void;
  onNavigate: (view: View) => void;
};

type FamilyInviteCandidate = {
  userId: string;
  publicHandle?: string | null;
  displayName?: string;
  phoneMasked?: string | null;
  inviteKey?: string;
  alreadyLinked?: boolean;
  linkStatus?: string | null;
};

export default function FamilyProtectionPage({ user, onLoginClick, onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [data, setData] = useState<FamilyData | null>(null);
  const [msg, setMsg] = useState('');
  const [wardHandle, setWardHandle] = useState('');
  const [familyRelation, setFamilyRelation] = useState<'parent' | 'child'>('parent');
  const [candidates, setCandidates] = useState<FamilyInviteCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<FamilyInviteCandidate | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const d = (await fetchFamilyProtection()) as FamilyData;
      setData(d);
      setMsg('');
    } catch (e) {
      const err = e as Error & { message?: string };
      setMsg(err?.message || '가족 보호 정보를 불러오지 못했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const slots = data?.memberSlots;
  const slotMax =
    slots?.isPaid === false
      ? 0
      : slots?.maxMembers && slots.maxMembers > 0
        ? slots.maxMembers
        : slots?.baseMaxMembers || 4;
  const slotCount = slots?.memberCount ?? (data?.asGuardian?.length ?? 0) + 1;

  const onSearch = async () => {
    const q = wardHandle.trim();
    if (!q) {
      setMsg('가족 VLUE 아이디 또는 전화번호를 입력해 주세요.');
      return;
    }
    setSearchBusy(true);
    setMsg('');
    setSelectedCandidate(null);
    setCandidates([]);
    try {
      const res = (await lookupFamilyInviteCandidates(q)) as {
        candidates?: FamilyInviteCandidate[];
        message?: string;
      };
      const list = Array.isArray(res?.candidates) ? res.candidates : [];
      setCandidates(list);
      if (!list.length) {
        setMsg(res?.message || '일치하는 회원을 찾지 못했습니다.');
      } else if (list.length === 1 && !list[0].alreadyLinked) {
        setSelectedCandidate(list[0]);
      }
    } catch (e) {
      setMsg((e as Error)?.message || '조회에 실패했습니다.');
    } finally {
      setSearchBusy(false);
    }
  };

  const onInvite = async () => {
    const target = selectedCandidate || (candidates.length === 1 ? candidates[0] : null);
    const key = String(target?.inviteKey || target?.publicHandle || '').trim();
    if (!key) {
      setMsg('먼저 조회한 뒤 목록에서 가족을 선택해 주세요.');
      return;
    }
    if (target?.alreadyLinked) {
      setMsg('이미 등록·초대된 가족입니다.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      try {
        await createFamilyProtectionLink(key, familyRelation, undefined);
      } catch (first) {
        const fe = first as Error & { code?: string };
        if (familyRelation !== 'child' || fe?.code !== 'GUARDIAN_PASS_REQUIRED') {
          throw first;
        }
        const guardianImpUid = await requestGuardianPassImpUid();
        await createFamilyProtectionLink(key, familyRelation, guardianImpUid);
      }
      setWardHandle('');
      setCandidates([]);
      setSelectedCandidate(null);
      setMsg('초대를 보냈습니다. 상대가 앱에서 수락하면 보호가 시작됩니다.');
      await load();
      window.dispatchEvent(new CustomEvent('vlue-family-protection-changed'));
    } catch (e) {
      const err = e as Error & { message?: string; code?: string };
      setMsg(err?.message || '등록에 실패했습니다.');
      if (err?.code === 'FAMILY_FREE_TIER') {
        setMsg('유료 멤버십에서 가족 보호를 이용할 수 있습니다. 인증신청에서 요금제를 확인해 주세요.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async (linkId: string) => {
    setBusy(true);
    try {
      await acceptFamilyProtectionLink(linkId);
      setMsg('가족 보호 연결을 수락했습니다.');
      await load();
    } catch (e) {
      setMsg((e as Error)?.message || '수락 실패');
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (linkId: string) => {
    if (!window.confirm('이 가족 연결을 해제할까요?')) return;
    setBusy(true);
    try {
      await revokeFamilyProtectionLink(linkId);
      setMsg('연결을 해제했습니다.');
      await load();
    } catch (e) {
      setMsg((e as Error)?.message || '해제 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('pricing')}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          인증신청으로
        </button>

        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 sm:p-8 shadow-xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 opacity-90" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Family Protection</p>
              <h1 className="text-2xl sm:text-3xl font-black">가족구성원 등록</h1>
            </div>
          </div>
          <p className="text-sm text-indigo-50/95 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            앱과 동일한 @vlue/api로 연동됩니다. 웹에서 초대·수락하면 모바일·PC 앱에도 바로 반영됩니다.
          </p>
        </div>

        {!user ? (
          <div className="card p-8 text-center">
            <Users className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <p className="text-slate-800 font-bold mb-2">로그인 후 가족을 등록할 수 있습니다</p>
            <p className="text-sm text-slate-500 mb-6">VLUE 계정(아이디·비밀번호)으로 로그인해 주세요.</p>
            <button type="button" onClick={onLoginClick} className="btn-primary">
              로그인
            </button>
          </div>
        ) : loading ? (
          <div className="card p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {slots?.isPaid !== false ? (
              <div className="card p-5 mb-4 border-l-4 border-l-indigo-500">
                <p className="text-sm font-black text-slate-900">
                  가족 보호 인원: {slotCount} / {slotMax}명
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  유료 1대3 — 본인 포함 기본 4명. 5~8명은 추가 인원 패키지가 필요합니다.
                </p>
              </div>
            ) : (
              <div className="card p-5 mb-4 border-l-4 border-l-amber-400 bg-amber-50/80">
                <p className="text-sm font-bold text-amber-900">유료 멤버십 전용 기능입니다</p>
                <p className="text-xs text-amber-800 mt-1">가족 보호는 유료·기업 회원에게 제공됩니다.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('pricing')}
                  className="mt-3 text-xs font-bold text-primary-600 hover:underline"
                >
                  요금제 보기 →
                </button>
              </div>
            )}

            {data?.guide ? (
              <div className="card p-4 mb-4 bg-blue-50/80 border-blue-100">
                <p className="text-xs font-bold text-blue-900">이용 방법</p>
                <p className="text-xs text-blue-800 mt-1">{data.guide.summary}</p>
                {data.guide.steps?.length ? (
                  <ol className="mt-2 list-decimal pl-4 text-[11px] text-blue-900/90 space-y-0.5">
                    {data.guide.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}

            <div className="card p-5 sm:p-6 mb-4">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                가족 초대
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {(['parent', 'child'] as const).map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => setFamilyRelation(rel)}
                    className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
                      familyRelation === rel
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {rel === 'parent' ? '부모(노부모) 보호' : '자녀 보호'}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">가족 VLUE 아이디 · 전화번호</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="tel"
                  value={wardHandle}
                  onChange={(e) => {
                    setWardHandle(e.target.value);
                    setCandidates([]);
                    setSelectedCandidate(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void onSearch();
                    }
                  }}
                  placeholder="예: honggildong, 010-1234-5678"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:border-primary-400 focus:outline-none"
                  disabled={busy || searchBusy || data?.canInviteFamily === false}
                />
                <button
                  type="button"
                  onClick={() => void onSearch()}
                  disabled={busy || searchBusy || data?.canInviteFamily === false || !wardHandle.trim()}
                  className="shrink-0 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 px-6 py-3 text-sm font-bold text-white"
                >
                  {searchBusy ? '조회 중…' : '조회'}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                먼저 조회해 이름·아이디를 확인한 뒤 초대해 주세요.
              </p>
              {candidates.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {candidates.map((c) => {
                    const selected = selectedCandidate?.userId === c.userId;
                    return (
                      <li key={c.userId}>
                        <button
                          type="button"
                          disabled={Boolean(c.alreadyLinked)}
                          onClick={() => setSelectedCandidate(c)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left ${
                            c.alreadyLinked
                              ? 'border-slate-100 bg-slate-50 opacity-70'
                              : selected
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{c.displayName || '회원'}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {c.publicHandle ? `@${c.publicHandle}` : '아이디 없음'}
                              {c.phoneMasked ? ` · ${c.phoneMasked}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] font-bold text-slate-500">
                            {c.alreadyLinked ? (c.linkStatus === 'pending' ? '초대 중' : '등록됨') : selected ? '선택됨' : '선택'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => void onInvite()}
                disabled={
                  busy ||
                  searchBusy ||
                  data?.canInviteFamily === false ||
                  (!selectedCandidate && candidates.length !== 1) ||
                  Boolean(selectedCandidate?.alreadyLinked)
                }
                className="mt-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-3 text-sm font-bold text-white"
              >
                {busy ? '처리 중…' : '선택한 가족 초대'}
              </button>
              {data?.inviteBlockReason ? (
                <p className="mt-2 text-xs text-amber-700">{data.inviteBlockReason}</p>
              ) : null}
            </div>

            {(data?.asGuardian?.length ?? 0) > 0 ? (
              <div className="card p-5 mb-4">
                <h2 className="text-sm font-black text-slate-900 mb-3">내가 보호하는 가족</h2>
                <ul className="space-y-2">
                  {data!.asGuardian!.map((link) => (
                    <li
                      key={link.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{displayUser(link.ward)}</p>
                        <p className="text-[11px] text-slate-500">
                          {link.familyRelation === 'child' ? '자녀' : '부모(노부모)'} · {link.status}
                        </p>
                      </div>
                      {link.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => onRevoke(link.id)}
                          className="text-xs font-bold text-slate-500 hover:text-red-600"
                        >
                          초대 취소
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRevoke(link.id)}
                          className="text-xs font-bold text-slate-500 hover:text-red-600"
                        >
                          해제
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(data?.asWard?.length ?? 0) > 0 ? (
              <div className="card p-5 mb-4">
                <h2 className="text-sm font-black text-slate-900 mb-3">나를 보호하는 가족</h2>
                <ul className="space-y-2">
                  {data!.asWard!.map((link) => (
                    <li
                      key={link.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{displayUser(link.guardian)}</p>
                        <p className="text-[11px] text-slate-500">{link.status}</p>
                      </div>
                      {link.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => onAccept(link.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          수락
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {msg ? (
              <p className="text-sm font-medium text-center text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3">
                {msg}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => onNavigate('download')}
                className="text-sm font-bold text-primary-600 hover:underline"
              >
                모바일·PC 설치 안내 →
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export { AFTER_LOGIN_KEY };
