import { useEffect } from "react";
import { Monitor, Smartphone, Download, ArrowLeft, Store } from "lucide-react";
import { VlueBrandLogo } from "./VlueBrandLogo.jsx";
import { marketingDownloadUrl, marketingHomeUrl } from "../lib/siteMode.js";
import "../site/bolt/index.css";

/**
 * 프로덕션 웹 브라우저 — /app 직접 접근 차단 (마켓·PC 설치형 정책)
 */
export default function BrowserAppBlockedPage() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.dataset.vlueShell = "www";
    document.body.style.backgroundColor = "#F5F9FF";
    return () => {
      delete document.body.dataset.vlueShell;
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div
      data-vlue-site="marketing"
      className="min-h-screen bg-gradient-to-b from-[#F5F9FF] to-white px-4 py-10 sm:px-6"
    >
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <VlueBrandLogo size={56} className="rounded-2xl shadow-soft ring-2 ring-primary-100" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 sm:text-3xl" style={{ letterSpacing: "-0.04em" }}>
          VLUE 앱은 브라우저에서 이용할 수 없습니다
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base" style={{ wordBreak: "keep-all" }}>
          홈페이지(www)에서는 검색·쇼핑·가입·AI 엑셀 등을 이용하세요.
          <br />
          통화 알림·명함·가족보호 등 <strong className="text-gray-800">전체 앱 기능</strong>은 스토어 앱 또는 PC 설치형
          프로그램에서 동일 계정으로 이용합니다.
        </p>

        <div className="mt-8 space-y-3 text-left">
          <a
            href={marketingDownloadUrl()}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
          >
            <Download className="h-5 w-5" />
            앱·PC 다운로드 안내
          </a>
          <a
            href={marketingHomeUrl()}
            className="btn-secondary flex w-full items-center justify-center gap-2 py-3 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            VLUE 홈페이지로
          </a>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <Smartphone className="mx-auto h-6 w-6 text-primary-600" />
            <p className="mt-2 text-xs font-bold text-gray-800">모바일</p>
            <p className="mt-1 text-[11px] text-gray-500">Play 스토어 · App Store</p>
            <Store className="mx-auto mt-2 h-4 w-4 text-gray-400" />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <Monitor className="mx-auto h-6 w-6 text-primary-600" />
            <p className="mt-2 text-xs font-bold text-gray-800">PC 버전</p>
            <p className="mt-1 text-[11px] text-gray-500">Windows · macOS 설치</p>
          </div>
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-gray-400">
          이미 가입하셨다면 홈페이지에서 동일 아이디로 로그인하세요. 앱 설치 후 같은 계정으로 자동 연동됩니다.
        </p>
      </div>
    </div>
  );
}
