import {
  DCC_ACCOUNT_TYPES,
  DCC_BANK_OPTIONS,
  DCC_ACCOUNT_DISCLAIMER,
  normalizeDccAccountType,
  digitsOnlyAccount
} from "../lib/dccAccountFields.js";

/**
 * DCC 설정 — 계좌번호 등록 (개인 / 사업자 / 모임·단체)
 */
export default function LetteringBizcardAccountSection({
  isDarkMode = false,
  inputBase = "",
  lockedLegalName = "",
  accountType = "",
  setAccountType,
  bankName = "",
  setBankName,
  accountNumber = "",
  setAccountNumber,
  accountHolder = "",
  setAccountHolder,
  accountGroupDocName = "",
  onGroupDocPick,
  groupDocError = "",
  onClearAccount
}) {
  const type = normalizeDccAccountType(accountType);
  const primaryTab = type === DCC_ACCOUNT_TYPES.PERSONAL ? "PERSONAL" : type ? "BUSINESS" : "";
  const isGroup = type === DCC_ACCOUNT_TYPES.GROUP;
  const isPersonal = type === DCC_ACCOUNT_TYPES.PERSONAL;
  const holderLocked = isPersonal ? String(lockedLegalName || "").trim() : "";

  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";
  const panel = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/[0.03] p-3"
    : "rounded-2xl border border-slate-200 bg-slate-50/80 p-3";
  const tabOn = isDarkMode
    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
    : "bg-blue-600 text-white shadow-sm";
  const tabOff = isDarkMode
    ? "bg-transparent text-gray-400 hover:bg-white/5"
    : "bg-white text-slate-600 hover:bg-slate-100";

  return (
    <div id="dcc-settings-account" className={`scroll-mt-4 sm:col-span-2 ${panel}`}>
      <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
        계좌정보 (선택)
      </p>
      <p className={`mt-1 text-[10px] leading-relaxed ${muted}`}>
        명함 앞면 만료일 위에 표시됩니다. 송금 전 예금주 확인을 안내합니다.
      </p>

      <div
        className={`mt-3 grid grid-cols-2 gap-1 rounded-xl p-1 ${
          isDarkMode ? "bg-black/30" : "bg-white ring-1 ring-slate-200"
        }`}
        role="tablist"
        aria-label="계좌 유형"
      >
        <button
          type="button"
          role="tab"
          aria-selected={primaryTab === "PERSONAL"}
          className={`rounded-lg px-3 py-2.5 text-[12px] font-bold transition ${
            primaryTab === "PERSONAL" ? tabOn : tabOff
          }`}
          onClick={() => {
            setAccountType(DCC_ACCOUNT_TYPES.PERSONAL);
            if (holderLocked) setAccountHolder(holderLocked);
          }}
        >
          개인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={primaryTab === "BUSINESS"}
          className={`rounded-lg px-3 py-2.5 text-[12px] font-bold transition ${
            primaryTab === "BUSINESS" ? tabOn : tabOff
          }`}
          onClick={() => {
            if (type !== DCC_ACCOUNT_TYPES.GROUP) {
              setAccountType(DCC_ACCOUNT_TYPES.BUSINESS);
            }
          }}
        >
          사업자
        </button>
      </div>

      {primaryTab === "BUSINESS" ? (
        <label
          className={`mt-2 flex cursor-pointer items-start gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold ${
            isDarkMode ? "bg-white/5 text-gray-200" : "bg-white text-slate-800 ring-1 ring-slate-200"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0"
            checked={isGroup}
            onChange={(e) =>
              setAccountType(e.target.checked ? DCC_ACCOUNT_TYPES.GROUP : DCC_ACCOUNT_TYPES.BUSINESS)
            }
          />
          <span>모임/단체 통장 (통장 사본 업로드 · 승인 후 송출)</span>
        </label>
      ) : null}

      {type ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className={`text-[11px] font-bold ${muted}`}>은행</span>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={`mt-1.5 w-full ${inputBase}`}
            >
              <option value="">은행 선택</option>
              {DCC_BANK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-1">
            <span className={`text-[11px] font-bold ${muted}`}>계좌번호</span>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(digitsOnlyAccount(e.target.value).slice(0, 30))}
              placeholder="숫자만 입력"
              className={`mt-1.5 w-full ${inputBase}`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={`text-[11px] font-bold ${muted}`}>
              예금주{isPersonal ? " (본인인증 실명 · 수정 불가)" : ""}
            </span>
            <input
              type="text"
              value={isPersonal ? holderLocked || accountHolder : accountHolder}
              onChange={(e) => {
                if (isPersonal) return;
                setAccountHolder(e.target.value);
              }}
              readOnly={isPersonal}
              placeholder={
                isPersonal
                  ? holderLocked || "본인인증 실명"
                  : isGroup
                    ? "모임·단체 예금주명"
                    : "상호/법인명 (짤림 가능 — 직접 입력)"
              }
              className={`mt-1.5 w-full ${inputBase}${
                isPersonal ? " cursor-not-allowed opacity-80" : ""
              }`}
            />
            {isPersonal && !holderLocked ? (
              <p className={`mt-1 text-[10px] font-semibold text-amber-600`}>
                본인인증 실명을 확인할 수 없습니다. 로그인·본인인증 후 다시 열어 주세요.
              </p>
            ) : null}
          </label>

          {isGroup ? (
            <div className="sm:col-span-2 space-y-2">
              <p className={`text-[10px] leading-relaxed ${muted}`}>
                모임통장/단체 계좌의 경우 통장 사본(확인서) 업로드 및 승인 후 송출됩니다.
              </p>
              <label className="block">
                <span className={`text-[11px] font-bold ${muted}`}>통장 사본 · 확인서</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className={`mt-1.5 w-full text-[12px] ${muted}`}
                  onChange={(e) => onGroupDocPick?.(e)}
                />
              </label>
              {accountGroupDocName ? (
                <p className={`text-[10px] font-semibold ${isDarkMode ? "text-cyan-200" : "text-blue-700"}`}>
                  첨부됨: {accountGroupDocName}
                </p>
              ) : null}
              {groupDocError ? (
                <p className="text-[10px] font-bold text-red-500">{groupDocError}</p>
              ) : null}
            </div>
          ) : null}

          <p className={`sm:col-span-2 text-[9px] leading-relaxed ${muted}`}>{DCC_ACCOUNT_DISCLAIMER}</p>

          <button
            type="button"
            className={`sm:col-span-2 rounded-xl py-2 text-[11px] font-bold ${
              isDarkMode ? "text-gray-400 hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"
            }`}
            onClick={() => {
              if (typeof onClearAccount === "function") {
                onClearAccount();
                return;
              }
              setAccountType("");
              setBankName("");
              setAccountNumber("");
              setAccountHolder("");
            }}
          >
            계좌정보 비우기
          </button>
        </div>
      ) : (
        <p className={`mt-3 text-[11px] ${muted}`}>유형을 선택하면 은행·계좌를 입력할 수 있습니다.</p>
      )}
    </div>
  );
}
