import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/BusinessCardPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/BusinessCardPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Shield, Phone, CheckCircle, X, Volume2, MessageSquare, ArrowLeft, AlertTriangle } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const CARD_EXAMPLES = [
  {
    name: "국민은행 대표번호",
    number: "1588-9999",
    org: "국민은행",
    dept: "고객상담센터",
    grade: "premium"
  },
  {
    name: "삼성서울병원",
    number: "02-3410-2114",
    org: "삼성서울병원",
    dept: "원무과",
    grade: "standard"
  },
  {
    name: "명경채 요양병원",
    number: "02-1234-5678",
    org: "명경채 요양병원",
    dept: "입원상담팀",
    grade: "basic"
  }
];
function GalaxyReceiveScreen({
  name,
  number,
  org,
  dept,
  grade
}) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "relative w-full select-none overflow-hidden",
      style: {
        background: "linear-gradient(180deg, #0F172A 0%, #1E293B 40%, #0F172A 100%)",
        borderRadius: "2.5rem",
        aspectRatio: "9/19.5",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
        border: "2px solid rgba(255,255,255,0.08)"
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 49,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex flex-col items-center justify-between py-8 px-4 z-10", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-center mt-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/50 text-xs mb-1 font-medium tracking-wider", children: "수신 전화" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 53,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/70 text-xs", children: number }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 54,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 52,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "w-full flex flex-col items-center", children: grade !== "basic" ? /* @__PURE__ */ jsxDEV(CardOverlay, { org, dept, grade }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 59,
            columnNumber: 11
          }, this) : /* @__PURE__ */ jsxDEV(BasicCard, { org, dept, number }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 61,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 57,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "w-full", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-white/40 text-center text-xs mb-4", style: { wordBreak: "keep-all" }, children: "밀어서 응답" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 66,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center px-4", children: [
              /* @__PURE__ */ jsxDEV("button", { className: "w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg", children: /* @__PURE__ */ jsxDEV(X, { className: "w-6 h-6 text-white", strokeWidth: 2.5 }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 69,
                columnNumber: 15
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 68,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-1", children: [
                /* @__PURE__ */ jsxDEV("button", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Volume2, { className: "w-4 h-4 text-white/70" }, void 0, false, {
                  fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                  lineNumber: 73,
                  columnNumber: 17
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                  lineNumber: 72,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV("button", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(MessageSquare, { className: "w-4 h-4 text-white/70" }, void 0, false, {
                  fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                  lineNumber: 76,
                  columnNumber: 17
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                  lineNumber: 75,
                  columnNumber: 15
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 71,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("button", { className: "w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg", children: /* @__PURE__ */ jsxDEV(Phone, { className: "w-6 h-6 text-white", strokeWidth: 2.5 }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 80,
                columnNumber: 15
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 79,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 67,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 65,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 51,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 39,
      columnNumber: 5
    },
    this
  );
}
_c = GalaxyReceiveScreen;
function IphoneReceiveScreen({
  number,
  org,
  dept,
  grade
}) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "relative w-full select-none overflow-hidden",
      style: {
        background: "linear-gradient(180deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)",
        borderRadius: "3rem",
        aspectRatio: "9/19.5",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)",
        border: "2.5px solid rgba(255,255,255,0.1)"
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-b-3xl z-20" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 103,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex flex-col items-center py-10 px-4 z-10", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-6 mt-2", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/50 text-xs mb-2 tracking-widest uppercase font-semibold", children: "INCOMING CALL" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 107,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-white text-2xl font-black mb-1", style: { letterSpacing: "-0.02em" }, children: number }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 108,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/60 text-sm", children: "알 수 없음" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 109,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 106,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "w-full flex-1 flex items-center justify-center", children: grade !== "basic" ? /* @__PURE__ */ jsxDEV(CardOverlay, { org, dept, grade }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 114,
            columnNumber: 11
          }, this) : /* @__PURE__ */ jsxDEV(BasicCard, { org, dept, number }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 116,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 112,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "w-full", children: /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center px-4 mt-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-1", children: [
              /* @__PURE__ */ jsxDEV("button", { className: "w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl", children: /* @__PURE__ */ jsxDEV(Phone, { className: "w-7 h-7 text-white rotate-135", strokeWidth: 2, style: { transform: "rotate(135deg)" } }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 124,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 123,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/60 text-xs", children: "거절" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 126,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 122,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-1", children: [
              /* @__PURE__ */ jsxDEV("button", { className: "w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl", children: /* @__PURE__ */ jsxDEV(Phone, { className: "w-7 h-7 text-white", strokeWidth: 2 }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 130,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 129,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/60 text-xs", children: "수락" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 132,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 128,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 121,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 120,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 105,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 93,
      columnNumber: 5
    },
    this
  );
}
_c2 = IphoneReceiveScreen;
function BasicCard({ org, dept, number }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "w-4/5 rounded-2xl p-4 text-center",
      style: {
        background: "rgba(255,255,255,0.08)",
        border: "2px solid rgba(100,180,255,0.4)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 0 20px rgba(100,180,255,0.15)"
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1.5 mb-2", children: [
          /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-primary-400" }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 153,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-primary-300 text-xs font-bold", children: "VLUE 인증기관" }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 154,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 152,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-white font-black text-base mb-0.5", style: { letterSpacing: "-0.02em" }, children: org }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 156,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-white/60 text-xs", children: dept }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 157,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-primary-300 text-xs mt-1 font-mono", children: number }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 158,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 143,
      columnNumber: 5
    },
    this
  );
}
_c3 = BasicCard;
function CardOverlay({ org, dept, grade }) {
  if (grade === "standard") {
    return /* @__PURE__ */ jsxDEV("div", { className: "w-4/5 relative", children: [
      /* @__PURE__ */ jsxDEV("style", { children: `
          @keyframes goldRotate {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .gold-border-wrap {
            position: absolute;
            inset: -3px;
            border-radius: 18px;
            overflow: hidden;
          }
          .gold-border-spin {
            position: absolute;
            inset: -50%;
            background: conic-gradient(
              from 0deg,
              transparent 0deg 270deg,
              #F59E0B 270deg 300deg,
              #FDE68A 300deg 330deg,
              #F59E0B 330deg 360deg
            );
            animation: goldRotate 2s linear infinite;
          }
          .gold-border-inner {
            position: absolute;
            inset: 3px;
            border-radius: 15px;
            background: rgba(15,23,42,0.95);
          }
        ` }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 167,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "gold-border-wrap", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "gold-border-spin" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 198,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "gold-border-inner" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 199,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 197,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "relative z-10 rounded-2xl p-4 text-center",
          style: { background: "rgba(15,23,42,0.9)", backdropFilter: "blur(16px)" },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1.5 mb-2", children: [
              /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-amber-400" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 206,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 text-xs font-bold", children: "VLUE 인증기관" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 207,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 205,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-white font-black text-base mb-0.5", children: org }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 209,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/60 text-xs", children: dept }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 210,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1 mt-2", children: [
              /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3 text-amber-400" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 212,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-amber-400 text-xs font-semibold", children: "스탠다드 인증" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 213,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 211,
              columnNumber: 11
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 201,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 166,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "w-4/5 relative", children: [
    /* @__PURE__ */ jsxDEV("style", { children: `
        @keyframes hologramRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hologramPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        .hologram-border-wrap {
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          overflow: hidden;
        }
        .hologram-border-spin {
          position: absolute;
          inset: -50%;
          background: conic-gradient(
            from 0deg,
            #FF0080, #FF8C00, #FFD700, #00FF88, #00BFFF, #8B5CF6, #FF0080
          );
          animation: hologramRotate 3s linear infinite;
        }
        .hologram-border-inner {
          position: absolute;
          inset: 4px;
          border-radius: 16px;
          background: rgba(10,15,30,0.97);
        }
        .hologram-card {
          animation: hologramPulse 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hologram-text {
          background: linear-gradient(90deg, #FF0080, #FF8C00, #FFD700, #00FF88, #00BFFF, #FF0080);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      ` }, void 0, false, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 222,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "hologram-border-wrap", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "hologram-border-spin" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 269,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "hologram-border-inner" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 270,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 268,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "relative z-10 rounded-2xl p-4 text-center hologram-card",
        style: { background: "rgba(10,15,30,0.95)", backdropFilter: "blur(20px)" },
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1.5 mb-2", children: [
            /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4", style: { color: "#00BFFF" } }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 277,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "hologram-text text-xs font-black", children: "VLUE 프리미엄 인증" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 278,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 276,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-white font-black text-base mb-0.5", children: org }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 280,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-white/60 text-xs", children: dept }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 281,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1 mt-2", children: [
            /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3 text-cyan-400" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 283,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "hologram-text text-xs font-bold", children: "홀로그램 인증" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 284,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 282,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 272,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
    lineNumber: 221,
    columnNumber: 5
  }, this);
}
_c4 = CardOverlay;
function LetteringCompare({ number }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center", children: [
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "w-full rounded-2xl overflow-hidden",
          style: {
            background: "linear-gradient(180deg, #1A1A2E 0%, #0F172A 100%)",
            border: "2px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
          },
          children: /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-5 text-center", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/40 text-xs mb-3 font-medium tracking-wider", children: "수신 전화" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 304,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "rounded-xl p-3 mb-3",
                style: { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" },
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1 mb-1", children: [
                    /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-3.5 h-3.5 text-red-400" }, void 0, false, {
                      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                      lineNumber: 310,
                      columnNumber: 17
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-red-400 text-xs font-bold", children: "스팸 주의" }, void 0, false, {
                      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                      lineNumber: 311,
                      columnNumber: 17
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                    lineNumber: 309,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "text-white/50 text-xs font-mono", children: number }, void 0, false, {
                    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                    lineNumber: 313,
                    columnNumber: 15
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 305,
                columnNumber: 13
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3", children: /* @__PURE__ */ jsxDEV("span", { className: "text-white/50 text-lg", children: "?" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 316,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 315,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between mt-3 px-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(X, { className: "w-4 h-4 text-white" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 320,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 319,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-emerald-500/80 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Phone, { className: "w-4 h-4 text-white" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 323,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 322,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 318,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 303,
            columnNumber: 11
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 295,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-red-500 font-semibold mt-2", children: "BEFORE" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 328,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400", children: "일반 수신 화면" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 329,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 294,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center", children: [
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "w-full rounded-2xl overflow-hidden",
          style: {
            background: "linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
            border: "2px solid rgba(49,130,246,0.3)",
            boxShadow: "0 8px 24px rgba(49,130,246,0.2)"
          },
          children: /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-5 text-center", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-white/40 text-xs mb-3 font-medium tracking-wider", children: "수신 전화" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 342,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "rounded-xl p-3 mb-3",
                style: { background: "rgba(49,130,246,0.15)", border: "1px solid rgba(49,130,246,0.4)" },
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1 mb-1", children: [
                    /* @__PURE__ */ jsxDEV(Shield, { className: "w-3.5 h-3.5 text-primary-400" }, void 0, false, {
                      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                      lineNumber: 348,
                      columnNumber: 17
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-primary-300 text-xs font-bold", children: "[VLUE 인증기관]" }, void 0, false, {
                      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                      lineNumber: 349,
                      columnNumber: 17
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                    lineNumber: 347,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1", children: [
                    /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: "w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0",
                        style: { background: "#3182F6" },
                        children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-1.5 h-1.5 text-white", strokeWidth: 3 }, void 0, false, {
                          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                          lineNumber: 356,
                          columnNumber: 19
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                        lineNumber: 352,
                        columnNumber: 17
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV("div", { className: "text-white text-xs font-black", children: "국민은행" }, void 0, false, {
                      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                      lineNumber: 358,
                      columnNumber: 17
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                    lineNumber: 351,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "text-white/50 text-xs font-mono mt-0.5", children: number }, void 0, false, {
                    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                    lineNumber: 360,
                    columnNumber: 15
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 343,
                columnNumber: 13
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center mx-auto mb-3", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-5 h-5 text-primary-400" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 363,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 362,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between mt-3 px-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(X, { className: "w-4 h-4 text-white" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 367,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 366,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow", children: /* @__PURE__ */ jsxDEV(Phone, { className: "w-4 h-4 text-white" }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 370,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/BusinessCardPage.tsx",
                lineNumber: 369,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 365,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 341,
            columnNumber: 11
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 333,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-primary-500 font-semibold mt-2", children: "AFTER" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 375,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400", children: "VLUE 인증 화면" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 376,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 332,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
    lineNumber: 293,
    columnNumber: 5
  }, this);
}
_c5 = LetteringCompare;
export default function BusinessCardPage({ onBack }) {
  _s();
  const [selectedCard, setSelectedCard] = useState(0);
  const [deviceType, setDeviceType] = useState("galaxy");
  const [activeTab, setActiveTab] = useState("card");
  const card = CARD_EXAMPLES[selectedCard];
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen pt-16 bg-gray-50", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-2xl mx-auto px-4 py-8", children: [
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: onBack,
        className: "flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors",
        children: [
          /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 396,
            columnNumber: 11
          }, this),
          "돌아가기"
        ]
      },
      void 0,
      true,
      {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 392,
        columnNumber: 9
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-black text-gray-900 mb-1", style: { letterSpacing: "-0.03em", wordBreak: "keep-all" }, children: "VLUE 디지털 명함" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 401,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm", style: { wordBreak: "keep-all" }, children: "실제 기기 수신 화면에 나타나는 인증 명함을 미리 확인하세요" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 404,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 400,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex border-b border-gray-200 mb-6", children: [
      { key: "card", label: "등급별 명함" },
      { key: "lettering", label: "레터링 서비스" }
    ].map(
      ({ key, label }) => /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setActiveTab(key),
          className: `px-5 py-3 text-sm font-semibold transition-colors ${activeTab === key ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-400 hover:text-gray-600"}`,
          children: label
        },
        key,
        false,
        {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 414,
          columnNumber: 11
        },
        this
      )
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 409,
      columnNumber: 9
    }, this),
    activeTab === "card" && /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-4", children: CARD_EXAMPLES.map(
        (c, i) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setSelectedCard(i),
            className: `flex-1 py-2 px-3 text-xs font-semibold rounded-2xl border transition-all ${selectedCard === i ? "bg-primary-500 text-white border-primary-500" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"}`,
            style: { wordBreak: "keep-all" },
            children: c.grade === "basic" ? "기본형" : c.grade === "standard" ? "스탠다드" : "프리미엄"
          },
          i,
          false,
          {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 430,
            columnNumber: 13
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 428,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 mb-6", children: ["galaxy", "iphone"].map(
        (d) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setDeviceType(d),
            className: `px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all ${deviceType === d ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`,
            children: d === "galaxy" ? "Galaxy" : "iPhone"
          },
          d,
          false,
          {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 447,
            columnNumber: 13
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 445,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center mb-6", children: /* @__PURE__ */ jsxDEV("div", { style: { width: "min(260px, 65vw)" }, children: deviceType === "galaxy" ? /* @__PURE__ */ jsxDEV(
        GalaxyReceiveScreen,
        {
          name: card.name,
          number: card.number,
          org: card.org,
          dept: card.dept,
          grade: card.grade
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 462,
          columnNumber: 15
        },
        this
      ) : /* @__PURE__ */ jsxDEV(
        IphoneReceiveScreen,
        {
          number: card.number,
          org: card.org,
          dept: card.dept,
          grade: card.grade
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 470,
          columnNumber: 15
        },
        this
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 460,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 459,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "card p-4 mb-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: `w-10 h-10 rounded-2xl flex items-center justify-center ${card.grade === "premium" ? "bg-gradient-to-br from-cyan-500 to-purple-600" : card.grade === "standard" ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-primary-100"}`, children: /* @__PURE__ */ jsxDEV(Shield, { className: `w-5 h-5 ${card.grade === "basic" ? "text-primary-600" : "text-white"}` }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 487,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 482,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-gray-900", children: [
            card.org,
            " · ",
            card.dept
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 490,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-500", children: card.number }, void 0, false, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 491,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 489,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "ml-auto", children: /* @__PURE__ */ jsxDEV("span", { className: `px-2.5 py-1 rounded-full text-xs font-bold ${card.grade === "premium" ? "bg-gradient-to-r from-cyan-100 to-purple-100 text-purple-700" : card.grade === "standard" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-primary-50 text-primary-700 border border-primary-100"}`, children: card.grade === "basic" ? "기본형" : card.grade === "standard" ? "골드 애니메이션" : "홀로그램" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 494,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 493,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 481,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 480,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 427,
      columnNumber: 9
    }, this),
    activeTab === "lettering" && /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-5", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-600 leading-relaxed", style: { wordBreak: "keep-all" }, children: [
        "VLUE 인증 기관의 전화번호를 수신할 때, 일반 스팸 경고 대신",
        " ",
        /* @__PURE__ */ jsxDEV("strong", { className: "text-primary-600", children: "VLUE 인증 마크와 기관명" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 512,
          columnNumber: 17
        }, this),
        "이 즉시 표시됩니다."
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 510,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 509,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(LetteringCompare, { number: "1588-9999" }, void 0, false, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 515,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "card p-4 mt-5", children: [
        /* @__PURE__ */ jsxDEV("h4", { className: "text-sm font-bold text-gray-900 mb-3", children: "레터링 서비스 혜택" }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 517,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          "수신 즉시 기관명·인증 마크 표시",
          "스팸 경고 없이 안심 수신 가능",
          "사칭 전화 자동 구분 및 경보",
          "스탠다드/프리미엄 요금제 기본 포함"
        ].map(
          (item) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-4 h-4 text-primary-500 flex-shrink-0" }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 526,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-sm text-gray-700", style: { wordBreak: "keep-all" }, children: item }, void 0, false, {
              fileName: "/home/project/src/pages/BusinessCardPage.tsx",
              lineNumber: 527,
              columnNumber: 21
            }, this)
          ] }, item, true, {
            fileName: "/home/project/src/pages/BusinessCardPage.tsx",
            lineNumber: 525,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/BusinessCardPage.tsx",
          lineNumber: 518,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/BusinessCardPage.tsx",
        lineNumber: 516,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/BusinessCardPage.tsx",
      lineNumber: 508,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
    lineNumber: 391,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/pages/BusinessCardPage.tsx",
    lineNumber: 390,
    columnNumber: 5
  }, this);
}
_s(BusinessCardPage, "ieEkCvzy88nF41PRcbY3tiLB3wI=");
_c6 = BusinessCardPage;
var _c, _c2, _c3, _c4, _c5, _c6;
$RefreshReg$(_c, "GalaxyReceiveScreen");
$RefreshReg$(_c2, "IphoneReceiveScreen");
$RefreshReg$(_c3, "BasicCard");
$RefreshReg$(_c4, "CardOverlay");
$RefreshReg$(_c5, "LetteringCompare");
$RefreshReg$(_c6, "BusinessCardPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/BusinessCardPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/BusinessCardPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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dUJBQUMsU0FBSSxXQUFVLGlCQUNiO0FBQUEsK0JBQUMsUUFBRyxXQUFVLHdDQUF1QywwQkFBckQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUErRDtBQUFBLFFBQy9ELHVCQUFDLFNBQUksV0FBVSxhQUNaO0FBQUEsVUFDQztBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQXFCLEVBQ3JCMkI7QUFBQUEsVUFBSSxDQUFDSyxTQUNMLHVCQUFDLFNBQWUsV0FBVSw2QkFDeEI7QUFBQSxtQ0FBQyxlQUFZLFdBQVUsNENBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQStEO0FBQUEsWUFDL0QsdUJBQUMsVUFBSyxXQUFVLHlCQUF3QixPQUFPLEVBQUVoQyxXQUFXLFdBQVcsR0FBSWdDLGtCQUEzRTtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFnRjtBQUFBLGVBRnhFQSxNQUFWO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxRQUNELEtBWEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVlBO0FBQUEsV0FkRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBZUE7QUFBQSxTQXZCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBd0JBO0FBQUEsT0E3SUo7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQStJQSxLQWhKRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBaUpBO0FBRUo7QUFBQ2hCLEdBM0p1QkYsa0JBQWdCO0FBQUFtQixNQUFoQm5CO0FBQWdCLElBQUFiLElBQUFJLEtBQUFHLEtBQUFHLEtBQUFFLEtBQUFvQjtBQUFBQyxhQUFBakMsSUFBQTtBQUFBaUMsYUFBQTdCLEtBQUE7QUFBQTZCLGFBQUExQixLQUFBO0FBQUEwQixhQUFBdkIsS0FBQTtBQUFBdUIsYUFBQXJCLEtBQUE7QUFBQXFCLGFBQUFELEtBQUEiLCJuYW1lcyI6WyJTaGllbGQiLCJQaG9uZSIsIkNoZWNrQ2lyY2xlIiwiWCIsIlZvbHVtZTIiLCJNZXNzYWdlU3F1YXJlIiwiQXJyb3dMZWZ0IiwiQWxlcnRUcmlhbmdsZSIsIkNBUkRfRVhBTVBMRVMiLCJuYW1lIiwibnVtYmVyIiwib3JnIiwiZGVwdCIsImdyYWRlIiwiR2FsYXh5UmVjZWl2ZVNjcmVlbiIsImJhY2tncm91bmQiLCJib3JkZXJSYWRpdXMiLCJhc3BlY3RSYXRpbyIsImJveFNoYWRvdyIsImJvcmRlciIsIndvcmRCcmVhayIsIl9jIiwiSXBob25lUmVjZWl2ZVNjcmVlbiIsImxldHRlclNwYWNpbmciLCJ0cmFuc2Zvcm0iLCJfYzIiLCJCYXNpY0NhcmQiLCJiYWNrZHJvcEZpbHRlciIsIl9jMyIsIkNhcmRPdmVybGF5IiwiY29sb3IiLCJfYzQiLCJMZXR0ZXJpbmdDb21wYXJlIiwiX2M1IiwiQnVzaW5lc3NDYXJkUGFnZSIsIm9uQmFjayIsIl9zIiwic2VsZWN0ZWRDYXJkIiwic2V0U2VsZWN0ZWRDYXJkIiwidXNlU3RhdGUiLCJkZXZpY2VUeXBlIiwic2V0RGV2aWNlVHlwZSIsImFjdGl2ZVRhYiIsInNldEFjdGl2ZVRhYiIsImNhcmQiLCJrZXkiLCJsYWJlbCIsIm1hcCIsImMiLCJpIiwiZCIsIndpZHRoIiwiaXRlbSIsIl9jNiIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJCdXNpbmVzc0NhcmRQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IFNoaWVsZCwgUGhvbmUsIENoZWNrQ2lyY2xlLCBYLCBWb2x1bWUyLCBNZXNzYWdlU3F1YXJlLCBBcnJvd0xlZnQsIEFsZXJ0VHJpYW5nbGUgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuXG5pbnRlcmZhY2UgQnVzaW5lc3NDYXJkUGFnZVByb3BzIHtcbiAgb25CYWNrOiAoKSA9PiB2b2lkO1xufVxuXG50eXBlIEdyYWRlID0gJ2Jhc2ljJyB8ICdzdGFuZGFyZCcgfCAncHJlbWl1bSc7XG50eXBlIERldmljZVR5cGUgPSAnZ2FsYXh5JyB8ICdpcGhvbmUnO1xuXG5jb25zdCBDQVJEX0VYQU1QTEVTID0gW1xuICB7XG4gICAgbmFtZTogJ+q1reuvvOydgO2WiSDrjIDtkZzrsojtmLgnLFxuICAgIG51bWJlcjogJzE1ODgtOTk5OScsXG4gICAgb3JnOiAn6rWt66+87J2A7ZaJJyxcbiAgICBkZXB0OiAn6rOg6rCd7IOB64u07IS87YSwJyxcbiAgICBncmFkZTogJ3ByZW1pdW0nIGFzIEdyYWRlLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ+yCvOyEseyEnOyauOuzkeybkCcsXG4gICAgbnVtYmVyOiAnMDItMzQxMC0yMTE0JyxcbiAgICBvcmc6ICfsgrzshLHshJzsmrjrs5Hsm5AnLFxuICAgIGRlcHQ6ICfsm5DrrLTqs7wnLFxuICAgIGdyYWRlOiAnc3RhbmRhcmQnIGFzIEdyYWRlLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ+uqheqyveyxhCDsmpTslpHrs5Hsm5AnLFxuICAgIG51bWJlcjogJzAyLTEyMzQtNTY3OCcsXG4gICAgb3JnOiAn66qF6rK97LGEIOyalOyWkeuzkeybkCcsXG4gICAgZGVwdDogJ+yeheybkOyDgeuLtO2MgCcsXG4gICAgZ3JhZGU6ICdiYXNpYycgYXMgR3JhZGUsXG4gIH0sXG5dO1xuXG5mdW5jdGlvbiBHYWxheHlSZWNlaXZlU2NyZWVuKHtcbiAgbmFtZSwgbnVtYmVyLCBvcmcsIGRlcHQsIGdyYWRlLFxufTogeyBuYW1lOiBzdHJpbmc7IG51bWJlcjogc3RyaW5nOyBvcmc6IHN0cmluZzsgZGVwdDogc3RyaW5nOyBncmFkZTogR3JhZGUgfSkge1xuICByZXR1cm4gKFxuICAgIDxkaXZcbiAgICAgIGNsYXNzTmFtZT1cInJlbGF0aXZlIHctZnVsbCBzZWxlY3Qtbm9uZSBvdmVyZmxvdy1oaWRkZW5cIlxuICAgICAgc3R5bGU9e3tcbiAgICAgICAgYmFja2dyb3VuZDogJ2xpbmVhci1ncmFkaWVudCgxODBkZWcsICMwRjE3MkEgMCUsICMxRTI5M0IgNDAlLCAjMEYxNzJBIDEwMCUpJyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnMi41cmVtJyxcbiAgICAgICAgYXNwZWN0UmF0aW86ICc5LzE5LjUnLFxuICAgICAgICBib3hTaGFkb3c6ICcwIDMwcHggODBweCByZ2JhKDAsMCwwLDAuNyksIGluc2V0IDAgMXB4IDAgcmdiYSgyNTUsMjU1LDI1NSwwLjEpJyxcbiAgICAgICAgYm9yZGVyOiAnMnB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4wOCknLFxuICAgICAgfX1cbiAgICA+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0wIGxlZnQtMS8yIC10cmFuc2xhdGUteC0xLzIgdy0yNCBoLTYgYmctYmxhY2sgcm91bmRlZC1iLTJ4bCB6LTIwXCIgLz5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBweS04IHB4LTQgei0xMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtY2VudGVyIG10LTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNTAgdGV4dC14cyBtYi0xIGZvbnQtbWVkaXVtIHRyYWNraW5nLXdpZGVyXCI+7IiY7IugIOyghO2ZlDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXhzXCI+e251bWJlcn08L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICB7Z3JhZGUgIT09ICdiYXNpYycgPyAoXG4gICAgICAgICAgICA8Q2FyZE92ZXJsYXkgb3JnPXtvcmd9IGRlcHQ9e2RlcHR9IGdyYWRlPXtncmFkZX0gLz5cbiAgICAgICAgICApIDogKFxuICAgICAgICAgICAgPEJhc2ljQ2FyZCBvcmc9e29yZ30gZGVwdD17ZGVwdH0gbnVtYmVyPXtudW1iZXJ9IC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGxcIj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzQwIHRleHQtY2VudGVyIHRleHQteHMgbWItNFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT7rsIDslrTshJwg7J2R64u1PC9wPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHB4LTRcIj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwidy0xNCBoLTE0IHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy1sZ1wiPlxuICAgICAgICAgICAgICA8WCBjbGFzc05hbWU9XCJ3LTYgaC02IHRleHQtd2hpdGVcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xXCI+XG4gICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy13aGl0ZS8xMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxWb2x1bWUyIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC13aGl0ZS83MFwiIC8+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLWZ1bGwgYmctd2hpdGUvMTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8TWVzc2FnZVNxdWFyZSBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtd2hpdGUvNzBcIiAvPlxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJ3LTE0IGgtMTQgcm91bmRlZC1mdWxsIGJnLWVtZXJhbGQtNTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy1sZ1wiPlxuICAgICAgICAgICAgICA8UGhvbmUgY2xhc3NOYW1lPVwidy02IGgtNiB0ZXh0LXdoaXRlXCIgc3Ryb2tlV2lkdGg9ezIuNX0gLz5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBJcGhvbmVSZWNlaXZlU2NyZWVuKHtcbiAgbnVtYmVyLCBvcmcsIGRlcHQsIGdyYWRlLFxufTogeyBudW1iZXI6IHN0cmluZzsgb3JnOiBzdHJpbmc7IGRlcHQ6IHN0cmluZzsgZ3JhZGU6IEdyYWRlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9XCJyZWxhdGl2ZSB3LWZ1bGwgc2VsZWN0LW5vbmUgb3ZlcmZsb3ctaGlkZGVuXCJcbiAgICAgIHN0eWxlPXt7XG4gICAgICAgIGJhY2tncm91bmQ6ICdsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCAjMUExQTJFIDAlLCAjMTYyMTNFIDUwJSwgIzBGMzQ2MCAxMDAlKScsXG4gICAgICAgIGJvcmRlclJhZGl1czogJzNyZW0nLFxuICAgICAgICBhc3BlY3RSYXRpbzogJzkvMTkuNScsXG4gICAgICAgIGJveFNoYWRvdzogJzAgMzBweCA4MHB4IHJnYmEoMCwwLDAsMC43KSwgaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LDAuMTUpJyxcbiAgICAgICAgYm9yZGVyOiAnMi41cHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjEpJyxcbiAgICAgIH19XG4gICAgPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMCBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIHctMjggaC04IGJnLWJsYWNrIHJvdW5kZWQtYi0zeGwgei0yMFwiIC8+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBweS0xMCBweC00IHotMTBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciBtYi02IG10LTJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNTAgdGV4dC14cyBtYi0yIHRyYWNraW5nLXdpZGVzdCB1cHBlcmNhc2UgZm9udC1zZW1pYm9sZFwiPklOQ09NSU5HIENBTEw8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUgdGV4dC0yeGwgZm9udC1ibGFjayBtYi0xXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19PntudW1iZXJ9PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzYwIHRleHQtc21cIj7slYwg7IiYIOyXhuydjDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBmbGV4LTEgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICB7Z3JhZGUgIT09ICdiYXNpYycgPyAoXG4gICAgICAgICAgICA8Q2FyZE92ZXJsYXkgb3JnPXtvcmd9IGRlcHQ9e2RlcHR9IGdyYWRlPXtncmFkZX0gLz5cbiAgICAgICAgICApIDogKFxuICAgICAgICAgICAgPEJhc2ljQ2FyZCBvcmc9e29yZ30gZGVwdD17ZGVwdH0gbnVtYmVyPXtudW1iZXJ9IC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGxcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBweC00IG10LTRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC1mdWxsIGJnLXJlZC01MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgc2hhZG93LTJ4bFwiPlxuICAgICAgICAgICAgICAgIDxQaG9uZSBjbGFzc05hbWU9XCJ3LTcgaC03IHRleHQtd2hpdGUgcm90YXRlLTEzNVwiIHN0cm9rZVdpZHRoPXsyfSBzdHlsZT17eyB0cmFuc2Zvcm06ICdyb3RhdGUoMTM1ZGVnKScgfX0gLz5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPuqxsOygiDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInctMTYgaC0xNiByb3VuZGVkLWZ1bGwgYmctZW1lcmFsZC01MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgc2hhZG93LTJ4bFwiPlxuICAgICAgICAgICAgICAgIDxQaG9uZSBjbGFzc05hbWU9XCJ3LTcgaC03IHRleHQtd2hpdGVcIiBzdHJva2VXaWR0aD17Mn0gLz5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPuyImOudvTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBCYXNpY0NhcmQoeyBvcmcsIGRlcHQsIG51bWJlciB9OiB7IG9yZzogc3RyaW5nOyBkZXB0OiBzdHJpbmc7IG51bWJlcjogc3RyaW5nIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9XCJ3LTQvNSByb3VuZGVkLTJ4bCBwLTQgdGV4dC1jZW50ZXJcIlxuICAgICAgc3R5bGU9e3tcbiAgICAgICAgYmFja2dyb3VuZDogJ3JnYmEoMjU1LDI1NSwyNTUsMC4wOCknLFxuICAgICAgICBib3JkZXI6ICcycHggc29saWQgcmdiYSgxMDAsMTgwLDI1NSwwLjQpJyxcbiAgICAgICAgYmFja2Ryb3BGaWx0ZXI6ICdibHVyKDEwcHgpJyxcbiAgICAgICAgYm94U2hhZG93OiAnMCAwIDIwcHggcmdiYSgxMDAsMTgwLDI1NSwwLjE1KScsXG4gICAgICB9fVxuICAgID5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTEuNSBtYi0yXCI+XG4gICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNDAwXCIgLz5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTMwMCB0ZXh0LXhzIGZvbnQtYm9sZFwiPlZMVUUg7J247Kad6riw6rSAPC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ibGFjayB0ZXh0LWJhc2UgbWItMC41XCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19Pntvcmd9PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPntkZXB0fTwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktMzAwIHRleHQteHMgbXQtMSBmb250LW1vbm9cIj57bnVtYmVyfTwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBDYXJkT3ZlcmxheSh7IG9yZywgZGVwdCwgZ3JhZGUgfTogeyBvcmc6IHN0cmluZzsgZGVwdDogc3RyaW5nOyBncmFkZTogR3JhZGUgfSkge1xuICBpZiAoZ3JhZGUgPT09ICdzdGFuZGFyZCcpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQvNSByZWxhdGl2ZVwiPlxuICAgICAgICA8c3R5bGU+e2BcbiAgICAgICAgICBAa2V5ZnJhbWVzIGdvbGRSb3RhdGUge1xuICAgICAgICAgICAgMCUgICB7IHRyYW5zZm9ybTogcm90YXRlKDBkZWcpOyB9XG4gICAgICAgICAgICAxMDAlIHsgdHJhbnNmb3JtOiByb3RhdGUoMzYwZGVnKTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAuZ29sZC1ib3JkZXItd3JhcCB7XG4gICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgICAgICBpbnNldDogLTNweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDE4cHg7XG4gICAgICAgICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAuZ29sZC1ib3JkZXItc3BpbiB7XG4gICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgICAgICBpbnNldDogLTUwJTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6IGNvbmljLWdyYWRpZW50KFxuICAgICAgICAgICAgICBmcm9tIDBkZWcsXG4gICAgICAgICAgICAgIHRyYW5zcGFyZW50IDBkZWcgMjcwZGVnLFxuICAgICAgICAgICAgICAjRjU5RTBCIDI3MGRlZyAzMDBkZWcsXG4gICAgICAgICAgICAgICNGREU2OEEgMzAwZGVnIDMzMGRlZyxcbiAgICAgICAgICAgICAgI0Y1OUUwQiAzMzBkZWcgMzYwZGVnXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYW5pbWF0aW9uOiBnb2xkUm90YXRlIDJzIGxpbmVhciBpbmZpbml0ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLmdvbGQtYm9yZGVyLWlubmVyIHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgICAgIGluc2V0OiAzcHg7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiAxNXB4O1xuICAgICAgICAgICAgYmFja2dyb3VuZDogcmdiYSgxNSwyMyw0MiwwLjk1KTtcbiAgICAgICAgICB9XG4gICAgICAgIGB9PC9zdHlsZT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnb2xkLWJvcmRlci13cmFwXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnb2xkLWJvcmRlci1zcGluXCIgLz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdvbGQtYm9yZGVyLWlubmVyXCIgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9XCJyZWxhdGl2ZSB6LTEwIHJvdW5kZWQtMnhsIHAtNCB0ZXh0LWNlbnRlclwiXG4gICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogJ3JnYmEoMTUsMjMsNDIsMC45KScsIGJhY2tkcm9wRmlsdGVyOiAnYmx1cigxNnB4KScgfX1cbiAgICAgICAgPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTEuNSBtYi0yXCI+XG4gICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1hbWJlci00MDBcIiAvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1hbWJlci0zMDAgdGV4dC14cyBmb250LWJvbGRcIj5WTFVFIOyduOymneq4sOq0gDwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ibGFjayB0ZXh0LWJhc2UgbWItMC41XCI+e29yZ308L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC14c1wiPntkZXB0fTwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTEgbXQtMlwiPlxuICAgICAgICAgICAgPENoZWNrQ2lyY2xlIGNsYXNzTmFtZT1cInctMyBoLTMgdGV4dC1hbWJlci00MDBcIiAvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1hbWJlci00MDAgdGV4dC14cyBmb250LXNlbWlib2xkXCI+7Iqk7YOg64uk65OcIOyduOymnTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInctNC81IHJlbGF0aXZlXCI+XG4gICAgICA8c3R5bGU+e2BcbiAgICAgICAgQGtleWZyYW1lcyBob2xvZ3JhbVJvdGF0ZSB7XG4gICAgICAgICAgMCUgICB7IHRyYW5zZm9ybTogcm90YXRlKDBkZWcpOyB9XG4gICAgICAgICAgMTAwJSB7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IH1cbiAgICAgICAgfVxuICAgICAgICBAa2V5ZnJhbWVzIGhvbG9ncmFtUHVsc2Uge1xuICAgICAgICAgIDAlLCAxMDAlIHsgb3BhY2l0eTogMTsgfVxuICAgICAgICAgIDUwJSAgICAgICB7IG9wYWNpdHk6IDAuNzsgfVxuICAgICAgICB9XG4gICAgICAgIC5ob2xvZ3JhbS1ib3JkZXItd3JhcCB7XG4gICAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgICAgIGluc2V0OiAtNHB4O1xuICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDIwcHg7XG4gICAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICAgICAgfVxuICAgICAgICAuaG9sb2dyYW0tYm9yZGVyLXNwaW4ge1xuICAgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgICBpbnNldDogLTUwJTtcbiAgICAgICAgICBiYWNrZ3JvdW5kOiBjb25pYy1ncmFkaWVudChcbiAgICAgICAgICAgIGZyb20gMGRlZyxcbiAgICAgICAgICAgICNGRjAwODAsICNGRjhDMDAsICNGRkQ3MDAsICMwMEZGODgsICMwMEJGRkYsICM4QjVDRjYsICNGRjAwODBcbiAgICAgICAgICApO1xuICAgICAgICAgIGFuaW1hdGlvbjogaG9sb2dyYW1Sb3RhdGUgM3MgbGluZWFyIGluZmluaXRlO1xuICAgICAgICB9XG4gICAgICAgIC5ob2xvZ3JhbS1ib3JkZXItaW5uZXIge1xuICAgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgICBpbnNldDogNHB4O1xuICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDE2cHg7XG4gICAgICAgICAgYmFja2dyb3VuZDogcmdiYSgxMCwxNSwzMCwwLjk3KTtcbiAgICAgICAgfVxuICAgICAgICAuaG9sb2dyYW0tY2FyZCB7XG4gICAgICAgICAgYW5pbWF0aW9uOiBob2xvZ3JhbVB1bHNlIDNzIGVhc2UtaW4tb3V0IGluZmluaXRlO1xuICAgICAgICB9XG4gICAgICAgIEBrZXlmcmFtZXMgc2hpbW1lciB7XG4gICAgICAgICAgMCUgICB7IGJhY2tncm91bmQtcG9zaXRpb246IC0yMDAlIGNlbnRlcjsgfVxuICAgICAgICAgIDEwMCUgeyBiYWNrZ3JvdW5kLXBvc2l0aW9uOiAyMDAlIGNlbnRlcjsgfVxuICAgICAgICB9XG4gICAgICAgIC5ob2xvZ3JhbS10ZXh0IHtcbiAgICAgICAgICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoOTBkZWcsICNGRjAwODAsICNGRjhDMDAsICNGRkQ3MDAsICMwMEZGODgsICMwMEJGRkYsICNGRjAwODApO1xuICAgICAgICAgIGJhY2tncm91bmQtc2l6ZTogMjAwJSBhdXRvO1xuICAgICAgICAgIC13ZWJraXQtYmFja2dyb3VuZC1jbGlwOiB0ZXh0O1xuICAgICAgICAgIC13ZWJraXQtdGV4dC1maWxsLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgICAgICAgICBiYWNrZ3JvdW5kLWNsaXA6IHRleHQ7XG4gICAgICAgICAgYW5pbWF0aW9uOiBzaGltbWVyIDNzIGxpbmVhciBpbmZpbml0ZTtcbiAgICAgICAgfVxuICAgICAgYH08L3N0eWxlPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJob2xvZ3JhbS1ib3JkZXItd3JhcFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImhvbG9ncmFtLWJvcmRlci1zcGluXCIgLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJob2xvZ3JhbS1ib3JkZXItaW5uZXJcIiAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2XG4gICAgICAgIGNsYXNzTmFtZT1cInJlbGF0aXZlIHotMTAgcm91bmRlZC0yeGwgcC00IHRleHQtY2VudGVyIGhvbG9ncmFtLWNhcmRcIlxuICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAncmdiYSgxMCwxNSwzMCwwLjk1KScsIGJhY2tkcm9wRmlsdGVyOiAnYmx1cigyMHB4KScgfX1cbiAgICAgID5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMS41IG1iLTJcIj5cbiAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctNCBoLTRcIiBzdHlsZT17eyBjb2xvcjogJyMwMEJGRkYnIH19IC8+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaG9sb2dyYW0tdGV4dCB0ZXh0LXhzIGZvbnQtYmxhY2tcIj5WTFVFIO2UhOumrOuvuOyXhCDsnbjspp08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ibGFjayB0ZXh0LWJhc2UgbWItMC41XCI+e29yZ308L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzYwIHRleHQteHNcIj57ZGVwdH08L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMSBtdC0yXCI+XG4gICAgICAgICAgPENoZWNrQ2lyY2xlIGNsYXNzTmFtZT1cInctMyBoLTMgdGV4dC1jeWFuLTQwMFwiIC8+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaG9sb2dyYW0tdGV4dCB0ZXh0LXhzIGZvbnQtYm9sZFwiPu2ZgOuhnOq3uOueqCDsnbjspp08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIExldHRlcmluZ0NvbXBhcmUoeyBudW1iZXIgfTogeyBudW1iZXI6IHN0cmluZyB9KSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcm91bmRlZC0yeGwgb3ZlcmZsb3ctaGlkZGVuXCJcbiAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgYmFja2dyb3VuZDogJ2xpbmVhci1ncmFkaWVudCgxODBkZWcsICMxQTFBMkUgMCUsICMwRjE3MkEgMTAwJSknLFxuICAgICAgICAgICAgYm9yZGVyOiAnMnB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4wOCknLFxuICAgICAgICAgICAgYm94U2hhZG93OiAnMCA4cHggMjRweCByZ2JhKDAsMCwwLDAuNSknLFxuICAgICAgICAgIH19XG4gICAgICAgID5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTQgcHktNSB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzQwIHRleHQteHMgbWItMyBmb250LW1lZGl1bSB0cmFja2luZy13aWRlclwiPuyImOyLoCDsoITtmZQ8L2Rpdj5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC14bCBwLTMgbWItM1wiXG4gICAgICAgICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6ICdyZ2JhKDIzOSw2OCw2OCwwLjE1KScsIGJvcmRlcjogJzFweCBzb2xpZCByZ2JhKDIzOSw2OCw2OCwwLjMpJyB9fVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xIG1iLTFcIj5cbiAgICAgICAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LXJlZC00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcmVkLTQwMCB0ZXh0LXhzIGZvbnQtYm9sZFwiPuyKpO2MuCDso7zsnZg8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNTAgdGV4dC14cyBmb250LW1vbm9cIj57bnVtYmVyfTwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLWZ1bGwgYmctd2hpdGUvMTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgbXgtYXV0byBtYi0zXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNTAgdGV4dC1sZ1wiPj88L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gbXQtMyBweC0yXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwLzgwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy1lbWVyYWxkLTUwMC84MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxQaG9uZSBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXJlZC01MDAgZm9udC1zZW1pYm9sZCBtdC0yXCI+QkVGT1JFPC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj7snbzrsJgg7IiY7IugIO2ZlOuptDwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcm91bmRlZC0yeGwgb3ZlcmZsb3ctaGlkZGVuXCJcbiAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgYmFja2dyb3VuZDogJ2xpbmVhci1ncmFkaWVudCgxODBkZWcsICMwRjE3MkEgMCUsICMxRTI5M0IgNTAlLCAjMEYxNzJBIDEwMCUpJyxcbiAgICAgICAgICAgIGJvcmRlcjogJzJweCBzb2xpZCByZ2JhKDQ5LDEzMCwyNDYsMC4zKScsXG4gICAgICAgICAgICBib3hTaGFkb3c6ICcwIDhweCAyNHB4IHJnYmEoNDksMTMwLDI0NiwwLjIpJyxcbiAgICAgICAgICB9fVxuICAgICAgICA+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC00IHB5LTUgdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS80MCB0ZXh0LXhzIG1iLTMgZm9udC1tZWRpdW0gdHJhY2tpbmctd2lkZXJcIj7siJjsi6Ag7KCE7ZmUPC9kaXY+XG4gICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQteGwgcC0zIG1iLTNcIlxuICAgICAgICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAncmdiYSg0OSwxMzAsMjQ2LDAuMTUpJywgYm9yZGVyOiAnMXB4IHNvbGlkIHJnYmEoNDksMTMwLDI0NiwwLjQpJyB9fVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xIG1iLTFcIj5cbiAgICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtcHJpbWFyeS00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS0zMDAgdGV4dC14cyBmb250LWJvbGRcIj5bVkxVRSDsnbjspp3quLDqtIBdPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctMyBoLTMgcm91bmRlZC1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogJyMzMTgyRjYnIH19XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTEuNSBoLTEuNSB0ZXh0LXdoaXRlXCIgc3Ryb2tlV2lkdGg9ezN9IC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1ibGFja1wiPuq1reuvvOydgO2WiTwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzUwIHRleHQteHMgZm9udC1tb25vIG10LTAuNVwiPntudW1iZXJ9PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTUwMC8yMCBib3JkZXIgYm9yZGVyLXByaW1hcnktNTAwLzQwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG14LWF1dG8gbWItM1wiPlxuICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1wcmltYXJ5LTQwMFwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gbXQtMyBweC0yXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwLzgwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy1lbWVyYWxkLTUwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3dcIj5cbiAgICAgICAgICAgICAgICA8UGhvbmUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1wcmltYXJ5LTUwMCBmb250LXNlbWlib2xkIG10LTJcIj5BRlRFUjwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNDAwXCI+VkxVRSDsnbjspp0g7ZmU66m0PC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEJ1c2luZXNzQ2FyZFBhZ2UoeyBvbkJhY2sgfTogQnVzaW5lc3NDYXJkUGFnZVByb3BzKSB7XG4gIGNvbnN0IFtzZWxlY3RlZENhcmQsIHNldFNlbGVjdGVkQ2FyZF0gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW2RldmljZVR5cGUsIHNldERldmljZVR5cGVdID0gdXNlU3RhdGU8RGV2aWNlVHlwZT4oJ2dhbGF4eScpO1xuICBjb25zdCBbYWN0aXZlVGFiLCBzZXRBY3RpdmVUYWJdID0gdXNlU3RhdGU8J2NhcmQnIHwgJ2xldHRlcmluZyc+KCdjYXJkJyk7XG5cbiAgY29uc3QgY2FyZCA9IENBUkRfRVhBTVBMRVNbc2VsZWN0ZWRDYXJkXTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIHB0LTE2IGJnLWdyYXktNTBcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctMnhsIG14LWF1dG8gcHgtNCBweS04XCI+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXtvbkJhY2t9XG4gICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC1zbSB0ZXh0LWdyYXktNTAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgbWItNiB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgID5cbiAgICAgICAgICA8QXJyb3dMZWZ0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgIOuPjOyVhOqwgOq4sFxuICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTZcIj5cbiAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1ibGFjayB0ZXh0LWdyYXktOTAwIG1iLTFcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDNlbScsIHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgIFZMVUUg65SU7KeA7YS4IOuqhe2VqFxuICAgICAgICAgIDwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LXNtXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAg7Iuk7KCcIOq4sOq4sCDsiJjsi6Ag7ZmU66m07JeQIOuCmO2DgOuCmOuKlCDsnbjspp0g66qF7ZWo7J2EIOuvuOumrCDtmZXsnbjtlZjshLjsmpRcbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBib3JkZXItYiBib3JkZXItZ3JheS0yMDAgbWItNlwiPlxuICAgICAgICAgIHtbXG4gICAgICAgICAgICB7IGtleTogJ2NhcmQnLCBsYWJlbDogJ+uTseq4ieuzhCDrqoXtlagnIH0sXG4gICAgICAgICAgICB7IGtleTogJ2xldHRlcmluZycsIGxhYmVsOiAn66CI7YSw66eBIOyEnOu5hOyKpCcgfSxcbiAgICAgICAgICBdLm1hcCgoeyBrZXksIGxhYmVsIH0pID0+IChcbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAga2V5PXtrZXl9XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYihrZXkgYXMgdHlwZW9mIGFjdGl2ZVRhYil9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTUgcHktMyB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgJHtcbiAgICAgICAgICAgICAgICBhY3RpdmVUYWIgPT09IGtleSA/ICd0ZXh0LXByaW1hcnktNjAwIGJvcmRlci1iLTIgYm9yZGVyLXByaW1hcnktNjAwJyA6ICd0ZXh0LWdyYXktNDAwIGhvdmVyOnRleHQtZ3JheS02MDAnXG4gICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7bGFiZWx9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAge2FjdGl2ZVRhYiA9PT0gJ2NhcmQnICYmIChcbiAgICAgICAgICA8PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yIG1iLTRcIj5cbiAgICAgICAgICAgICAge0NBUkRfRVhBTVBMRVMubWFwKChjLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAga2V5PXtpfVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2VsZWN0ZWRDYXJkKGkpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleC0xIHB5LTIgcHgtMyB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgcm91bmRlZC0yeGwgYm9yZGVyIHRyYW5zaXRpb24tYWxsICR7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkQ2FyZCA9PT0gaVxuICAgICAgICAgICAgICAgICAgICAgID8gJ2JnLXByaW1hcnktNTAwIHRleHQtd2hpdGUgYm9yZGVyLXByaW1hcnktNTAwJ1xuICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXdoaXRlIHRleHQtZ3JheS02MDAgYm9yZGVyLWdyYXktMjAwIGhvdmVyOmJvcmRlci1wcmltYXJ5LTMwMCdcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAge2MuZ3JhZGUgPT09ICdiYXNpYycgPyAn6riw67O47ZiVJyA6IGMuZ3JhZGUgPT09ICdzdGFuZGFyZCcgPyAn7Iqk7YOg64uk65OcJyA6ICftlITrpqzrr7jsl4QnfVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTIgbWItNlwiPlxuICAgICAgICAgICAgICB7KFsnZ2FsYXh5JywgJ2lwaG9uZSddIGFzIERldmljZVR5cGVbXSkubWFwKChkKSA9PiAoXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAga2V5PXtkfVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0RGV2aWNlVHlwZShkKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTQgcHktMS41IHRleHQteHMgZm9udC1zZW1pYm9sZCByb3VuZGVkLXhsIGJvcmRlciB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2VUeXBlID09PSBkID8gJ2JnLWdyYXktOTAwIHRleHQtd2hpdGUgYm9yZGVyLWdyYXktOTAwJyA6ICdiZy13aGl0ZSB0ZXh0LWdyYXktNjAwIGJvcmRlci1ncmF5LTIwMCdcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtkID09PSAnZ2FsYXh5JyA/ICdHYWxheHknIDogJ2lQaG9uZSd9XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWNlbnRlciBtYi02XCI+XG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICdtaW4oMjYwcHgsIDY1dncpJyB9fT5cbiAgICAgICAgICAgICAgICB7ZGV2aWNlVHlwZSA9PT0gJ2dhbGF4eScgPyAoXG4gICAgICAgICAgICAgICAgICA8R2FsYXh5UmVjZWl2ZVNjcmVlblxuICAgICAgICAgICAgICAgICAgICBuYW1lPXtjYXJkLm5hbWV9XG4gICAgICAgICAgICAgICAgICAgIG51bWJlcj17Y2FyZC5udW1iZXJ9XG4gICAgICAgICAgICAgICAgICAgIG9yZz17Y2FyZC5vcmd9XG4gICAgICAgICAgICAgICAgICAgIGRlcHQ9e2NhcmQuZGVwdH1cbiAgICAgICAgICAgICAgICAgICAgZ3JhZGU9e2NhcmQuZ3JhZGV9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICA8SXBob25lUmVjZWl2ZVNjcmVlblxuICAgICAgICAgICAgICAgICAgICBudW1iZXI9e2NhcmQubnVtYmVyfVxuICAgICAgICAgICAgICAgICAgICBvcmc9e2NhcmQub3JnfVxuICAgICAgICAgICAgICAgICAgICBkZXB0PXtjYXJkLmRlcHR9XG4gICAgICAgICAgICAgICAgICAgIGdyYWRlPXtjYXJkLmdyYWRlfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNhcmQgcC00IG1iLTRcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy0xMCBoLTEwIHJvdW5kZWQtMnhsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyICR7XG4gICAgICAgICAgICAgICAgICBjYXJkLmdyYWRlID09PSAncHJlbWl1bScgPyAnYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1jeWFuLTUwMCB0by1wdXJwbGUtNjAwJyA6XG4gICAgICAgICAgICAgICAgICBjYXJkLmdyYWRlID09PSAnc3RhbmRhcmQnID8gJ2JnLWdyYWRpZW50LXRvLWJyIGZyb20tYW1iZXItNDAwIHRvLWFtYmVyLTYwMCcgOlxuICAgICAgICAgICAgICAgICAgJ2JnLXByaW1hcnktMTAwJ1xuICAgICAgICAgICAgICAgIH1gfT5cbiAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPXtgdy01IGgtNSAke2NhcmQuZ3JhZGUgPT09ICdiYXNpYycgPyAndGV4dC1wcmltYXJ5LTYwMCcgOiAndGV4dC13aGl0ZSd9YH0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwXCI+e2NhcmQub3JnfSDCtyB7Y2FyZC5kZXB0fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS01MDBcIj57Y2FyZC5udW1iZXJ9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtbC1hdXRvXCI+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2BweC0yLjUgcHktMSByb3VuZGVkLWZ1bGwgdGV4dC14cyBmb250LWJvbGQgJHtcbiAgICAgICAgICAgICAgICAgICAgY2FyZC5ncmFkZSA9PT0gJ3ByZW1pdW0nID8gJ2JnLWdyYWRpZW50LXRvLXIgZnJvbS1jeWFuLTEwMCB0by1wdXJwbGUtMTAwIHRleHQtcHVycGxlLTcwMCcgOlxuICAgICAgICAgICAgICAgICAgICBjYXJkLmdyYWRlID09PSAnc3RhbmRhcmQnID8gJ2JnLWFtYmVyLTUwIHRleHQtYW1iZXItNzAwIGJvcmRlciBib3JkZXItYW1iZXItMjAwJyA6XG4gICAgICAgICAgICAgICAgICAgICdiZy1wcmltYXJ5LTUwIHRleHQtcHJpbWFyeS03MDAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTEwMCdcbiAgICAgICAgICAgICAgICAgIH1gfT5cbiAgICAgICAgICAgICAgICAgICAge2NhcmQuZ3JhZGUgPT09ICdiYXNpYycgPyAn6riw67O47ZiVJyA6IGNhcmQuZ3JhZGUgPT09ICdzdGFuZGFyZCcgPyAn6rOo65OcIOyVoOuLiOuplOydtOyFmCcgOiAn7ZmA66Gc6re4656oJ31cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8Lz5cbiAgICAgICAgKX1cblxuICAgICAgICB7YWN0aXZlVGFiID09PSAnbGV0dGVyaW5nJyAmJiAoXG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNVwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtZ3JheS02MDAgbGVhZGluZy1yZWxheGVkXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICAgIFZMVUUg7J247KadIOq4sOq0gOydmCDsoITtmZTrsojtmLjrpbwg7IiY7Iug7ZWgIOuVjCwg7J2867CYIOyKpO2MuCDqsr3qs6Ag64yA7IugeycgJ31cbiAgICAgICAgICAgICAgICA8c3Ryb25nIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS02MDBcIj5WTFVFIOyduOymnSDrp4jtgazsmYAg6riw6rSA66qFPC9zdHJvbmc+7J20IOymieyLnCDtkZzsi5zrkKnri4jri6QuXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPExldHRlcmluZ0NvbXBhcmUgbnVtYmVyPVwiMTU4OC05OTk5XCIgLz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2FyZCBwLTQgbXQtNVwiPlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1ncmF5LTkwMCBtYi0zXCI+66CI7YSw66eBIOyEnOu5hOyKpCDtmJztg508L2g0PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICAgIHtbXG4gICAgICAgICAgICAgICAgICAn7IiY7IugIOymieyLnCDquLDqtIDrqoXCt+yduOymnSDrp4jtgawg7ZGc7IucJyxcbiAgICAgICAgICAgICAgICAgICfsiqTtjLgg6rK96rOgIOyXhuydtCDslYjsi6wg7IiY7IugIOqwgOuKpScsXG4gICAgICAgICAgICAgICAgICAn7IKs7LmtIOyghO2ZlCDsnpDrj5kg6rWs67aEIOuwjyDqsr3rs7QnLFxuICAgICAgICAgICAgICAgICAgJ+yKpO2DoOuLpOuTnC/tlITrpqzrr7jsl4Qg7JqU6riI7KCcIOq4sOuzuCDtj6ztlagnLFxuICAgICAgICAgICAgICAgIF0ubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aXRlbX0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNVwiPlxuICAgICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNTAwIGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtZ3JheS03MDBcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+e2l0ZW19PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvcGFnZXMvQnVzaW5lc3NDYXJkUGFnZS50c3gifQ==