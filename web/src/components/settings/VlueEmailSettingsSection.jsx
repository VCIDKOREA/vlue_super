import { useCallback, useEffect, useMemo, useState } from "react";
import { isPaidMembershipKind } from "../../lib/membershipBm.js";
import {
  fetchEmailForwardingMapping,
  saveTargetMasterEmail,
  saveVirtualEmailMapping,
  slugifyCompanyName
} from "../../lib/vlueEmailMappingsApi.js";
import { SettingsDivider, SettingsSubpageShell } from "./VlueSettingsUi.jsx";

function buildPreview(prefix, addressKind, companySlug) {
  const p = String(prefix || "").trim().toLowerCase();
  if (!p) return "";
  if (addressKind === "brand" && companySlug) {
    return `${p}@${companySlug}.vlue.kr`;
  }
  return `${p}@vlue.kr`;
}

export default function VlueEmailSettingsSection({
  isDarkMode,
  onBack,
  membershipTier = "free",
  onOpenUpgrade,
  showSettingNotice,
  companyName = ""
}) {
  const isPremium = isPaidMembershipKind(membershipTier);
  const [loading, setLoading] = useState(true);
  const [savingVirtual, setSavingVirtual] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [prefix, setPrefix] = useState("");
  const [addressKind, setAddressKind] = useState("standard");
  const [companySlug, setCompanySlug] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [configuredEmail, setConfiguredEmail] = useState(null);

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const boxClass = isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-100 bg-white";
  const muted = isDarkMode ? "text-gray-500" : "text-gray-500";

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchEmailForwardingMapping();
    const m = data.mapping || {};
    setPrefix(m.virtualEmailPrefix || "");
    setAddressKind(m.addressKind === "brand" ? "brand" : "standard");
    setCompanySlug(m.userCompanySlug || slugifyCompanyName(companyName));
    setTargetEmail(m.targetMasterEmail || "");
    setConfiguredEmail(m.fullVirtualEmail || null);
    setLoading(false);
  }, [companyName]);

  useEffect(() => {
    load();
  }, [load]);

  const preview = useMemo(
    () => buildPreview(prefix, addressKind, companySlug),
    [prefix, addressKind, companySlug]
  );

  const selectBrand = () => {
    if (!isPremium) {
      setUpgradeOpen(true);
      return;
    }
    setAddressKind("brand");
    if (!companySlug && companyName) {
      setCompanySlug(slugifyCompanyName(companyName));
    }
  };

  const handleSaveVirtual = async () => {
    if (!prefix.trim()) {
      showSettingNotice?.("메일 아이디를 입력해 주세요.");
      return;
    }
    setSavingVirtual(true);
    try {
      const data = await saveVirtualEmailMapping({
        virtualEmailPrefix: prefix.trim(),
        addressKind,
        userCompanySlug: addressKind === "brand" ? companySlug : null
      });
      setConfiguredEmail(data.mapping?.fullVirtualEmail || preview);
      showSettingNotice?.("VLUE 가상 메일 주소가 저장되었습니다.");
    } catch (e) {
      if (e.code === "PREMIUM_REQUIRED") {
        setUpgradeOpen(true);
      } else {
        showSettingNotice?.(e.message || "저장에 실패했습니다.");
      }
    } finally {
      setSavingVirtual(false);
    }
  };

  const handleSaveTarget = async () => {
    if (!targetEmail.trim()) {
      showSettingNotice?.("수신할 실제 이메일을 입력해 주세요.");
      return;
    }
    setSavingTarget(true);
    try {
      await saveTargetMasterEmail(targetEmail.trim());
      showSettingNotice?.("마스터 메일 연동이 완료되었습니다.");
    } catch (e) {
      showSettingNotice?.(e.message || "저장에 실패했습니다.");
    } finally {
      setSavingTarget(false);
    }
  };

  return (
    <SettingsSubpageShell
      title="VLUE 메일 설정"
      subtitle="가상 주소 → 외부 메일 즉시 포워딩"
      onBack={onBack}
      isDarkMode={isDarkMode}
    >
      {loading ? (
        <p className={`rounded-2xl border px-4 py-8 text-center text-[13px] ${muted} ${boxClass}`}>
          불러오는 중…
        </p>
      ) : (
        <>
          <div className={`rounded-2xl border p-4 space-y-4 ${boxClass}`}>
            <p className={`text-[12px] font-bold ${headText}`}>가상 메일 주소 선택</p>

            <label
              className={`block cursor-pointer rounded-xl border p-3 ${
                addressKind === "standard"
                  ? isDarkMode
                    ? "border-blue-500/60 bg-blue-500/10"
                    : "border-blue-500 bg-blue-50"
                  : isDarkMode
                    ? "border-white/10"
                    : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="vlue-email-kind"
                  checked={addressKind === "standard"}
                  onChange={() => setAddressKind("standard")}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${headText}`}>기본형</p>
                  <p className={`mt-1 text-[11px] leading-relaxed ${muted}`}>
                    VLUE의 공식 크루로서 가장 심플하게 사용하는 메일 주소
                  </p>
                  <div className={`mt-2 flex items-center gap-1 text-[14px] font-bold ${headText}`}>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value.replace(/@.*/g, ""))}
                      placeholder="내 아이디"
                      className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-semibold ${
                        isDarkMode ? "border-white/15 bg-black/20 text-white" : "border-gray-200 bg-white text-gray-900"
                      }`}
                    />
                    <span className="shrink-0">@vlue.kr</span>
                  </div>
                </div>
              </div>
            </label>

            <label
              className={`block rounded-xl border p-3 ${
                !isPremium ? "opacity-60" : "cursor-pointer"
              } ${
                addressKind === "brand"
                  ? isDarkMode
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-amber-500 bg-amber-50"
                  : isDarkMode
                    ? "border-white/10"
                    : "border-gray-200"
              }`}
              onClick={(e) => {
                if (!isPremium) {
                  e.preventDefault();
                  selectBrand();
                }
              }}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="vlue-email-kind"
                  checked={addressKind === "brand"}
                  onChange={selectBrand}
                  disabled={!isPremium}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${headText}`}>
                    상호 브랜드형 <span aria-hidden>👑</span>
                    <span className={`ml-1 text-[10px] font-bold text-amber-600`}>유료 전용</span>
                  </p>
                  <p className={`mt-1 text-[11px] leading-relaxed ${muted}`}>
                    내 사업자 상호를 노출하여 대외 신뢰도를 극대화하는 비즈니스 메일 주소
                  </p>
                  <div className={`mt-2 flex flex-wrap items-center gap-1 text-[14px] font-bold ${headText}`}>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value.replace(/@.*/g, ""))}
                      placeholder="내 아이디"
                      disabled={!isPremium}
                      className={`min-w-[72px] flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-semibold ${
                        isDarkMode ? "border-white/15 bg-black/20 text-white" : "border-gray-200 bg-white text-gray-900"
                      }`}
                    />
                    <span className="shrink-0">@</span>
                    <input
                      type="text"
                      value={companySlug}
                      onChange={(e) => setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="상호슬러그"
                      disabled={!isPremium}
                      className={`min-w-[72px] flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-semibold ${
                        isDarkMode ? "border-white/15 bg-black/20 text-white" : "border-gray-200 bg-white text-gray-900"
                      }`}
                    />
                    <span className="shrink-0">.vlue.kr</span>
                  </div>
                </div>
              </div>
            </label>

            {preview ? (
              <p className={`text-[11px] ${muted}`}>
                미리보기: <span className={`font-bold ${headText}`}>{preview}</span>
              </p>
            ) : null}

            {configuredEmail ? (
              <p className={`text-[11px] ${muted}`}>
                현재 적용: <span className={`font-bold ${headText}`}>{configuredEmail}</span>
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSaveVirtual}
              disabled={savingVirtual}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
            >
              {savingVirtual ? "저장 중…" : "가상 메일 주소 저장"}
            </button>
          </div>

          <div className={`mt-4 rounded-2xl border p-4 space-y-3 ${boxClass}`}>
            <p className={`text-[12px] font-bold ${headText}`}>마스터 메일 연동</p>
            <p className={`text-[11px] leading-relaxed ${muted}`}>
              최종 메일을 수신할 실제 이메일 주소 (네이버, 구글 등)
            </p>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="example@naver.com"
              className={`w-full rounded-xl border px-3 py-2.5 text-[14px] font-semibold ${
                isDarkMode ? "border-white/15 bg-black/20 text-white" : "border-gray-200 bg-white text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={handleSaveTarget}
              disabled={savingTarget}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-[13px] font-black text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {savingTarget ? "저장 중…" : "마스터 메일 저장"}
            </button>
          </div>

          <p className={`mt-3 px-1 text-[11px] leading-relaxed ${muted}`}>
            수신된 메일은 VLUE 서버에 보관하지 않고 0.1초 내 외부 메일로 전달됩니다. 제목·보낸 사람만 앱 알림으로 표시됩니다.
          </p>
        </>
      )}

      {upgradeOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl ${
              isDarkMode ? "border-white/10 bg-[#1a1d26] text-gray-100" : "border-gray-200 bg-white text-gray-900"
            }`}
            role="dialog"
            aria-labelledby="vlue-email-upgrade-title"
          >
            <p id="vlue-email-upgrade-title" className="text-[16px] font-black">
              프리미엄 메일 주소
            </p>
            <p className={`mt-2 text-[12px] leading-relaxed ${muted}`}>
              상호 브랜드형 메일(<code>아이디@회사명.vlue.kr</code>)은 유료 회원 전용 혜택입니다. 업그레이드 후 바로 사용할 수 있습니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setUpgradeOpen(false)}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold ${
                  isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"
                }`}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpgradeOpen(false);
                  onOpenUpgrade?.();
                }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-[13px] font-black text-white"
              >
                유료 업그레이드
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSubpageShell>
  );
}
