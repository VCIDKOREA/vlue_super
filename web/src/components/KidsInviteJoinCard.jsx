import { useState } from "react";
import { redeemKidsInvite } from "../lib/familyProtectionApi.js";
import { setVlueSessionTokens } from "../lib/vlueAuthHeaders.js";
import { normalizeProtectionInviteCode } from "../lib/protectionInvite.js";

/** 만 14세 미만 — PASS 없이 부모 초대 코드로 가입 */
export default function KidsInviteJoinCard({ onJoined, onCancel }) {
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const inviteCode = normalizeProtectionInviteCode(code);
    const name = nickname.trim();
    if (name.length < 1) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    if (inviteCode.length !== 6) {
      setError("부모 앱에 표시된 6자리 코드를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const data = await redeemKidsInvite(inviteCode, name);
      if (data.accessToken || data.refreshToken) {
        setVlueSessionTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      }
      if (data.userId) localStorage.setItem("vlue_server_user_id", data.userId);
      if (data.publicHandle) localStorage.setItem("vlue_member_handle", `@${data.publicHandle}`);
      localStorage.setItem("vlue_family_role", "KIDS");
      localStorage.setItem("vlue_membership_kind", "free");
      onJoined?.({
        membershipKind: "free",
        membershipTier: "free",
        familyRole: "KIDS",
        userId: data.userId
      });
    } catch (err) {
      setError(err?.message || "초대 코드 확인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
      <h2 className="text-[16px] font-black text-slate-900">자녀 가입</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
        만 14세 미만은 본인인증(PASS)을 하지 않습니다. 부모 앱에서 받은 6자리 코드와 닉네임으로 가입합니다.
      </p>
      <label className="mt-3 block text-[11px] font-bold text-slate-700">
        닉네임
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] font-semibold"
          placeholder="예: 아들, 딸"
          autoComplete="nickname"
        />
      </label>
      <label className="mt-3 block text-[11px] font-bold text-slate-700">
        초대 코드
        <input
          value={code}
          onChange={(e) => setCode(normalizeProtectionInviteCode(e.target.value))}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-[20px] font-black tracking-[0.3em]"
          placeholder="ABC234"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={6}
        />
      </label>
      {error ? <p className="mt-2 text-[12px] font-semibold text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-2xl bg-violet-600 py-3 text-[14px] font-black text-white disabled:opacity-50"
      >
        {busy ? "확인 중…" : "코드로 가입하기"}
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="mt-2 w-full py-2 text-[12px] font-bold text-slate-500">
          일반 회원가입으로 돌아가기
        </button>
      ) : null}
    </section>
  );
}
