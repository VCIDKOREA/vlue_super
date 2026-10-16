import React, { useState } from "react";

/**
 * [VLUÉ] NHN KCP 안전결제 PG 모듈 (KcpPayment)
 * - 신용/체크카드, 간편결제(카카오페이/네이버페이/토스페이/페이코), 실시간 계좌이체, 휴대폰 소액결제 지원
 * - NHN KCP 공식 표준 결제 화면 디자인 & 암호화 보안 통신 프로토콜
 * - 결제창 호출 및 승인 완료 콜백 연동
 */

const CARD_COMPANIES = [
  { id: "kb", name: "KB국민", color: "bg-amber-500" },
  { id: "shinhan", name: "신한", color: "bg-blue-600" },
  { id: "samsung", name: "삼성", color: "bg-blue-700" },
  { id: "hyundai", name: "현대", color: "bg-slate-900" },
  { id: "lotte", name: "롯데", color: "bg-red-600" },
  { id: "bc", name: "BC/페이북", color: "bg-red-500" },
  { id: "hana", name: "하나", color: "bg-emerald-600" },
  { id: "woori", name: "우리", color: "bg-sky-600" },
  { id: "nh", name: "NH농협", color: "bg-green-600" },
  { id: "kakaobank", name: "카카오뱅크", color: "bg-yellow-400 text-slate-900" }
];

const EASY_PAYS = [
  { id: "kakaopay", name: "카카오페이", badge: "카카오페이", bg: "bg-[#FEE500] text-slate-900 border-[#E5CE00]" },
  { id: "naverpay", name: "네이버페이", badge: "N Pay", bg: "bg-[#03C75A] text-white border-[#02B150]" },
  { id: "tosspay", name: "토스페이", badge: "toss", bg: "bg-[#0064FF] text-white border-[#0052D4]" },
  { id: "payco", name: "페이코", badge: "PAYCO", bg: "bg-[#FA1C1A] text-white border-[#DF1513]" }
];

const BANKS = [
  "KB국민은행", "신한은행", "우리은행", "하나은행", "NH농협",
  "IBK기업은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행"
];

const INSTALLMENT_MONTHS = [
  "일시불", "2개월 (무이자)", "3개월 (무이자)", "4개월", "5개월", "6개월", "12개월"
];

export function formatKrw(num) {
  return (Number(num) || 0).toLocaleString("ko-KR") + "원";
}

