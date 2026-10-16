import React from "react";
import { createPortal } from "react-dom";

export const POLICY_CONTENTS = {
  terms: {
    title: "이용약관",
    body: `[제 1조] 목적
본 약관은 브이씨아이디코리아 (이하 "회사"라 함)에서 제공하는 VLUÉ 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

[제 2조] 용어의 정의
1. "서비스"라 함은 구현되는 단말기(스마트폰, 태블릿, PC 등)와 상관없이 회원이 이용할 수 있는 VLUÉ 디지털 명함(DCC), 통화 쇼케이스, 가족 위치 및 안전 케어, 보이스피싱 안심 차단 및 관련 제반 서비스를 의미합니다.
2. "회원"이라 함은 회사의 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.
3. "쇼케이스"라 함은 회원이 서비스 내에 등록하여 통화 발·수신 화면 및 프로필에 송출하는 사진, 동영상, 사운드, 텍스트 등의 콘텐츠를 의미합니다.
4. "유료 서비스"라 함은 회사가 유료로 제공하는 각종 멤버십 플랜, 추가 회선, 부가 서비스 등을 의미합니다.

[제 3조] 약관의 효력 및 변경
1. 본 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있습니다.
3. 개정된 약관은 적용일자 및 개정사유를 명시하여 적용일자 7일 전(중대한 변경 또는 회원에게 불리한 변경은 30일 전)부터 앱 내 공지사항 및 팝업을 통해 고지합니다.
4. 회원이 개정 약관의 적용에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있으며, 효력 발생일 이후에도 서비스를 계속 이용하는 경우 변경사항에 동의한 것으로 봅니다.

[제 4조] 서비스의 제공 및 변경
1. 회사는 연중무휴, 1일 24시간 서비스를 제공함을 원칙으로 합니다.
2. 정보통신설비의 점검, 교체, 천재지변, 운영상 중대한 사유가 있는 경우 일시적으로 서비스가 중단될 수 있으며, 사전 또는 사후에 공지합니다.
3. 회사는 안정적인 서비스 운영을 위해 서비스의 일부 또는 전부를 변경할 수 있습니다.

[제 5조] 회원의 권리와 의무
1. 회원은 타인의 개인정보나 명의를 도용하여 가입하거나 활동해서는 안 됩니다.
2. 회원은 공서양속을 해치거나 불법적인 콘텐츠(음란물, 사기, 명예훼손 등)를 쇼케이스나 프로필에 게시해서는 안 됩니다.
3. 회원은 서비스 이용 권한, 기타 이용계약상 지위를 타인에게 양도하거나 담보로 제공할 수 없습니다.

[제 6조] 면책 조항
1. 회사는 천재지변, 기간통신사업자의 회선 장애 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
2. 회원이 게재한 정보나 자료의 신뢰도 및 정확성에 대해서는 회원이 직접 책임을 부담하며, 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.

[부칙]
본 약관은 2024년 1월 1일부터 시행됩니다.`
  },
  privacy: {
    title: "개인정보 처리방침",
    body: `브이씨아이디코리아(이하 "회사")는 「개인정보 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

[제 1조] 개인정보의 수집 및 이용 목적
회사는 다음 목적을 위하여 최소한의 개인정보를 수집·이용합니다.
1. 회원 가입 및 관리: 본인 확인, 휴대폰 점유 인증(PASS 등), 불량 회원의 부정이용 방지, 알림 및 고지사항 전달
2. 서비스 제공: 디지털 명함(DCC) 송출, 통화 중 쇼케이스 브로드캐스팅, 가족 위치 보호 및 안심 케어 서비스
3. 유료 결제 및 정산: 유료 멤버십 가입, 부가 회선 결제 처리, 청구서 발행, 결제 도용 방지
4. 안전 및 보안: 악성 앱 및 보이스피싱 위험 감지, 기기 보안 인증

[제 2조] 수집하는 개인정보 항목
1. 필수 항목: 휴대전화번호, 성명, 생년월일, 성별, 기기 식별정보(UUID, OS 버전)
2. 가족 보호 서비스 이용 시: 실시간 위치 정보(GPS, Wi-Fi 데이터), 배터리 잔량, SOS 긴급 호출 데이터
3. 쇼케이스 이용 시: 등록한 사진, 동영상, 닉네임, 회사명/직함, 상태메시지
4. 유료 결제 시: 결제 수단 정보(신용카드사명, 결제 승인번호 등 포트원/PG사 처리 데이터)

[제 3조] 개인정보의 보유 및 이용 기간
1. 회원 탈퇴 시 원칙적으로 지체 없이 파기합니다.
2. 단, 전자상거래법 등 관계 법령에 따라 보존 의무가 있는 경우 해당 법정 기간 동안 안전하게 분리 보관합니다.
   - 계약 또는 청약철회에 관한 기록: 5년
   - 대금결제 및 재화 공급에 관한 기록: 5년
   - 소비자의 불만 또는 분쟁 처리에 관한 기록: 3년
   - 접속 로그 및 통신사실확인자료: 3개월

[제 4조] 개인정보의 제3자 제공 및 위탁
1. 회사는 회원의 사전 동의 없이 개인정보를 외부에 제공하지 않습니다.
2. 원활한 결제 및 인증 처리를 위하여 다음 수탁업체에 위탁하여 운영합니다.
   - 포트원((주)포트원), NHN KCP: 전자결제(PG) 대행 및 결제 승인 처리
   - 통신사/PASS: 휴대폰 본인확인
   - Google Firebase: 푸시 알림(FCM) 발송

[제 5조] 이용자의 권리와 행사 방법
이용자는 언제든지 앱 내 「설정 > 내 계정」에서 개인정보를 열람, 수정하거나 회원 탈퇴를 통해 동의를 철회할 수 있습니다.

[제 6조] 개인정보 보호책임자
- 성명: 이종근 (대표)
- 문의처: support@vlue.kr / 고객센터 1:1 문의

[부칙]
본 개인정보 처리방침은 2024년 1월 1일부터 적용됩니다.`
  },
  refund: {
    title: "환불·청약철회 규정",
    body: `브이씨아이디코리아 VLUÉ 유료 멤버십 및 디지털 콘텐츠 서비스의 환불 및 청약철회 규정은 「전자상거래 등에서의 소비자보호에 관한 법률」을 준수합니다.

[제 1조] 청약철회(환불) 기준
1. 유료 멤버십 결제 후 7일 이내에 디지털 서비스(쇼케이스 송출, DCC 명함 송출, 가족보호 안심케어 등)를 전혀 이용하지 않은 경우 결제 금액 전액을 청약철회(환불)받으실 수 있습니다.
2. 결제 후 7일이 경과하였거나, 결제 직후 이미 유료 혜택(쇼케이스 송출, 가족보호 프리미엄 기능 활성화 등)을 이용·개시한 경우에는 관련 법령에 따라 청약철회가 제한될 수 있습니다.

[제 2조] 중도 해지 및 일할 계산
1. 월간 정기결제 상품: 당월 이용 기간 중 중도 해지 시, 해지 신청일이 속한 결제 주기의 종료일까지 혜택이 유지되며 익월부터 추가 과금되지 않습니다.
2. 연간 정기결제 상품: 중도 해지 요청 시, 이미 경과한 개월 수에 대해 정상 월정액 요금(할인 전 정가)을 차감하고 잔여 금액에 대해 위약금(잔여 금액의 10%)을 공제한 후 환불됩니다.

[제 3조] 과오납금의 환불
1. 시스템 오류 또는 착오로 인해 과오납금이 발생한 경우 결제된 수단과 동일한 방법으로 수수료 없이 전액 즉시 환불 처리합니다.
2. 회원의 귀책사유로 인한 중복 결제 시 결제 수수료가 차감될 수 있습니다.

[제 4조] 환불 절차 및 방법
1. 환불 신청은 앱 내 「설정 > 고객센터 / 1:1 문의」 또는 공식 고객센터 이메일(support@vlue.kr)을 통해 접수하실 수 있습니다.
2. 카드사 결제 취소는 신청 승인 후 영업일 기준 3~5일 이내에 카드사 승인 취소 또는 계좌 입금으로 반영됩니다.

[부칙]
본 규정은 2024년 1월 1일부터 적용됩니다.`
  },
  pricing: {
    title: "요금·멤버십 안내",
    body: `VLUÉ는 개인의 안전과 비즈니스를 연결하는 프리미엄 멤버십 서비스를 제공합니다.

[1] VLUÉ 유료 플랜 (Personal Premium)
- 월간 결제: 14,100원 / 월 (부가세 포함)
- 연간 결제: 141,000원 / 년 (월 11,750원 상당, 약 17% 할인)
- 제공 혜택:
  • 온가족 실시간 안심 케어 (가족보호 위치 및 위기 SOS 알림)
  • 무제한 블루 쇼케이스 송출 (통화 중 동영상/사진/음원 자유 브로드캐스팅)
  • BGM 독립 & 프리미엄 사운드 라이브러리 지원
  • 보이스피싱 안심 차단 & VLUÉ 공식 인증 마크 부여

[2] VLUÉ 비즈니스 플랜 (Business & Enterprise)
- 월간 결제: 28,300원 / 월 (부가세 포함)
- 연간 결제: 283,000원 / 년 (월 23,583원 상당)
- 제공 혜택:
  • 유료 플랜의 모든 프리미엄 혜택 기본 포함
  • 디지털 인증 명함(DCC) 멀티 라인 발행 및 통화 중 명함 브로드캐스팅
  • 기업/팀 브랜딩 커스텀 템플릿 지원
  • 발신 통계 및 쇼케이스 반응 리포트 제공

[3] 추천인(프로모션) 할인 혜택
- 가입 시 추천인 코드 입력 시, 첫 달 또는 연간 결제 시 4,200원 특별 할인 적용
  • 유료 플랜 월 결제 시: 14,100원 → 9,900원 (첫 달 혜택)
  • 연간 결제 시: 141,000원 → 99,000원 (첫 해 혜택)

[4] 추가 부가 서비스
- 내선·대표번호 추가 회선: 회선당 5,200원 / 월
- 멀티 프로필+ 추가 슬롯: 슬롯당 4,200원 / 월

※ 요금 관련 문의: 고객센터 support@vlue.kr`
  }
};

