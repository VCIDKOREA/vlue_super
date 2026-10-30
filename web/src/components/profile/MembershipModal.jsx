import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isVlueKidsApp } from "../../lib/vlueKidsApp.js";
import {
  formatKrw,
  isPaidMembershipKind,
  isB2bMembershipKind,
  normalizeMembershipKind,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_EVENT_MONTHLY_KRW,
  PAID_REFERRAL_MONTHLY_KRW,
  EXTENSION_LINE_MONTHLY_KRW,
  EXTENSION_LINE_NO_REFERRAL_NOTE,
  MULTI_PROFILE_ADDON_MONTHLY_KRW,
  MULTI_PROFILE_ADDON_NO_DISCOUNT_NOTE,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_STAFF_REFERRAL_MONTHLY_KRW
} from "../../lib/membershipBm.js";

const PLAN_BENEFITS = [
  {
    icon: "🛡️",
    title: "가족보호 · 골든타임",
    desc: "본인 및 가족 실시간 위치·이동 경로·안심 귀가, 기기 미작동/앱 미접속 골든타임, 원터치 SOS",
    tag: "핵심"
  },
  {
    icon: "📱",
    title: "무제한 블루 쇼케이스",
    desc: "통화 수신·발신 화면에 고화질 영상·포트폴리오·디지털 명함을 트래픽 제한 없이 송출",
    tag: "대표기능"
  },
  {
    icon: "🎵",
    title: "BGM · 프리미엄 사운드",
    desc: "통신사 컬러링과 독립된 맞춤 배경음악 및 보이스 레터링",
    tag: "프리미엄"
  },
  {
    icon: "🔒",
    title: "안심 차단 · 공식 인증 배지",
    desc: "피싱 의심 번호 탐지와 VLUÉ 공인 인증 마크로 수신자에게 신뢰 제공",
    tag: "보안"
  }
];

const B2B_BENEFITS = [
  {
    icon: "🏢",
    title: "기업 CI/BI · 단체 인증명함",
    desc: "사명·로고·공식 인증마크가 적용된 디지털 명함을 임직원에게 일괄 배포",
    tag: "기업전용"
  },
  {
    icon: "👥",
    title: "임직원 회선 무제한 쇼케이스",
    desc: "영업·상담 통화 시 회사 소개 영상·프로모션·바로연결을 동시 송출",
    tag: "영업강화"
  },
  {
    icon: "📊",
    title: "중앙 관리자 대시보드",
    desc: "조직도 기반 회선 등록·라이선스 통합 관리 및 세금계산서 연동",
    tag: "통합관리"
  }
];

const GOLDEN_TIME_BENEFITS = [
  {
    icon: "⏱️",
    title: "골든타임 감지",
    desc: "기기 미작동 또는 VLUE 앱 미접속 기준을 선택해 이상 징후를 감지합니다."
  },
  {
    icon: "📞",
    title: "부재중 · 장통화 알림",
    desc: "부재중 누적·모르는 번호 장통화 시 보호자에게 즉시 알립니다."
  },
  {
    icon: "🛡️",
    title: "원격보안 연동",
    desc: "유해사이트·원격보안 설정과 함께 가족 보호 슬롯을 운영합니다."
  }
];

function statusLabel(kind) {
  if (isB2bMembershipKind(kind)) return "B2B 멤버십 활성화";
  if (isPaidMembershipKind(kind)) return "프리미엄 멤버십 활성화";
  return "일반 회원";
}

function badgeLabel(kind) {
  if (isB2bMembershipKind(kind)) return "B2B 인증배지";
  if (isPaidMembershipKind(kind)) return "프리미엄 인증배지";
  return "기본";
}

/**
 * [VLUÉ] 멤버십 혜택 카탈로그 · 계정 권한 상태 표시
 * Play 정책: 결제 CTA·외부 결제 유도 문구 없음. 권한은 웹 결제 후 백엔드 동기화로만 반영.
 */
