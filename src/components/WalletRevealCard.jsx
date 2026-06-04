import { useCallback, useEffect, useState } from "react";
import {
  fetchWalletSummary,
  fetchWithdrawalAccount,
  requestWalletDeposit,
  requestWalletWithdrawal,
  saveWithdrawalAccount
} from "../lib/walletApi.js";

const BANKS = [
  { code: "004", name: "국민은행" },
  { code: "088", name: "신한은행" },
  { code: "020", name: "우리은행" },
  { code: "081", name: "하나은행" },
  { code: "011", name: "NH농협" },
  { code: "090", name: "카카오뱅크" },
  { code: "092", name: "토스뱅크" }
];

function formatKrw(n) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR");
}

function formatPoints(n) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR");
}

export default function WalletRevealCard({ isDarkMode = false }) {
  const [revealed, setRevealed] = useState(false);
  const [cash, setCash] = useState(0);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);

  const [accountOpen, setAccountOpen] = useState(false);
  const [bankCode, setBankCode] = useState(BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-500";

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWalletSummary();
      setCash(data?.balanceCash ?? data?.account?.balanceCash ?? 0);
      setPoints(data?.balanceRewardPoints ?? 0);
    } catch {
      setCash(0);
      setPoints(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const data = await fetchWithdrawalAccount();
      if (data?.account) {
        setHasAccount(true);
        setBankCode(data.account.bankCode || BANKS[0].code);
        setAccountNumber(data.account.accountNumber || "");
        setAccountHolder(data.account.accountHolder || "");
      } else {
        setHasAccount(false);
      }
    } catch {
      setHasAccount(false);
    }
  }, []);

  useEffect(() => {
    if (revealed) {
      loadBalances();
      loadAccount();
    }
  }, [revealed, loadBalances, loadAccount]);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 2600);
  };

  const onReveal = () => {
    if (!revealed) setRevealed(true);
  };

  const onHide = () => {
    setRevealed(false);
  };

  const submitDeposit = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt < 1000) {
      showNotice("입금 신청 금액은 1,000원 이상입니다.");
      return;
    }
    setDepositBusy(true);
    try {
      const res = await requestWalletDeposit(amt);
      setDepositOpen(false);
      setDepositAmount("");
      showNotice(res?.message || "입금 신청이 접수되었습니다.");
      loadBalances();
    } catch (e) {
      showNotice(e?.message || "입금 신청에 실패했습니다.");
    } finally {
      setDepositBusy(false);
    }
  };

  const saveAccount = async () => {
    const bank = BANKS.find((b) => b.code === bankCode);
    if (!bank || !accountNumber.trim() || !accountHolder.trim()) {
      showNotice("은행·계좌번호·예금주를 입력해 주세요.");
      return;
    }
    setAccountBusy(true);
    try {
      await saveWithdrawalAccount({
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber: accountNumber.replace(/\s/g, ""),
        accountHolder: accountHolder.trim()
      });
      setHasAccount(true);
      setAccountOpen(false);
      showNotice("출금 계좌가 등록되었습니다.");
    } catch (e) {
      showNotice(e?.message || "계좌 등록에 실패했습니다.");
    } finally {
      setAccountBusy(false);
    }
  };

  const openWithdraw = async () => {
    try {
      const data = await fetchWithdrawalAccount();
      if (!data?.account) {
        setAccountOpen(true);
        return;
      }
      setHasAccount(true);
      setWithdrawOpen(true);
    } catch {
      setAccountOpen(true);
    }
  };

  const submitWithdraw = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt < 10000) {
      showNotice("출금 신청은 10,000원 이상입니다.");
      return;
    }
    setWithdrawBusy(true);
    try {
      const res = await requestWalletWithdrawal(amt);
      setWithdrawOpen(false);
      setWithdrawAmount("");
      showNotice(res?.message || "출금 신청이 접수되었습니다.");
      loadBalances();
    } catch (e) {
      if (e?.status === 400 && String(e?.message || "").includes("계좌")) {
        setWithdrawOpen(false);
        setAccountOpen(true);
      }
      showNotice(e?.message || "출금 신청에 실패했습니다.");
    } finally {
      setWithdrawBusy(false);
    }
  };

  return (
    <>
      <div
        className={`relative mt-6 min-h-[148px] rounded-[32px] p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-2 overflow-hidden ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-blue-50/80 bg-white"
        }`}
      >
        {revealed ? (
          <button
            type="button"
            onClick={onHide}
            className={`absolute right-3 top-3 z-20 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors active:scale-95 ${
              isDarkMode
                ? "bg-white/10 text-gray-200 hover:bg-white/15"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            aria-label="잔액 숨기기"
          >
            숨기기
          </button>
        ) : null}
        <div
          className={`pt-5 ${revealed ? "" : "pointer-events-none select-none blur-[6px] opacity-90"}`}
        >
          <div
            className={`rounded-[20px] py-3 px-3.5 mb-1 ${
              isDarkMode ? "bg-white/5 border border-white/5" : "bg-gray-50/80"
            }`}
          >
            <div className="text-center">
              <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${subText}`}>CASH</p>
              <p className={`mt-1 text-[clamp(14px,4.3vw,17px)] font-black leading-none ${headText}`}>
                {loading ? "…" : formatKrw(cash)}{" "}
                <span className={`ml-0.5 text-[12px] font-semibold ${subText}`}>원</span>
              </p>
            </div>
            <div className={`my-2 h-px ${isDarkMode ? "bg-white/10" : "bg-gray-200/60"}`} />
            <div className="text-center">
              <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${subText}`}>리워드 포인트</p>
              <p className="mt-1 text-[clamp(14px,4.3vw,17px)] font-black leading-none text-blue-600">
                {loading ? "…" : formatPoints(points)} <span className="ml-0.5 text-[12px] font-semibold">P</span>
              </p>
            </div>
          </div>
          {revealed ? (
            <div className="flex gap-2 p-1">
              <button
                type="button"
                onClick={() => setDepositOpen(true)}
                className={`flex-1 rounded-xl border py-2 text-[11px] font-bold active:scale-95 transition-all ${
                  isDarkMode
                    ? "border-blue-400/50 bg-blue-600/25 text-blue-100"
                    : "border-blue-300 bg-blue-50 text-blue-700"
                }`}
              >
                입금신청
              </button>
              <button
                type="button"
                onClick={openWithdraw}
                className={`flex-1 rounded-xl border py-2 text-[11px] font-bold active:scale-95 transition-all ${
                  isDarkMode
                    ? "border-white/15 bg-white/10 text-gray-100"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                출금신청
              </button>
            </div>
          ) : (
            <div className="flex gap-2 p-1 opacity-60">
              <div className="flex-1 rounded-xl border border-blue-200 bg-blue-50/80 py-2 text-center text-[11px] font-bold text-blue-400">
                입금신청
              </div>
              <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 py-2 text-center text-[11px] font-bold text-gray-400">
                출금신청
              </div>
            </div>
          )}
        </div>

        {!revealed ? (
          <button
            type="button"
            onClick={onReveal}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[30px] bg-white/5 backdrop-blur-[2px]"
            aria-label="잔액 확인"
          >
            <span
              className={`rounded-full px-4 py-2 text-[12px] font-bold ${
                isDarkMode ? "bg-black/55 text-gray-100" : "bg-white/95 text-gray-700 shadow-sm"
              }`}
            >
              (확인하려면 탭하십시요.)
            </span>
          </button>
        ) : null}
      </div>

      {notice ? <p className="mt-2 text-center text-[11px] font-semibold text-blue-600">{notice}</p> : null}

      {depositOpen ? (
        <div className="fixed inset-0 z-[225] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-[15px] font-black text-gray-900">입금 신청</p>
            <p className="mt-1 text-[11px] text-gray-500">입금 확인 후 캐시 잔액에 반영됩니다.</p>
            <input
              type="number"
              min={1000}
              step={1000}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="금액 (원)"
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] font-bold"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setDepositOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                disabled={depositBusy}
                onClick={submitDeposit}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {depositBusy ? "처리 중…" : "신청"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {accountOpen ? (
        <div className="fixed inset-0 z-[225] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-[15px] font-black text-gray-900">출금 계좌 등록</p>
            <p className="mt-1 text-[11px] text-gray-500">출금 신청 전 본인 명의 계좌를 등록해 주세요.</p>
            <label className="mt-3 block text-[11px] font-bold text-gray-600">
              은행
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] font-bold"
              >
                {BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-[11px] font-bold text-gray-600">
              계좌번호
              <input
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d-]/g, ""))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] font-bold"
                placeholder="- 없이 입력"
              />
            </label>
            <label className="mt-2 block text-[11px] font-bold text-gray-600">
              예금주
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] font-bold"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                disabled={accountBusy}
                onClick={saveAccount}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {accountBusy ? "저장 중…" : hasAccount ? "수정 저장" : "등록"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {withdrawOpen ? (
        <div className="fixed inset-0 z-[225] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-[15px] font-black text-gray-900">출금 신청</p>
            <p className="mt-1 text-[11px] text-gray-500">
              보유 캐시 {formatKrw(cash)}원 · 최소 10,000원
            </p>
            <input
              type="number"
              min={10000}
              step={1000}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="출금 금액 (원)"
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] font-bold"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setWithdrawOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={submitWithdraw}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {withdrawBusy ? "처리 중…" : "신청"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
