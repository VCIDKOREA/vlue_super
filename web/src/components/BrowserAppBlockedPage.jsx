import { useEffect, useMemo } from "react";
import { Monitor, Smartphone, Download, ArrowLeft, Store, Apple } from "lucide-react";
import { VlueBrandLogo } from "./VlueBrandLogo.jsx";
import { getVlueDownloadLinks } from "../lib/vlueClientAccess.js";
import "../site/bolt/index.css";

/**
 * 순수 웹 브라우저 — /app 직접 접근 차단 · 앱·PC 다운로드 유도
 * (Electron VLUE-PC-App UA · 모바일 네이티브 셸은 siteMode에서 선행 통과)
 */
export default function BrowserAppBlockedPage() {
  const links = useMemo(() => getVlueDownloadLinks(), []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.dataset.vlueShell = "app-blocked";
    document.body.style.backgroundColor = "#ffffff";
    return () => {
      delete document.body.dataset.vlueShell;
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div
      data-vlue-site="app-blocked"
      className="min-h-screen bg-white px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex justify-center">
          <VlueBrandLogo size={64} className="rounded-2xl shadow-lg ring-1 ring-gray-100" />
        </div>

        <div className="text-center">
          <h1
            className="text-2xl font-black tracking-tight text-gray-900 sm:text-[28px]"
            style={{ wordBreak: "keep-all", letterSpacing: "-0.03em" }}
          >
            VLUE 앱은 브라우저에서 이용할 수 없습니다
          </h1>
          <p
            className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-[15px]"
            style={{ wordBreak: "keep-all" }}
          >
            홈페이지(www)에서는 검색·쇼핑·가입·AI 엑셀 등을 이용하세요. 통화 알림·명함·가족보호 등{" "}
            <strong className="font-semibold text-gray-800">전체 앱 기능</strong>은 스토어 앱 또는 PC
            설치형 프로그램에서 동일 계정으로 이용합니다.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <a
            href={links.downloadPage}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-[15px] font-bold text-white shadow-md transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            <span aria-hidden>📥</span>
            앱·PC 다운로드 안내
            <Download className="h-4 w-4 opacity-80" aria-hidden />
          </a>
          <a
            href={links.home}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[14px] font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            VLUE 홈페이지로
          </a>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                📱
              </span>
              <p className="text-sm font-black text-gray-900">모바일</p>
            </div>
            <p className="mb-4 text-[12px] leading-relaxed text-gray-500">
              Play 스토어 · App Store에서 VLUE 앱을 설치하세요.
            </p>
            <div className="space-y-2">
              <a
                href={links.playStore}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
              >
                <Smartphone className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                <span>
                  <span className="block text-[12px] font-bold text-gray-800">Google Play</span>
                  <span className="text-[10px] text-gray-400">Android 다운로드</span>
                </span>
                <Store className="ml-auto h-4 w-4 text-gray-300" aria-hidden />
              </a>
              <a
                href={links.appStore}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
              >
                <Apple className="h-5 w-5 shrink-0 text-gray-700" aria-hidden />
                <span>
                  <span className="block text-[12px] font-bold text-gray-800">App Store</span>
                  <span className="text-[10px] text-gray-400">iOS 다운로드</span>
                </span>
                <Store className="ml-auto h-4 w-4 text-gray-300" aria-hidden />
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                💻
              </span>
              <p className="text-sm font-black text-gray-900">PC 버전</p>
            </div>
            <p className="mb-4 text-[12px] leading-relaxed text-gray-500">
              Windows · macOS 설치형 프로그램으로 멀티태스킹 채팅·메일톡을 이용하세요.
            </p>
            <div className="space-y-2">
              <a
                href={links.pcWindows}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
              >
                <Monitor className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                <span>
                  <span className="block text-[12px] font-bold text-gray-800">Windows</span>
                  <span className="text-[10px] text-gray-400">PC 설치형 다운로드</span>
                </span>
                <Download className="ml-auto h-4 w-4 text-gray-300" aria-hidden />
              </a>
              <a
                href={links.pcMac}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
              >
                <Monitor className="h-5 w-5 shrink-0 text-gray-700" aria-hidden />
                <span>
                  <span className="block text-[12px] font-bold text-gray-800">macOS</span>
                  <span className="text-[10px] text-gray-400">PC 설치형 다운로드</span>
                </span>
                <Download className="ml-auto h-4 w-4 text-gray-300" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        <p
          className="mt-10 border-t border-gray-100 pt-6 text-center text-[11px] leading-relaxed text-gray-400"
          style={{ wordBreak: "keep-all" }}
        >
          이미 가입하셨다면 홈페이지에서 동일 아이디로 로그인하세요. 앱 설치 후 같은 계정으로 자동
          연동됩니다.
        </p>
      </div>
    </div>
  );
}
