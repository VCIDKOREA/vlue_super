import { useCallback, useEffect, useState } from "react";
import { requestIamportCertification, consumeIamportCertRedirectResult } from "../../lib/iamportClient.js";
import { getPortoneUserCode } from "../../lib/portoneEnv.js";
import { formatPhoneE164ForKoreaDisplay } from "../../lib/phoneDisplay.js";
import {
  changePhoneWithIdentity,
  markPhoneChangeCertPending,
  clearPhoneChangeCertPending
} from "../../lib/phoneChangeApi.js";

/**
 * 설정 > 전화번호 — PASS 본인인증으로 계정 번호 변경
 */
export default function PhoneChangeSection({ currentPhone = "", isDarkMode = false, onSuccess, onError }) {
  const [impUid, setImpUid] = useState("");
  const [previewPhone, setPreviewPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const redirect = consumeIamportCertRedirectResult();
    if (redirect?.success && redirect.imp_uid) {
      setImpUid(redirect.imp_uid);
      const display = formatPhoneE164ForKoreaDisplay(redirect.phone || redirect.customer_phone || "");
      if (display) setPreviewPhone(display);
      setNotice("본인인증이 완료되었습니다. 아래 확인을 눌러 번호를 변경해 주세요.");
      clearPhoneChangeCertPending();
    } else if (redirect && redirect.success === false) {
      setError(redirect.error_msg || "본인인증이 완료되지 않았습니다.");
      clearPhoneChangeCertPending();
    }
  }, []);

  const runPass = useCallback(async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      markPhoneChangeCertPending();
      const userCode = getPortoneUserCode();
      const cert = await requestIamportCertification(userCode);
      const uid = String(cert?.imp_uid || cert?.impUid || "").trim();
      if (!uid) throw new Error("본인인증 결과를 확인하지 못했습니다.");
      setImpUid(uid);
      const phoneRaw =
        cert?.phone || cert?.customer_phone || cert?.customerPhone || cert?.phoneNumber || "";
      const display = formatPhoneE164ForKoreaDisplay(phoneRaw);
      if (display) setPreviewPhone(display);
      setNotice("본인인증이 완료되었습니다. 아래 확인을 눌러 번호를 변경해 주세요.");
      clearPhoneChangeCertPending();
    } catch (e) {
      clearPhoneChangeCertPending();
      setError(e?.message || "본인인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmChange = async () => {
    if (!impUid) {
      setError("먼저 PASS 본인인증을 완료해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await changePhoneWithIdentity(impUid);
      onSuccess?.(data.phoneDisplay || previewPhone || currentPhone);
      setNotice("전화번호가 변경되었습니다.");
      setImpUid("");
      setPreviewPhone("");
    } catch (e) {
      const msg = e?.message || "전화번호를 변경하지 못했습니다.";
      setError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const boxClass = isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-100 bg-white";
  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-600";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${boxClass}`}>
      <div>
        <p className={`text-[11px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>휴대전화</p>
        <p className={`mt-1 text-[15px] font-bold ${headText}`}>{currentPhone || "(등록된 번호 없음)"}</p>
      </div>
      <p className={`text-[12px] leading-relaxed ${subText}`} style={{ wordBreak: "keep-all" }}>
        새 휴대폰으로 PASS 본인인증을 하면 계정 전화번호가 변경됩니다. 게시물·케이스함·명함 등 기존 데이터는
        그대로 유지됩니다.
      </p>
      {previewPhone ? (
        <p className={`text-[12px] font-bold ${headText}`}>
          인증된 번호: <span className="tabular-nums">{previewPhone}</span>
        </p>
      ) : null}
      {error ? <p className="text-[12px] font-bold text-rose-500">{error}</p> : null}
      {notice ? <p className="text-[12px] font-bold text-emerald-600">{notice}</p> : null}
      {impUid ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={confirmChange}
            className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
          >
            {busy ? "변경 중…" : "이 번호로 변경"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={runPass}
            className={`w-full rounded-xl border py-3 text-[13px] font-bold disabled:opacity-50 ${
              isDarkMode ? "border-white/15 text-gray-100" : "border-gray-200 text-gray-800"
            }`}
          >
            본인인증 다시 하기
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={runPass}
          className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
        >
          {busy ? "본인인증 중…" : "새 번호로 PASS 본인인증"}
        </button>
      )}
    </div>
  );
}
