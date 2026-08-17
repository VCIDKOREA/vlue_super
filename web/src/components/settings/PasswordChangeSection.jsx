import { useCallback, useEffect, useState } from "react";
import { SettingsSubpageShell } from "./VlueSettingsUi.jsx";
import { requestIamportCertification, consumeIamportCertRedirectResult } from "../../lib/iamportClient.js";
import { getPortoneUserCode } from "../../lib/portoneEnv.js";
import { isValidMemberPassword, MEMBER_PASSWORD_HINT, MEMBER_PASSWORD_INVALID_MESSAGE } from "../../lib/memberPasswordRules.js";
import {
  changePasswordWithCurrent,
  changePasswordWithIdentity,
  markPasswordChangeCertPending,
  clearPasswordChangeCertPending,
  buildPasswordChangeSupportMailto
} from "../../lib/passwordChangeApi.js";

function Field({ label, value, onChange, isDarkMode, autoComplete, placeholder }) {
  return (
    <label className={`block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
      {label}
      <input
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none ${
          isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white text-gray-900"
        }`}
      />
    </label>
  );
}

export default function PasswordChangeSection({
  variant = "settings",
  isDarkMode = false,
  loggedIn = true,
  handle = "",
  legalName = "",
  phone = "",
  onBack,
  onSuccess
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [impUid, setImpUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const redirect = consumeIamportCertRedirectResult();
    if (redirect?.success && redirect.imp_uid) {
      setImpUid(redirect.imp_uid);
      setNotice("본인인증이 완료되었습니다. 새 비밀번호를 입력해 주세요.");
      clearPasswordChangeCertPending();
    } else if (redirect && redirect.success === false) {
      setError(redirect.error_msg || "본인인증이 완료되지 않았습니다.");
      clearPasswordChangeCertPending();
    }
  }, []);

  const mailto = buildPasswordChangeSupportMailto({ handle, legalName, phone });

  const validateNew = () => {
    if (!isValidMemberPassword(newPassword)) return MEMBER_PASSWORD_INVALID_MESSAGE;
    if (newPassword !== confirmPassword) return "새 비밀번호 확인이 일치하지 않습니다.";
    return "";
  };

  const submitWithCurrent = async () => {
    const invalid = validateNew();
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!oldPassword) {
      setError("기존 비밀번호를 입력해 주세요. 모르면 아래 본인인증을 이용해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changePasswordWithCurrent(oldPassword, newPassword);
      onSuccess?.("비밀번호가 변경되었습니다.");
    } catch (e) {
      setError(e?.message || "비밀번호를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const runPass = useCallback(async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      markPasswordChangeCertPending(variant === "overlay" ? "login" : "settings");
      const userCode = getPortoneUserCode();
      const cert = await requestIamportCertification(userCode);
      const uid = String(cert?.imp_uid || cert?.impUid || "").trim();
      if (!uid) throw new Error("본인인증 결과를 확인하지 못했습니다.");
      setImpUid(uid);
      setNotice("본인인증이 완료되었습니다. 새 비밀번호를 입력한 뒤 변경을 눌러 주세요.");
      clearPasswordChangeCertPending();
    } catch (e) {
      clearPasswordChangeCertPending();
      setError(e?.message || "본인인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  const submitWithIdentity = async () => {
    const invalid = validateNew();
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!impUid) {
      setError("먼저 PASS 본인인증을 완료해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changePasswordWithIdentity(impUid, newPassword, { anonymous: !loggedIn });
      onSuccess?.(
        loggedIn
          ? "본인인증으로 비밀번호가 변경되었습니다."
          : "본인인증으로 비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요."
      );
    } catch (e) {
      setError(e?.message || "비밀번호를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const boxClass = isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-100 bg-white";
  const body = (
    <div className="space-y-4">
      {loggedIn ? (
        <div className={`rounded-2xl border p-4 space-y-3 ${boxClass}`}>
          <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            기존 비밀번호로 변경
          </p>
          <Field
            label="기존 비밀번호"
            value={oldPassword}
            onChange={setOldPassword}
            isDarkMode={isDarkMode}
            autoComplete="current-password"
          />
          <Field
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
            isDarkMode={isDarkMode}
            autoComplete="new-password"
            placeholder={MEMBER_PASSWORD_HINT}
          />
          <Field
            label="새 비밀번호 확인"
            value={confirmPassword}
            onChange={setConfirmPassword}
            isDarkMode={isDarkMode}
            autoComplete="new-password"
          />
          <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{MEMBER_PASSWORD_HINT}</p>
          {error ? <p className="text-[12px] font-bold text-rose-500">{error}</p> : null}
          {notice ? <p className="text-[12px] font-bold text-emerald-600">{notice}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={impUid ? submitWithIdentity : submitWithCurrent}
            className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
          >
            {busy ? "처리 중…" : impUid ? "본인인증으로 변경" : "비밀번호 변경"}
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl border p-4 space-y-3 ${boxClass}`}>
          <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            본인인증으로 재설정
          </p>
          <p className={`text-[12px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} style={{ wordBreak: "keep-all" }}>
            가입 때 사용한 휴대폰으로 PASS 본인인증을 하면 새 비밀번호를 설정할 수 있습니다.
          </p>
          <Field
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
            isDarkMode={isDarkMode}
            autoComplete="new-password"
            placeholder={MEMBER_PASSWORD_HINT}
          />
          <Field
            label="새 비밀번호 확인"
            value={confirmPassword}
            onChange={setConfirmPassword}
            isDarkMode={isDarkMode}
            autoComplete="new-password"
          />
          {error ? <p className="text-[12px] font-bold text-rose-500">{error}</p> : null}
          {notice ? <p className="text-[12px] font-bold text-emerald-600">{notice}</p> : null}
          {impUid ? (
            <button
              type="button"
              disabled={busy}
              onClick={submitWithIdentity}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "처리 중…" : "새 비밀번호 저장"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={runPass}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "본인인증 중…" : "PASS·휴대폰 본인인증"}
            </button>
          )}
        </div>
      )}

      {loggedIn ? (
        <div className={`rounded-2xl border p-4 space-y-2 ${boxClass}`}>
          <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            기존 비밀번호를 모르겠어요
          </p>
          <p className={`text-[12px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} style={{ wordBreak: "keep-all" }}>
            가입 휴대폰으로 PASS 본인인증을 하면 기존 비밀번호 없이 바꿀 수 있습니다.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={runPass}
            className={`w-full rounded-xl border py-3 text-[13px] font-bold disabled:opacity-50 ${
              isDarkMode ? "border-white/15 text-gray-100" : "border-gray-200 text-gray-800"
            }`}
          >
            {impUid ? "본인인증 다시 하기" : "PASS·휴대폰 본인인증"}
          </button>
        </div>
      ) : null}

      <div className={`rounded-2xl border p-4 space-y-2 ${boxClass}`}>
        <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
          본인인증이 어려워요
        </p>
        <p className={`text-[12px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} style={{ wordBreak: "keep-all" }}>
          고객센터 메일로 비밀번호 변경을 신청할 수 있습니다. 회원 ID와 가입 휴대폰을 적어 주세요.
        </p>
        <a
          href={mailto}
          className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-3 text-[13px] font-black text-white"
        >
          support@vlue.kr 로 신청
        </a>
      </div>
    </div>
  );

  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 z-[240] flex flex-col bg-[#f7f8fa]">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#f0f1f3] bg-white px-4 py-3.5">
          <button
            type="button"
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-full text-[20px] font-light text-[#4e5968]"
            aria-label="뒤로"
          >
            ‹
          </button>
          <p className="text-[17px] font-black text-[#191f28]">비밀번호 찾기</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{body}</div>
      </div>
    );
  }

  return (
    <SettingsSubpageShell title="비밀번호 변경" onBack={onBack} isDarkMode={isDarkMode}>
      {body}
    </SettingsSubpageShell>
  );
}
