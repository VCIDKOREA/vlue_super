import { useState } from "react";
import VLUE_SHIELD_LOGO from "../../assets/vlue-shield-logo.svg?url";
import { hqLogin } from "../../lib/hqAdminApi.js";

export default function HqMasterLogin({ onSuccess }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await hqLogin(loginId, password);
      if (data.role !== "SUPER_ADMIN") {
        setError("SUPER_ADMIN 권한이 없습니다. DB에서 role=admin 인 계정인지 확인하세요.");
        return;
      }
      onSuccess?.(data);
    } catch (err) {
      if (err?.status === 403) {
        setError(err?.message || "SUPER_ADMIN 권한이 없습니다.");
        return;
      }
      setError(err?.message || "로그인에 실패했습니다. API 서버(8788)가 켜져 있는지 확인하세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={VLUE_SHIELD_LOGO} alt="" className="h-16 w-16 rounded-2xl shadow-sm" />
          <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.2em] text-blue-600">VLUE HQ</p>
          <h1 className="mt-2 text-[28px] font-black text-slate-900">본사 최고 관제소</h1>
          <p className="mt-2 text-[15px] font-semibold text-slate-500">SUPER_ADMIN 전용 마스터 로그인</p>
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-600">
            이 주소에서만 열립니다: <span className="font-black text-blue-600">/super-admin-hq</span>
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-[15px] font-black text-slate-800">관리자 아이디</span>
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[17px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            autoComplete="username"
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-2 block text-[15px] font-black text-slate-800">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[17px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="mt-4 text-[14px] font-bold text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-8 w-full rounded-xl bg-blue-600 py-4 text-[17px] font-black text-white disabled:opacity-50"
        >
          {busy ? "검증 중…" : "관제 데스크 진입"}
        </button>
      </form>
    </div>
  );
}
