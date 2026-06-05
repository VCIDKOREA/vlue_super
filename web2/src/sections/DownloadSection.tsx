import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/sections/DownloadSection.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/sections/DownloadSection.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import { Smartphone, Monitor, Apple, Shield, Star, Download, Code } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import __vite__cjsImport4_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport4_react["useState"];
import __vite__cjsImport5_jszip from "/node_modules/.vite/deps/jszip.js?v=4b28e2bb"; const JSZip = __vite__cjsImport5_jszip.__esModule ? __vite__cjsImport5_jszip.default : __vite__cjsImport5_jszip;
const FEATURES = ["실시간 보이스피싱 경보", "VLUE 기관 인증 조회", "위치기반 안심영역 설정", "피해 즉시 신고 기능"];
export default function DownloadSection() {
  _s();
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadProjectSource = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const sourceFiles = [
        { path: "src/pages/HomePage.tsx", url: "/src/pages/HomePage.tsx" },
        { path: "src/pages/SearchPage.tsx", url: "/src/pages/SearchPage.tsx" },
        { path: "src/pages/ShoppingPage.tsx", url: "/src/pages/ShoppingPage.tsx" },
        { path: "src/pages/ResourcesPage.tsx", url: "/src/pages/ResourcesPage.tsx" },
        { path: "src/pages/AboutPage.tsx", url: "/src/pages/AboutPage.tsx" },
        { path: "src/pages/PricingPage.tsx", url: "/src/pages/PricingPage.tsx" },
        { path: "src/pages/SafeZonePage.tsx", url: "/src/pages/SafeZonePage.tsx" },
        { path: "src/pages/SecureMailPage.tsx", url: "/src/pages/SecureMailPage.tsx" },
        { path: "src/pages/DownloadPage.tsx", url: "/src/pages/DownloadPage.tsx" },
        { path: "src/pages/NewsPage.tsx", url: "/src/pages/NewsPage.tsx" },
        { path: "src/pages/EventsPage.tsx", url: "/src/pages/EventsPage.tsx" },
        { path: "src/pages/JobsPage.tsx", url: "/src/pages/JobsPage.tsx" },
        { path: "src/pages/SupportPage.tsx", url: "/src/pages/SupportPage.tsx" },
        { path: "src/pages/MyPage.tsx", url: "/src/pages/MyPage.tsx" },
        { path: "src/pages/BusinessCardPage.tsx", url: "/src/pages/BusinessCardPage.tsx" },
        { path: "src/sections/HeroSection.tsx", url: "/src/sections/HeroSection.tsx" },
        { path: "src/sections/PhishingSection.tsx", url: "/src/sections/PhishingSection.tsx" },
        { path: "src/sections/NewsSection.tsx", url: "/src/sections/NewsSection.tsx" },
        { path: "src/sections/EventsSection.tsx", url: "/src/sections/EventsSection.tsx" },
        { path: "src/sections/DownloadSection.tsx", url: "/src/sections/DownloadSection.tsx" },
        { path: "src/components/AnimatedBackground.tsx", url: "/src/components/AnimatedBackground.tsx" },
        { path: "src/components/AuthModal.tsx", url: "/src/components/AuthModal.tsx" },
        { path: "src/components/ChatBot.tsx", url: "/src/components/ChatBot.tsx" },
        { path: "src/components/DocumentEditor.tsx", url: "/src/components/DocumentEditor.tsx" },
        { path: "src/components/EmergencyButton.tsx", url: "/src/components/EmergencyButton.tsx" },
        { path: "src/components/FamilySafety.tsx", url: "/src/components/FamilySafety.tsx" },
        { path: "src/components/Footer.tsx", url: "/src/components/Footer.tsx" },
        { path: "src/components/LoginRequiredModal.tsx", url: "/src/components/LoginRequiredModal.tsx" },
        { path: "src/components/Navbar.tsx", url: "/src/components/Navbar.tsx" },
        { path: "src/data/mockData.ts", url: "/src/data/mockData.ts" },
        { path: "src/types/index.ts", url: "/src/types/index.ts" },
        { path: "src/lib/supabase.ts", url: "/src/lib/supabase.ts" },
        { path: "src/App.tsx", url: "/src/App.tsx" },
        { path: "src/main.tsx", url: "/src/main.tsx" },
        { path: "src/index.css", url: "/src/index.css" },
        { path: "src/vite-env.d.ts", url: "/src/vite-env.d.ts" },
        { path: "package.json", url: "/package.json" },
        { path: "vite.config.ts", url: "/vite.config.ts" },
        { path: "tailwind.config.js", url: "/tailwind.config.js" },
        { path: "tsconfig.json", url: "/tsconfig.json" },
        { path: "tsconfig.app.json", url: "/tsconfig.app.json" },
        { path: "tsconfig.node.json", url: "/tsconfig.node.json" },
        { path: "index.html", url: "/index.html" },
        { path: "postcss.config.js", url: "/postcss.config.js" },
        { path: "eslint.config.js", url: "/eslint.config.js" },
        { path: ".gitignore", url: "/.gitignore" }
      ];
      let fileCount = 0;
      for (const file of sourceFiles) {
        try {
          const response = await fetch(file.url);
          if (response.ok) {
            const content = await response.text();
            zip.file(file.path, content);
            fileCount++;
          }
        } catch (err) {
          console.warn(`Failed to fetch ${file.url}`);
        }
      }
      zip.file("README.md", `# VLUE - 보이스피싱 방지 플랫폼

디지털 명함을 통한 기관 인증 및 보이스피싱 방지 서비스

## 주요 기능
- 실시간 보이스피싱 경보
- VLUE 기관 인증 조회
- 위치기반 안심영역 설정
- 피해 즉시 신고 기능

## 기술 스택
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase
- Lucide React Icons

## 설치 및 실행

\`\`\`bash
npm install
npm run dev
\`\`\`

## 빌드

\`\`\`bash
npm run build
\`\`\`

## 라이선스
© 2026 VLUE. All rights reserved.`);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "vlue.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download project:", error);
      alert("다운로드 실패. 다시 시도해주세요.");
    } finally {
      setIsDownloading(false);
    }
  };
  return /* @__PURE__ */ jsxDEV("section", { className: "bg-gradient-to-br from-primary-600 to-primary-800 py-20", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Smartphone, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 134,
          columnNumber: 15
        }, this),
        "앱 다운로드"
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 133,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl sm:text-4xl font-black text-white mb-4 leading-tight", children: [
        "언제 어디서나",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 138,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-primary-200", children: "VLUE와 함께" }, void 0, false, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 139,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 137,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-base leading-relaxed mb-6", children: "모바일 앱으로 보이스피싱 의심 번호를 즉시 확인하고, 위치기반 안심영역 설정으로 더욱 안전한 생활을 누려보세요." }, void 0, false, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 141,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("ul", { className: "space-y-2 mb-8", children: FEATURES.map(
        (f) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-center gap-2.5 text-white/80 text-sm", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Star, { className: "w-2.5 h-2.5 text-white" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 150,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 149,
            columnNumber: 19
          }, this),
          f
        ] }, f, true, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 148,
          columnNumber: 15
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 146,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row gap-3", children: [
        /* @__PURE__ */ jsxDEV("button", { className: "flex items-center gap-3 px-5 py-3 bg-black hover:bg-gray-900 rounded-xl transition-colors group", children: [
          /* @__PURE__ */ jsxDEV(Apple, { className: "w-6 h-6 text-white" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 159,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-left", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-xs", children: "Download on the" }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 161,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-white font-bold text-sm", children: "App Store" }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 162,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 160,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 158,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("button", { className: "flex items-center gap-3 px-5 py-3 bg-black hover:bg-gray-900 rounded-xl transition-colors group", children: [
          /* @__PURE__ */ jsxDEV("svg", { className: "w-6 h-6", viewBox: "0 0 24 24", fill: "white", children: /* @__PURE__ */ jsxDEV("path", { d: "M3.18 23.88c.3.17.66.19.98.05l12.34-7.13-2.76-2.76-10.56 9.84zM.54 1.55C.2 1.89 0 2.43 0 3.12v17.76c0 .69.2 1.23.55 1.57l.08.07 9.95-9.95v-.24L.62 1.48l-.08.07zM20.6 10.65l-2.62-1.51-3.1 3.1 3.1 3.1 2.64-1.53c.75-.43.75-1.14.01-1.57l-.03-.59zM3.18.12L15.74 7.24l-2.76 2.76L2.16.16 3.18.12z" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 167,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 166,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-left", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-xs", children: "Get it on" }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 170,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-white font-bold text-sm", children: "Google Play" }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 171,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 169,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 165,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 157,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/DownloadSection.tsx",
      lineNumber: 132,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white/10 border border-white/20 rounded-3xl p-6 w-full max-w-sm", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Monitor, { className: "w-5 h-5 text-white" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 181,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 180,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "text-white font-bold text-base", children: "PC 버전" }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 184,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-xs", children: "Windows / macOS" }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 185,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 183,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 179,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mb-4 leading-relaxed", children: "PC에서도 VLUE 데스크탑 앱으로 동일한 인증 조회와 보안 서비스를 이용하세요." }, void 0, false, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 188,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxDEV("button", { className: "flex-1 py-2 text-sm font-semibold text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-colors", children: "Windows 다운로드" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 192,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("button", { className: "flex-1 py-2 text-sm font-semibold text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-colors", children: "macOS 다운로드" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 195,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 191,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 178,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white/10 border border-white/20 rounded-2xl p-4 w-full max-w-sm flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-4.5 h-4.5 text-white", style: { width: "18px", height: "18px" } }, void 0, false, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 203,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 202,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-white font-semibold text-sm", children: "앱 신뢰 인증" }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 206,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-xs", children: "구글·애플 공식 스토어에만 배포되는 정품 앱입니다." }, void 0, false, {
            fileName: "/home/project/src/sections/DownloadSection.tsx",
            lineNumber: 207,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 205,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/DownloadSection.tsx",
        lineNumber: 201,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: downloadProjectSource,
          disabled: isDownloading,
          className: "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30 rounded-2xl p-4 w-full max-w-sm flex items-center gap-3 hover:border-amber-400/50 hover:from-amber-500/30 hover:to-orange-500/30 transition-all disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 bg-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Code, { className: "w-4.5 h-4.5 text-amber-200", style: { width: "18px", height: "18px" } }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 217,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 216,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 text-left", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-white font-semibold text-sm", children: "전체 프로젝트 다운로드" }, void 0, false, {
                fileName: "/home/project/src/sections/DownloadSection.tsx",
                lineNumber: 220,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-xs", children: "완전한 소스코드 ZIP 파일" }, void 0, false, {
                fileName: "/home/project/src/sections/DownloadSection.tsx",
                lineNumber: 221,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 219,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-shrink-0 p-2", children: /* @__PURE__ */ jsxDEV(Download, { className: `w-5 h-5 text-amber-300 ${isDownloading ? "animate-bounce" : ""}` }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 224,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "/home/project/src/sections/DownloadSection.tsx",
              lineNumber: 223,
              columnNumber: 15
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/sections/DownloadSection.tsx",
          lineNumber: 211,
          columnNumber: 13
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/DownloadSection.tsx",
      lineNumber: 177,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/sections/DownloadSection.tsx",
    lineNumber: 131,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "/home/project/src/sections/DownloadSection.tsx",
    lineNumber: 130,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/sections/DownloadSection.tsx",
    lineNumber: 129,
    columnNumber: 5
  }, this);
}
_s(DownloadSection, "I+IY6bHIajfeJNOs4vl6hY3OWII=");
_c = DownloadSection;
var _c;
$RefreshReg$(_c, "DownloadSection");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/sections/DownloadSection.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/sections/DownloadSection.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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dEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFHQTtBQUFBLFlBQ0EsdUJBQUMsU0FBSSxXQUFVLHFCQUNiLGlDQUFDLFlBQVMsV0FBVywwQkFBMEJyQyxnQkFBZ0IsbUJBQW1CLEVBQUUsTUFBcEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBdUYsS0FEekY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBO0FBQUE7QUFBQSxRQWRGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQWVBO0FBQUEsU0FqREY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWtEQTtBQUFBLE9BaEdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FpR0EsS0FsR0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQW1HQSxLQXBHRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBcUdBO0FBRUo7QUFBQ0QsR0FqT3VCRCxpQkFBZTtBQUFBd0MsS0FBZnhDO0FBQWUsSUFBQXdDO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJNb25pdG9yIiwiU2hpZWxkIiwiU3RhciIsInVzZVN0YXRlIiwiSlNaaXAiLCJGRUFUVVJFUyIsIkRvd25sb2FkU2VjdGlvbiIsIl9zIiwiaXNEb3dubG9hZGluZyIsInNldElzRG93bmxvYWRpbmciLCJkb3dubG9hZFByb2plY3RTb3VyY2UiLCJ6aXAiLCJzb3VyY2VGaWxlcyIsInBhdGgiLCJ1cmwiLCJmaWxlQ291bnQiLCJmaWxlIiwicmVzcG9uc2UiLCJmZXRjaCIsIm9rIiwiY29udGVudCIsInRleHQiLCJlcnIiLCJjb25zb2xlIiwid2FybiIsImJsb2IiLCJnZW5lcmF0ZUFzeW5jIiwidHlwZSIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImxpbmsiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJocmVmIiwiZG93bmxvYWQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwicmV2b2tlT2JqZWN0VVJMIiwiZXJyb3IiLCJhbGVydCIsIm1hcCIsImYiLCJ3aWR0aCIsImhlaWdodCIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkRvd25sb2FkU2VjdGlvbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU21hcnRwaG9uZSwgTW9uaXRvciwgQXBwbGUsIFNoaWVsZCwgU3RhciwgRG93bmxvYWQsIENvZGUgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgSlNaaXAgZnJvbSAnanN6aXAnO1xuXG5jb25zdCBGRUFUVVJFUyA9IFsn7Iuk7Iuc6rCEIOuztOydtOyKpO2UvOyLsSDqsr3rs7QnLCAnVkxVRSDquLDqtIAg7J247KadIOyhsO2ajCcsICfsnITsuZjquLDrsJgg7JWI7Ius7JiB7JetIOyEpOyglScsICftlLztlbQg7KaJ7IucIOyLoOqzoCDquLDriqUnXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRG93bmxvYWRTZWN0aW9uKCkge1xuICBjb25zdCBbaXNEb3dubG9hZGluZywgc2V0SXNEb3dubG9hZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgY29uc3QgZG93bmxvYWRQcm9qZWN0U291cmNlID0gYXN5bmMgKCkgPT4ge1xuICAgIHNldElzRG93bmxvYWRpbmcodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHppcCA9IG5ldyBKU1ppcCgpO1xuXG4gICAgICBjb25zdCBzb3VyY2VGaWxlcyA9IFtcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL0hvbWVQYWdlLnRzeCcsIHVybDogJy9zcmMvcGFnZXMvSG9tZVBhZ2UudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvcGFnZXMvU2VhcmNoUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL1NlYXJjaFBhZ2UudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvcGFnZXMvU2hvcHBpbmdQYWdlLnRzeCcsIHVybDogJy9zcmMvcGFnZXMvU2hvcHBpbmdQYWdlLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL1Jlc291cmNlc1BhZ2UudHN4JywgdXJsOiAnL3NyYy9wYWdlcy9SZXNvdXJjZXNQYWdlLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL0Fib3V0UGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL0Fib3V0UGFnZS50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9wYWdlcy9QcmljaW5nUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL1ByaWNpbmdQYWdlLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL1NhZmVab25lUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL1NhZmVab25lUGFnZS50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9wYWdlcy9TZWN1cmVNYWlsUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL1NlY3VyZU1haWxQYWdlLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL0Rvd25sb2FkUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL0Rvd25sb2FkUGFnZS50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9wYWdlcy9OZXdzUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL05ld3NQYWdlLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL0V2ZW50c1BhZ2UudHN4JywgdXJsOiAnL3NyYy9wYWdlcy9FdmVudHNQYWdlLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3BhZ2VzL0pvYnNQYWdlLnRzeCcsIHVybDogJy9zcmMvcGFnZXMvSm9ic1BhZ2UudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvcGFnZXMvU3VwcG9ydFBhZ2UudHN4JywgdXJsOiAnL3NyYy9wYWdlcy9TdXBwb3J0UGFnZS50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9wYWdlcy9NeVBhZ2UudHN4JywgdXJsOiAnL3NyYy9wYWdlcy9NeVBhZ2UudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvcGFnZXMvQnVzaW5lc3NDYXJkUGFnZS50c3gnLCB1cmw6ICcvc3JjL3BhZ2VzL0J1c2luZXNzQ2FyZFBhZ2UudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvc2VjdGlvbnMvSGVyb1NlY3Rpb24udHN4JywgdXJsOiAnL3NyYy9zZWN0aW9ucy9IZXJvU2VjdGlvbi50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9zZWN0aW9ucy9QaGlzaGluZ1NlY3Rpb24udHN4JywgdXJsOiAnL3NyYy9zZWN0aW9ucy9QaGlzaGluZ1NlY3Rpb24udHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvc2VjdGlvbnMvTmV3c1NlY3Rpb24udHN4JywgdXJsOiAnL3NyYy9zZWN0aW9ucy9OZXdzU2VjdGlvbi50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9zZWN0aW9ucy9FdmVudHNTZWN0aW9uLnRzeCcsIHVybDogJy9zcmMvc2VjdGlvbnMvRXZlbnRzU2VjdGlvbi50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9zZWN0aW9ucy9Eb3dubG9hZFNlY3Rpb24udHN4JywgdXJsOiAnL3NyYy9zZWN0aW9ucy9Eb3dubG9hZFNlY3Rpb24udHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvY29tcG9uZW50cy9BbmltYXRlZEJhY2tncm91bmQudHN4JywgdXJsOiAnL3NyYy9jb21wb25lbnRzL0FuaW1hdGVkQmFja2dyb3VuZC50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9jb21wb25lbnRzL0F1dGhNb2RhbC50c3gnLCB1cmw6ICcvc3JjL2NvbXBvbmVudHMvQXV0aE1vZGFsLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL2NvbXBvbmVudHMvQ2hhdEJvdC50c3gnLCB1cmw6ICcvc3JjL2NvbXBvbmVudHMvQ2hhdEJvdC50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9jb21wb25lbnRzL0RvY3VtZW50RWRpdG9yLnRzeCcsIHVybDogJy9zcmMvY29tcG9uZW50cy9Eb2N1bWVudEVkaXRvci50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9jb21wb25lbnRzL0VtZXJnZW5jeUJ1dHRvbi50c3gnLCB1cmw6ICcvc3JjL2NvbXBvbmVudHMvRW1lcmdlbmN5QnV0dG9uLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL2NvbXBvbmVudHMvRmFtaWx5U2FmZXR5LnRzeCcsIHVybDogJy9zcmMvY29tcG9uZW50cy9GYW1pbHlTYWZldHkudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvY29tcG9uZW50cy9Gb290ZXIudHN4JywgdXJsOiAnL3NyYy9jb21wb25lbnRzL0Zvb3Rlci50c3gnIH0sXG4gICAgICAgIHsgcGF0aDogJ3NyYy9jb21wb25lbnRzL0xvZ2luUmVxdWlyZWRNb2RhbC50c3gnLCB1cmw6ICcvc3JjL2NvbXBvbmVudHMvTG9naW5SZXF1aXJlZE1vZGFsLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL2NvbXBvbmVudHMvTmF2YmFyLnRzeCcsIHVybDogJy9zcmMvY29tcG9uZW50cy9OYXZiYXIudHN4JyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvZGF0YS9tb2NrRGF0YS50cycsIHVybDogJy9zcmMvZGF0YS9tb2NrRGF0YS50cycgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL3R5cGVzL2luZGV4LnRzJywgdXJsOiAnL3NyYy90eXBlcy9pbmRleC50cycgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL2xpYi9zdXBhYmFzZS50cycsIHVybDogJy9zcmMvbGliL3N1cGFiYXNlLnRzJyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvQXBwLnRzeCcsIHVybDogJy9zcmMvQXBwLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL21haW4udHN4JywgdXJsOiAnL3NyYy9tYWluLnRzeCcgfSxcbiAgICAgICAgeyBwYXRoOiAnc3JjL2luZGV4LmNzcycsIHVybDogJy9zcmMvaW5kZXguY3NzJyB9LFxuICAgICAgICB7IHBhdGg6ICdzcmMvdml0ZS1lbnYuZC50cycsIHVybDogJy9zcmMvdml0ZS1lbnYuZC50cycgfSxcbiAgICAgICAgeyBwYXRoOiAncGFja2FnZS5qc29uJywgdXJsOiAnL3BhY2thZ2UuanNvbicgfSxcbiAgICAgICAgeyBwYXRoOiAndml0ZS5jb25maWcudHMnLCB1cmw6ICcvdml0ZS5jb25maWcudHMnIH0sXG4gICAgICAgIHsgcGF0aDogJ3RhaWx3aW5kLmNvbmZpZy5qcycsIHVybDogJy90YWlsd2luZC5jb25maWcuanMnIH0sXG4gICAgICAgIHsgcGF0aDogJ3RzY29uZmlnLmpzb24nLCB1cmw6ICcvdHNjb25maWcuanNvbicgfSxcbiAgICAgICAgeyBwYXRoOiAndHNjb25maWcuYXBwLmpzb24nLCB1cmw6ICcvdHNjb25maWcuYXBwLmpzb24nIH0sXG4gICAgICAgIHsgcGF0aDogJ3RzY29uZmlnLm5vZGUuanNvbicsIHVybDogJy90c2NvbmZpZy5ub2RlLmpzb24nIH0sXG4gICAgICAgIHsgcGF0aDogJ2luZGV4Lmh0bWwnLCB1cmw6ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBwYXRoOiAncG9zdGNzcy5jb25maWcuanMnLCB1cmw6ICcvcG9zdGNzcy5jb25maWcuanMnIH0sXG4gICAgICAgIHsgcGF0aDogJ2VzbGludC5jb25maWcuanMnLCB1cmw6ICcvZXNsaW50LmNvbmZpZy5qcycgfSxcbiAgICAgICAgeyBwYXRoOiAnLmdpdGlnbm9yZScsIHVybDogJy8uZ2l0aWdub3JlJyB9LFxuICAgICAgXTtcblxuICAgICAgbGV0IGZpbGVDb3VudCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2Ygc291cmNlRmlsZXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGZpbGUudXJsKTtcbiAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgICAgICB6aXAuZmlsZShmaWxlLnBhdGgsIGNvbnRlbnQpO1xuICAgICAgICAgICAgZmlsZUNvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byBmZXRjaCAke2ZpbGUudXJsfWApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHppcC5maWxlKCdSRUFETUUubWQnLCBgIyBWTFVFIC0g67O07J207Iqk7ZS87IuxIOuwqeyngCDtlIzrnqvtj7xcblxu65SU7KeA7YS4IOuqhe2VqOydhCDthrXtlZwg6riw6rSAIOyduOymnSDrsI8g67O07J207Iqk7ZS87IuxIOuwqeyngCDshJzruYTsiqRcblxuIyMg7KO87JqUIOq4sOuKpVxuLSDsi6Tsi5zqsIQg67O07J207Iqk7ZS87IuxIOqyveuztFxuLSBWTFVFIOq4sOq0gCDsnbjspp0g7KGw7ZqMXG4tIOychOy5mOq4sOuwmCDslYjsi6zsmIHsl60g7ISk7KCVXG4tIO2UvO2VtCDsponsi5wg7Iug6rOgIOq4sOuKpVxuXG4jIyDquLDsiKAg7Iqk7YOdXG4tIFJlYWN0IDE4ICsgVHlwZVNjcmlwdFxuLSBWaXRlXG4tIFRhaWx3aW5kIENTU1xuLSBTdXBhYmFzZVxuLSBMdWNpZGUgUmVhY3QgSWNvbnNcblxuIyMg7ISk7LmYIOuwjyDsi6TtlolcblxuXFxgXFxgXFxgYmFzaFxubnBtIGluc3RhbGxcbm5wbSBydW4gZGV2XG5cXGBcXGBcXGBcblxuIyMg67mM65OcXG5cblxcYFxcYFxcYGJhc2hcbm5wbSBydW4gYnVpbGRcblxcYFxcYFxcYFxuXG4jIyDrnbzsnbTshKDsiqRcbsKpIDIwMjYgVkxVRS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5gKTtcblxuICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IHppcC5nZW5lcmF0ZUFzeW5jKHsgdHlwZTogJ2Jsb2InIH0pO1xuICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICBsaW5rLmhyZWYgPSB1cmw7XG4gICAgICBsaW5rLmRvd25sb2FkID0gJ3ZsdWUuemlwJztcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICBsaW5rLmNsaWNrKCk7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGxpbmspO1xuICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZG93bmxvYWQgcHJvamVjdDonLCBlcnJvcik7XG4gICAgICBhbGVydCgn64uk7Jq066Gc65OcIOyLpO2MqC4g64uk7IucIOyLnOuPhO2VtOyjvOyEuOyalC4nKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0SXNEb3dubG9hZGluZyhmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1wcmltYXJ5LTYwMCB0by1wcmltYXJ5LTgwMCBweS0yMFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbGc6Z3JpZC1jb2xzLTIgZ2FwLTEyIGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC0zIHB5LTEuNSBtYi01IHJvdW5kZWQtZnVsbCBiZy13aGl0ZS8xMCBib3JkZXIgYm9yZGVyLXdoaXRlLzIwIHRleHQtd2hpdGUgdGV4dC14cyBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICAgIDxTbWFydHBob25lIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAg7JWxIOuLpOyatOuhnOuTnFxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0zeGwgc206dGV4dC00eGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIG1iLTQgbGVhZGluZy10aWdodFwiPlxuICAgICAgICAgICAgICDslrjsoJwg7Ja065SU7ISc64KYPGJyIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS0yMDBcIj5WTFVF7JmAIO2VqOq7mDwvc3Bhbj5cbiAgICAgICAgICAgIDwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQtYmFzZSBsZWFkaW5nLXJlbGF4ZWQgbWItNlwiPlxuICAgICAgICAgICAgICDrqqjrsJTsnbwg7JWx7Jy866GcIOuztOydtOyKpO2UvOyLsSDsnZjsi6wg67KI7Zi466W8IOymieyLnCDtmZXsnbjtlZjqs6AsXG4gICAgICAgICAgICAgIOychOy5mOq4sOuwmCDslYjsi6zsmIHsl60g7ISk7KCV7Jy866GcIOuNlOyasSDslYjsoITtlZwg7IOd7Zmc7J2EIOuIhOugpOuztOyEuOyalC5cbiAgICAgICAgICAgIDwvcD5cblxuICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cInNwYWNlLXktMiBtYi04XCI+XG4gICAgICAgICAgICAgIHtGRUFUVVJFUy5tYXAoKGYpID0+IChcbiAgICAgICAgICAgICAgICA8bGkga2V5PXtmfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41IHRleHQtd2hpdGUvODAgdGV4dC1zbVwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQgaC00IHJvdW5kZWQtZnVsbCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgICAgICAgIDxTdGFyIGNsYXNzTmFtZT1cInctMi41IGgtMi41IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICB7Zn1cbiAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdWw+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBnYXAtM1wiPlxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHB4LTUgcHktMyBiZy1ibGFjayBob3ZlcjpiZy1ncmF5LTkwMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzIGdyb3VwXCI+XG4gICAgICAgICAgICAgICAgPEFwcGxlIGNsYXNzTmFtZT1cInctNiBoLTYgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPkRvd25sb2FkIG9uIHRoZTwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ib2xkIHRleHQtc21cIj5BcHAgU3RvcmU8L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHB4LTUgcHktMyBiZy1ibGFjayBob3ZlcjpiZy1ncmF5LTkwMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzIGdyb3VwXCI+XG4gICAgICAgICAgICAgICAgPHN2ZyBjbGFzc05hbWU9XCJ3LTYgaC02XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJ3aGl0ZVwiPlxuICAgICAgICAgICAgICAgICAgPHBhdGggZD1cIk0zLjE4IDIzLjg4Yy4zLjE3LjY2LjE5Ljk4LjA1bDEyLjM0LTcuMTMtMi43Ni0yLjc2LTEwLjU2IDkuODR6TS41NCAxLjU1Qy4yIDEuODkgMCAyLjQzIDAgMy4xMnYxNy43NmMwIC42OS4yIDEuMjMuNTUgMS41N2wuMDguMDcgOS45NS05Ljk1di0uMjRMLjYyIDEuNDhsLS4wOC4wN3pNMjAuNiAxMC42NWwtMi42Mi0xLjUxLTMuMSAzLjEgMy4xIDMuMSAyLjY0LTEuNTNjLjc1LS40My43NS0xLjE0LjAxLTEuNTdsLS4wMy0uNTl6TTMuMTguMTJMMTUuNzQgNy4yNGwtMi43NiAyLjc2TDIuMTYuMTYgMy4xOC4xMnpcIi8+XG4gICAgICAgICAgICAgICAgPC9zdmc+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPkdldCBpdCBvbjwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ib2xkIHRleHQtc21cIj5Hb29nbGUgUGxheTwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUvMTAgYm9yZGVyIGJvcmRlci13aGl0ZS8yMCByb3VuZGVkLTN4bCBwLTYgdy1mdWxsIG1heC13LXNtXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgbWItNFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIGJnLXdoaXRlLzIwIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgIDxNb25pdG9yIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIGZvbnQtYm9sZCB0ZXh0LWJhc2VcIj5QQyDrsoTsoIQ8L2gzPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS82MCB0ZXh0LXhzXCI+V2luZG93cyAvIG1hY09TPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXNtIG1iLTQgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgICAgUEPsl5DshJzrj4QgVkxVRSDrjbDsiqTtgaztg5Eg7JWx7Jy866GcIOuPmeydvO2VnCDsnbjspp0g7KGw7ZqM7JmAIOuztOyViCDshJzruYTsiqTrpbwg7J207Jqp7ZWY7IS47JqULlxuICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwiZmxleC0xIHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtcHJpbWFyeS02MDAgYmctd2hpdGUgaG92ZXI6YmctcHJpbWFyeS01MCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgICBXaW5kb3dzIOuLpOyatOuhnOuTnFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwiZmxleC0xIHB5LTIgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtcHJpbWFyeS02MDAgYmctd2hpdGUgaG92ZXI6YmctcHJpbWFyeS01MCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgICBtYWNPUyDri6TsmrTroZzrk5xcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZS8xMCBib3JkZXIgYm9yZGVyLXdoaXRlLzIwIHJvdW5kZWQtMnhsIHAtNCB3LWZ1bGwgbWF4LXctc20gZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IGJnLXdoaXRlLzIwIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00LjUgaC00LjUgdGV4dC13aGl0ZVwiIHN0eWxlPXt7IHdpZHRoOiAnMThweCcsIGhlaWdodDogJzE4cHgnIH19IC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCB0ZXh0LXNtXCI+7JWxIOyLoOuisCDsnbjspp08L3A+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS82MCB0ZXh0LXhzXCI+6rWs6riAwrfslaDtlIwg6rO17IudIOyKpO2GoOyWtOyXkOunjCDrsLDtj6zrkJjripQg7KCV7ZKIIOyVseyeheuLiOuLpC48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17ZG93bmxvYWRQcm9qZWN0U291cmNlfVxuICAgICAgICAgICAgICBkaXNhYmxlZD17aXNEb3dubG9hZGluZ31cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1hbWJlci01MDAvMjAgdG8tb3JhbmdlLTUwMC8yMCBib3JkZXIgYm9yZGVyLWFtYmVyLTQwMC8zMCByb3VuZGVkLTJ4bCBwLTQgdy1mdWxsIG1heC13LXNtIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zIGhvdmVyOmJvcmRlci1hbWJlci00MDAvNTAgaG92ZXI6ZnJvbS1hbWJlci01MDAvMzAgaG92ZXI6dG8tb3JhbmdlLTUwMC8zMCB0cmFuc2l0aW9uLWFsbCBkaXNhYmxlZDpvcGFjaXR5LTUwXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IGJnLWFtYmVyLTUwMC8zMCByb3VuZGVkLXhsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICA8Q29kZSBjbGFzc05hbWU9XCJ3LTQuNSBoLTQuNSB0ZXh0LWFtYmVyLTIwMFwiIHN0eWxlPXt7IHdpZHRoOiAnMThweCcsIGhlaWdodDogJzE4cHgnIH19IC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSB0ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIGZvbnQtc2VtaWJvbGQgdGV4dC1zbVwiPuyghOyytCDtlITroZzsoJ3tirgg64uk7Jq066Gc65OcPC9wPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPuyZhOyghO2VnCDshozsiqTsvZTrk5wgWklQIO2MjOydvDwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC1zaHJpbmstMCBwLTJcIj5cbiAgICAgICAgICAgICAgICA8RG93bmxvYWQgY2xhc3NOYW1lPXtgdy01IGgtNSB0ZXh0LWFtYmVyLTMwMCAke2lzRG93bmxvYWRpbmcgPyAnYW5pbWF0ZS1ib3VuY2UnIDogJyd9YH0gLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL3NlY3Rpb25zL0Rvd25sb2FkU2VjdGlvbi50c3gifQ==