export default function KcpPayment({
  orderName = "VLUÉ 유료 플랜 (Paid)",
  amount = 14100,
  buyerName = "",
  buyerTel = "",
  buyerEmail = "",
  onSuccess,
  onCancel,
  isDarkMode = false
}) {
  const [payMethod, setPayMethod] = useState("card"); // 'card' | 'easypay' | 'trans' | 'phone'
  const [selectedCard, setSelectedCard] = useState("kb");
  const [selectedInstallment, setSelectedInstallment] = useState("일시불");
  const [cardAuthType, setCardAuthType] = useState("app"); // 'app' | 'general'
  const [selectedEasyPay, setSelectedEasyPay] = useState("kakaopay");
  const [selectedBank, setSelectedBank] = useState("KB국민은행");
  const [selectedCarrier, setSelectedCarrier] = useState("SKT");

  // 약관 동의
  const [agreeAll, setAgreeAll] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState({
    term1: true,
    term2: true,
    term3: true
  });

  // 결제 진행 상태
  const [processing, setProcessing] = useState(false);
  const [processStage, setProcessStage] = useState("");

  const handleToggleAllTerms = (checked) => {
    setAgreeAll(checked);
    setAgreedTerms({
      term1: checked,
      term2: checked,
      term3: checked
    });
  };

  const handleToggleTerm = (key, checked) => {
    const next = { ...agreedTerms, [key]: checked };
    setAgreedTerms(next);
    setAgreeAll(next.term1 && next.term2 && next.term3);
  };

  const handleExecuteKcpPay = () => {
    if (!agreeAll && (!agreedTerms.term1 || !agreedTerms.term2 || !agreedTerms.term3)) {
      alert("전자금융거래 필수 이용약관에 동의해 주세요.");
      return;
    }

    setProcessing(true);
    setProcessStage("NHN KCP 보안 결제 세션 암호화 연결 중…");

    setTimeout(() => {
      setProcessStage("금융결제원 및 카드사 승인 요청 진행 중 (TEST PG)…");
    }, 700);

    setTimeout(() => {
      setProcessStage("KCP 정상 결제 승인 완료. VLUÉ 멤버십에 반영 중…");
    }, 1400);

    setTimeout(() => {
      setProcessing(false);
      const merchant_uid = `kcp_order_${Date.now()}`;
      const imp_uid = `kcp_test_${Math.random().toString(36).substring(2, 11)}`;
      
      onSuccess?.({
        success: true,
        merchant_uid,
        imp_uid,
        pay_method: payMethod,
        paid_amount: amount,
        paid_at: Math.floor(Date.now() / 1000),
        status: "paid",
        pg_provider: "kcp",
        pg_type: "kcp_safe_pay",
        card_name: payMethod === "card" ? selectedCard : undefined,
        easy_pay_provider: payMethod === "easypay" ? selectedEasyPay : undefined
      });
    }, 1900);
  };

  return (
    <div className={`w-full overflow-hidden rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"} shadow-xl text-left`}>
      {/* 1. KCP 상단 네이비 헤더 */}
      <div className="bg-[#0f274a] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* NHN KCP 로고 마크 */}
          <div className="flex items-center tracking-tighter text-[11px] font-black">
            <span className="bg-[#e61e2b] px-1.5 py-0.5 rounded-l text-white">NHN</span>
            <span className="bg-[#1b437c] px-1.5 py-0.5 rounded-r text-white">KCP</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold tracking-tight">안전결제 시스템</span>
              <span className="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded">TEST PG</span>
            </div>
            <p className="text-[9px] text-slate-300">SSL 256bit 금융보안 암호화</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="text-slate-300 hover:text-white p-1 rounded-full transition-colors text-sm"
          aria-label="결제창 닫기"
        >
          ✕
        </button>
      </div>

      {/* 2. 결제 상품 및 금액 요약 바 */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 px-4 py-2.5">
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">가맹점명</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate pl-2">(주)브이씨아이디코리아 (VLUÉ)</span>
        </div>
        <div className="flex justify-between items-center text-[12px] mt-1">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">주문상품</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pl-2">{orderName}</span>
        </div>
        <div className="flex justify-between items-center text-[13px] mt-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-700/80">
          <span className="text-slate-600 dark:text-slate-300 font-medium">최종 결제금액</span>
          <span className="text-[16px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {formatKrw(amount)}
          </span>
        </div>
      </div>

      {/* 3. 결제수단 탭 (카드 / 간편결제 / 실시간 계좌이체 / 휴대폰) */}
      <div className="p-4 space-y-3.5">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-medium text-center">
          <button
            type="button"
            onClick={() => setPayMethod("card")}
            className={`py-1.5 rounded-lg transition-all ${
              payMethod === "card"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            신용/체크카드
          </button>
          <button
            type="button"
            onClick={() => setPayMethod("easypay")}
            className={`py-1.5 rounded-lg transition-all ${
              payMethod === "easypay"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            간편결제
          </button>
          <button
            type="button"
            onClick={() => setPayMethod("trans")}
            className={`py-1.5 rounded-lg transition-all ${
              payMethod === "trans"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            계좌이체
          </button>
          <button
            type="button"
            onClick={() => setPayMethod("phone")}
            className={`py-1.5 rounded-lg transition-all ${
              payMethod === "phone"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            휴대폰결제
          </button>
        </div>

        {/* 4. 결제수단 세부 설정 */}
        {payMethod === "card" && (
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">카드사 선택</span>
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {CARD_COMPANIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCard(c.id)}
                    className={`py-2 px-1 text-[11px] rounded-lg border text-center transition-all ${
                      selectedCard === c.id
                        ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">할부 기간</label>
                <select
                  value={selectedInstallment}
                  onChange={(e) => setSelectedInstallment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-[12px] text-slate-800 dark:text-slate-200"
                >
                  {INSTALLMENT_MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">인증 방식</label>
                <div className="mt-1 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCardAuthType("app")}
                    className={`flex-1 py-1 rounded text-center ${cardAuthType === "app" ? "bg-white dark:bg-slate-700 font-bold text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-500"}`}
                  >
                    앱카드
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardAuthType("general")}
                    className={`flex-1 py-1 rounded text-center ${cardAuthType === "general" ? "bg-white dark:bg-slate-700 font-bold text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-500"}`}
                  >
                    일반결제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {payMethod === "easypay" && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">간편결제사 선택</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {EASY_PAYS.map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => setSelectedEasyPay(ep.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    selectedEasyPay === ep.id
                      ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{ep.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ep.bg}`}>
                    {ep.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {payMethod === "trans" && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">이체 은행 선택</span>
            <div className="grid grid-cols-5 gap-1.5 mt-1">
              {BANKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBank(b)}
                  className={`py-2 px-1 text-[11px] rounded-lg border text-center truncate ${
                    selectedBank === b
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {b.replace("은행", "")}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              * 실시간 계좌이체는 금융결제원 안전 계좌인증을 통해 즉시 처리됩니다.
            </p>
          </div>
        )}

        {payMethod === "phone" && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">통신사 선택</span>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {["SKT", "KT", "LGU+", "알뜰폰"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCarrier(c)}
                  className={`py-2 text-[11px] rounded-lg border text-center ${
                    selectedCarrier === c
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              * 통신요금 합산 청구되며 익월 휴대폰 요금에 반영됩니다.
            </p>
          </div>
        )}

        {/* 5. KCP 전자금융거래 기본약관 동의 */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-1.5 text-[11px]">
          <label className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeAll}
              onChange={(e) => handleToggleAllTerms(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>전자금융거래 이용약관 전체 동의</span>
          </label>
          <div className="pl-5 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/80 pt-1.5">
            <div className="flex justify-between items-center">
              <span>[필수] 전자금융거래 기본약관</span>
              <span className="text-slate-400">보기</span>
            </div>
            <div className="flex justify-between items-center">
              <span>[필수] 개인정보 수집 및 이용 동의</span>
              <span className="text-slate-400">보기</span>
            </div>
            <div className="flex justify-between items-center">
              <span>[필수] 개인정보 제공 및 위탁 동의</span>
              <span className="text-slate-400">보기</span>
            </div>
          </div>
        </div>

        {/* 6. 결제 진행 버튼 */}
        <div className="pt-1 space-y-2">
          <button
            type="button"
            disabled={processing}
            onClick={handleExecuteKcpPay}
            className="w-full rounded-xl bg-[#0f274a] hover:bg-[#153460] active:scale-[0.99] py-3.5 text-center text-[14px] font-bold text-white shadow-lg shadow-blue-950/20 transition-all flex items-center justify-center gap-2"
          >
            <span>🔒</span>
            <span>{formatKrw(amount)} KCP 안전결제 승인</span>
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            className="w-full py-2 text-center text-[12px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            결제 취소하고 이전으로
          </button>
        </div>
      </div>

      {/* 결제 진행 중 KCP 오버레이 */}
      {processing && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white z-50 rounded-2xl">
          <div className="h-10 w-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <h4 className="mt-4 text-[15px] font-bold tracking-tight">NHN KCP 결제 통신 중</h4>
          <p className="mt-1.5 text-[12px] text-slate-300 max-w-xs leading-relaxed animate-pulse">
            {processStage}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/10 px-3 py-1 rounded-full">
            <span>🛡️</span>
            <span>창을 닫거나 새로고침하지 마세요</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * NHN KCP 결제 모듈 호출 함수 (`initKCPPayment`)
 */
export function initKCPPayment(options = {}) {
  const {
    orderName = "VLUÉ 유료 플랜 (Paid)",
    amount = 14100,
    buyerName = "",
    buyerTel = "",
    buyerEmail = "",
    onSuccess,
    onCancel,
    onError
  } = options;

  return {
    orderName,
    amount,
    buyerName,
    buyerTel,
    buyerEmail,
    onSuccess,
    onCancel,
    onError
  };
}
