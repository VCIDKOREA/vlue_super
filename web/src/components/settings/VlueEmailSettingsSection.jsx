import { useCallback, useEffect, useMemo, useState } from "react";
import { isB2bMembershipKind, isPaidMembershipKind } from "../../lib/membershipBm.js";
import {
  addMasterEmail,
  connectExternalMailAccount,
  fetchEmailForwardingMapping,
  fetchExternalMailAccounts,
  readLocalLoginPrefix,
  saveVirtualEmailMapping,
  setPrimaryMasterEmail,
  slugifyCompanyName
} from "../../lib/vlueEmailMappingsApi.js";
import { getPricingConfigSync } from "../../lib/pricingConfig.js";
import { sendAuthCode, verifyAuthCode, EMAIL_AUTH_SUPPORT } from "../../lib/emailAuthApi.js";
import VluePromoCard, { VlueMailPreviewFloat } from "../ui/VluePromoCard.jsx";
import { SettingsSubpageShell } from "./VlueSettingsUi.jsx";

function buildPreview(loginId, addressKind, companySlug) {
  const id = String(loginId || "").trim().toLowerCase();
  if (!id) return "";
  if (addressKind === "brand" && companySlug) {
    return `${id}@${companySlug}.vlue.kr`;
  }
  return `${id}@vlue.kr`;
}

function OptionCard({ selected, disabled, onSelect, isDarkMode, title, hint, children }) {
  const border = selected
    ? isDarkMode
      ? "border-primary-500/50 bg-primary-500/8"
      : "border-primary-500/40 bg-primary-50/80"
    : isDarkMode
      ? "border-white/10"
      : "border-[#f0f1f3]";

  return (
    <label
      className={`block rounded-xl border p-3.5 transition ${disabled ? "opacity-65" : "cursor-pointer"} ${border}`}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="radio"
          checked={selected}
          onChange={() => onSelect?.()}
          disabled={disabled}
          className="mt-0.5 accent-primary-600"
        />
        <div className="min-w-0 flex-1">
          <p className={`vlue-type-subtitle ${isDarkMode ? "text-gray-100" : "text-[#191f28]"}`}>{title}</p>
          {hint ? <p className="vlue-settings-card__hint">{hint}</p> : null}
          {children}
        </div>
      </div>
    </label>
  );
}

