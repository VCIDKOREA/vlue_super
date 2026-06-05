import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/DownloadPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.__vite_plugin_react_preamble_installed__) {
    throw new Error("@vitejs/plugin-react can't detect preamble. Something is wrong. See https://github.com/vitejs/vite-plugin-react/pull/11#discussion_r430879201");
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    RefreshRuntime.register(type, "/home/project/src/pages/DownloadPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { Monitor, Smartphone, Download, Shield, CheckCircle, Apple, Chrome, ArrowLeft } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const PC_FEATURES = [
  "실시간 전화번호·기관 사기 여부 조회",
  "공공데이터 연동 자동 검증",
  "VLUE 인증 기관 데이터베이스 직접 연결",
  "피싱 사이트 URL 자동 탐지 알림",
  "보안 문서 열람 및 서명 기능",
  "대용량 기관 일괄 검증 (기업용)"
];
const MOBILE_FEATURES = [
  "수신 전화 실시간 사기 위험 알림",
  "문자 링크 자동 안전 분석",
  "위치 기반 안심영역 설정",
  "음성 통화 중 즉시 기관 조회",
  "지문·Face ID 간편 인증",
  "오프라인 최근 검색 기록 보기"
];
const PC_SYSTEMS = [
  { icon: Chrome, label: "Windows", sub: "Windows 10 이상", badge: "최신" },
  { icon: Monitor, label: "macOS", sub: "macOS 12 이상", badge: "" }
];
const MOBILE_SYSTEMS = [
  { icon: Smartphone, label: "Android", sub: "Android 9.0 이상", badge: "권장" },
  { icon: Apple, label: "iOS", sub: "iOS 15 이상", badge: "" }
];
export default function DownloadPage({ onBack }) {
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-[60px]", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: onBack,
        className: "inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-8",
        children: [
          /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 44,
            columnNumber: 11
          }, this),
          "홈으로 돌아가기"
        ]
      },
      void 0,
      true,
      {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 40,
        columnNumber: 9
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-12", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-600 font-semibold text-xs px-3 py-1.5 mb-4", children: [
        /* @__PURE__ */ jsxDEV(Shield, { className: "w-3.5 h-3.5 flex-shrink-0" }, void 0, false, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 51,
          columnNumber: 13
        }, this),
        "공식 배포 채널"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 50,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "h1",
        {
          className: "text-3xl sm:text-4xl font-black text-gray-900 mb-3",
          style: { letterSpacing: "-0.04em", wordBreak: "keep-all" },
          children: "VLUE 앱 다운로드"
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 54,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm sm:text-base max-w-xl mx-auto", style: { wordBreak: "keep-all" }, children: [
        "PC와 모바일 모두에서 사기 피해를 예방하세요.",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 61,
          columnNumber: 39
        }, this),
        "어떤 환경에서도 실시간으로 기관 신뢰도를 확인할 수 있습니다."
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 60,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/DownloadPage.tsx",
      lineNumber: 49,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-10", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden flex flex-col", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-br from-primary-600 to-primary-500 px-7 pt-8 pb-6", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxDEV(Monitor, { className: "w-6 h-6 text-white" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 73,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 72,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-black text-white mb-1", style: { letterSpacing: "-0.03em" }, children: "PC 버전" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 75,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-primary-100 text-sm", children: "Windows / macOS 데스크톱 전용" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 76,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 71,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "px-7 py-6 flex-1 flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3 mb-6", children: PC_SYSTEMS.map(
            ({ icon: Ic, label, sub, badge }) => /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "flex-1 rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3 flex flex-col items-center gap-1 text-center",
                children: [
                  /* @__PURE__ */ jsxDEV(Ic, { className: "w-5 h-5 text-gray-500 mb-0.5" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 86,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-800", children: label }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 87,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-gray-400", children: sub }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 88,
                    columnNumber: 21
                  }, this),
                  badge && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-bold bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full", children: badge }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 90,
                    columnNumber: 19
                  }, this)
                ]
              },
              label,
              true,
              {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 82,
                columnNumber: 17
              },
              this
            )
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 80,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("ul", { className: "space-y-2 flex-1 mb-6", children: PC_FEATURES.map(
            (f) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2 text-sm text-gray-600", children: [
              /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" }, void 0, false, {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 101,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("span", { style: { wordBreak: "keep-all" }, children: f }, void 0, false, {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 102,
                columnNumber: 21
              }, this)
            ] }, f, true, {
              fileName: "/home/project/src/pages/DownloadPage.tsx",
              lineNumber: 100,
              columnNumber: 17
            }, this)
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 98,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2.5", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                className: "w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-sm transition-all shadow-soft",
                children: [
                  /* @__PURE__ */ jsxDEV(Download, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 111,
                    columnNumber: 19
                  }, this),
                  "Windows 다운로드",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-primary-200 text-xs font-normal ml-1", children: "v2.4.1" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 113,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 108,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                className: "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-sm border border-gray-200 transition-all",
                children: [
                  /* @__PURE__ */ jsxDEV(Monitor, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 118,
                    columnNumber: 19
                  }, this),
                  "macOS 다운로드",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 text-xs font-normal ml-1", children: "v2.4.1" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 120,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 115,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 107,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-center text-[11px] text-gray-400 mt-3", children: "설치 파일 서명 인증 완료 · 바이러스 검사 통과" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 124,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 79,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 70,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden flex flex-col", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-br from-sky-500 to-blue-400 px-7 pt-8 pb-6", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxDEV(Smartphone, { className: "w-6 h-6 text-white" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 134,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 133,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-black text-white mb-1", style: { letterSpacing: "-0.03em" }, children: "모바일 버전" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 136,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-sky-100 text-sm", children: "Android / iOS 스마트폰 전용" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 137,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 132,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "px-7 py-6 flex-1 flex flex-col", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3 mb-6", children: MOBILE_SYSTEMS.map(
            ({ icon: Ic, label, sub, badge }) => /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "flex-1 rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3 flex flex-col items-center gap-1 text-center",
                children: [
                  /* @__PURE__ */ jsxDEV(Ic, { className: "w-5 h-5 text-gray-500 mb-0.5" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 147,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-800", children: label }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 148,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-gray-400", children: sub }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 149,
                    columnNumber: 21
                  }, this),
                  badge && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-bold bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full", children: badge }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 151,
                    columnNumber: 19
                  }, this)
                ]
              },
              label,
              true,
              {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 143,
                columnNumber: 17
              },
              this
            )
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 141,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("ul", { className: "space-y-2 flex-1 mb-6", children: MOBILE_FEATURES.map(
            (f) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2 text-sm text-gray-600", children: [
              /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" }, void 0, false, {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 162,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("span", { style: { wordBreak: "keep-all" }, children: f }, void 0, false, {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 163,
                columnNumber: 21
              }, this)
            ] }, f, true, {
              fileName: "/home/project/src/pages/DownloadPage.tsx",
              lineNumber: 161,
              columnNumber: 17
            }, this)
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 159,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2.5", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                className: "w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-semibold text-sm transition-all shadow-soft",
                children: [
                  /* @__PURE__ */ jsxDEV(Apple, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 172,
                    columnNumber: 19
                  }, this),
                  "App Store",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 text-xs font-normal ml-1", children: "iOS" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 174,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 169,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                className: "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-all shadow-soft",
                children: [
                  /* @__PURE__ */ jsxDEV(Smartphone, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 179,
                    columnNumber: 19
                  }, this),
                  "Google Play",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-emerald-200 text-xs font-normal ml-1", children: "Android" }, void 0, false, {
                    fileName: "/home/project/src/pages/DownloadPage.tsx",
                    lineNumber: 181,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/DownloadPage.tsx",
                lineNumber: 176,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 168,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-center text-[11px] text-gray-400 mt-3", children: "공식 스토어 배포 · 개인정보 수집 최소화" }, void 0, false, {
            fileName: "/home/project/src/pages/DownloadPage.tsx",
            lineNumber: 185,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 140,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 131,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/DownloadPage.tsx",
      lineNumber: 67,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl border border-gray-100 shadow-card px-7 py-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-6 h-6 text-primary-600" }, void 0, false, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 195,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 194,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "font-bold text-gray-900 text-sm mb-0.5", children: "모든 버전은 무료입니다" }, void 0, false, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 198,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs", style: { wordBreak: "keep-all" }, children: "VLUE 기본 검색 및 사기 탐지 기능은 회원가입 없이도 사용 가능합니다. 기업용 일괄 검증, 보안 메일 등 프리미엄 기능은 인증 플랜을 확인하세요." }, void 0, false, {
          fileName: "/home/project/src/pages/DownloadPage.tsx",
          lineNumber: 199,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 197,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { className: "btn-primary text-sm flex-shrink-0 whitespace-nowrap", children: "인증 플랜 보기" }, void 0, false, {
        fileName: "/home/project/src/pages/DownloadPage.tsx",
        lineNumber: 203,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/DownloadPage.tsx",
      lineNumber: 193,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/DownloadPage.tsx",
    lineNumber: 38,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/pages/DownloadPage.tsx",
    lineNumber: 37,
    columnNumber: 5
  }, this);
}
_c = DownloadPage;
var _c;
$RefreshReg$(_c, "DownloadPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/DownloadPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/DownloadPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFBQTtBQUFBO0FBQUEsYUFFQTtBQUFBLE1BQ0EsdUJBQUMsU0FBSSxXQUFVLFVBQ2I7QUFBQSwrQkFBQyxPQUFFLFdBQVUsMENBQXlDLDRCQUF0RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWtFO0FBQUEsUUFDbEUsdUJBQUMsT0FBRSxXQUFVLHlCQUF3QixPQUFPLEVBQUVILFdBQVcsV0FBVyxHQUFFLG1HQUF0RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQUpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFLQTtBQUFBLE1BQ0EsdUJBQUMsWUFBTyxXQUFVLHVEQUFxRCx3QkFBdkU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsU0FaRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBYUE7QUFBQSxPQXhLRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBeUtBLEtBMUtGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0EyS0E7QUFFSjtBQUFDSSxLQS9LdUJQO0FBQVksSUFBQU87QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbIlNtYXJ0cGhvbmUiLCJTaGllbGQiLCJDaGVja0NpcmNsZSIsIkFwcGxlIiwiQ2hyb21lIiwiUENfRkVBVFVSRVMiLCJNT0JJTEVfRkVBVFVSRVMiLCJQQ19TWVNURU1TIiwiaWNvbiIsImxhYmVsIiwic3ViIiwiYmFkZ2UiLCJNb25pdG9yIiwiTU9CSUxFX1NZU1RFTVMiLCJEb3dubG9hZFBhZ2UiLCJvbkJhY2siLCJsZXR0ZXJTcGFjaW5nIiwid29yZEJyZWFrIiwibWFwIiwiSWMiLCJmIiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiRG93bmxvYWRQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb25pdG9yLCBTbWFydHBob25lLCBEb3dubG9hZCwgU2hpZWxkLCBDaGVja0NpcmNsZSwgQXBwbGUsIENocm9tZSwgQXJyb3dMZWZ0IH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuaW50ZXJmYWNlIERvd25sb2FkUGFnZVByb3BzIHtcbiAgb25CYWNrOiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBQQ19GRUFUVVJFUyA9IFtcbiAgJ+yLpOyLnOqwhCDsoITtmZTrsojtmLjCt+q4sOq0gCDsgqzquLAg7Jes67aAIOyhsO2ajCcsXG4gICfqs7Xqs7XrjbDsnbTthLAg7Jew64+ZIOyekOuPmSDqsoDspp0nLFxuICAnVkxVRSDsnbjspp0g6riw6rSAIOuNsOydtO2EsOuyoOydtOyKpCDsp4HsoJEg7Jew6rKwJyxcbiAgJ+2UvOyLsSDsgqzsnbTtirggVVJMIOyekOuPmSDtg5Dsp4Ag7JWM66a8JyxcbiAgJ+uztOyViCDrrLjshJwg7Je0656MIOuwjyDshJzrqoUg6riw64qlJyxcbiAgJ+uMgOyaqeufiSDquLDqtIAg7J286rSEIOqygOymnSAo6riw7JeF7JqpKScsXG5dO1xuXG5jb25zdCBNT0JJTEVfRkVBVFVSRVMgPSBbXG4gICfsiJjsi6Ag7KCE7ZmUIOyLpOyLnOqwhCDsgqzquLAg7JyE7ZeYIOyVjOumvCcsXG4gICfrrLjsnpAg66eB7YGsIOyekOuPmSDslYjsoIQg67aE7ISdJyxcbiAgJ+ychOy5mCDquLDrsJgg7JWI7Ius7JiB7JetIOyEpOyglScsXG4gICfsnYzshLEg7Ya17ZmUIOykkSDsponsi5wg6riw6rSAIOyhsO2ajCcsXG4gICfsp4DrrLjCt0ZhY2UgSUQg6rCE7Y64IOyduOymnScsXG4gICfsmKTtlITrnbzsnbgg7LWc6re8IOqygOyDiSDquLDroZ0g67O06riwJyxcbl07XG5cbmNvbnN0IFBDX1NZU1RFTVMgPSBbXG4gIHsgaWNvbjogQ2hyb21lLCBsYWJlbDogJ1dpbmRvd3MnLCBzdWI6ICdXaW5kb3dzIDEwIOydtOyDgScsIGJhZGdlOiAn7LWc7IugJyB9LFxuICB7IGljb246IE1vbml0b3IsIGxhYmVsOiAnbWFjT1MnLCBzdWI6ICdtYWNPUyAxMiDsnbTsg4EnLCBiYWRnZTogJycgfSxcbl07XG5cbmNvbnN0IE1PQklMRV9TWVNURU1TID0gW1xuICB7IGljb246IFNtYXJ0cGhvbmUsIGxhYmVsOiAnQW5kcm9pZCcsIHN1YjogJ0FuZHJvaWQgOS4wIOydtOyDgScsIGJhZGdlOiAn6raM7J6lJyB9LFxuICB7IGljb246IEFwcGxlLCBsYWJlbDogJ2lPUycsIHN1YjogJ2lPUyAxNSDsnbTsg4EnLCBiYWRnZTogJycgfSxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERvd25sb2FkUGFnZSh7IG9uQmFjayB9OiBEb3dubG9hZFBhZ2VQcm9wcykge1xuICByZXR1cm4gKFxuICAgIDxtYWluIGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ibHVlLXRpbnQgcHQtWzYwcHhdXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTV4bCBteC1hdXRvIHB4LTQgc206cHgtNiBweS0xMCBzbTpweS0xNlwiPlxuXG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXtvbkJhY2t9XG4gICAgICAgICAgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgdGV4dC1zbSB0ZXh0LWdyYXktNTAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgdHJhbnNpdGlvbi1jb2xvcnMgbWItOFwiXG4gICAgICAgID5cbiAgICAgICAgICA8QXJyb3dMZWZ0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgIO2ZiOycvOuhnCDrj4zslYTqsIDquLBcbiAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgey8qIO2XpOuNlCAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciBtYi0xMlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTIwMCB0ZXh0LXByaW1hcnktNjAwIGZvbnQtc2VtaWJvbGQgdGV4dC14cyBweC0zIHB5LTEuNSBtYi00XCI+XG4gICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctMy41IGgtMy41IGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAg6rO17IudIOuwsO2PrCDssYTrhJBcbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8aDFcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQtM3hsIHNtOnRleHQtNHhsIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBtYi0zXCJcbiAgICAgICAgICAgIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wNGVtJywgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19XG4gICAgICAgICAgPlxuICAgICAgICAgICAgVkxVRSDslbEg64uk7Jq066Gc65OcXG4gICAgICAgICAgPC9oMT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIHRleHQtc20gc206dGV4dC1iYXNlIG1heC13LXhsIG14LWF1dG9cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICBQQ+yZgCDrqqjrsJTsnbwg66qo65GQ7JeQ7IScIOyCrOq4sCDtlLztlbTrpbwg7JiI67Cp7ZWY7IS47JqULjxiciAvPlxuICAgICAgICAgICAg7Ja065akIO2ZmOqyveyXkOyEnOuPhCDsi6Tsi5zqsITsnLzroZwg6riw6rSAIOyLoOuisOuPhOulvCDtmZXsnbjtlaAg7IiYIOyeiOyKteuLiOuLpC5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiAyLey7rOufvCDsubTrk5wgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMiBnYXAtNiBtYi0xMFwiPlxuXG4gICAgICAgICAgey8qIFBDIOuyhOyghCAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItZ3JheS0xMDAgc2hhZG93LWNhcmQgb3ZlcmZsb3ctaGlkZGVuIGZsZXggZmxleC1jb2xcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1wcmltYXJ5LTYwMCB0by1wcmltYXJ5LTUwMCBweC03IHB0LTggcGItNlwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTIgaC0xMiByb3VuZGVkLTJ4bCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtYi00XCI+XG4gICAgICAgICAgICAgICAgPE1vbml0b3IgY2xhc3NOYW1lPVwidy02IGgtNiB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBtYi0xXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PlBDIOuyhOyghDwvaDI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS0xMDAgdGV4dC1zbVwiPldpbmRvd3MgLyBtYWNPUyDrjbDsiqTtgazthrEg7KCE7JqpPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtNyBweS02IGZsZXgtMSBmbGV4IGZsZXgtY29sXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMyBtYi02XCI+XG4gICAgICAgICAgICAgICAge1BDX1NZU1RFTVMubWFwKCh7IGljb246IEljLCBsYWJlbCwgc3ViLCBiYWRnZSB9KSA9PiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGtleT17bGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXgtMSByb3VuZGVkLTJ4bCBiZy1ncmF5LTUwIGJvcmRlciBib3JkZXItZ3JheS0xMDAgcHgtMyBweS0zIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xIHRleHQtY2VudGVyXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPEljIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1ncmF5LTUwMCBtYi0wLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTgwMFwiPntsYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtZ3JheS00MDBcIj57c3VifTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAge2JhZGdlICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYm9sZCBiZy1wcmltYXJ5LTEwMCB0ZXh0LXByaW1hcnktNjAwIHB4LTEuNSBweS0wLjUgcm91bmRlZC1mdWxsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7YmFkZ2V9XG4gICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJzcGFjZS15LTIgZmxleC0xIG1iLTZcIj5cbiAgICAgICAgICAgICAgICB7UENfRkVBVFVSRVMubWFwKChmKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8bGkga2V5PXtmfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yIHRleHQtc20gdGV4dC1ncmF5LTYwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNTAwIGZsZXgtc2hyaW5rLTAgbXQtMC41XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PntmfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvdWw+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTIuNVwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweS0zIHJvdW5kZWQtMnhsIGJnLXByaW1hcnktNjAwIGhvdmVyOmJnLXByaW1hcnktNzAwIGFjdGl2ZTpiZy1wcmltYXJ5LTgwMCB0ZXh0LXdoaXRlIGZvbnQtc2VtaWJvbGQgdGV4dC1zbSB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctc29mdFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPERvd25sb2FkIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgV2luZG93cyDri6TsmrTroZzrk5xcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS0yMDAgdGV4dC14cyBmb250LW5vcm1hbCBtbC0xXCI+djIuNC4xPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweS0yLjUgcm91bmRlZC0yeGwgYmctZ3JheS01MCBob3ZlcjpiZy1ncmF5LTEwMCB0ZXh0LWdyYXktNzAwIGZvbnQtc2VtaWJvbGQgdGV4dC1zbSBib3JkZXIgYm9yZGVyLWdyYXktMjAwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8TW9uaXRvciBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgIG1hY09TIOuLpOyatOuhnOuTnFxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzIGZvbnQtbm9ybWFsIG1sLTFcIj52Mi40LjE8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtY2VudGVyIHRleHQtWzExcHhdIHRleHQtZ3JheS00MDAgbXQtM1wiPlxuICAgICAgICAgICAgICAgIOyEpOy5mCDtjIzsnbwg7ISc66qFIOyduOymnSDsmYTro4wgJm1pZGRvdDsg67CU7J2065+s7IqkIOqygOyCrCDthrXqs7xcbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7Lyog66qo67CU7J28IOuyhOyghCAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItZ3JheS0xMDAgc2hhZG93LWNhcmQgb3ZlcmZsb3ctaGlkZGVuIGZsZXggZmxleC1jb2xcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1za3ktNTAwIHRvLWJsdWUtNDAwIHB4LTcgcHQtOCBwYi02XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMiBoLTEyIHJvdW5kZWQtMnhsIGJnLXdoaXRlLzIwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG1iLTRcIj5cbiAgICAgICAgICAgICAgICA8U21hcnRwaG9uZSBjbGFzc05hbWU9XCJ3LTYgaC02IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIG1iLTFcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDNlbScgfX0+66qo67CU7J28IOuyhOyghDwvaDI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc2t5LTEwMCB0ZXh0LXNtXCI+QW5kcm9pZCAvIGlPUyDsiqTrp4jtirjtj7Ag7KCE7JqpPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtNyBweS02IGZsZXgtMSBmbGV4IGZsZXgtY29sXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMyBtYi02XCI+XG4gICAgICAgICAgICAgICAge01PQklMRV9TWVNURU1TLm1hcCgoeyBpY29uOiBJYywgbGFiZWwsIHN1YiwgYmFkZ2UgfSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LTEgcm91bmRlZC0yeGwgYmctZ3JheS01MCBib3JkZXIgYm9yZGVyLWdyYXktMTAwIHB4LTMgcHktMyBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LWNlbnRlclwiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxJYyBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtZ3JheS01MDAgbWItMC41XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtZ3JheS04MDBcIj57bGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNDAwXCI+e3N1Yn08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIHtiYWRnZSAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LWJvbGQgYmctc2t5LTEwMCB0ZXh0LXNreS02MDAgcHgtMS41IHB5LTAuNSByb3VuZGVkLWZ1bGxcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtiYWRnZX1cbiAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cInNwYWNlLXktMiBmbGV4LTEgbWItNlwiPlxuICAgICAgICAgICAgICAgIHtNT0JJTEVfRkVBVFVSRVMubWFwKChmKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8bGkga2V5PXtmfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yIHRleHQtc20gdGV4dC1ncmF5LTYwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXNreS01MDAgZmxleC1zaHJpbmstMCBtdC0wLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+e2Z9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC91bD5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMi41XCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHB5LTMgcm91bmRlZC0yeGwgYmctZ3JheS05MDAgaG92ZXI6YmctZ3JheS04MDAgYWN0aXZlOmJnLWJsYWNrIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCB0ZXh0LXNtIHRyYW5zaXRpb24tYWxsIHNoYWRvdy1zb2Z0XCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8QXBwbGUgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgICBBcHAgU3RvcmVcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14cyBmb250LW5vcm1hbCBtbC0xXCI+aU9TPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweS0yLjUgcm91bmRlZC0yeGwgYmctZW1lcmFsZC02MDAgaG92ZXI6YmctZW1lcmFsZC03MDAgYWN0aXZlOmJnLWVtZXJhbGQtODAwIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCB0ZXh0LXNtIHRyYW5zaXRpb24tYWxsIHNoYWRvdy1zb2Z0XCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8U21hcnRwaG9uZSBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgIEdvb2dsZSBQbGF5XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWVtZXJhbGQtMjAwIHRleHQteHMgZm9udC1ub3JtYWwgbWwtMVwiPkFuZHJvaWQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtY2VudGVyIHRleHQtWzExcHhdIHRleHQtZ3JheS00MDAgbXQtM1wiPlxuICAgICAgICAgICAgICAgIOqzteyLnSDsiqTthqDslrQg67Cw7Y+sICZtaWRkb3Q7IOqwnOyduOygleuztCDsiJjsp5Eg7LWc7IaM7ZmUXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7Lyog7ZWY64uoIOuwsOuEiCAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLWdyYXktMTAwIHNoYWRvdy1jYXJkIHB4LTcgcHktNiBmbGV4IGZsZXgtY29sIHNtOmZsZXgtcm93IGl0ZW1zLWNlbnRlciBnYXAtNCB0ZXh0LWNlbnRlciBzbTp0ZXh0LWxlZnRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTIgaC0xMiByb3VuZGVkLTJ4bCBiZy1wcmltYXJ5LTUwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy02IGgtNiB0ZXh0LXByaW1hcnktNjAwXCIgLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMVwiPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZ3JheS05MDAgdGV4dC1zbSBtYi0wLjVcIj7rqqjrk6Ag67KE7KCE7J2AIOustOujjOyeheuLiOuLpDwvcD5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC14c1wiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAgVkxVRSDquLDrs7gg6rKA7IOJIOuwjyDsgqzquLAg7YOQ7KeAIOq4sOuKpeydgCDtmozsm5DqsIDsnoUg7JeG7J2064+EIOyCrOyaqSDqsIDriqXtlanri4jri6QuIOq4sOyXheyaqSDsnbzqtIQg6rKA7KadLCDrs7TslYgg66mU7J28IOuTsSDtlITrpqzrr7jsl4Qg6riw64ql7J2AIOyduOymnSDtlIzrnpzsnYQg7ZmV7J247ZWY7IS47JqULlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwiYnRuLXByaW1hcnkgdGV4dC1zbSBmbGV4LXNocmluay0wIHdoaXRlc3BhY2Utbm93cmFwXCI+XG4gICAgICAgICAgICDsnbjspp0g7ZSM656cIOuztOq4sFxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvbWFpbj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvcGFnZXMvRG93bmxvYWRQYWdlLnRzeCJ9