export default function MembershipModal({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false
}) {
  const currentKind = normalizeMembershipKind(membershipTier);
  const [selectedCategory, setSelectedCategory] = useState(
    isB2bMembershipKind(currentKind) ? "b2b" : "paid"
  );

  useEffect(() => {
    if (!open) return;
    setSelectedCategory(isB2bMembershipKind(currentKind) ? "b2b" : "paid");
  }, [currentKind, open]);

  if (!open || isVlueKidsApp()) return null;

  const panelBg = isDarkMode
    ? "bg-[#141722] border-white/10 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";
  const subTextCls = isDarkMode ? "text-slate-400" : "text-slate-500";
  const paidActive = isPaidMembershipKind(currentKind) || isB2bMembershipKind(currentKind);

  const handleTabClick = (e, category) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setSelectedCategory(category);
  };

  const handleCloseExplicit = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onClose?.();
  };

  const benefitCard = (item, idx, accent = "slate") => (
    <div
      key={idx}
      className={`rounded-2xl border p-3.5 ${
        isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200/90 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[17px]">{item.icon}</span>
        <h4 className="text-[13px] font-semibold tracking-tight">{item.title}</h4>
        {item.tag ? (
          <span
            className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
              accent === "amber"
                ? "bg-amber-500/10 text-amber-700"
                : isDarkMode
                  ? "bg-white/10 text-slate-300"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {item.tag}
          </span>
        ) : null}
      </div>
      <p className={`mt-1.5 text-[11px] leading-relaxed ${subTextCls}`}>{item.desc}</p>
    </div>
  );

  const content = (
    <div
      className="fixed inset-0 z-[50000] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      style={{ letterSpacing: "-0.02em" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${panelBg}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          }`}
        >
          <div>
            <span className="text-[11px] font-medium text-blue-600 tracking-tight">
              VLUÉ MEMBERSHIP
            </span>
            <h2 className="text-[17px] font-semibold tracking-tight mt-0.5">혜택 안내 · 멤버십 상태</h2>
          </div>
          <button
            type="button"
            onClick={handleCloseExplicit}
            className={`rounded-full p-2 text-xl leading-none transition-colors ${
              isDarkMode ? "text-slate-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 overscroll-contain">
          <div
            className={`mb-5 rounded-2xl border p-4 ${
              paidActive
                ? isDarkMode
                  ? "border-emerald-500/40 bg-emerald-950/30"
                  : "border-emerald-200 bg-emerald-50"
                : isDarkMode
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500">현재 계정 권한</p>
            <p
              className={`mt-1 text-[16px] font-bold ${
                paidActive ? "text-emerald-700 dark:text-emerald-300" : ""
              }`}
            >
              {statusLabel(currentKind)}
            </p>
            <p className={`mt-1 text-[12px] ${subTextCls}`}>
              인증 배지: <span className="font-semibold text-blue-600">{badgeLabel(currentKind)}</span>
              {paidActive
                ? " · 프리미엄·골든타임 기능을 바로 이용할 수 있습니다."
                : " · 유료 권한은 계정에 동기화된 뒤 자동으로 반영됩니다."}
            </p>
          </div>

          <div
            className={`grid grid-cols-4 rounded-2xl p-1 border ${
              isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100/90 border-slate-200/60"
            }`}
          >
            {[
              ["paid", "유료 혜택"],
              ["family", "골든타임"],
              ["b2b", "B2B"],
              ["addons", "확장"]
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={(e) => handleTabClick(e, id)}
                className={`rounded-xl py-2 text-[11px] font-semibold transition-all ${
                  selectedCategory === id
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedCategory === "paid" && (
            <div className="mt-5 space-y-4">
              <div
                className={`rounded-2xl border p-5 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-950/40 via-blue-900/20 to-slate-900/40 border-blue-500/30"
                    : "bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50/30 border-blue-200"
                }`}
              >
                <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white">
                  BEST · 프리미엄 올인원
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[24px] font-semibold text-blue-600 tabular-nums">
                    {formatKrw(PAID_EVENT_MONTHLY_KRW)}
                  </span>
                  <span className={`text-[13px] ${subTextCls}`}>/월 안내가</span>
                  <span className="text-[12px] text-slate-400 line-through ml-auto">
                    {formatKrw(PAID_LIST_PRICE_MONTHLY_KRW)}
                  </span>
                </div>
                <p className={`mt-2 text-[12px] leading-relaxed ${subTextCls}`}>
                  추천인 적용 시 안내가 {formatKrw(PAID_REFERRAL_MONTHLY_KRW)}/월 · 권한은 계정 동기화로
                  반영됩니다.
                </p>
              </div>
              <div className="space-y-2.5">{PLAN_BENEFITS.map((item, idx) => benefitCard(item, idx))}</div>
            </div>
          )}

          {selectedCategory === "family" && (
            <div className="mt-5 space-y-4">
              <div
                className={`rounded-2xl border p-5 ${
                  isDarkMode
                    ? "border-cyan-500/30 bg-cyan-950/20"
                    : "border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50"
                }`}
              >
                <span className="inline-flex rounded-full bg-cyan-600 px-2.5 py-1 text-[11px] font-medium text-white">
                  골든타임 가족보호
                </span>
                <p className={`mt-3 text-[13px] leading-relaxed ${subTextCls}`}>
                  프리미엄 계정에 연동되는 가족 보호·골든타임 기능 안내입니다. 활성화된 계정에서는 설정
                  화면에서 바로 이용할 수 있습니다.
                </p>
              </div>
              <div className="space-y-2.5">
                {GOLDEN_TIME_BENEFITS.map((item, idx) => benefitCard(item, idx))}
              </div>
            </div>
          )}

          {selectedCategory === "b2b" && (
            <div className="mt-5 space-y-4">
              <div
                className={`rounded-2xl border p-5 ${
                  isDarkMode
                    ? "border-amber-500/30 bg-amber-950/20"
                    : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40"
                }`}
              >
                <span className="inline-flex rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950">
                  B2B 기업 전용
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[22px] font-semibold text-amber-700 tabular-nums">
                    {formatKrw(B2B_STAFF_EVENT_MONTHLY_KRW)}
                  </span>
                  <span className={`text-[12px] ${subTextCls}`}>/모바일 회선 안내가</span>
                </div>
                <p className={`mt-2 text-[12px] ${subTextCls}`}>
                  대표자 {formatKrw(B2B_REP_LIST_MONTHLY_KRW)} · 추천 시 모바일{" "}
                  {formatKrw(B2B_STAFF_REFERRAL_MONTHLY_KRW)}
                </p>
              </div>
              <div className="space-y-2.5">
                {B2B_BENEFITS.map((item, idx) => benefitCard(item, idx, "amber"))}
              </div>
            </div>
          )}

          {selectedCategory === "addons" && (
            <div className="mt-5 space-y-4">
              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode ? "border-violet-500/30 bg-white/5" : "border-violet-200 bg-violet-50/60"
                }`}
              >
                <p className="text-[11px] font-semibold text-violet-700">회선 확장</p>
                <h4 className="mt-1 text-[15px] font-semibold">내선·대표번호 추가</h4>
                <p className="mt-1 text-[18px] font-semibold text-violet-600 tabular-nums">
                  +{formatKrw(EXTENSION_LINE_MONTHLY_KRW)}
                  <span className={`ml-1 text-[11px] font-normal ${subTextCls}`}>/월</span>
                </p>
                <p className={`mt-2 text-[11px] ${subTextCls}`}>{EXTENSION_LINE_NO_REFERRAL_NOTE}</p>
              </div>
              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode ? "border-sky-500/30 bg-white/5" : "border-sky-200 bg-sky-50/60"
                }`}
              >
                <p className="text-[11px] font-semibold text-sky-700">멀티 슬롯</p>
                <h4 className="mt-1 text-[15px] font-semibold">멀티 프로필+</h4>
                <p className="mt-1 text-[18px] font-semibold text-sky-600 tabular-nums">
                  +{formatKrw(MULTI_PROFILE_ADDON_MONTHLY_KRW)}
                  <span className={`ml-1 text-[11px] font-normal ${subTextCls}`}>/슬롯/월</span>
                </p>
                <p className={`mt-2 text-[11px] ${subTextCls}`}>{MULTI_PROFILE_ADDON_NO_DISCOUNT_NOTE}</p>
              </div>
            </div>
          )}

          <p className={`mt-6 text-center text-[10px] leading-relaxed ${subTextCls}`}>
            본 화면은 혜택 소개와 계정 권한 상태만 표시합니다. 멤버십 권한은 계정에 동기화된 상태를
            따릅니다.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
