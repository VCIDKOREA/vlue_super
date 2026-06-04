import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchSocialLinks, linkSocialAccount, readCachedSocialLinks } from "../../lib/socialAccountLinkApi.js";
import { getKakaoAccessTokenWithLogin } from "../../lib/kakaoSocialLogin.js";

const PROVIDERS = [
  {
    id: "kakao",
    label: "카카오",
    brandBg: "bg-[#FEE500]",
    brandText: "text-[#191919]",
    badge: "K",
    badgeBg: "bg-[#191919] text-[#FEE500]"
  },
  {
    id: "naver",
    label: "네이버",
    brandBg: "bg-[#03C75A]",
    brandText: "text-white",
    badge: "N",
    badgeBg: "bg-white text-[#03C75A]"
  }
];

function formatLinkedAt(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * 마이페이지 — VLUE 순정 가입 후 카카오/네이버 사후 연동
 */
export default function SocialAccountLinkPanel({ onToast }) {
  const [links, setLinks] = useState(() => readCachedSocialLinks());
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchSocialLinks();
      setLinks(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "연동 정보를 불러오지 못했습니다.");
      setLinks(readCachedSocialLinks());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const linkedMap = useMemo(() => {
    const m = {};
    for (const row of links) {
      m[String(row.provider).toLowerCase()] = row;
    }
    return m;
  }, [links]);

  const linkWithKakaoSdk = async () => {
    setBusyProvider("kakao");
    setError("");
    try {
      const token = await getKakaoAccessTokenWithLogin();
      await linkSocialAccount({ provider: "kakao", socialToken: token });
      onToast?.("카카오 계정이 VLUE 마스터 계정에 연동되었습니다.");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "카카오 연동에 실패했습니다.";
      setError(msg);
      onToast?.(msg);
    } finally {
      setBusyProvider("");
    }
  };

  const linkNaverPlaceholder = () => {
    onToast?.("네이버 연동 UI는 준비 중입니다. API는 연동 가능하며, 네이버 로그인 SDK 연결 후 활성화됩니다.");
  };

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-black text-slate-900">소셜 로그인 연동</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600 [word-break:keep-all]">
            VLUE는 <b>본인인증 회원가입</b>으로만 계정이 만들어집니다. 가입 후 여기서 카카오·네이버를
            <b> 1:1로 연결</b>하면 다음부터 간편 로그인할 수 있습니다.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black text-indigo-800">
          사후 연동
        </span>
      </div>

      <ol className="mt-4 space-y-2 text-[11px] leading-relaxed text-slate-600">
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
            1
          </span>
          <span>VLUE 회원가입(본인인증·아이디·비밀번호)으로 마스터 계정을 만듭니다.</span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
            2
          </span>
          <span>아래에서 카카오/네이버를 이 계정에 연결합니다.</span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
            3
          </span>
          <span>로그인 화면의 「간편 로그인」으로 1초 만에 접속합니다.</span>
        </li>
      </ol>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-2.5">
        {PROVIDERS.map((p) => {
          const linked = linkedMap[p.id];
          const isLinked = Boolean(linked);
          const isBusy = busyProvider === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border px-3 py-3 ${
                isLinked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-[15px] font-black ${p.brandBg} ${p.brandText}`}
                  >
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-black ${p.badgeBg}`}>
                      {p.badge}
                    </span>
                  </span>
                  <div>
                    <p className="text-[13px] font-black text-slate-900">{p.label}</p>
                    <p className="text-[10px] text-slate-500">
                      {isLinked
                        ? `연동됨 · ${formatLinkedAt(linked.linkedAt) || "최근"}`
                        : "미연동 — 연결하면 간편 로그인 가능"}
                    </p>
                  </div>
                </div>
                {isLinked ? (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">연동 완료</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">미연동</span>
                )}
              </div>

              {!isLinked && p.id === "kakao" ? (
                <button
                  type="button"
                  disabled={Boolean(busyProvider)}
                  onClick={linkWithKakaoSdk}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-2.5 text-[13px] font-semibold text-[#191919] disabled:opacity-60"
                >
                  {isBusy ? "연동 중…" : "카카오로 연동하기"}
                </button>
              ) : null}

              {!isLinked && p.id === "naver" ? (
                <button
                  type="button"
                  disabled={Boolean(busyProvider)}
                  onClick={linkNaverPlaceholder}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#03C75A] py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  네이버 연동 (준비 중)
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 disabled:opacity-50"
        >
          {loading ? "새로고침 중…" : "연동 상태 새로고침"}
        </button>
        <p className="text-[10px] text-slate-400">소셜로 신규 가입은 되지 않습니다</p>
      </div>
    </section>
  );
}
