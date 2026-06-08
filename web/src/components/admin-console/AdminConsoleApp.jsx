import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CONSOLE_TOKEN_KEY,
  adminConsoleLogin,
  clearAdminConsoleSession,
  fetchAdminConsoleMe,
  readAdminConsoleSession
} from "../../lib/adminConsoleApi.js";
import AdminConsoleDesk from "./AdminConsoleDesk.jsx";

function AdminConsoleLogin({ onSuccess }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await adminConsoleLogin(loginId, password);
      onSuccess(data);
    } catch (err) {
      setError(err?.message || "로그인 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-blue-400">VLUE Admin</p>
        <h1 className="mt-2 text-center text-[20px] font-black text-white">관리자 대시보드</h1>
        <p className="mt-1 text-center text-[12px] text-slate-400">role=admin 계정만 접근할 수 있습니다.</p>
        <label className="mt-5 block text-[11px] font-bold text-slate-400">
          아이디
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-[14px] text-white"
            autoComplete="username"
          />
        </label>
        <label className="mt-3 block text-[11px] font-bold text-slate-400">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-[14px] text-white"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="mt-3 text-[12px] font-semibold text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-[14px] font-black text-white disabled:opacity-60"
        >
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}

export default function AdminConsoleApp() {
  const [user, setUser] = useState(() => readAdminConsoleSession());
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(ADMIN_CONSOLE_TOKEN_KEY)));

  const logout = useCallback(() => {
    clearAdminConsoleSession();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(ADMIN_CONSOLE_TOKEN_KEY)) {
      setChecking(false);
      return;
    }
    fetchAdminConsoleMe()
      .then((data) => {
        setUser({
          userId: data.userId,
          legalName: data.legalName,
          publicHandle: data.publicHandle,
          role: data.role
        });
      })
      .catch(() => {
        clearAdminConsoleSession();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-[14px] font-bold text-slate-300">
        관리자 세션 확인 중…
      </div>
    );
  }

  if (!user?.userId) {
    return (
      <AdminConsoleLogin
        onSuccess={(data) =>
          setUser({
            userId: data.userId,
            legalName: data.legalName,
            publicHandle: data.publicHandle,
            role: data.role
          })
        }
      />
    );
  }

  return <AdminConsoleDesk user={user} onLogout={logout} />;
}