// 별칭 매핑 (호환성 보장)
POLICY_CONTENTS.termsOfService = POLICY_CONTENTS.terms;
POLICY_CONTENTS.privacyPolicy = POLICY_CONTENTS.privacy;
POLICY_CONTENTS.refundPolicy = POLICY_CONTENTS.refund;
POLICY_CONTENTS.membership = POLICY_CONTENTS.pricing;
POLICY_CONTENTS.membershipInfo = POLICY_CONTENTS.pricing;

export default function PolicyModal({
  open,
  onClose,
  title,
  content,
  policyType,
  isDarkMode = false
}) {
  if (!open) return null;

  // policyType, title 또는 content의 키를 이용해 정적 텍스트 결정
  const keyCandidate = policyType || (
    typeof content === "string" && POLICY_CONTENTS[content] ? content : ""
  );

  let fallbackData = null;
  if (keyCandidate && POLICY_CONTENTS[keyCandidate]) {
    fallbackData = POLICY_CONTENTS[keyCandidate];
  } else if (title) {
    if (title.includes("개인정보")) fallbackData = POLICY_CONTENTS.privacy;
    else if (title.includes("환불") || title.includes("청약철회")) fallbackData = POLICY_CONTENTS.refund;
    else if (title.includes("요금") || title.includes("멤버십") || title.includes("가격")) fallbackData = POLICY_CONTENTS.pricing;
    else if (title.includes("약관")) fallbackData = POLICY_CONTENTS.terms;
  }

  const finalTitle = title || fallbackData?.title || "약관 및 정책";
  const finalContent = (typeof content === "string" && content.trim().length > 0)
    ? content
    : (fallbackData?.body || POLICY_CONTENTS.terms.body);

  return createPortal(
    <div
      className="fixed inset-0 z-[60000] flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      style={{ letterSpacing: "-0.02em" }}
      onClick={onClose}
    >
      <div
        className={`relative z-50 flex w-full max-w-lg max-h-[85vh] h-[70vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border shadow-2xl transition-all ${
          isDarkMode
            ? "bg-[#141722] border-white/10 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 (고정) */}
        <div
          className={`flex shrink-0 items-center justify-between border-b p-4 ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          }`}
        >
          <h2 className="text-[17px] font-bold tracking-tight text-inherit">
            {finalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 text-xl leading-none transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:bg-white/10"
                : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div
          className={`flex-1 overflow-y-auto p-5 text-sm leading-relaxed whitespace-pre-wrap ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          {finalContent}
        </div>
      </div>
    </div>,
    document.body
  );
}
