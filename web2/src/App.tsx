import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/App.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"]; const useEffect = __vite__cjsImport3_react["useEffect"];
import AnimatedBackground from "/src/components/AnimatedBackground.tsx";
import Navbar from "/src/components/Navbar.tsx";
import Footer from "/src/components/Footer.tsx";
import ChatBot from "/src/components/ChatBot.tsx";
import AuthModal from "/src/components/AuthModal.tsx";
import EmergencyButton from "/src/components/EmergencyButton.tsx";
import LoginRequiredModal from "/src/components/LoginRequiredModal.tsx";
import HomePage from "/src/pages/HomePage.tsx";
import SearchPage from "/src/pages/SearchPage.tsx";
import ShoppingPage from "/src/pages/ShoppingPage.tsx";
import ResourcesPage from "/src/pages/ResourcesPage.tsx";
import AboutPage from "/src/pages/AboutPage.tsx";
import PricingPage from "/src/pages/PricingPage.tsx";
import SafeZonePage from "/src/pages/SafeZonePage.tsx";
import SecureMailPage from "/src/pages/SecureMailPage.tsx";
import DownloadPage from "/src/pages/DownloadPage.tsx";
import NewsPage from "/src/pages/NewsPage.tsx";
import EventsPage from "/src/pages/EventsPage.tsx";
import JobsPage from "/src/pages/JobsPage.tsx";
import SupportPage from "/src/pages/SupportPage.tsx";
import MyPage from "/src/pages/MyPage.tsx";
import BusinessCardPage from "/src/pages/BusinessCardPage.tsx";
import { supabase, isSupabaseAvailable } from "/src/lib/supabase.ts";
const PremiumHeroSection = () => {
  _s();
  const [showToast, setShowToast] = useState(false);
  const handleCopyLink = async () => {
    const shareUrl = window.location.origin + "/pricing";
    const shareText = `[VLUE] 부모님 보안을 위한 자녀 안심 서비스
상세보기: ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2e3);
    } catch (err) {
      alert("복사에 실패했습니다.");
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-6 mb-12", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-[48px] overflow-hidden flex flex-col lg:flex-row border border-slate-100 shadow-2xl relative", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "lg:w-5/12 min-h-[500px] bg-[#020617] relative flex flex-col items-center justify-center p-10 overflow-hidden", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 opacity-30", children: /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "w-[200%] h-[200%] absolute top-[-50%] left-[-50%]",
            style: {
              backgroundImage: "conic-gradient(from 0deg at 50% 50%, #3b82f6 0deg, transparent 90deg)",
              animation: "spin 3s linear infinite"
            }
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 49,
            columnNumber: 13
          },
          this
        ) }, void 0, false, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 48,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "z-10 w-full bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 font-mono shadow-[0_0_50px_rgba(59,130,246,0.15)]", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center mb-6 border-b border-white/10 pb-3 text-[10px]", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-blue-400 font-black animate-pulse", children: "● VLUE_AI_MONITOR_ON" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 59,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-slate-500 text-[10px]", children: "REAL-TIME SCAN" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 60,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 58,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-3 text-[12px]", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-emerald-400 font-bold", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "VOICE SCANNER" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 63,
                columnNumber: 80
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "ACTIVE" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 63,
                columnNumber: 106
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 63,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-slate-400", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "PHISHING_ATTACK" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 64,
                columnNumber: 68
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "DETECTING" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 64,
                columnNumber: 96
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 64,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-slate-400", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "REMOTE_ACCESS" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 65,
                columnNumber: 68
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "FILTERING" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 65,
                columnNumber: 94
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 65,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "h-[2px] bg-blue-500/10 my-4 overflow-hidden rounded-full", children: /* @__PURE__ */ jsxDEV("div", { className: "h-full bg-blue-500 w-1/3", style: { animation: "scan 2s ease-in-out infinite" } }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 67,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 66,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-blue-300/60 text-center italic text-[10px]", children: '"부모님 폰 보안, AI 분석팀이 24시간 실시간 보호 중"' }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 69,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 62,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 57,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "z-10 mt-12 text-center px-4", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-white text-2xl font-black leading-tight mb-5 tracking-tighter", children: [
            "식당도, 회사도 보안경비업체가 지키는데",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 74,
              columnNumber: 36
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-blue-500 underline underline-offset-8 decoration-4", children: "왜 부모님 폰은 방치하시나요?" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 75,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 73,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400 text-sm font-medium leading-relaxed", children: [
            "ADT캡스가 건물을 지키듯, VLUE AI 분석팀은",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 78,
              columnNumber: 43
            }, this),
            "가장 취약한 부모님의 휴대폰을 24시간 실시간 보안합니다."
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 77,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 72,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 47,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "lg:w-7/12 p-12 lg:p-20 flex flex-col bg-white relative", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 flex flex-col justify-center", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative group mb-6 w-fit h-fit overflow-hidden rounded-full p-[2px]", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 transition-opacity duration-300 opacity-30 group-hover:opacity-100", style: {
              backgroundImage: "linear-gradient(110deg, #ff00ea, #ffdd00 20%, #00ffaa 40%, #00aaff 60%, #ff00ea 80%, #ffdd00)",
              backgroundSize: "300% 300%",
              animation: "hologram 4s linear infinite"
            } }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 89,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "relative inline-flex items-center gap-2 px-6 py-2 bg-blue-50 group-hover:bg-blue-50/70 backdrop-blur-sm rounded-full w-fit", children: /* @__PURE__ */ jsxDEV("span", { className: "text-blue-700 font-black text-xs uppercase tracking-widest relative z-10 transition-colors group-hover:text-blue-900", children: "Family Care Event" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 95,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 94,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 88,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-4xl lg:text-5xl font-black leading-tight mb-8 relative", children: [
            "부모님 폰 보안, 이제",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 102,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-blue-600 underline decoration-blue-100 decoration-8 underline-offset-8", children: "자녀가 직접 챙겨주세요" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 103,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 101,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-4 mb-12 text-lg text-slate-600 font-bold", children: [
            /* @__PURE__ */ jsxDEV("p", { children: "✓ 자녀 대리 결제 시스템으로 간편 신청" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 107,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { children: "✓ 스탠다드 요금제 가입 시 첫 달 1개월 무료" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 108,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { children: "✓ AI 분석팀 이상징후 포착 시 자녀에게 즉시 알림" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 109,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 106,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 w-full relative mb-12", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }),
                className: "px-8 py-6 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all w-full h-full",
                children: "무료 혜택받고 시작하기"
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 113,
                columnNumber: 15
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: handleCopyLink,
                className: "px-8 py-6 bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl font-black text-xl shadow-md hover:bg-slate-100 active:scale-95 transition-all w-full h-full flex items-center justify-center gap-3",
                children: [
                  /* @__PURE__ */ jsxDEV("svg", { className: "w-6 h-6 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxDEV("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2.5", d: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" }, void 0, false, {
                    fileName: "/home/project/src/App.tsx",
                    lineNumber: 125,
                    columnNumber: 19
                  }, this) }, void 0, false, {
                    fileName: "/home/project/src/App.tsx",
                    lineNumber: 124,
                    columnNumber: 17
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: "가족에게 공유하기" }, void 0, false, {
                    fileName: "/home/project/src/App.tsx",
                    lineNumber: 127,
                    columnNumber: 17
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 120,
                columnNumber: 15
              },
              this
            ),
            showToast && /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-2xl animate-bounce", children: "클립보드가 복사되었습니다" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 131,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 112,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 86,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "border-t border-slate-100 pt-8 mt-auto flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50 rounded-3xl p-6", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-28 h-28 bg-white p-3 rounded-2xl shadow-inner border border-slate-100 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxDEV(
            "img",
            {
              src: "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://vlue.co.kr/install",
              alt: "VLUE App Install QR",
              className: "w-full h-full"
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 142,
              columnNumber: 15
            },
            this
          ) }, void 0, false, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 140,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 text-center sm:text-left", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-slate-500 text-sm font-medium mb-1", children: "가족이 함께 계시다면?" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 149,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h5", { className: "text-slate-900 text-lg font-black leading-snug", children: [
              "부모님 휴대폰으로",
              /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 151,
                columnNumber: 26
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-blue-600", children: "QR 코드를 스캔" }, void 0, false, {
                fileName: "/home/project/src/App.tsx",
                lineNumber: 152,
                columnNumber: 17
              }, this),
              "하여 바로 설치하세요"
            ] }, void 0, true, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 150,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-slate-400 text-xs mt-2 font-medium", children: "스캔 시 앱스토어/플레이스토어로 자동 연결됩니다." }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 154,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 148,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 139,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer z-10",
            onClick: () => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }),
            children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center", children: /* @__PURE__ */ jsxDEV("svg", { className: "w-5 h-5 text-blue-500 animate-bounce", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxDEV("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "3", d: "M19 9l-7 7-7-7" }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 163,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 162,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/home/project/src/App.tsx",
              lineNumber: 161,
              columnNumber: 13
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/App.tsx",
            lineNumber: 159,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 85,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 45,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("style", { children: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes hologram {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      ` }, void 0, false, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 170,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/App.tsx",
    lineNumber: 44,
    columnNumber: 5
  }, this);
};
_s(PremiumHeroSection, "y28QZOdDWVDj83V6uORTAols8b4=");
_c = PremiumHeroSection;
export default function App() {
  _s2();
  const [view, setView] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  useEffect(() => {
    if (!isSupabaseAvailable) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ email: session.user.email ?? "", grade: "basic" });
    }).catch(() => {
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email ?? "", grade: "basic" });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleSearch = (query) => {
    setSearchQuery(query);
    setView("search");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleNavigate = (nextView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleLogout = async () => {
    try {
      if (isSupabaseAvailable) await supabase.auth.signOut();
    } catch {
    }
    setUser(null);
    setView("home");
  };
  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    setShowAuth(false);
    setShowLoginRequired(false);
  };
  const handleLoginRequired = () => {
    if (!user) setShowLoginRequired(true);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen bg-blue-tint relative font-sans", children: [
    /* @__PURE__ */ jsxDEV(AnimatedBackground, {}, void 0, false, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 229,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "relative z-10", children: [
      /* @__PURE__ */ jsxDEV(Navbar, { currentView: view, onNavigate: handleNavigate, user, onLoginClick: () => setShowAuth(true), onLogout: handleLogout }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 231,
        columnNumber: 9
      }, this),
      view === "home" && /* @__PURE__ */ jsxDEV(HomePage, { onSearch: handleSearch, onNavigate: handleNavigate }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 233,
        columnNumber: 29
      }, this),
      view === "search" && /* @__PURE__ */ jsxDEV(SearchPage, { initialQuery: searchQuery, onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 234,
        columnNumber: 31
      }, this),
      view === "shopping" && /* @__PURE__ */ jsxDEV(ShoppingPage, { user, onLoginClick: handleLoginRequired }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 235,
        columnNumber: 33
      }, this),
      view === "about" && /* @__PURE__ */ jsxDEV(AboutPage, {}, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 236,
        columnNumber: 30
      }, this),
      view === "resources" && /* @__PURE__ */ jsxDEV(ResourcesPage, { user }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 237,
        columnNumber: 34
      }, this),
      view === "pricing" && /* @__PURE__ */ jsxDEV("div", { className: "pt-32 pb-20", children: [
        /* @__PURE__ */ jsxDEV(PremiumHeroSection, {}, void 0, false, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 241,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { id: "plans", children: /* @__PURE__ */ jsxDEV(PricingPage, { user, onLoginClick: handleLoginRequired }, void 0, false, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 243,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/App.tsx",
          lineNumber: 242,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 240,
        columnNumber: 9
      }, this),
      view === "safezone" && /* @__PURE__ */ jsxDEV(SafeZonePage, { onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 248,
        columnNumber: 33
      }, this),
      view === "mail" && /* @__PURE__ */ jsxDEV(SecureMailPage, { onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 249,
        columnNumber: 29
      }, this),
      view === "download" && /* @__PURE__ */ jsxDEV(DownloadPage, { onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 250,
        columnNumber: 33
      }, this),
      view === "news" && /* @__PURE__ */ jsxDEV(NewsPage, { onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 251,
        columnNumber: 29
      }, this),
      view === "events" && /* @__PURE__ */ jsxDEV(EventsPage, { onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 252,
        columnNumber: 31
      }, this),
      view === "jobs" && /* @__PURE__ */ jsxDEV(JobsPage, { user, onLoginClick: handleLoginRequired, onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 253,
        columnNumber: 29
      }, this),
      view === "support" && /* @__PURE__ */ jsxDEV(SupportPage, { user, onLoginClick: handleLoginRequired, onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 254,
        columnNumber: 32
      }, this),
      view === "mypage" && user && /* @__PURE__ */ jsxDEV(MyPage, { user, onNavigate: (v) => handleNavigate(v), onLogout: handleLogout }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 255,
        columnNumber: 39
      }, this),
      view === "bizcard" && /* @__PURE__ */ jsxDEV(BusinessCardPage, { onBack: () => handleNavigate("home") }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 256,
        columnNumber: 32
      }, this),
      view !== "mypage" && /* @__PURE__ */ jsxDEV(Footer, { onNavigate: handleNavigate }, void 0, false, {
        fileName: "/home/project/src/App.tsx",
        lineNumber: 258,
        columnNumber: 31
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 230,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(ChatBot, {}, void 0, false, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 260,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(EmergencyButton, {}, void 0, false, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 261,
      columnNumber: 7
    }, this),
    showLoginRequired && !user && /* @__PURE__ */ jsxDEV(LoginRequiredModal, { onClose: () => setShowLoginRequired(false), onLogin: () => {
      setShowLoginRequired(false);
      setShowAuth(true);
    } }, void 0, false, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 263,
      columnNumber: 7
    }, this),
    showAuth && /* @__PURE__ */ jsxDEV(AuthModal, { onClose: () => setShowAuth(false), onSuccess: handleAuthSuccess }, void 0, false, {
      fileName: "/home/project/src/App.tsx",
      lineNumber: 265,
      columnNumber: 20
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/App.tsx",
    lineNumber: 228,
    columnNumber: 5
  }, this);
}
_s2(App, "DsI3lAGDuHCcseBA+JhtguQfI4k=");
_c2 = App;
var _c, _c2;
$RefreshReg$(_c, "PremiumHeroSection");
$RefreshReg$(_c2, "App");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/App.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/App.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QTtBQUFBO0FBQUEsU0FzQ0E7QUFFSjtBQUFDL0IsSUFyRnVCRCxLQUFHO0FBQUFvQyxNQUFIcEM7QUFBRyxJQUFBRCxJQUFBcUM7QUFBQUMsYUFBQXRDLElBQUE7QUFBQXNDLGFBQUFELEtBQUEiLCJuYW1lcyI6WyJ1c2VFZmZlY3QiLCJBbmltYXRlZEJhY2tncm91bmQiLCJOYXZiYXIiLCJGb290ZXIiLCJDaGF0Qm90IiwiQXV0aE1vZGFsIiwiRW1lcmdlbmN5QnV0dG9uIiwiTG9naW5SZXF1aXJlZE1vZGFsIiwiSG9tZVBhZ2UiLCJTZWFyY2hQYWdlIiwiU2hvcHBpbmdQYWdlIiwiUmVzb3VyY2VzUGFnZSIsIkFib3V0UGFnZSIsIlByaWNpbmdQYWdlIiwiU2FmZVpvbmVQYWdlIiwiU2VjdXJlTWFpbFBhZ2UiLCJEb3dubG9hZFBhZ2UiLCJOZXdzUGFnZSIsIkV2ZW50c1BhZ2UiLCJKb2JzUGFnZSIsIlN1cHBvcnRQYWdlIiwiTXlQYWdlIiwiQnVzaW5lc3NDYXJkUGFnZSIsInN1cGFiYXNlIiwiaXNTdXBhYmFzZUF2YWlsYWJsZSIsIlByZW1pdW1IZXJvU2VjdGlvbiIsIl9zIiwic2hvd1RvYXN0Iiwic2V0U2hvd1RvYXN0IiwidXNlU3RhdGUiLCJoYW5kbGVDb3B5TGluayIsInNoYXJlVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJzaGFyZVRleHQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJzZXRUaW1lb3V0IiwiZXJyIiwiYWxlcnQiLCJiYWNrZ3JvdW5kSW1hZ2UiLCJhbmltYXRpb24iLCJiYWNrZ3JvdW5kU2l6ZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJzY3JvbGxJbnRvVmlldyIsImJlaGF2aW9yIiwiX2MiLCJBcHAiLCJfczIiLCJ2aWV3Iiwic2V0VmlldyIsInNlYXJjaFF1ZXJ5Iiwic2V0U2VhcmNoUXVlcnkiLCJ1c2VyIiwic2V0VXNlciIsInNob3dBdXRoIiwic2V0U2hvd0F1dGgiLCJzaG93TG9naW5SZXF1aXJlZCIsInNldFNob3dMb2dpblJlcXVpcmVkIiwiYXV0aCIsImdldFNlc3Npb24iLCJ0aGVuIiwiZGF0YSIsInNlc3Npb24iLCJlbWFpbCIsImdyYWRlIiwiY2F0Y2giLCJzdWJzY3JpcHRpb24iLCJvbkF1dGhTdGF0ZUNoYW5nZSIsIl9ldmVudCIsInVuc3Vic2NyaWJlIiwiaGFuZGxlU2VhcmNoIiwicXVlcnkiLCJzY3JvbGxUbyIsInRvcCIsImhhbmRsZU5hdmlnYXRlIiwibmV4dFZpZXciLCJoYW5kbGVMb2dvdXQiLCJzaWduT3V0IiwiaGFuZGxlQXV0aFN1Y2Nlc3MiLCJhdXRoVXNlciIsImhhbmRsZUxvZ2luUmVxdWlyZWQiLCJ2IiwiX2MyIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IFZpZXcgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBBbmltYXRlZEJhY2tncm91bmQgZnJvbSAnLi9jb21wb25lbnRzL0FuaW1hdGVkQmFja2dyb3VuZCc7XG5pbXBvcnQgTmF2YmFyIGZyb20gJy4vY29tcG9uZW50cy9OYXZiYXInO1xuaW1wb3J0IEZvb3RlciBmcm9tICcuL2NvbXBvbmVudHMvRm9vdGVyJztcbmltcG9ydCBDaGF0Qm90IGZyb20gJy4vY29tcG9uZW50cy9DaGF0Qm90JztcbmltcG9ydCBBdXRoTW9kYWwgZnJvbSAnLi9jb21wb25lbnRzL0F1dGhNb2RhbCc7XG5pbXBvcnQgRW1lcmdlbmN5QnV0dG9uIGZyb20gJy4vY29tcG9uZW50cy9FbWVyZ2VuY3lCdXR0b24nO1xuaW1wb3J0IExvZ2luUmVxdWlyZWRNb2RhbCBmcm9tICcuL2NvbXBvbmVudHMvTG9naW5SZXF1aXJlZE1vZGFsJztcbmltcG9ydCBIb21lUGFnZSBmcm9tICcuL3BhZ2VzL0hvbWVQYWdlJztcbmltcG9ydCBTZWFyY2hQYWdlIGZyb20gJy4vcGFnZXMvU2VhcmNoUGFnZSc7XG5pbXBvcnQgU2hvcHBpbmdQYWdlIGZyb20gJy4vcGFnZXMvU2hvcHBpbmdQYWdlJztcbmltcG9ydCBSZXNvdXJjZXNQYWdlIGZyb20gJy4vcGFnZXMvUmVzb3VyY2VzUGFnZSc7XG5pbXBvcnQgQWJvdXRQYWdlIGZyb20gJy4vcGFnZXMvQWJvdXRQYWdlJztcbmltcG9ydCBQcmljaW5nUGFnZSBmcm9tICcuL3BhZ2VzL1ByaWNpbmdQYWdlJztcbmltcG9ydCBTYWZlWm9uZVBhZ2UgZnJvbSAnLi9wYWdlcy9TYWZlWm9uZVBhZ2UnO1xuaW1wb3J0IFNlY3VyZU1haWxQYWdlIGZyb20gJy4vcGFnZXMvU2VjdXJlTWFpbFBhZ2UnO1xuaW1wb3J0IERvd25sb2FkUGFnZSBmcm9tICcuL3BhZ2VzL0Rvd25sb2FkUGFnZSc7XG5pbXBvcnQgTmV3c1BhZ2UgZnJvbSAnLi9wYWdlcy9OZXdzUGFnZSc7XG5pbXBvcnQgRXZlbnRzUGFnZSBmcm9tICcuL3BhZ2VzL0V2ZW50c1BhZ2UnO1xuaW1wb3J0IEpvYnNQYWdlIGZyb20gJy4vcGFnZXMvSm9ic1BhZ2UnO1xuaW1wb3J0IFN1cHBvcnRQYWdlIGZyb20gJy4vcGFnZXMvU3VwcG9ydFBhZ2UnO1xuaW1wb3J0IE15UGFnZSBmcm9tICcuL3BhZ2VzL015UGFnZSc7XG5pbXBvcnQgQnVzaW5lc3NDYXJkUGFnZSBmcm9tICcuL3BhZ2VzL0J1c2luZXNzQ2FyZFBhZ2UnO1xuaW1wb3J0IHsgc3VwYWJhc2UsIGlzU3VwYWJhc2VBdmFpbGFibGUgfSBmcm9tICcuL2xpYi9zdXBhYmFzZSc7XG5cbi8vIFvrjIDtkZzri5gg7KO866y4XSDsl6zrsLHsl5Ag67aA66qo64uYIOyVsSDshKTsuZjsmqkgUVIg7L2U65OcIOy2lOqwgFxuY29uc3QgUHJlbWl1bUhlcm9TZWN0aW9uID0gKCkgPT4ge1xuICBjb25zdCBbc2hvd1RvYXN0LCBzZXRTaG93VG9hc3RdID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIGNvbnN0IGhhbmRsZUNvcHlMaW5rID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHNoYXJlVXJsID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbiArICcvcHJpY2luZyc7IFxuICAgIGNvbnN0IHNoYXJlVGV4dCA9IGBbVkxVRV0g67aA66qo64uYIOuztOyViOydhCDsnITtlZwg7J6Q64WAIOyViOyLrCDshJzruYTsiqRcXG7sg4HshLjrs7TquLA6ICR7c2hhcmVVcmx9YDtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoc2hhcmVUZXh0KTtcbiAgICAgIHNldFNob3dUb2FzdCh0cnVlKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0U2hvd1RvYXN0KGZhbHNlKSwgMjAwMCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBhbGVydCgn67O17IKs7JeQIOyLpO2MqO2WiOyKteuLiOuLpC4nKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTYgbWItMTJcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC1bNDhweF0gb3ZlcmZsb3ctaGlkZGVuIGZsZXggZmxleC1jb2wgbGc6ZmxleC1yb3cgYm9yZGVyIGJvcmRlci1zbGF0ZS0xMDAgc2hhZG93LTJ4bCByZWxhdGl2ZVwiPlxuICAgICAgICB7Lyog7Jm87Kq9OiBBSSDsi6Tsi5zqsIQg6rCQ7IucIOyEvO2EsCBVSSAo7Jyg7KeAKSAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsZzp3LTUvMTIgbWluLWgtWzUwMHB4XSBiZy1bIzAyMDYxN10gcmVsYXRpdmUgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC0xMCBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgb3BhY2l0eS0zMFwiPlxuICAgICAgICAgICAgPGRpdiBcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1bMjAwJV0gaC1bMjAwJV0gYWJzb2x1dGUgdG9wLVstNTAlXSBsZWZ0LVstNTAlXVwiIFxuICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgIGJhY2tncm91bmRJbWFnZTogJ2NvbmljLWdyYWRpZW50KGZyb20gMGRlZyBhdCA1MCUgNTAlLCAjM2I4MmY2IDBkZWcsIHRyYW5zcGFyZW50IDkwZGVnKScsXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnc3BpbiAzcyBsaW5lYXIgaW5maW5pdGUnXG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICA+PC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ6LTEwIHctZnVsbCBiZy1zbGF0ZS05MDAvOTAgYmFja2Ryb3AtYmx1ci14bCBib3JkZXIgYm9yZGVyLWJsdWUtNTAwLzMwIHJvdW5kZWQtM3hsIHAtOCBmb250LW1vbm8gc2hhZG93LVswXzBfNTBweF9yZ2JhKDU5LDEzMCwyNDYsMC4xNSldXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBtYi02IGJvcmRlci1iIGJvcmRlci13aGl0ZS8xMCBwYi0zIHRleHQtWzEwcHhdXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYmx1ZS00MDAgZm9udC1ibGFjayBhbmltYXRlLXB1bHNlXCI+4pePIFZMVUVfQUlfTU9OSVRPUl9PTjwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDAgdGV4dC1bMTBweF1cIj5SRUFMLVRJTUUgU0NBTjwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTMgdGV4dC1bMTJweF1cIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LWVtZXJhbGQtNDAwIGZvbnQtYm9sZFwiPjxzcGFuPlZPSUNFIFNDQU5ORVI8L3NwYW4+PHNwYW4+QUNUSVZFPC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtc2xhdGUtNDAwXCI+PHNwYW4+UEhJU0hJTkdfQVRUQUNLPC9zcGFuPjxzcGFuPkRFVEVDVElORzwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LXNsYXRlLTQwMFwiPjxzcGFuPlJFTU9URV9BQ0NFU1M8L3NwYW4+PHNwYW4+RklMVEVSSU5HPC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtWzJweF0gYmctYmx1ZS01MDAvMTAgbXktNCBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC1mdWxsXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctYmx1ZS01MDAgdy0xLzNcIiBzdHlsZT17eyBhbmltYXRpb246ICdzY2FuIDJzIGVhc2UtaW4tb3V0IGluZmluaXRlJyB9fT48L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtYmx1ZS0zMDAvNjAgdGV4dC1jZW50ZXIgaXRhbGljIHRleHQtWzEwcHhdXCI+XCLrtoDrqqjri5gg7Y+wIOuztOyViCwgQUkg67aE7ISd7YyA7J20IDI07Iuc6rCEIOyLpOyLnOqwhCDrs7TtmLgg7KSRXCI8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInotMTAgbXQtMTIgdGV4dC1jZW50ZXIgcHgtNFwiPlxuICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cInRleHQtd2hpdGUgdGV4dC0yeGwgZm9udC1ibGFjayBsZWFkaW5nLXRpZ2h0IG1iLTUgdHJhY2tpbmctdGlnaHRlclwiPlxuICAgICAgICAgICAgICDsi53ri7nrj4QsIO2ajOyCrOuPhCDrs7TslYjqsr3ruYTsl4XssrTqsIAg7KeA7YKk64qU642wPGJyLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ibHVlLTUwMCB1bmRlcmxpbmUgdW5kZXJsaW5lLW9mZnNldC04IGRlY29yYXRpb24tNFwiPuyZnCDrtoDrqqjri5gg7Y+w7J2AIOuwqey5mO2VmOyLnOuCmOyalD88L3NwYW4+XG4gICAgICAgICAgICA8L2g0PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDAgdGV4dC1zbSBmb250LW1lZGl1bSBsZWFkaW5nLXJlbGF4ZWRcIj5cbiAgICAgICAgICAgICAgQURU7Lqh7Iqk6rCAIOqxtOusvOydhCDsp4DtgqTrk68sIFZMVUUgQUkg67aE7ISd7YyA7J2APGJyLz5cbiAgICAgICAgICAgICAg6rCA7J6lIOy3qOyVve2VnCDrtoDrqqjri5jsnZgg7Zy064yA7Y+w7J2EIDI07Iuc6rCEIOyLpOyLnOqwhCDrs7TslYjtlanri4jri6QuXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiDsmKTrpbjsqr06IOyDgeyEuCDtmJztg50g7JWI64K0ICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImxnOnctNy8xMiBwLTEyIGxnOnAtMjAgZmxleCBmbGV4LWNvbCBiZy13aGl0ZSByZWxhdGl2ZVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXggZmxleC1jb2wganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgIHsvKiDtmYDroZzqt7jrnqgg7Zqo6rO8IOuxg+yngCAo7Jyg7KeAKSAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgZ3JvdXAgbWItNiB3LWZpdCBoLWZpdCBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC1mdWxsIHAtWzJweF1cIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHRyYW5zaXRpb24tb3BhY2l0eSBkdXJhdGlvbi0zMDAgb3BhY2l0eS0zMCBncm91cC1ob3ZlcjpvcGFjaXR5LTEwMFwiIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZEltYWdlOiAnbGluZWFyLWdyYWRpZW50KDExMGRlZywgI2ZmMDBlYSwgI2ZmZGQwMCAyMCUsICMwMGZmYWEgNDAlLCAjMDBhYWZmIDYwJSwgI2ZmMDBlYSA4MCUsICNmZmRkMDApJyxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kU2l6ZTogJzMwMCUgMzAwJScsXG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uOiAnaG9sb2dyYW0gNHMgbGluZWFyIGluZmluaXRlJyxcbiAgICAgICAgICAgICAgfX0+PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTYgcHktMiBiZy1ibHVlLTUwIGdyb3VwLWhvdmVyOmJnLWJsdWUtNTAvNzAgYmFja2Ryb3AtYmx1ci1zbSByb3VuZGVkLWZ1bGwgdy1maXRcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNzAwIGZvbnQtYmxhY2sgdGV4dC14cyB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHJlbGF0aXZlIHotMTAgdHJhbnNpdGlvbi1jb2xvcnMgZ3JvdXAtaG92ZXI6dGV4dC1ibHVlLTkwMFwiPlxuICAgICAgICAgICAgICAgICAgRmFtaWx5IENhcmUgRXZlbnRcbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LTR4bCBsZzp0ZXh0LTV4bCBmb250LWJsYWNrIGxlYWRpbmctdGlnaHQgbWItOCByZWxhdGl2ZVwiPlxuICAgICAgICAgICAgICDrtoDrqqjri5gg7Y+wIOuztOyViCwg7J207KCcPGJyLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ibHVlLTYwMCB1bmRlcmxpbmUgZGVjb3JhdGlvbi1ibHVlLTEwMCBkZWNvcmF0aW9uLTggdW5kZXJsaW5lLW9mZnNldC04XCI+7J6Q64WA6rCAIOyngeygkSDssZnqsqjso7zshLjsmpQ8L3NwYW4+XG4gICAgICAgICAgICA8L2gyPlxuICAgICAgICAgICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNCBtYi0xMiB0ZXh0LWxnIHRleHQtc2xhdGUtNjAwIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICA8cD7inJMg7J6Q64WAIOuMgOumrCDqsrDsoJwg7Iuc7Iqk7YWc7Jy866GcIOqwhO2OuCDsi6Dssq08L3A+XG4gICAgICAgICAgICAgIDxwPuKckyDsiqTtg6Dri6Trk5wg7JqU6riI7KCcIOqwgOyehSDsi5wg7LKrIOuLrCAx6rCc7JuUIOustOujjDwvcD5cbiAgICAgICAgICAgICAgPHA+4pyTIEFJIOu2hOyEne2MgCDsnbTsg4Hsp5Xtm4Qg7Y+s7LCpIOyLnCDsnpDrhYDsl5Dqsowg7KaJ7IucIOyVjOumvDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgZ2FwLTQgdy1mdWxsIHJlbGF0aXZlIG1iLTEyXCI+XG4gICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYW5zJyk/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnIH0pfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTggcHktNiBiZy1ibHVlLTYwMCB0ZXh0LXdoaXRlIHJvdW5kZWQtMnhsIGZvbnQtYmxhY2sgdGV4dC14bCBzaGFkb3cteGwgYWN0aXZlOnNjYWxlLTk1IHRyYW5zaXRpb24tYWxsIHctZnVsbCBoLWZ1bGxcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAg66y066OMIO2YnO2Dneuwm+qzoCDsi5zsnpHtlZjquLBcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZUNvcHlMaW5rfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTggcHktNiBiZy1zbGF0ZS01MCB0ZXh0LXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCByb3VuZGVkLTJ4bCBmb250LWJsYWNrIHRleHQteGwgc2hhZG93LW1kIGhvdmVyOmJnLXNsYXRlLTEwMCBhY3RpdmU6c2NhbGUtOTUgdHJhbnNpdGlvbi1hbGwgdy1mdWxsIGgtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtM1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8c3ZnIGNsYXNzTmFtZT1cInctNiBoLTYgdGV4dC1ibHVlLTYwMFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPlxuICAgICAgICAgICAgICAgICAgPHBhdGggc3Ryb2tlTGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlTGluZWpvaW49XCJyb3VuZFwiIHN0cm9rZVdpZHRoPVwiMi41XCIgZD1cIk04LjY4NCAxMy4zNDJDOC44ODYgMTIuOTM4IDkgMTIuNDgyIDkgMTJjMC0uNDgyLS4xMTQtLjkzOC0uMzE2LTEuMzQybTAgMi42ODRhMyAzIDAgMTEwLTIuNjg0bTAgMi42ODRsNi42MzIgMy4zMTZtLTYuNjMyLTZsNi42MzItMy4zMTZtMCAwYTMgMyAwIDEwNS4zNjctMi42ODQgMyAzIDAgMDAtNS4zNjcgMi42ODR6bTAgOS4zMTZhMyAzIDAgMTA1LjM2OCAyLjY4NCAzIDMgMCAwMC01LjM2OC0yLjY4NHpcIiAvPlxuICAgICAgICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgICAgICAgIDxzcGFuPuqwgOyhseyXkOqyjCDqs7XsnKDtlZjquLA8L3NwYW4+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgIHtzaG93VG9hc3QgJiYgKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgLXRvcC0xNiBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIGJnLXNsYXRlLTgwMCB0ZXh0LXdoaXRlIHB4LTYgcHktMyByb3VuZGVkLXhsIHRleHQtc20gZm9udC1ib2xkIHNoYWRvdy0yeGwgYW5pbWF0ZS1ib3VuY2VcIj5cbiAgICAgICAgICAgICAgICAgIO2BtOumveuztOuTnOqwgCDrs7XsgqzrkJjsl4jsirXri4jri6RcbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgey8qIFvrjIDtkZzri5gg7KO866y4IOuwmOyYgV0g7Jes67Cx7JeQIOy2lOqwgOuQnCBRUiDsvZTrk5wg7ISk7LmYIOyEueyFmCAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJvcmRlci10IGJvcmRlci1zbGF0ZS0xMDAgcHQtOCBtdC1hdXRvIGZsZXggZmxleC1jb2wgc206ZmxleC1yb3cgaXRlbXMtY2VudGVyIGdhcC02IGJnLXNsYXRlLTUwLzUwIHJvdW5kZWQtM3hsIHAtNlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTI4IGgtMjggYmctd2hpdGUgcC0zIHJvdW5kZWQtMnhsIHNoYWRvdy1pbm5lciBib3JkZXIgYm9yZGVyLXNsYXRlLTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaHJpbmstMFwiPlxuICAgICAgICAgICAgICB7Lyog7Iuk7KCcIOyKpO2GoOyWtCDshKTsuZgg66eB7YGsIFFSIOydtOuvuOyngCAo7JiI7IucIOydtOuvuOyngCwg7ISc67mE7IqkIOyYpO2UiCDsi5wg6rWQ7LK0KSAqL31cbiAgICAgICAgICAgICAgPGltZyBcbiAgICAgICAgICAgICAgICBzcmM9XCJodHRwczovL2FwaS5xcnNlcnZlci5jb20vdjEvY3JlYXRlLXFyLWNvZGUvP3NpemU9MTAweDEwMCZkYXRhPWh0dHBzOi8vdmx1ZS5jby5rci9pbnN0YWxsXCIgXG4gICAgICAgICAgICAgICAgYWx0PVwiVkxVRSBBcHAgSW5zdGFsbCBRUlwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGgtZnVsbFwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIHRleHQtY2VudGVyIHNtOnRleHQtbGVmdFwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTUwMCB0ZXh0LXNtIGZvbnQtbWVkaXVtIG1iLTFcIj7qsIDsobHsnbQg7ZWo6ruYIOqzhOyLnOuLpOuptD88L3A+XG4gICAgICAgICAgICAgIDxoNSBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTkwMCB0ZXh0LWxnIGZvbnQtYmxhY2sgbGVhZGluZy1zbnVnXCI+XG4gICAgICAgICAgICAgICAg67aA66qo64uYIO2ctOuMgO2PsOycvOuhnDxici8+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ibHVlLTYwMFwiPlFSIOy9lOuTnOulvCDsiqTsupQ8L3NwYW4+7ZWY7JesIOuwlOuhnCDshKTsuZjtlZjshLjsmpRcbiAgICAgICAgICAgICAgPC9oNT5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDAgdGV4dC14cyBtdC0yIGZvbnQtbWVkaXVtXCI+7Iqk7LqUIOyLnCDslbHsiqTthqDslrQv7ZSM66CI7J207Iqk7Yag7Ja066GcIOyekOuPmSDsl7DqsrDrkKnri4jri6QuPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7Lyog7ZWY64uoIOyKpO2BrOuhpCDqsIDsnbTrk5wgKOycoOyngCkgKi99XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBib3R0b20tOCBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xIG9wYWNpdHktNjAgaG92ZXI6b3BhY2l0eS0xMDAgdHJhbnNpdGlvbi1vcGFjaXR5IGN1cnNvci1wb2ludGVyIHotMTBcIlxuICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYW5zJyk/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnIH0pfT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPHN2ZyBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtYmx1ZS01MDAgYW5pbWF0ZS1ib3VuY2VcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj5cbiAgICAgICAgICAgICAgICA8cGF0aCBzdHJva2VMaW5lY2FwPVwicm91bmRcIiBzdHJva2VMaW5lam9pbj1cInJvdW5kXCIgc3Ryb2tlV2lkdGg9XCIzXCIgZD1cIk0xOSA5bC03IDctNy03XCIgLz5cbiAgICAgICAgICAgICAgPC9zdmc+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgPHN0eWxlPntgXG4gICAgICAgIEBrZXlmcmFtZXMgc3BpbiB7IGZyb20geyB0cmFuc2Zvcm06IHJvdGF0ZSgwZGVnKTsgfSB0byB7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IH0gfVxuICAgICAgICBAa2V5ZnJhbWVzIHNjYW4geyAwJSB7IHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtMTAwJSk7IH0gMTAwJSB7IHRyYW5zZm9ybTogdHJhbnNsYXRlWCgzMDAlKTsgfSB9XG4gICAgICAgIEBrZXlmcmFtZXMgaG9sb2dyYW0ge1xuICAgICAgICAgIDAlIHsgYmFja2dyb3VuZC1wb3NpdGlvbjogMCUgNTAlOyB9XG4gICAgICAgICAgNTAlIHsgYmFja2dyb3VuZC1wb3NpdGlvbjogMTAwJSA1MCU7IH1cbiAgICAgICAgICAxMDAlIHsgYmFja2dyb3VuZC1wb3NpdGlvbjogMCUgNTAlOyB9XG4gICAgICAgIH1cbiAgICAgIGB9PC9zdHlsZT5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCgpIHtcbiAgY29uc3QgW3ZpZXcsIHNldFZpZXddID0gdXNlU3RhdGU8Vmlldz4oJ2hvbWUnKTtcbiAgY29uc3QgW3NlYXJjaFF1ZXJ5LCBzZXRTZWFyY2hRdWVyeV0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFt1c2VyLCBzZXRVc2VyXSA9IHVzZVN0YXRlPHsgZW1haWw6IHN0cmluZzsgZ3JhZGU/OiAnYmFzaWMnIHwgJ2NlcnRpZmllZCcgfSB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbc2hvd0F1dGgsIHNldFNob3dBdXRoXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3Nob3dMb2dpblJlcXVpcmVkLCBzZXRTaG93TG9naW5SZXF1aXJlZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWlzU3VwYWJhc2VBdmFpbGFibGUpIHJldHVybjtcbiAgICBzdXBhYmFzZS5hdXRoLmdldFNlc3Npb24oKS50aGVuKCh7IGRhdGE6IHsgc2Vzc2lvbiB9IH0pID0+IHtcbiAgICAgIGlmIChzZXNzaW9uPy51c2VyKSBzZXRVc2VyKHsgZW1haWw6IHNlc3Npb24udXNlci5lbWFpbCA/PyAnJywgZ3JhZGU6ICdiYXNpYycgfSk7XG4gICAgfSkuY2F0Y2goKCkgPT4ge30pO1xuICAgIGNvbnN0IHsgZGF0YTogeyBzdWJzY3JpcHRpb24gfSB9ID0gc3VwYWJhc2UuYXV0aC5vbkF1dGhTdGF0ZUNoYW5nZSgoX2V2ZW50LCBzZXNzaW9uKSA9PiB7XG4gICAgICBpZiAoc2Vzc2lvbj8udXNlcikgeyBzZXRVc2VyKHsgZW1haWw6IHNlc3Npb24udXNlci5lbWFpbCA/PyAnJywgZ3JhZGU6ICdiYXNpYycgfSk7IH0gXG4gICAgICBlbHNlIHsgc2V0VXNlcihudWxsKTsgfVxuICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGhhbmRsZVNlYXJjaCA9IChxdWVyeTogc3RyaW5nKSA9PiB7XG4gICAgc2V0U2VhcmNoUXVlcnkocXVlcnkpO1xuICAgIHNldFZpZXcoJ3NlYXJjaCcpO1xuICAgIHdpbmRvdy5zY3JvbGxUbyh7IHRvcDogMCwgYmVoYXZpb3I6ICdzbW9vdGgnIH0pO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZU5hdmlnYXRlID0gKG5leHRWaWV3OiBWaWV3KSA9PiB7XG4gICAgc2V0VmlldyhuZXh0Vmlldyk7XG4gICAgd2luZG93LnNjcm9sbFRvKHsgdG9wOiAwLCBiZWhhdmlvcjogJ3Ntb290aCcgfSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlTG9nb3V0ID0gYXN5bmMgKCkgPT4ge1xuICAgIHRyeSB7IGlmIChpc1N1cGFiYXNlQXZhaWxhYmxlKSBhd2FpdCBzdXBhYmFzZS5hdXRoLnNpZ25PdXQoKTsgfSBjYXRjaCB7fVxuICAgIHNldFVzZXIobnVsbCk7XG4gICAgc2V0VmlldygnaG9tZScpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUF1dGhTdWNjZXNzID0gKGF1dGhVc2VyOiB7IGVtYWlsOiBzdHJpbmc7IGdyYWRlPzogJ2Jhc2ljJyB8ICdjZXJ0aWZpZWQnIH0pID0+IHtcbiAgICBzZXRVc2VyKGF1dGhVc2VyKTtcbiAgICBzZXRTaG93QXV0aChmYWxzZSk7XG4gICAgc2V0U2hvd0xvZ2luUmVxdWlyZWQoZmFsc2UpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUxvZ2luUmVxdWlyZWQgPSAoKSA9PiB7IGlmICghdXNlcikgc2V0U2hvd0xvZ2luUmVxdWlyZWQodHJ1ZSk7IH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ibHVlLXRpbnQgcmVsYXRpdmUgZm9udC1zYW5zXCI+XG4gICAgICA8QW5pbWF0ZWRCYWNrZ3JvdW5kIC8+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIHotMTBcIj5cbiAgICAgICAgPE5hdmJhciBjdXJyZW50Vmlldz17dmlld30gb25OYXZpZ2F0ZT17aGFuZGxlTmF2aWdhdGV9IHVzZXI9e3VzZXJ9IG9uTG9naW5DbGljaz17KCkgPT4gc2V0U2hvd0F1dGgodHJ1ZSl9IG9uTG9nb3V0PXtoYW5kbGVMb2dvdXR9IC8+XG5cbiAgICAgICAge3ZpZXcgPT09ICdob21lJyAmJiA8SG9tZVBhZ2Ugb25TZWFyY2g9e2hhbmRsZVNlYXJjaH0gb25OYXZpZ2F0ZT17aGFuZGxlTmF2aWdhdGV9IC8+fVxuICAgICAgICB7dmlldyA9PT0gJ3NlYXJjaCcgJiYgPFNlYXJjaFBhZ2UgaW5pdGlhbFF1ZXJ5PXtzZWFyY2hRdWVyeX0gb25CYWNrPXsoKSA9PiBoYW5kbGVOYXZpZ2F0ZSgnaG9tZScpfSAvPn1cbiAgICAgICAge3ZpZXcgPT09ICdzaG9wcGluZycgJiYgPFNob3BwaW5nUGFnZSB1c2VyPXt1c2VyfSBvbkxvZ2luQ2xpY2s9e2hhbmRsZUxvZ2luUmVxdWlyZWR9IC8+fVxuICAgICAgICB7dmlldyA9PT0gJ2Fib3V0JyAmJiA8QWJvdXRQYWdlIC8+fVxuICAgICAgICB7dmlldyA9PT0gJ3Jlc291cmNlcycgJiYgPFJlc291cmNlc1BhZ2UgdXNlcj17dXNlcn0gLz59XG4gICAgICAgIFxuICAgICAgICB7dmlldyA9PT0gJ3ByaWNpbmcnICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB0LTMyIHBiLTIwXCI+XG4gICAgICAgICAgICA8UHJlbWl1bUhlcm9TZWN0aW9uIC8+XG4gICAgICAgICAgICA8ZGl2IGlkPVwicGxhbnNcIj5cbiAgICAgICAgICAgICAgPFByaWNpbmdQYWdlIHVzZXI9e3VzZXJ9IG9uTG9naW5DbGljaz17aGFuZGxlTG9naW5SZXF1aXJlZH0gLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIHt2aWV3ID09PSAnc2FmZXpvbmUnICYmIDxTYWZlWm9uZVBhZ2Ugb25CYWNrPXsoKSA9PiBoYW5kbGVOYXZpZ2F0ZSgnaG9tZScpfSAvPn1cbiAgICAgICAge3ZpZXcgPT09ICdtYWlsJyAmJiA8U2VjdXJlTWFpbFBhZ2Ugb25CYWNrPXsoKSA9PiBoYW5kbGVOYXZpZ2F0ZSgnaG9tZScpfSAvPn1cbiAgICAgICAge3ZpZXcgPT09ICdkb3dubG9hZCcgJiYgPERvd25sb2FkUGFnZSBvbkJhY2s9eygpID0+IGhhbmRsZU5hdmlnYXRlKCdob21lJyl9IC8+fVxuICAgICAgICB7dmlldyA9PT0gJ25ld3MnICYmIDxOZXdzUGFnZSBvbkJhY2s9eygpID0+IGhhbmRsZU5hdmlnYXRlKCdob21lJyl9IC8+fVxuICAgICAgICB7dmlldyA9PT0gJ2V2ZW50cycgJiYgPEV2ZW50c1BhZ2Ugb25CYWNrPXsoKSA9PiBoYW5kbGVOYXZpZ2F0ZSgnaG9tZScpfSAvPn1cbiAgICAgICAge3ZpZXcgPT09ICdqb2JzJyAmJiA8Sm9ic1BhZ2UgdXNlcj17dXNlcn0gb25Mb2dpbkNsaWNrPXtoYW5kbGVMb2dpblJlcXVpcmVkfSBvbkJhY2s9eygpID0+IGhhbmRsZU5hdmlnYXRlKCdob21lJyl9IC8+fVxuICAgICAgICB7dmlldyA9PT0gJ3N1cHBvcnQnICYmIDxTdXBwb3J0UGFnZSB1c2VyPXt1c2VyfSBvbkxvZ2luQ2xpY2s9e2hhbmRsZUxvZ2luUmVxdWlyZWR9IG9uQmFjaz17KCkgPT4gaGFuZGxlTmF2aWdhdGUoJ2hvbWUnKX0gLz59XG4gICAgICAgIHt2aWV3ID09PSAnbXlwYWdlJyAmJiB1c2VyICYmIDxNeVBhZ2UgdXNlcj17dXNlcn0gb25OYXZpZ2F0ZT17KHYpID0+IGhhbmRsZU5hdmlnYXRlKHYgYXMgVmlldyl9IG9uTG9nb3V0PXtoYW5kbGVMb2dvdXR9IC8+fVxuICAgICAgICB7dmlldyA9PT0gJ2JpemNhcmQnICYmIDxCdXNpbmVzc0NhcmRQYWdlIG9uQmFjaz17KCkgPT4gaGFuZGxlTmF2aWdhdGUoJ2hvbWUnKX0gLz59XG5cbiAgICAgICAge3ZpZXcgIT09ICdteXBhZ2UnICYmIDxGb290ZXIgb25OYXZpZ2F0ZT17aGFuZGxlTmF2aWdhdGV9IC8+fVxuICAgICAgPC9kaXY+XG4gICAgICA8Q2hhdEJvdCAvPlxuICAgICAgPEVtZXJnZW5jeUJ1dHRvbiAvPlxuICAgICAge3Nob3dMb2dpblJlcXVpcmVkICYmICF1c2VyICYmIChcbiAgICAgICAgPExvZ2luUmVxdWlyZWRNb2RhbCBvbkNsb3NlPXsoKSA9PiBzZXRTaG93TG9naW5SZXF1aXJlZChmYWxzZSl9IG9uTG9naW49eygpID0+IHsgc2V0U2hvd0xvZ2luUmVxdWlyZWQoZmFsc2UpOyBzZXRTaG93QXV0aCh0cnVlKTsgfX0gLz5cbiAgICAgICl9XG4gICAgICB7c2hvd0F1dGggJiYgPEF1dGhNb2RhbCBvbkNsb3NlPXsoKSA9PiBzZXRTaG93QXV0aChmYWxzZSl9IG9uU3VjY2Vzcz17aGFuZGxlQXV0aFN1Y2Nlc3N9IC8+fVxuICAgIDwvZGl2PlxuICApO1xufSJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvQXBwLnRzeCJ9