import { useEffect, useMemo, useState } from "react";
import { VlueBrandLogo } from "./VlueBrandLogo.jsx";
import { getVlueDownloadLinks } from "../lib/vlueClientAccess.js";

const PARENT_PACKAGE = "kr.vlue.app";

function readInviteToken() {
  try {
    const q = new URLSearchParams(window.location.search || "");
    return String(q.get("vmapInvite") || q.get("inviteToken") || "").trim();
  } catch {
    return "";
  }
}

function buildVlueSchemeLink(token) {
  return `vlue://vmap?inviteToken=${encodeURIComponent(token)}`;
}

/** Chrome/카톡 인앱 — 설치 앱 우선, 실패 시 현재 브리지로 복귀 */
function buildAndroidIntentLink(token) {
  const schemeQuery = `inviteToken=${encodeURIComponent(token)}&vmapInvite=${encodeURIComponent(token)}&target=vmap`;
  const fallback = typeof window !== "undefined" ? window.location.href : "https://www.vlue.kr/#download";
  return (
    `intent://vmap?${schemeQuery}` +
    `#Intent;scheme=vlue;package=${PARENT_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
  );
}

/**
 * 카카오/브라우저 초대 핸드오프 — /app 차단 페이지를 거치지 않고 앱 딥링크를 우선 실행.
 * 경로: /invite/vmap?vmapInvite=TOKEN
 */
export default function VmapInviteBridgePage() {
  const links = useMemo(() => getVlueDownloadLinks(), []);
  const token = useMemo(() => readInviteToken(), []);
  const [status, setStatus] = useState(token ? "opening" : "missing");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.dataset.vlueShell = "vmap-invite-bridge";
    document.body.style.backgroundColor = "#ffffff";
    return () => {
      delete document.body.dataset.vlueShell;
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    const target = isAndroid ? buildAndroidIntentLink(token) : buildVlueSchemeLink(token);
    setStatus("opening");
    const t = window.setTimeout(() => {
      try {
        window.location.href = target;
      } catch {
        setStatus("manual");
      }
    }, 120);
    const fallback = window.setTimeout(() => setStatus("manual"), 1600);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(fallback);
    };
  }, [token]);

  const openApp = () => {
    if (!token) return;
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    window.location.href = isAndroid ? buildAndroidIntentLink(token) : buildVlueSchemeLink(token);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <VlueBrandLogo size={56} className="rounded-2xl shadow-lg ring-1 ring-gray-100" />
        </div>
        <h1 className="text-[22px] font-black tracking-tight text-gray-900">V-Map 초대</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-gray-600" style={{ wordBreak: "keep-all" }}>
          {status === "missing"
            ? "초대 링크가 올바르지 않습니다. 카카오톡에서 초대를 다시 받아 주세요."
            : status === "opening"
              ? "VLUÉ 앱으로 이동 중입니다…"
              : "앱이 열리지 않으면 아래 버튼으로 다시 시도하거나 스토어에서 설치해 주세요."}
        </p>

        {token ? (
          <button
            type="button"
            onClick={openApp}
            className="mt-8 w-full rounded-2xl bg-[#00A3FF] px-5 py-3.5 text-[15px] font-bold text-white shadow-md"
          >
            VLUÉ 앱으로 입장 확인하기
          </button>
        ) : null}

        <div className="mt-4 space-y-2">
          {links.playStore ? (
            <a
              href={links.playStore}
              className="block w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[14px] font-semibold text-gray-800"
            >
              Google Play에서 설치
            </a>
          ) : (
            <a
              href={links.downloadPage}
              className="block w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[14px] font-semibold text-gray-800"
            >
              앱 다운로드 안내
            </a>
          )}
          <a href={links.home} className="block text-[13px] font-medium text-gray-500 underline-offset-2 hover:underline">
            VLUÉ 홈으로
          </a>
        </div>
      </div>
    </div>
  );
}