export default function VlueEmailSettingsSection({
  isDarkMode,
  onBack,
  membershipTier = "free",
  onOpenUpgrade,
  showSettingNotice,
  companyName = ""
}) {
  const canUseBrand =
    isPaidMembershipKind(membershipTier) || isB2bMembershipKind(membershipTier);
  const [loading, setLoading] = useState(true);
  const [savingVirtual, setSavingVirtual] = useState(false);
  const [addingMaster, setAddingMaster] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("brand");

  const [externalAccounts, setExternalAccounts] = useState([]);
  const [connectingExternal, setConnectingExternal] = useState(false);
  const [extProvider, setExtProvider] = useState("naver");
  const [extEmail, setExtEmail] = useState("");

  const pricing = getPricingConfigSync();
  const freeEmailNote =
    pricing?.legacy?.freeTierEmailNote || "아이디@vlue.kr 무료 제공";
  const premiumEmailNote =
    pricing?.plans?.soho_activity?.description?.split(".")[0] ||
    "아이디@유저회사명.vlue.kr 프리미엄 상호 메일";

  const [loginId, setLoginId] = useState(() => readLocalLoginPrefix());
  const [addressKind, setAddressKind] = useState("standard");
  const [companySlug, setCompanySlug] = useState("");
  const [configuredEmail, setConfiguredEmail] = useState(null);
  const [masterEmails, setMasterEmails] = useState([]);
  const [newMasterEmail, setNewMasterEmail] = useState("");
  const [masterOtp, setMasterOtp] = useState("");
  const [masterOtpHint, setMasterOtpHint] = useState("");
  const [masterVerifyToken, setMasterVerifyToken] = useState("");

  const headText = isDarkMode ? "text-gray-100" : "text-[#191f28]";
  const inputCls = isDarkMode
    ? "border-white/12 bg-black/20 text-white placeholder:text-gray-500"
    : "border-[#e8eaed] bg-white text-[#191f28] placeholder:text-[#b0b8c1]";

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchEmailForwardingMapping();
    const m = data.mapping || {};
    setLoginId(m.loginPrefix || m.virtualEmailPrefix || readLocalLoginPrefix());
    setAddressKind(m.addressKind === "brand" ? "brand" : "standard");
    setCompanySlug(m.userCompanySlug || slugifyCompanyName(companyName));
    setConfiguredEmail(m.fullVirtualEmail || null);
    setMasterEmails(Array.isArray(m.masterEmails) ? m.masterEmails : []);
    const ext = await fetchExternalMailAccounts();
    setExternalAccounts(ext.accounts || []);
    setLoading(false);
  }, [companyName]);

  useEffect(() => {
    load();
  }, [load]);

  const preview = useMemo(
    () => buildPreview(loginId, addressKind, companySlug),
    [loginId, addressKind, companySlug]
  );

  const displayEmail = configuredEmail || preview || `${loginId || "아이디"}@vlue.kr`;

  const selectBrand = () => {
    if (!canUseBrand) {
      setUpgradeReason("brand");
      setUpgradeOpen(true);
      return;
    }
    setAddressKind("brand");
    if (!companySlug && companyName) {
      setCompanySlug(slugifyCompanyName(companyName));
    }
  };

  const handleSaveVirtual = async () => {
    if (!loginId) {
      showSettingNotice?.("로그인 후 VLUE 아이디가 메일 주소로 자동 적용됩니다.");
      return;
    }
    setSavingVirtual(true);
    try {
      const data = await saveVirtualEmailMapping({
        addressKind,
        userCompanySlug: addressKind === "brand" ? companySlug : null
      });
      setConfiguredEmail(data.mapping?.fullVirtualEmail || preview);
      showSettingNotice?.("VLUE 메일 주소가 적용되었습니다.");
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

  const handleSendMasterOtp = async () => {
    const email = newMasterEmail.trim();
    if (!email) {
      showSettingNotice?.("연동할 이메일을 입력해 주세요.");
      return;
    }
    setAddingMaster(true);
    try {
      const data = await sendAuthCode({ purpose: "dcc_email", email }, { auth: true });
      setMasterVerifyToken("");
      setMasterOtpHint(
        data.devCode
          ? `개발 모드 인증번호: ${data.devCode}`
          : `${data.maskedEmail || email} 로 인증번호를 보냈습니다. 5분 내에 입력해 주세요.`
      );
      showSettingNotice?.("인증번호를 발송했습니다.");
    } catch (e) {
      showSettingNotice?.(e.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setAddingMaster(false);
    }
  };

  const handleVerifyMasterOtp = async () => {
    const email = newMasterEmail.trim();
    const code = String(masterOtp || "").trim();
    if (!email || code.length !== 6) {
      showSettingNotice?.("이메일과 인증번호 6자리를 입력해 주세요.");
      return;
    }
    setAddingMaster(true);
    try {
      const data = await verifyAuthCode({ purpose: "dcc_email", email, code }, { auth: true });
      setMasterVerifyToken(data.token || "");
      setMasterOtpHint("이메일 인증이 완료되었습니다. 추가를 눌러 등록해 주세요.");
      showSettingNotice?.("이메일 인증이 완료되었습니다.");
    } catch (e) {
      showSettingNotice?.(e.message || "인증에 실패했습니다.");
    } finally {
      setAddingMaster(false);
    }
  };

  const handleAddMaster = async () => {
    const email = newMasterEmail.trim();
    if (!email) {
      showSettingNotice?.("연동할 이메일을 입력해 주세요.");
      return;
    }
    if (!masterVerifyToken) {
      showSettingNotice?.("먼저 이메일 인증번호를 확인해 주세요.");
      return;
    }
    setAddingMaster(true);
    try {
      const data = await addMasterEmail(email, masterVerifyToken);
      setMasterEmails(data.mapping?.masterEmails || []);
      setNewMasterEmail("");
      setMasterOtp("");
      setMasterOtpHint("");
      setMasterVerifyToken("");
      showSettingNotice?.("수신 메일이 등록되었습니다.");
    } catch (e) {
      showSettingNotice?.(e.message || "등록에 실패했습니다.");
    } finally {
      setAddingMaster(false);
    }
  };

  const handleSelectPrimary = async (email) => {
    try {
      const data = await setPrimaryMasterEmail(email);
      setMasterEmails(data.mapping?.masterEmails || []);
      showSettingNotice?.("대표 수신 메일로 설정되었습니다.");
    } catch (e) {
      showSettingNotice?.(e.message || "설정에 실패했습니다.");
    }
  };

  const handleConnectExternal = async () => {
    if (!canUseBrand) {
      setUpgradeReason("external");
      setUpgradeOpen(true);
      return;
    }
    const email = String(extEmail || "").trim();
    if (!email) {
      showSettingNotice?.("연동할 메일 주소를 입력해 주세요.");
      return;
    }
    setConnectingExternal(true);
    try {
      await connectExternalMailAccount({ email, provider: extProvider });
      const ext = await fetchExternalMailAccounts();
      setExternalAccounts(ext.accounts || []);
      setExtEmail("");
      showSettingNotice?.("외부 메일 연동이 등록되었습니다.");
    } catch (e) {
      if (e.code === "PREMIUM_REQUIRED") {
        setUpgradeReason("external");
        setUpgradeOpen(true);
      } else {
        showSettingNotice?.(e.message || "연동에 실패했습니다.");
      }
    } finally {
      setConnectingExternal(false);
    }
  };

  const idDisplay = loginId || "아이디";

  return (
    <SettingsSubpageShell
      title="VLUE 메일"
      subtitle="가상 주소 · 통합 메일함"
      onBack={onBack}
      isDarkMode={isDarkMode}
    >
      {loading ? (
        <p className="vlue-type-body py-12 text-center text-[#8b95a1]">불러오는 중…</p>
      ) : (
        <div className="space-y-3 pb-2">
          <VluePromoCard
            headline="VLUE 메일"
            headlineAccent="사업 메일함 속으로 쏙"
            floating={
              <VlueMailPreviewFloat
                fromAddress="partner@example.com"
                toAddress={displayEmail}
                snippet="견적서 보내드립니다"
              />
            }
            bodyTitle="VLUE 메일 / 사업 메일함 속으로 쏙"
            bodyIcon="📬"
            description="로그인 아이디가 곧 메일 주소입니다. 가상 @vlue.kr로 받은 메일은 대표 메일로 전달되고, 앱 통합 메일함에서 한눈에 확인하세요."
            ctaLabel={savingVirtual ? "저장 중…" : "메일 주소 적용"}
            ctaVariant="primary"
            onCta={handleSaveVirtual}
          />

          <section className={`vlue-settings-card ${isDarkMode ? "!bg-[#151821]" : ""}`}>
            <p className="vlue-settings-card__label">내 VLUE 메일 주소</p>
            <p className="vlue-settings-card__hint">별도 아이디 입력 없이 로그인 ID가 적용됩니다.</p>

            <div className="mt-3 space-y-2">
              <OptionCard
                selected={addressKind === "standard"}
                onSelect={() => setAddressKind("standard")}
                isDarkMode={isDarkMode}
                title="기본형 (무료)"
                hint={freeEmailNote}
              >
                <p className={`vlue-type-email mt-2 ${headText}`}>
                  <span className="text-primary-600">{idDisplay}</span>
                  <span className="font-normal text-[#8b95a1]">@vlue.kr</span>
                </p>
              </OptionCard>

              <OptionCard
                selected={addressKind === "brand"}
                disabled={!canUseBrand}
                onSelect={selectBrand}
                isDarkMode={isDarkMode}
                title={
                  <>
                    상호 브랜드형
                    <span className="vlue-chip ml-1.5 bg-amber-100 text-amber-800">유료·B2B</span>
                  </>
                }
                hint={premiumEmailNote}
              >
                <div className={`vlue-type-email mt-2 flex flex-wrap items-center gap-0.5 ${headText}`}>
                  <span className="text-primary-600">{idDisplay}</span>
                  <span className="font-normal text-[#8b95a1]">@</span>
                  <input
                    type="text"
                    value={companySlug}
                    onChange={(e) =>
                      setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="상호"
                    disabled={!canUseBrand}
                    className={`min-w-[72px] flex-1 rounded-md border px-2 py-1 text-[14px] font-medium ${inputCls}`}
                  />
                  <span className="font-normal text-[#8b95a1]">.vlue.kr</span>
                </div>
              </OptionCard>
            </div>

            {preview ? (
              <p className="vlue-type-caption mt-3 text-[#8b95a1]">
                적용 주소 <span className={`font-medium ${headText}`}>{preview}</span>
              </p>
            ) : null}
          </section>

          <section className={`vlue-settings-card ${isDarkMode ? "!bg-[#151821]" : ""}`}>
            <p className="vlue-settings-card__label">대표 수신 메일</p>
            <p className="vlue-settings-card__hint">
              @vlue.kr로 온 메일을 네이버·구글·카카오 등 실제 메일함으로 받습니다.
            </p>

            {masterEmails.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {masterEmails.map((item) => (
                  <li key={item.email}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                        item.isPrimary
                          ? isDarkMode
                            ? "border-primary-500/40 bg-primary-500/8"
                            : "border-primary-200 bg-primary-50/60"
                          : isDarkMode
                            ? "border-white/10"
                            : "border-[#f0f1f3]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="vlue-primary-master"
                        checked={Boolean(item.isPrimary)}
                        onChange={() => handleSelectPrimary(item.email)}
                        className="accent-primary-600"
                      />
                      <span className={`vlue-type-subtitle flex-1 ${headText}`}>{item.email}</span>
                      {item.isPrimary ? (
                        <span className="vlue-chip bg-primary-100 text-primary-700">대표</span>
                      ) : null}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vlue-type-body mt-3 rounded-xl border border-dashed border-[#e8eaed] py-6 text-center text-[#8b95a1]">
                등록된 수신 메일이 없습니다
              </p>
            )}

            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newMasterEmail}
                  onChange={(e) => {
                    setNewMasterEmail(e.target.value);
                    setMasterVerifyToken("");
                  }}
                  placeholder="example@naver.com"
                  className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 vlue-type-body ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={handleSendMasterOtp}
                  disabled={addingMaster}
                  className="vlue-promo-card__cta shrink-0 !w-auto px-3 disabled:opacity-50"
                >
                  {addingMaster ? "…" : "인증번호"}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={masterOtp}
                  onChange={(e) => setMasterOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 vlue-type-body ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={handleVerifyMasterOtp}
                  disabled={addingMaster}
                  className="shrink-0 rounded-xl border border-[#e8eaed] px-3 py-2.5 text-[13px] font-bold disabled:opacity-50"
                >
                  확인
                </button>
                <button
                  type="button"
                  onClick={handleAddMaster}
                  disabled={addingMaster}
                  className="vlue-promo-card__cta shrink-0 !w-auto px-4 disabled:opacity-50"
                >
                  {addingMaster ? "…" : "추가"}
                </button>
              </div>
              {masterOtpHint ? <p className="vlue-settings-card__hint">{masterOtpHint}</p> : null}
              <p className="vlue-settings-card__hint">{EMAIL_AUTH_SUPPORT}</p>
            </div>
          </section>

          <section className={`vlue-settings-card ${isDarkMode ? "!bg-[#151821]" : ""}`}>
            <div className="flex items-center gap-2">
              <p className="vlue-settings-card__label">외부 메일 통합</p>
              {!canUseBrand ? (
                <span className="vlue-chip bg-amber-100 text-amber-800">유료 전용</span>
              ) : null}
            </div>
            <p className="vlue-settings-card__hint">
              네이버·구글·카카오 메일을 통합 타임라인에 표시합니다. 50명 단위 순차 동기화.
            </p>

            {externalAccounts.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {externalAccounts.map((acc) => (
                  <li
                    key={acc.id || acc.email}
                    className={`rounded-xl border px-3 py-2 vlue-type-body ${headText} ${
                      isDarkMode ? "border-white/10" : "border-[#f0f1f3]"
                    }`}
                  >
                    {acc.provider || "custom"} · {acc.email}
                  </li>
                ))}
              </ul>
            ) : canUseBrand ? (
              <p className="vlue-type-body mt-3 text-center text-[#8b95a1]">연동된 외부 메일이 없습니다</p>
            ) : null}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                value={extProvider}
                onChange={(e) => setExtProvider(e.target.value)}
                disabled={!canUseBrand}
                className={`rounded-xl border px-3 py-2.5 vlue-type-body ${inputCls} disabled:opacity-50`}
              >
                <option value="naver">네이버</option>
                <option value="google">구글</option>
                <option value="kakao">카카오</option>
                <option value="custom">기타 IMAP</option>
              </select>
              <input
                type="email"
                value={extEmail}
                onChange={(e) => setExtEmail(e.target.value)}
                disabled={!canUseBrand}
                placeholder="example@gmail.com"
                className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 vlue-type-body ${inputCls} disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={handleConnectExternal}
                disabled={connectingExternal}
                className={`vlue-promo-card__cta shrink-0 !w-auto px-4 disabled:opacity-50 ${canUseBrand ? "vlue-promo-card__cta--primary" : ""}`}
              >
                {connectingExternal ? "…" : canUseBrand ? "연동" : "잠금"}
              </button>
            </div>
          </section>
        </div>
      )}

      {upgradeOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center">
          <div
            className={`w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl ${
              isDarkMode ? "bg-[#1a1d26] text-gray-100" : "bg-white text-[#191f28]"
            }`}
            role="dialog"
            aria-labelledby="vlue-email-upgrade-title"
          >
            <div className="bg-gradient-to-br from-[#00d4e8] to-[#0097c7] px-5 py-4">
              <p id="vlue-email-upgrade-title" className="vlue-promo-card__hero-title !text-[1.125rem]">
                {upgradeReason === "external" ? "외부 메일 연동" : "상호 브랜드형 메일"}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="vlue-type-body text-[#4e5968] dark:text-gray-400">
                {upgradeReason === "external" ? (
                  <>
                    네이버·구글·카카오 통합은 유료·B2B 회원 전용입니다. 무료 플랜은{" "}
                    <span className="font-medium text-primary-600">아이디@vlue.kr</span>만 제공됩니다.
                  </>
                ) : (
                  <>
                    유료·B2B 회원이면{" "}
                    <span className="font-medium text-primary-600">아이디@회사명.vlue.kr</span>을 바로 쓸 수
                    있습니다.
                  </>
                )}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(false)}
                  className="vlue-promo-card__cta flex-1"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeOpen(false);
                    onOpenUpgrade?.();
                  }}
                  className="vlue-promo-card__cta vlue-promo-card__cta--primary flex-1"
                >
                  요금제 보기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSubpageShell>
  );
}
