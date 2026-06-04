import { useCallback, useEffect, useState } from "react";
import { requestIamportCertification } from "../lib/iamportClient.js";
import { formatPhoneE164ForKoreaDisplay } from "../lib/phoneDisplay.js";
import { isCurrentUrlAdminEntry, normalizeAdminPath } from "../lib/adminEntryPath.js";
import { ensureAdminDeviceKey } from "../lib/adminDeviceKey.js";
import { fetchAdminDeviceMe } from "../lib/adminV1Api.js";
import CorporateAttributionAdminPanel from "./admin/CorporateAttributionAdminPanel.jsx";
import AdminDashboardPanel from "./admin/AdminDashboardPanel.jsx";

export default function AdminSecretApp() {
  const [authCode, setAuthCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isMasterDevice, setIsMasterDevice] = useState(false);
  const [deviceAuthorized, setDeviceAuthorized] = useState(false);
  const [adminTab, setAdminTab] = useState("dashboard");
  const [pendingMsg, setPendingMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [approveCode, setApproveCode] = useState("");
  const [approveOk, setApproveOk] = useState("");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const adminPath = normalizeAdminPath(import.meta.env.VITE_ADMIN_PATH);
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  useEffect(() => {
    if (!import.meta.env.VITE_ADMIN_PATH || !isCurrentUrlAdminEntry(import.meta.env.VITE_ADMIN_PATH)) {
      window.location.replace("/");
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("vlue-admin-entry", "1");
    return () => {
      try {
        sessionStorage.removeItem("vlue-admin-entry");
      } catch {
        /* ignore */
      }
    };
  }, []);

  const refreshDeviceStatus = useCallback(async () => {
    try {
      const st = await fetchAdminDeviceMe();
      setDeviceAuthorized(Boolean(st.isAuthorized || st.isMaster));
      setIsMasterDevice(Boolean(st.isMaster));
      return st;
    } catch {
      setDeviceAuthorized(false);
      return null;
    }
  }, []);

  const requestPendingCode = useCallback(async () => {
    setError("");
    setPendingMsg("");
    const deviceKey = ensureAdminDeviceKey();
    const url = `${apiBase}/api/admin/device/pending`.replace(/([^:]\/)\/+/g, "$1/");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Device-Id": deviceKey
      },
      body: JSON.stringify({ entryPathProof: adminPath })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || `요청 실패 (${res.status})`);
      return;
    }
    await refreshDeviceStatus();
    if (data.isMaster) {
      setIsMasterDevice(true);
      setDeviceAuthorized(true);
      setPendingMsg(data.message || "마스터 기기입니다.");
      setAuthCode("");
      setExpiresAt("");
      return;
    }
    setIsMasterDevice(false);
    setAuthCode(String(data.authCode || ""));
    setExpiresAt(String(data.expiresAt || ""));
    setPendingMsg("이 화면을 PC에 보이게 한 뒤, 마스터 휴대폰에서 아래 코드를 입력해 승인하세요.");
  }, [adminPath, apiBase, refreshDeviceStatus]);

  useEffect(() => {
    if (!adminPath) return;
    requestPendingCode().catch((e) => setError(e?.message || String(e)));
  }, [adminPath, requestPendingCode]);

  useEffect(() => {
    if (!deviceAuthorized && !isMasterDevice) {
      const t = setInterval(() => {
        refreshDeviceStatus();
      }, 4000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [deviceAuthorized, isMasterDevice, refreshDeviceStatus]);

  const submitAuthorize = async () => {
    setApproveOk("");
    setError("");
    const deviceKey = ensureAdminDeviceKey();
    const raw = approveCode.replace(/\D/g, "");
    if (raw.length !== 6) {
      setError("6자리 코드를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const url = `${apiBase}/api/admin/device/authorize`.replace(/([^:]\/)\/+/g, "$1/");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Device-Id": deviceKey
        },
        body: JSON.stringify({ authCode: raw })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `승인 실패 (${res.status})`);
      setApproveOk("승인되었습니다. PC에서 새로고침하면 관리 API를 사용할 수 있습니다.");
      setApproveCode("");
      await refreshDeviceStatus();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const runMasterIdentity = async () => {
    setError("");
    setBusy(true);
    try {
      const userCode = import.meta.env.VITE_PORTONE_USER_CODE;
      if (!userCode) throw new Error("VITE_PORTONE_USER_CODE 가 설정되지 않았습니다.");
      const rsp = await requestIamportCertification(userCode);
      const impUid = rsp?.imp_uid;
      if (!impUid) throw new Error("imp_uid가 없습니다.");
      const deviceKey = ensureAdminDeviceKey();
      const url = `${apiBase}/api/identity/portone/complete`.replace(/([^:]\/)\/+/g, "$1/");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impUid,
          isBusinessMember: false,
          requestDigitalCard: false,
          membershipTier: "free",
          adminDeviceKey: deviceKey
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `서버 오류 (${res.status})`);
      try {
        if (data.phoneE164) {
          localStorage.setItem("vlue_phone_e164", String(data.phoneE164));
          localStorage.setItem("myCardPhone", formatPhoneE164ForKoreaDisplay(data.phoneE164));
        }
      } catch {
        /* ignore */
      }
      setApproveOk(
        `본인인증 완료. 마스터 기기로 등록되었는지 서버 설정(ADMIN_MASTER_PHONE_E164)을 확인하세요. userId=${data.userId || ""}`
      );
      await requestPendingCode();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!import.meta.env.VITE_ADMIN_PATH) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 p-6 text-center text-[14px] text-gray-600">
        VITE_ADMIN_PATH 가 비어 있습니다. .env 를 설정한 뒤 다시 빌드하세요.
      </div>
    );
  }

  const canUseAdminApi = deviceAuthorized || isMasterDevice;

  return (
    <div className="min-h-[100dvh] bg-[#f0f4ff] text-gray-900 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <h1 className="text-[18px] font-black text-blue-700 tracking-tight">VLUE 본사 관리자</h1>
          <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">
            자동 가입 승인 · 기기 승인 · 기업 귀속 · 마케팅 · 콘텐츠 배포
          </p>

          {toast ? (
            <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-800">{toast}</p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
          ) : null}
          {approveOk ? (
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-[12px] text-green-800">{approveOk}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              disabled={!canUseAdminApi}
              onClick={() => setAdminTab("dashboard")}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-40 ${
                adminTab === "dashboard" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
            >
              가입 승인 홈
            </button>
            <button
              type="button"
              onClick={() => setAdminTab("device")}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${
                adminTab === "device" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
            >
              기기 승인
            </button>
            <button
              type="button"
              disabled={!canUseAdminApi}
              onClick={() => setAdminTab("attribution")}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-40 ${
                adminTab === "attribution" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
            >
              귀속 승인 관리
            </button>
          </div>

          {adminTab === "dashboard" && canUseAdminApi ? (
            <div className="mt-6">
              <AdminDashboardPanel onToast={showToast} />
            </div>
          ) : null}

          {adminTab === "device" ? (
            <>
              <section className="mt-6 space-y-2">
                <h2 className="text-[13px] font-bold text-gray-800">이 기기 (PC 등)</h2>
                {isMasterDevice ? (
                  <p className="text-[13px] text-blue-800 font-medium">
                    {pendingMsg || "마스터로 등록된 기기입니다."}
                  </p>
                ) : deviceAuthorized ? (
                  <p className="text-[13px] font-semibold text-green-800">
                    승인된 관리 기기입니다. 「귀속 승인 관리」 탭을 이용하세요.
                  </p>
                ) : (
                  <>
                    <p className="text-[12px] text-gray-600">{pendingMsg}</p>
                    {authCode ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-6 text-center">
                        <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                          승인 대기 코드
                        </p>
                        <p className="mt-2 text-[36px] font-black tracking-[0.2em] text-blue-900 tabular-nums">
                          {authCode}
                        </p>
                        {expiresAt ? (
                          <p className="mt-2 text-[11px] text-blue-700/80">
                            만료: {new Date(expiresAt).toLocaleString("ko-KR")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => requestPendingCode()}
                      className="w-full rounded-xl border border-gray-200 py-2 text-[12px] font-bold text-gray-700 active:scale-[0.99] disabled:opacity-50"
                    >
                      코드 새로 받기
                    </button>
                  </>
                )}
              </section>

              <section className="mt-8 space-y-3 border-t border-gray-100 pt-6">
                <h2 className="text-[13px] font-bold text-gray-800">마스터 휴대폰</h2>
                <p className="text-[11px] text-gray-500">
                  먼저 본인인증으로 이 기기를 마스터로 등록한 뒤, PC 화면의 6자리를 입력하세요.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={runMasterIdentity}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white shadow active:scale-[0.99] disabled:opacity-50"
                >
                  본인인증으로 마스터 기기 등록
                </button>
                <div className="flex gap-2">
                  <input
                    value={approveCode}
                    onChange={(e) => setApproveCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                    placeholder="PC 6자리"
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-[16px] font-bold tracking-widest text-center"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={submitAuthorize}
                    className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                  >
                    승인
                  </button>
                </div>
              </section>
            </>
          ) : adminTab === "attribution" ? (
            <div className="mt-6">
              <CorporateAttributionAdminPanel />
            </div>
          ) : null}

          <p className="mt-8 text-center">
            <button
              type="button"
              className="text-[12px] font-semibold text-blue-600 underline"
              onClick={() => window.location.replace("/")}
            >
              메인 앱으로
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
