import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/PricingPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/PricingPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { CheckCircle, Star, Zap, Shield, ArrowRight, CreditCard, Building2, Sparkles, Phone, X, AlertTriangle } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { pricingTiers } from "/src/data/mockData.ts";
const TIER_ICONS = [Shield, Zap, Star];
const TIER_COLORS = {
  gray: { header: "bg-gray-50", badge: "bg-gray-100 text-gray-600", border: "border-gray-200" },
  blue: { header: "bg-primary-600", badge: "bg-white/20 text-white", border: "border-primary-300" },
  gold: { header: "bg-gray-900", badge: "bg-amber-400/20 text-amber-300", border: "border-gray-700" }
};
function GalaxyCallScreen({ grade }) {
  const orgName = grade === "basic" ? "명경채 요양병원" : grade === "standard" ? "국민은행 고객센터" : "국민은행 대표번호";
  const dept = grade === "basic" ? "입원상담팀" : grade === "standard" ? "고객상담센터" : "공식 대표번호";
  const number = grade === "basic" ? "02-1234-5678" : "1588-9999";
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      style: {
        width: "200px",
        height: "430px",
        flexShrink: 0,
        background: "linear-gradient(180deg, #0F172A 0%, #1a2540 50%, #0F172A 100%)",
        borderRadius: "2.4rem",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.09)",
        border: "2.5px solid rgba(255,255,255,0.09)",
        position: "relative",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { style: {
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "70px",
          height: "22px",
          background: "#000",
          borderRadius: "0 0 14px 14px",
          zIndex: 20
        } }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 38,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "36px 16px 28px",
          zIndex: 10
        }, children: [
          /* @__PURE__ */ jsxDEV("div", { style: { textAlign: "center" }, children: [
            /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.35)", fontSize: "10px", letterSpacing: "0.12em", fontWeight: 600, marginBottom: "4px" }, children: "수신 전화" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 48,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "monospace" }, children: number }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 49,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 47,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }, children: [
            grade === "basic" && /* @__PURE__ */ jsxDEV(BasicCardPopup, { orgName, dept }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 53,
              columnNumber: 33
            }, this),
            grade === "standard" && /* @__PURE__ */ jsxDEV(StandardCardPopup, { orgName, dept }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 54,
              columnNumber: 36
            }, this),
            grade === "premium" && /* @__PURE__ */ jsxDEV(PremiumCardPopup, { orgName, dept }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 55,
              columnNumber: 35
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 52,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { width: "100%", display: "flex", justifyContent: "space-around", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxDEV("div", { style: { width: "48px", height: "48px", borderRadius: "50%", background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }, children: /* @__PURE__ */ jsxDEV(X, { size: 20, color: "white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 60,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 59,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { style: { width: "48px", height: "48px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(16,185,129,0.4)" }, children: /* @__PURE__ */ jsxDEV(Phone, { size: 20, color: "white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 63,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 62,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 58,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 43,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 25,
      columnNumber: 5
    },
    this
  );
}
_c = GalaxyCallScreen;
function BasicCardPopup({ orgName, dept }) {
  return /* @__PURE__ */ jsxDEV("div", { style: {
    width: "86%",
    background: "rgba(15,22,45,0.92)",
    border: "1.5px solid rgba(96,165,250,0.55)",
    borderRadius: "14px",
    padding: "10px 12px",
    textAlign: "center",
    backdropFilter: "blur(12px)",
    boxShadow: "0 0 20px rgba(96,165,250,0.15)"
  }, children: [
    /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "5px" }, children: [
      /* @__PURE__ */ jsxDEV(Shield, { size: 11, color: "#60A5FA", strokeWidth: 2.5 }, void 0, false, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 84,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { style: { color: "#93C5FD", fontSize: "9px", fontWeight: 800, letterSpacing: "0.04em" }, children: "VLUE 인증기관" }, void 0, false, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 85,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 83,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { style: { color: "#fff", fontWeight: 900, fontSize: "12px", letterSpacing: "-0.02em", marginBottom: "2px" }, children: orgName }, void 0, false, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 87,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.45)", fontSize: "9px" }, children: dept }, void 0, false, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 88,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/PricingPage.tsx",
    lineNumber: 73,
    columnNumber: 5
  }, this);
}
_c2 = BasicCardPopup;
function StandardCardPopup({ orgName, dept }) {
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("style", { children: `
        @keyframes goldSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .gold-border-wrap { position:relative; width:86%; border-radius:14px; }
        .gold-border-ring { position:absolute; inset:-2px; border-radius:14px; overflow:hidden; }
        .gold-border-spin {
          position:absolute; inset:-60%;
          background: conic-gradient(from 0deg, transparent 0deg 240deg, #F59E0B 240deg 270deg, #FDE68A 270deg 295deg, #FBBF24 295deg 320deg, transparent 320deg 360deg);
          animation: goldSpin 1.6s linear infinite;
        }
        .gold-border-bg { position:absolute; inset:2px; border-radius:12px; background:rgba(10,16,30,0.97); }
        .gold-card-inner { position:relative; z-index:2; padding:10px 12px; text-align:center; }
      ` }, void 0, false, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 96,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "gold-border-wrap", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "gold-border-ring", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "gold-border-spin" }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 113,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "gold-border-bg" }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 114,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 112,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "gold-card-inner", children: [
        /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "5px" }, children: [
          /* @__PURE__ */ jsxDEV(Shield, { size: 11, color: "#F59E0B", strokeWidth: 2.5 }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 118,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { style: { color: "#FCD34D", fontSize: "9px", fontWeight: 800, letterSpacing: "0.04em" }, children: "VLUE 인증기관" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 119,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 117,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: { color: "#fff", fontWeight: 900, fontSize: "12px", letterSpacing: "-0.02em", marginBottom: "2px" }, children: orgName }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 121,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.45)", fontSize: "9px" }, children: dept }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 122,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "4px" }, children: [
          /* @__PURE__ */ jsxDEV(CheckCircle, { size: 9, color: "#F59E0B" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 124,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { style: { color: "#FCD34D", fontSize: "8px", fontWeight: 700 }, children: "스탠다드 인증" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 125,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 123,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 116,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 111,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/PricingPage.tsx",
    lineNumber: 95,
    columnNumber: 5
  }, this);
}
_c3 = StandardCardPopup;
function PremiumCardPopup({ orgName, dept }) {
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("style", { children: `
        @keyframes holoSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes holoText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .holo-border-wrap { position:relative; width:86%; border-radius:14px; }
        .holo-border-ring { position:absolute; inset:-2.5px; border-radius:15px; overflow:hidden; }
        .holo-border-spin {
          position:absolute; inset:-60%;
          background: conic-gradient(from 0deg, #FF0080,#FF6B00,#FFD700,#00FF88,#00BFFF,#7C3AED,#FF0080);
          animation: holoSpin 2.4s linear infinite;
        }
        .holo-border-bg { position:absolute; inset:2.5px; border-radius:12px; background:rgba(6,10,22,0.98); }
        .holo-card-inner2 { position:relative; z-index:2; padding:10px 12px; text-align:center; }
        .holo-label {
          background: linear-gradient(90deg,#FF0080,#FF6B00,#FFD700,#00FF88,#00BFFF,#FF0080);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation: holoText 2.4s linear infinite;
          font-size:9px; font-weight:900; letter-spacing:0.04em;
        }
        .holo-badge {
          background: linear-gradient(90deg,#FF0080,#FFD700,#00BFFF,#FF0080);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation: holoText 2.4s linear infinite;
          font-size:8px; font-weight:700;
        }
      ` }, void 0, false, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 136,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "holo-border-wrap", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "holo-border-ring", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "holo-border-spin" }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 175,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "holo-border-bg" }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 176,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 174,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "holo-card-inner2", children: [
        /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "5px" }, children: [
          /* @__PURE__ */ jsxDEV(Shield, { size: 11, color: "#22D3EE", strokeWidth: 2.5 }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 180,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "holo-label", children: "VLUE 프리미엄" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 181,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 179,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: { color: "#fff", fontWeight: 900, fontSize: "12px", letterSpacing: "-0.02em", marginBottom: "2px" }, children: orgName }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 183,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.45)", fontSize: "9px" }, children: dept }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 184,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "4px" }, children: [
          /* @__PURE__ */ jsxDEV(CheckCircle, { size: 9, color: "#22D3EE" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 186,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "holo-badge", children: "홀로그램 인증" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 187,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 185,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 178,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 173,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/PricingPage.tsx",
    lineNumber: 135,
    columnNumber: 5
  }, this);
}
_c4 = PremiumCardPopup;
function LetteringCallScreen({ mode }) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      style: {
        width: "180px",
        height: "380px",
        flexShrink: 0,
        background: mode === "before" ? "linear-gradient(180deg,#1A1120 0%,#0F0A18 100%)" : "linear-gradient(180deg,#0C1520 0%,#0A1018 100%)",
        borderRadius: "2.2rem",
        boxShadow: mode === "before" ? "0 20px 60px rgba(0,0,0,0.8)" : "0 20px 60px rgba(49,130,246,0.2)",
        border: mode === "before" ? "2px solid rgba(255,255,255,0.07)" : "2px solid rgba(49,130,246,0.3)",
        position: "relative",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { style: {
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "60px",
          height: "18px",
          background: "#000",
          borderRadius: "0 0 12px 12px",
          zIndex: 20
        } }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 216,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "30px 14px 22px",
          zIndex: 10
        }, children: [
          /* @__PURE__ */ jsxDEV("div", { style: { textAlign: "center" }, children: /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.3)", fontSize: "9px", letterSpacing: "0.1em", fontWeight: 600 }, children: "수신 전화" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 227,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 226,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }, children: [
            mode === "before" ? /* @__PURE__ */ jsxDEV("div", { style: {
              width: "88%",
              background: "rgba(239,68,68,0.12)",
              border: "1.5px solid rgba(239,68,68,0.4)",
              borderRadius: "12px",
              padding: "10px 10px",
              textAlign: "center"
            }, children: [
              /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "5px" }, children: [
                /* @__PURE__ */ jsxDEV(AlertTriangle, { size: 11, color: "#F87171" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 238,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { style: { color: "#F87171", fontSize: "10px", fontWeight: 800 }, children: "스팸 주의" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 239,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 237,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.55)", fontSize: "11px", fontFamily: "monospace" }, children: "1588-9999" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 241,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.25)", fontSize: "9px", marginTop: "2px" }, children: "알 수 없는 번호" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 242,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 232,
              columnNumber: 11
            }, this) : /* @__PURE__ */ jsxDEV("div", { style: {
              width: "88%",
              background: "rgba(49,130,246,0.12)",
              border: "1.5px solid rgba(49,130,246,0.5)",
              borderRadius: "12px",
              padding: "10px 10px",
              textAlign: "center",
              backdropFilter: "blur(8px)"
            }, children: [
              /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "5px" }, children: [
                /* @__PURE__ */ jsxDEV("div", { style: { width: "14px", height: "14px", borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxDEV(Shield, { size: 9, color: "white", strokeWidth: 2.5 }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 253,
                  columnNumber: 19
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 252,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { style: { color: "#93C5FD", fontSize: "9px", fontWeight: 900, letterSpacing: "0.02em" }, children: "[VLUE 인증기관]" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 255,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 251,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { style: { color: "#fff", fontWeight: 900, fontSize: "13px", letterSpacing: "-0.02em" }, children: "국민은행" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 257,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { style: { color: "rgba(255,255,255,0.4)", fontSize: "9px", fontFamily: "monospace", marginTop: "2px" }, children: "1588-9999" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 258,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 245,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { style: {
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: mode === "before" ? "rgba(255,255,255,0.07)" : "rgba(59,130,246,0.18)",
              border: mode === "before" ? "1.5px solid rgba(255,255,255,0.12)" : "2px solid rgba(59,130,246,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }, children: mode === "before" ? /* @__PURE__ */ jsxDEV("span", { style: { color: "rgba(255,255,255,0.3)", fontSize: "20px", lineHeight: 1 }, children: "?" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 269,
              columnNumber: 13
            }, this) : /* @__PURE__ */ jsxDEV(Shield, { size: 20, color: "#60A5FA", strokeWidth: 2 }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 270,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 262,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 230,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { style: { width: "100%", display: "flex", justifyContent: "space-around" }, children: [
            /* @__PURE__ */ jsxDEV("div", { style: { width: "44px", height: "44px", borderRadius: "50%", background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(239,68,68,0.4)" }, children: /* @__PURE__ */ jsxDEV(X, { size: 18, color: "white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 277,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 276,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { style: {
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: mode === "before" ? "#4B5563" : "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: mode === "after" ? "0 4px 12px rgba(16,185,129,0.45)" : "none"
            }, children: /* @__PURE__ */ jsxDEV(Phone, { size: 18, color: mode === "before" ? "rgba(255,255,255,0.4)" : "white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 285,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 279,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 275,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 221,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 197,
      columnNumber: 5
    },
    this
  );
}
_c5 = LetteringCallScreen;
export default function PricingPage({ user, onLoginClick }) {
  _s();
  const [activeGrade, setActiveGrade] = useState("standard");
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-gray-50 pt-16", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white border-b border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Shield, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 301,
          columnNumber: 13
        }, this),
        "인증신청(요금제)"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 300,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl sm:text-4xl font-black text-gray-900 mb-3", style: { letterSpacing: "-0.035em" }, children: "나에게 맞는 인증 등급 선택" }, void 0, false, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 304,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-base max-w-lg mx-auto leading-relaxed", style: { wordBreak: "keep-all" }, children: [
        "모든 서비스는 로그인 후 이용 가능합니다.",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 306,
          columnNumber: 36
        }, this),
        "기관 규모와 필요에 맞는 요금제를 선택하세요."
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 305,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 299,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 298,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-16", children: pricingTiers.map((tier, idx) => {
        const Icon = TIER_ICONS[idx];
        const colors = TIER_COLORS[tier.color] ?? TIER_COLORS.gray;
        const isBlue = tier.color === "blue";
        const isGold = tier.color === "gold";
        return /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: `rounded-3xl border overflow-hidden relative flex flex-col shadow-card ${colors.border} ${isBlue ? "scale-[1.02] shadow-card-hover" : ""}`,
            children: [
              tier.recommended && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-4 right-4 px-2.5 py-1 bg-white rounded-full text-primary-600 text-xs font-black shadow-sm z-10", children: "추천" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 327,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: `${colors.header} px-6 pt-6 pb-8`, children: [
                /* @__PURE__ */ jsxDEV("div", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${colors.badge}`, children: [
                  /* @__PURE__ */ jsxDEV(Icon, { className: "w-3.5 h-3.5" }, void 0, false, {
                    fileName: "/home/project/src/pages/PricingPage.tsx",
                    lineNumber: 333,
                    columnNumber: 21
                  }, this),
                  tier.name
                ] }, void 0, true, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 332,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: `mb-2 ${isBlue || isGold ? "text-white" : "text-gray-900"}`, children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "text-4xl font-black font-inter", children: tier.price === 0 ? "무료" : tier.price.toLocaleString() }, void 0, false, {
                    fileName: "/home/project/src/pages/PricingPage.tsx",
                    lineNumber: 337,
                    columnNumber: 21
                  }, this),
                  tier.price > 0 && /* @__PURE__ */ jsxDEV("span", { className: "text-base font-medium", children: [
                    "원/",
                    tier.period
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/PricingPage.tsx",
                    lineNumber: 340,
                    columnNumber: 40
                  }, this)
                ] }, void 0, true, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 336,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: `text-sm ${isBlue || isGold ? "text-white/70" : "text-gray-500"}`, children: tier.description }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 342,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 331,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "bg-white px-6 py-6 flex-1 flex flex-col", children: [
                /* @__PURE__ */ jsxDEV("ul", { className: "space-y-3 mb-6 flex-1", children: tier.features.map(
                  (feature) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2.5 text-sm text-gray-700", children: [
                    /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" }, void 0, false, {
                      fileName: "/home/project/src/pages/PricingPage.tsx",
                      lineNumber: 349,
                      columnNumber: 25
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { style: { wordBreak: "keep-all" }, children: feature }, void 0, false, {
                      fileName: "/home/project/src/pages/PricingPage.tsx",
                      lineNumber: 350,
                      columnNumber: 25
                    }, this)
                  ] }, feature, true, {
                    fileName: "/home/project/src/pages/PricingPage.tsx",
                    lineNumber: 348,
                    columnNumber: 21
                  }, this)
                ) }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 346,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => {
                      if (!user && onLoginClick) onLoginClick();
                    },
                    className: `w-full py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 ${isBlue ? "btn-primary" : isGold ? "bg-amber-400 text-gray-900 hover:bg-amber-300 font-bold" : "btn-secondary"}`,
                    children: [
                      tier.price === 0 ? "무료로 시작하기" : "인증 신청하기",
                      /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4" }, void 0, false, {
                        fileName: "/home/project/src/pages/PricingPage.tsx",
                        lineNumber: 363,
                        columnNumber: 21
                      }, this)
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "/home/project/src/pages/PricingPage.tsx",
                    lineNumber: 354,
                    columnNumber: 19
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 345,
                columnNumber: 17
              }, this)
            ]
          },
          tier.id,
          true,
          {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 322,
            columnNumber: 15
          },
          this
        );
      }) }, void 0, false, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 314,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mb-16", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-8", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold", children: [
            /* @__PURE__ */ jsxDEV(Phone, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 374,
              columnNumber: 15
            }, this),
            "실제 수신 화면 미리보기"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 373,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-black text-gray-900 mb-2", style: { letterSpacing: "-0.03em" }, children: "통화 중 디지털 명함 — 등급별 실물 UI" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 377,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm max-w-xl mx-auto", style: { wordBreak: "keep-all" }, children: [
            "실제 Galaxy 수신 화면 위에 나타나는 명함 팝업을 미리 확인하세요.",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 381,
              columnNumber: 55
            }, this),
            "등급별로 테두리 효과와 인증 레이어가 달라집니다."
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 380,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 372,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-2 justify-center mb-8", children: ["basic", "standard", "premium"].map(
          (g) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setActiveGrade(g),
              className: `px-5 py-2.5 text-xs font-bold rounded-2xl border transition-all ${activeGrade === g ? g === "premium" ? "bg-gray-900 text-white border-gray-900 shadow-md" : g === "standard" ? "bg-amber-400 text-gray-900 border-amber-400 shadow-md" : "bg-primary-500 text-white border-primary-500 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`,
              children: g === "basic" ? "기본형 (연블루)" : g === "standard" ? "스탠다드 (골드)" : "프리미엄 (홀로그램)"
            },
            g,
            false,
            {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 388,
              columnNumber: 13
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 386,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 lg:p-12", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col lg:flex-row items-center gap-10 lg:gap-16", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(GalaxyCallScreen, { grade: activeGrade }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 409,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 408,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 text-white min-w-0", children: [
            activeGrade === "basic" && /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-4", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-5 h-5 text-primary-400" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 417,
                  columnNumber: 25
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 416,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "font-black text-xl", style: { letterSpacing: "-0.02em" }, children: "기본형 — 연블루 테두리" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 419,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 415,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-sm mb-5 leading-relaxed", style: { wordBreak: "keep-all" }, children: [
                "실제 Galaxy 수신 화면 위에 ",
                /* @__PURE__ */ jsxDEV("strong", { className: "text-primary-300", children: "연한 파란색 테두리" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 422,
                  columnNumber: 42
                }, this),
                "가 적용된 명함 팝업이 오버레이됩니다. VLUE 인증 마크와 기관명이 즉시 표시되어 수신자가 안심하고 통화할 수 있습니다."
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 421,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 p-4 bg-white/5 rounded-2xl", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-2.5 h-2.5 rounded-full bg-primary-400 flex-shrink-0" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 425,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-sm", children: "연블루 보더 · VLUE 인증 마크 · 기관명 및 부서명 표시" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 426,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 424,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 414,
              columnNumber: 17
            }, this),
            activeGrade === "standard" && /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-4", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Star, { className: "w-5 h-5 text-amber-400" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 434,
                  columnNumber: 25
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 433,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "font-black text-xl", style: { letterSpacing: "-0.02em" }, children: "스탠다드 — 골드 애니메이션" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 436,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 432,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-sm mb-5 leading-relaxed", style: { wordBreak: "keep-all" }, children: [
                "수신 화면 위에 팝업되는 명함의 테두리를 ",
                /* @__PURE__ */ jsxDEV("strong", { className: "text-amber-300", children: "금빛 빛이 회전" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 439,
                  columnNumber: 46
                }, this),
                "하며 흐릅니다. 고급스러운 첫인상으로 기관의 신뢰도를 높입니다."
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 438,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 p-4 bg-white/5 rounded-2xl", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 442,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-sm", children: "회전 골드 빛 테두리 · 인증 등급 배지 · 스탠다드 이상 제공" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 443,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 441,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 431,
              columnNumber: 17
            }, this),
            activeGrade === "premium" && /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-4", children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    style: { background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.4)" },
                    children: /* @__PURE__ */ jsxDEV(Sparkles, { className: "w-5 h-5 text-cyan-300" }, void 0, false, {
                      fileName: "/home/project/src/pages/PricingPage.tsx",
                      lineNumber: 452,
                      columnNumber: 25
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/home/project/src/pages/PricingPage.tsx",
                    lineNumber: 450,
                    columnNumber: 23
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("span", { className: "font-black text-xl", style: { letterSpacing: "-0.02em" }, children: "프리미엄 — 홀로그램 효과" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 454,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 449,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-sm mb-5 leading-relaxed", style: { wordBreak: "keep-all" }, children: [
                "명함 팝업 테두리에 ",
                /* @__PURE__ */ jsxDEV("strong", { className: "text-cyan-300", children: "무지개빛 홀로그램" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 457,
                  columnNumber: 34
                }, this),
                "이 회전하며 반사됩니다. 텍스트까지 홀로그램 그라디언트로 표현되는 최고급 디자인입니다."
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 456,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 p-4 bg-white/5 rounded-2xl", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 460,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-sm", children: "무지개 홀로그램 보더 · 텍스트 그라디언트 · 프리미엄 전용" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 461,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 459,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 448,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 412,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 407,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 406,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 371,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mb-16", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-8", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold", children: [
            /* @__PURE__ */ jsxDEV(CreditCard, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 473,
              columnNumber: 15
            }, this),
            "레터링 서비스"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 472,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-black text-gray-900 mb-2", style: { letterSpacing: "-0.03em" }, children: "수신 화면이 달라집니다 — Before / After" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 476,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm max-w-lg mx-auto", style: { wordBreak: "keep-all" }, children: [
            "VLUE 레터링 적용 전과 후를 직접 비교하세요.",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 480,
              columnNumber: 42
            }, this),
            "스팸 경고 대신 ",
            /* @__PURE__ */ jsxDEV("strong", { children: "VLUE 쉴드 아이콘" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 481,
              columnNumber: 24
            }, this),
            "과 ",
            /* @__PURE__ */ jsxDEV("strong", { children: "[VLUE 인증기관]" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 481,
              columnNumber: 54
            }, this),
            " 팝업이 표시됩니다."
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 479,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 471,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-3xl p-8 lg:p-12", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row items-center justify-center gap-8 lg:gap-16", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4", children: [
              /* @__PURE__ */ jsxDEV(LetteringCallScreen, { mode: "before" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 488,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "inline-block px-4 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black rounded-full", children: "BEFORE" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 490,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-white/40 text-xs mt-1.5", children: "인증 없는 일반 수신" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 491,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 489,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 487,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-2 text-white/30", children: [
              /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-8 h-8" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 496,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold", children: "VLUE 적용" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 497,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 495,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4", children: [
              /* @__PURE__ */ jsxDEV(LetteringCallScreen, { mode: "after" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 501,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "inline-block px-4 py-1.5 bg-primary-500/20 border border-primary-500/40 text-primary-300 text-xs font-black rounded-full", children: "AFTER" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 503,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-white/40 text-xs mt-1.5", children: "VLUE 인증 수신 화면" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 504,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 502,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 500,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 486,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "mt-10 max-w-2xl mx-auto bg-white/5 rounded-2xl p-5", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-white" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 512,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 511,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-white font-bold text-sm mb-1.5", children: "레터링 서비스 동작 방식" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 515,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/55 text-xs leading-relaxed", style: { wordBreak: "keep-all" }, children: [
                "VLUE에 등록된 인증기관 발신번호가 수신될 때, 수신 화면 위에 푸른색 VLUE 쉴드 아이콘과",
                /* @__PURE__ */ jsxDEV("strong", { className: "text-primary-300", children: " [VLUE 인증기관]" }, void 0, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 518,
                  columnNumber: 21
                }, this),
                " 볼드 텍스트가 담긴 팝업이 자동으로 오버레이됩니다. 스팸 데이터베이스에 없는 번호도 VLUE 인증 여부를 즉시 확인할 수 있습니다."
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 516,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "mt-3 flex flex-wrap gap-2", children: ["스탠다드 이상 포함", "실시간 인증 대조", "통신사 무관 적용", "사칭 원천 차단"].map(
                (tag) => /* @__PURE__ */ jsxDEV("span", { className: "px-2.5 py-1 bg-primary-500/15 border border-primary-500/30 text-primary-300 rounded-full text-xs font-semibold", children: tag }, tag, false, {
                  fileName: "/home/project/src/pages/PricingPage.tsx",
                  lineNumber: 523,
                  columnNumber: 21
                }, this)
              ) }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 521,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 514,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 510,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 509,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 485,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 470,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 mb-10", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col lg:flex-row items-start lg:items-center gap-6", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5 mb-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Building2, { className: "w-5 h-5 text-white" }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 539,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 538,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("h3", { className: "text-white font-bold text-lg", children: "B2B 기업 맞춤 요금제" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 542,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-white/60 text-xs", children: "50인 이상 기업 대량 가입 · 별도 협의" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 543,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 541,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 537,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm leading-relaxed mb-4", style: { wordBreak: "keep-all" }, children: "임직원 전체 VLUE 인증, 전용 API, 보안 교육 패키지, 전담 보안 매니저 배정 등 기업 맞춤형 솔루션을 제공합니다." }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 546,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("ul", { className: "grid grid-cols-2 gap-2", children: ["대량 임직원 인증", "전용 관리 콘솔", "커스텀 API 연동", "월간 보안 리포트"].map(
            (f) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-center gap-1.5 text-xs text-white/80", children: [
              /* @__PURE__ */ jsxDEV(Sparkles, { className: "w-3 h-3 text-amber-400 flex-shrink-0" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 552,
                columnNumber: 21
              }, this),
              f
            ] }, f, true, {
              fileName: "/home/project/src/pages/PricingPage.tsx",
              lineNumber: 551,
              columnNumber: 17
            }, this)
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 549,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 536,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              if (!user && onLoginClick) onLoginClick();
            },
            className: "px-6 py-3 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-sm rounded-2xl transition-all whitespace-nowrap flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsxDEV(Building2, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/pages/PricingPage.tsx",
                lineNumber: 563,
                columnNumber: 17
              }, this),
              "B2B 기업 상담 신청"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 559,
            columnNumber: 15
          },
          this
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 558,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 535,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 534,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white border border-gray-100 rounded-3xl p-6 sm:p-8", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-2.5 max-w-2xl mx-auto", children: [
        /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" }, void 0, false, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 572,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-600 text-xs leading-relaxed", style: { wordBreak: "keep-all" }, children: [
          /* @__PURE__ */ jsxDEV("strong", { className: "text-gray-800", children: "보안 안내문구 자동 표시:" }, void 0, false, {
            fileName: "/home/project/src/pages/PricingPage.tsx",
            lineNumber: 574,
            columnNumber: 15
          }, this),
          " 모든 디지털 명함 하단에 “본 명함은 VLUE 인증 회원임을 증명합니다. 인증된 상태 중 어떠한 경우에도 유선상 송금이나 개인정보를 요구하지 않으니 사칭에 주의하십시오.” 문구가 자동으로 포함됩니다."
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/PricingPage.tsx",
          lineNumber: 573,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 571,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/PricingPage.tsx",
        lineNumber: 570,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/PricingPage.tsx",
      lineNumber: 312,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/PricingPage.tsx",
    lineNumber: 297,
    columnNumber: 5
  }, this);
}
_s(PricingPage, "knzNymeFBVszB0z4v6D9GBBFp3s=");
_c6 = PricingPage;
var _c, _c2, _c3, _c4, _c5, _c6;
$RefreshReg$(_c, "GalaxyCallScreen");
$RefreshReg$(_c2, "BasicCardPopup");
$RefreshReg$(_c3, "StandardCardPopup");
$RefreshReg$(_c4, "PremiumCardPopup");
$RefreshReg$(_c5, "LetteringCallScreen");
$RefreshReg$(_c6, "PricingPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/PricingPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/PricingPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QSxPQXpSRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBMFJBO0FBRUo7QUFBQ0osR0FoU3VCSCxhQUFXO0FBQUEyQixNQUFYM0I7QUFBVyxJQUFBYixJQUFBRyxLQUFBRyxLQUFBRSxLQUFBSSxLQUFBNEI7QUFBQUMsYUFBQXpDLElBQUE7QUFBQXlDLGFBQUF0QyxLQUFBO0FBQUFzQyxhQUFBbkMsS0FBQTtBQUFBbUMsYUFBQWpDLEtBQUE7QUFBQWlDLGFBQUE3QixLQUFBO0FBQUE2QixhQUFBRCxLQUFBIiwibmFtZXMiOlsiQ2hlY2tDaXJjbGUiLCJTdGFyIiwiWmFwIiwiU2hpZWxkIiwiQXJyb3dSaWdodCIsIkNyZWRpdENhcmQiLCJCdWlsZGluZzIiLCJTcGFya2xlcyIsIlBob25lIiwiWCIsIkFsZXJ0VHJpYW5nbGUiLCJwcmljaW5nVGllcnMiLCJUSUVSX0lDT05TIiwiVElFUl9DT0xPUlMiLCJncmF5IiwiaGVhZGVyIiwiYmFkZ2UiLCJib3JkZXIiLCJibHVlIiwiZ29sZCIsIkdhbGF4eUNhbGxTY3JlZW4iLCJncmFkZSIsIm9yZ05hbWUiLCJkZXB0IiwibnVtYmVyIiwid2lkdGgiLCJoZWlnaHQiLCJmbGV4U2hyaW5rIiwiYmFja2dyb3VuZCIsImJvcmRlclJhZGl1cyIsImJveFNoYWRvdyIsInBvc2l0aW9uIiwib3ZlcmZsb3ciLCJ0b3AiLCJsZWZ0IiwidHJhbnNmb3JtIiwiekluZGV4IiwiaW5zZXQiLCJkaXNwbGF5IiwiZmxleERpcmVjdGlvbiIsImFsaWduSXRlbXMiLCJqdXN0aWZ5Q29udGVudCIsInBhZGRpbmciLCJ0ZXh0QWxpZ24iLCJjb2xvciIsImZvbnRTaXplIiwibGV0dGVyU3BhY2luZyIsImZvbnRXZWlnaHQiLCJtYXJnaW5Cb3R0b20iLCJmb250RmFtaWx5IiwiZ2FwIiwiX2MiLCJCYXNpY0NhcmRQb3B1cCIsImJhY2tkcm9wRmlsdGVyIiwiX2MyIiwiU3RhbmRhcmRDYXJkUG9wdXAiLCJtYXJnaW5Ub3AiLCJfYzMiLCJQcmVtaXVtQ2FyZFBvcHVwIiwiX2M0IiwiTGV0dGVyaW5nQ2FsbFNjcmVlbiIsIm1vZGUiLCJsaW5lSGVpZ2h0IiwiX2M1IiwiUHJpY2luZ1BhZ2UiLCJ1c2VyIiwib25Mb2dpbkNsaWNrIiwiX3MiLCJhY3RpdmVHcmFkZSIsInNldEFjdGl2ZUdyYWRlIiwidXNlU3RhdGUiLCJ3b3JkQnJlYWsiLCJtYXAiLCJ0aWVyIiwiaWR4IiwiSWNvbiIsImNvbG9ycyIsImlzQmx1ZSIsImlzR29sZCIsInJlY29tbWVuZGVkIiwibmFtZSIsInByaWNlIiwidG9Mb2NhbGVTdHJpbmciLCJwZXJpb2QiLCJkZXNjcmlwdGlvbiIsImZlYXR1cmVzIiwiZmVhdHVyZSIsImlkIiwiZyIsInRhZyIsImYiLCJfYzYiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiUHJpY2luZ1BhZ2UudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQ2hlY2tDaXJjbGUsIFN0YXIsIFphcCwgU2hpZWxkLCBBcnJvd1JpZ2h0LCBDcmVkaXRDYXJkLCBCdWlsZGluZzIsIFNwYXJrbGVzLCBQaG9uZSwgWCwgQWxlcnRUcmlhbmdsZSB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyBwcmljaW5nVGllcnMgfSBmcm9tICcuLi9kYXRhL21vY2tEYXRhJztcblxuaW50ZXJmYWNlIFByaWNpbmdQYWdlUHJvcHMge1xuICB1c2VyPzogeyBlbWFpbDogc3RyaW5nIH0gfCBudWxsO1xuICBvbkxvZ2luQ2xpY2s/OiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBUSUVSX0lDT05TID0gW1NoaWVsZCwgWmFwLCBTdGFyXTtcbmNvbnN0IFRJRVJfQ09MT1JTID0ge1xuICBncmF5OiB7IGhlYWRlcjogJ2JnLWdyYXktNTAnLCBiYWRnZTogJ2JnLWdyYXktMTAwIHRleHQtZ3JheS02MDAnLCBib3JkZXI6ICdib3JkZXItZ3JheS0yMDAnIH0sXG4gIGJsdWU6IHsgaGVhZGVyOiAnYmctcHJpbWFyeS02MDAnLCBiYWRnZTogJ2JnLXdoaXRlLzIwIHRleHQtd2hpdGUnLCBib3JkZXI6ICdib3JkZXItcHJpbWFyeS0zMDAnIH0sXG4gIGdvbGQ6IHsgaGVhZGVyOiAnYmctZ3JheS05MDAnLCBiYWRnZTogJ2JnLWFtYmVyLTQwMC8yMCB0ZXh0LWFtYmVyLTMwMCcsIGJvcmRlcjogJ2JvcmRlci1ncmF5LTcwMCcgfSxcbn07XG5cbnR5cGUgRGV2aWNlR3JhZGUgPSAnYmFzaWMnIHwgJ3N0YW5kYXJkJyB8ICdwcmVtaXVtJztcblxuZnVuY3Rpb24gR2FsYXh5Q2FsbFNjcmVlbih7IGdyYWRlIH06IHsgZ3JhZGU6IERldmljZUdyYWRlIH0pIHtcbiAgY29uc3Qgb3JnTmFtZSA9IGdyYWRlID09PSAnYmFzaWMnID8gJ+uqheqyveyxhCDsmpTslpHrs5Hsm5AnIDogZ3JhZGUgPT09ICdzdGFuZGFyZCcgPyAn6rWt66+87J2A7ZaJIOqzoOqwneyEvO2EsCcgOiAn6rWt66+87J2A7ZaJIOuMgO2RnOuyiO2YuCc7XG4gIGNvbnN0IGRlcHQgPSBncmFkZSA9PT0gJ2Jhc2ljJyA/ICfsnoXsm5Dsg4Hri7TtjIAnIDogZ3JhZGUgPT09ICdzdGFuZGFyZCcgPyAn6rOg6rCd7IOB64u07IS87YSwJyA6ICfqs7Xsi50g64yA7ZGc67KI7Zi4JztcbiAgY29uc3QgbnVtYmVyID0gZ3JhZGUgPT09ICdiYXNpYycgPyAnMDItMTIzNC01Njc4JyA6ICcxNTg4LTk5OTknO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdlxuICAgICAgc3R5bGU9e3tcbiAgICAgICAgd2lkdGg6ICcyMDBweCcsXG4gICAgICAgIGhlaWdodDogJzQzMHB4JyxcbiAgICAgICAgZmxleFNocmluazogMCxcbiAgICAgICAgYmFja2dyb3VuZDogJ2xpbmVhci1ncmFkaWVudCgxODBkZWcsICMwRjE3MkEgMCUsICMxYTI1NDAgNTAlLCAjMEYxNzJBIDEwMCUpJyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnMi40cmVtJyxcbiAgICAgICAgYm94U2hhZG93OiAnMCAyNHB4IDgwcHggcmdiYSgwLDAsMCwwLjgpLCBpbnNldCAwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsMC4wOSknLFxuICAgICAgICBib3JkZXI6ICcyLjVweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LDAuMDkpJyxcbiAgICAgICAgcG9zaXRpb246ICdyZWxhdGl2ZScsXG4gICAgICAgIG92ZXJmbG93OiAnaGlkZGVuJyxcbiAgICAgIH19XG4gICAgPlxuICAgICAgPGRpdiBzdHlsZT17e1xuICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJywgdG9wOiAwLCBsZWZ0OiAnNTAlJywgdHJhbnNmb3JtOiAndHJhbnNsYXRlWCgtNTAlKScsXG4gICAgICAgIHdpZHRoOiAnNzBweCcsIGhlaWdodDogJzIycHgnLCBiYWNrZ3JvdW5kOiAnIzAwMCcsIGJvcmRlclJhZGl1czogJzAgMCAxNHB4IDE0cHgnLCB6SW5kZXg6IDIwLFxuICAgICAgfX0gLz5cblxuICAgICAgPGRpdiBzdHlsZT17e1xuICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJywgaW5zZXQ6IDAsIGRpc3BsYXk6ICdmbGV4JywgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG4gICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLCBqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nLCBwYWRkaW5nOiAnMzZweCAxNnB4IDI4cHgnLCB6SW5kZXg6IDEwLFxuICAgICAgfX0+XG4gICAgICAgIDxkaXYgc3R5bGU9e3sgdGV4dEFsaWduOiAnY2VudGVyJyB9fT5cbiAgICAgICAgICA8ZGl2IHN0eWxlPXt7IGNvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwwLjM1KScsIGZvbnRTaXplOiAnMTBweCcsIGxldHRlclNwYWNpbmc6ICcwLjEyZW0nLCBmb250V2VpZ2h0OiA2MDAsIG1hcmdpbkJvdHRvbTogJzRweCcgfX0+7IiY7IugIOyghO2ZlDwvZGl2PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgY29sb3I6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNSknLCBmb250U2l6ZTogJzExcHgnLCBmb250RmFtaWx5OiAnbW9ub3NwYWNlJyB9fT57bnVtYmVyfTwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IHN0eWxlPXt7IHdpZHRoOiAnMTAwJScsIGRpc3BsYXk6ICdmbGV4JywgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsIGFsaWduSXRlbXM6ICdjZW50ZXInLCBnYXA6ICcxMHB4JyB9fT5cbiAgICAgICAgICB7Z3JhZGUgPT09ICdiYXNpYycgJiYgPEJhc2ljQ2FyZFBvcHVwIG9yZ05hbWU9e29yZ05hbWV9IGRlcHQ9e2RlcHR9IC8+fVxuICAgICAgICAgIHtncmFkZSA9PT0gJ3N0YW5kYXJkJyAmJiA8U3RhbmRhcmRDYXJkUG9wdXAgb3JnTmFtZT17b3JnTmFtZX0gZGVwdD17ZGVwdH0gLz59XG4gICAgICAgICAge2dyYWRlID09PSAncHJlbWl1bScgJiYgPFByZW1pdW1DYXJkUG9wdXAgb3JnTmFtZT17b3JnTmFtZX0gZGVwdD17ZGVwdH0gLz59XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICcxMDAlJywgZGlzcGxheTogJ2ZsZXgnLCBqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsIGFsaWduSXRlbXM6ICdjZW50ZXInIH19PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICc0OHB4JywgaGVpZ2h0OiAnNDhweCcsIGJvcmRlclJhZGl1czogJzUwJScsIGJhY2tncm91bmQ6ICcjRUY0NDQ0JywgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLCBib3hTaGFkb3c6ICcwIDRweCAxNnB4IHJnYmEoMjM5LDY4LDY4LDAuNCknIH19PlxuICAgICAgICAgICAgPFggc2l6ZT17MjB9IGNvbG9yPVwid2hpdGVcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICc0OHB4JywgaGVpZ2h0OiAnNDhweCcsIGJvcmRlclJhZGl1czogJzUwJScsIGJhY2tncm91bmQ6ICcjMTBCOTgxJywgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLCBib3hTaGFkb3c6ICcwIDRweCAxNnB4IHJnYmEoMTYsMTg1LDEyOSwwLjQpJyB9fT5cbiAgICAgICAgICAgIDxQaG9uZSBzaXplPXsyMH0gY29sb3I9XCJ3aGl0ZVwiIHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEJhc2ljQ2FyZFBvcHVwKHsgb3JnTmFtZSwgZGVwdCB9OiB7IG9yZ05hbWU6IHN0cmluZzsgZGVwdDogc3RyaW5nIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IHN0eWxlPXt7XG4gICAgICB3aWR0aDogJzg2JScsXG4gICAgICBiYWNrZ3JvdW5kOiAncmdiYSgxNSwyMiw0NSwwLjkyKScsXG4gICAgICBib3JkZXI6ICcxLjVweCBzb2xpZCByZ2JhKDk2LDE2NSwyNTAsMC41NSknLFxuICAgICAgYm9yZGVyUmFkaXVzOiAnMTRweCcsXG4gICAgICBwYWRkaW5nOiAnMTBweCAxMnB4JyxcbiAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXG4gICAgICBiYWNrZHJvcEZpbHRlcjogJ2JsdXIoMTJweCknLFxuICAgICAgYm94U2hhZG93OiAnMCAwIDIwcHggcmdiYSg5NiwxNjUsMjUwLDAuMTUpJyxcbiAgICB9fT5cbiAgICAgIDxkaXYgc3R5bGU9e3sgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLCBnYXA6ICc1cHgnLCBtYXJnaW5Cb3R0b206ICc1cHgnIH19PlxuICAgICAgICA8U2hpZWxkIHNpemU9ezExfSBjb2xvcj1cIiM2MEE1RkFcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICA8c3BhbiBzdHlsZT17eyBjb2xvcjogJyM5M0M1RkQnLCBmb250U2l6ZTogJzlweCcsIGZvbnRXZWlnaHQ6IDgwMCwgbGV0dGVyU3BhY2luZzogJzAuMDRlbScgfX0+VkxVRSDsnbjspp3quLDqtIA8L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgc3R5bGU9e3sgY29sb3I6ICcjZmZmJywgZm9udFdlaWdodDogOTAwLCBmb250U2l6ZTogJzEycHgnLCBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScsIG1hcmdpbkJvdHRvbTogJzJweCcgfX0+e29yZ05hbWV9PC9kaXY+XG4gICAgICA8ZGl2IHN0eWxlPXt7IGNvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwwLjQ1KScsIGZvbnRTaXplOiAnOXB4JyB9fT57ZGVwdH08L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU3RhbmRhcmRDYXJkUG9wdXAoeyBvcmdOYW1lLCBkZXB0IH06IHsgb3JnTmFtZTogc3RyaW5nOyBkZXB0OiBzdHJpbmcgfSkge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8c3R5bGU+e2BcbiAgICAgICAgQGtleWZyYW1lcyBnb2xkU3BpbiB7XG4gICAgICAgICAgZnJvbSB7IHRyYW5zZm9ybTogcm90YXRlKDBkZWcpOyB9XG4gICAgICAgICAgdG8gICB7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IH1cbiAgICAgICAgfVxuICAgICAgICAuZ29sZC1ib3JkZXItd3JhcCB7IHBvc2l0aW9uOnJlbGF0aXZlOyB3aWR0aDo4NiU7IGJvcmRlci1yYWRpdXM6MTRweDsgfVxuICAgICAgICAuZ29sZC1ib3JkZXItcmluZyB7IHBvc2l0aW9uOmFic29sdXRlOyBpbnNldDotMnB4OyBib3JkZXItcmFkaXVzOjE0cHg7IG92ZXJmbG93OmhpZGRlbjsgfVxuICAgICAgICAuZ29sZC1ib3JkZXItc3BpbiB7XG4gICAgICAgICAgcG9zaXRpb246YWJzb2x1dGU7IGluc2V0Oi02MCU7XG4gICAgICAgICAgYmFja2dyb3VuZDogY29uaWMtZ3JhZGllbnQoZnJvbSAwZGVnLCB0cmFuc3BhcmVudCAwZGVnIDI0MGRlZywgI0Y1OUUwQiAyNDBkZWcgMjcwZGVnLCAjRkRFNjhBIDI3MGRlZyAyOTVkZWcsICNGQkJGMjQgMjk1ZGVnIDMyMGRlZywgdHJhbnNwYXJlbnQgMzIwZGVnIDM2MGRlZyk7XG4gICAgICAgICAgYW5pbWF0aW9uOiBnb2xkU3BpbiAxLjZzIGxpbmVhciBpbmZpbml0ZTtcbiAgICAgICAgfVxuICAgICAgICAuZ29sZC1ib3JkZXItYmcgeyBwb3NpdGlvbjphYnNvbHV0ZTsgaW5zZXQ6MnB4OyBib3JkZXItcmFkaXVzOjEycHg7IGJhY2tncm91bmQ6cmdiYSgxMCwxNiwzMCwwLjk3KTsgfVxuICAgICAgICAuZ29sZC1jYXJkLWlubmVyIHsgcG9zaXRpb246cmVsYXRpdmU7IHotaW5kZXg6MjsgcGFkZGluZzoxMHB4IDEycHg7IHRleHQtYWxpZ246Y2VudGVyOyB9XG4gICAgICBgfTwvc3R5bGU+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImdvbGQtYm9yZGVyLXdyYXBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnb2xkLWJvcmRlci1yaW5nXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJnb2xkLWJvcmRlci1zcGluXCIgLz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdvbGQtYm9yZGVyLWJnXCIgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ29sZC1jYXJkLWlubmVyXCI+XG4gICAgICAgICAgPGRpdiBzdHlsZT17eyBkaXNwbGF5OiAnZmxleCcsIGFsaWduSXRlbXM6ICdjZW50ZXInLCBqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsIGdhcDogJzVweCcsIG1hcmdpbkJvdHRvbTogJzVweCcgfX0+XG4gICAgICAgICAgICA8U2hpZWxkIHNpemU9ezExfSBjb2xvcj1cIiNGNTlFMEJcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICAgICAgPHNwYW4gc3R5bGU9e3sgY29sb3I6ICcjRkNEMzREJywgZm9udFNpemU6ICc5cHgnLCBmb250V2VpZ2h0OiA4MDAsIGxldHRlclNwYWNpbmc6ICcwLjA0ZW0nIH19PlZMVUUg7J247Kad6riw6rSAPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgY29sb3I6ICcjZmZmJywgZm9udFdlaWdodDogOTAwLCBmb250U2l6ZTogJzEycHgnLCBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScsIG1hcmdpbkJvdHRvbTogJzJweCcgfX0+e29yZ05hbWV9PC9kaXY+XG4gICAgICAgICAgPGRpdiBzdHlsZT17eyBjb2xvcjogJ3JnYmEoMjU1LDI1NSwyNTUsMC40NSknLCBmb250U2l6ZTogJzlweCcgfX0+e2RlcHR9PC9kaXY+XG4gICAgICAgICAgPGRpdiBzdHlsZT17eyBkaXNwbGF5OiAnZmxleCcsIGFsaWduSXRlbXM6ICdjZW50ZXInLCBqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsIGdhcDogJzRweCcsIG1hcmdpblRvcDogJzRweCcgfX0+XG4gICAgICAgICAgICA8Q2hlY2tDaXJjbGUgc2l6ZT17OX0gY29sb3I9XCIjRjU5RTBCXCIgLz5cbiAgICAgICAgICAgIDxzcGFuIHN0eWxlPXt7IGNvbG9yOiAnI0ZDRDM0RCcsIGZvbnRTaXplOiAnOHB4JywgZm9udFdlaWdodDogNzAwIH19PuyKpO2DoOuLpOuTnCDsnbjspp08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFByZW1pdW1DYXJkUG9wdXAoeyBvcmdOYW1lLCBkZXB0IH06IHsgb3JnTmFtZTogc3RyaW5nOyBkZXB0OiBzdHJpbmcgfSkge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8c3R5bGU+e2BcbiAgICAgICAgQGtleWZyYW1lcyBob2xvU3BpbiB7XG4gICAgICAgICAgZnJvbSB7IHRyYW5zZm9ybTogcm90YXRlKDBkZWcpOyB9XG4gICAgICAgICAgdG8gICB7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IH1cbiAgICAgICAgfVxuICAgICAgICBAa2V5ZnJhbWVzIGhvbG9UZXh0IHtcbiAgICAgICAgICAwJSAgIHsgYmFja2dyb3VuZC1wb3NpdGlvbjogLTIwMCUgY2VudGVyOyB9XG4gICAgICAgICAgMTAwJSB7IGJhY2tncm91bmQtcG9zaXRpb246IDIwMCUgY2VudGVyOyB9XG4gICAgICAgIH1cbiAgICAgICAgLmhvbG8tYm9yZGVyLXdyYXAgeyBwb3NpdGlvbjpyZWxhdGl2ZTsgd2lkdGg6ODYlOyBib3JkZXItcmFkaXVzOjE0cHg7IH1cbiAgICAgICAgLmhvbG8tYm9yZGVyLXJpbmcgeyBwb3NpdGlvbjphYnNvbHV0ZTsgaW5zZXQ6LTIuNXB4OyBib3JkZXItcmFkaXVzOjE1cHg7IG92ZXJmbG93OmhpZGRlbjsgfVxuICAgICAgICAuaG9sby1ib3JkZXItc3BpbiB7XG4gICAgICAgICAgcG9zaXRpb246YWJzb2x1dGU7IGluc2V0Oi02MCU7XG4gICAgICAgICAgYmFja2dyb3VuZDogY29uaWMtZ3JhZGllbnQoZnJvbSAwZGVnLCAjRkYwMDgwLCNGRjZCMDAsI0ZGRDcwMCwjMDBGRjg4LCMwMEJGRkYsIzdDM0FFRCwjRkYwMDgwKTtcbiAgICAgICAgICBhbmltYXRpb246IGhvbG9TcGluIDIuNHMgbGluZWFyIGluZmluaXRlO1xuICAgICAgICB9XG4gICAgICAgIC5ob2xvLWJvcmRlci1iZyB7IHBvc2l0aW9uOmFic29sdXRlOyBpbnNldDoyLjVweDsgYm9yZGVyLXJhZGl1czoxMnB4OyBiYWNrZ3JvdW5kOnJnYmEoNiwxMCwyMiwwLjk4KTsgfVxuICAgICAgICAuaG9sby1jYXJkLWlubmVyMiB7IHBvc2l0aW9uOnJlbGF0aXZlOyB6LWluZGV4OjI7IHBhZGRpbmc6MTBweCAxMnB4OyB0ZXh0LWFsaWduOmNlbnRlcjsgfVxuICAgICAgICAuaG9sby1sYWJlbCB7XG4gICAgICAgICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDkwZGVnLCNGRjAwODAsI0ZGNkIwMCwjRkZENzAwLCMwMEZGODgsIzAwQkZGRiwjRkYwMDgwKTtcbiAgICAgICAgICBiYWNrZ3JvdW5kLXNpemU6MjAwJSBhdXRvO1xuICAgICAgICAgIC13ZWJraXQtYmFja2dyb3VuZC1jbGlwOnRleHQ7XG4gICAgICAgICAgLXdlYmtpdC10ZXh0LWZpbGwtY29sb3I6dHJhbnNwYXJlbnQ7XG4gICAgICAgICAgYmFja2dyb3VuZC1jbGlwOnRleHQ7XG4gICAgICAgICAgYW5pbWF0aW9uOiBob2xvVGV4dCAyLjRzIGxpbmVhciBpbmZpbml0ZTtcbiAgICAgICAgICBmb250LXNpemU6OXB4OyBmb250LXdlaWdodDo5MDA7IGxldHRlci1zcGFjaW5nOjAuMDRlbTtcbiAgICAgICAgfVxuICAgICAgICAuaG9sby1iYWRnZSB7XG4gICAgICAgICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDkwZGVnLCNGRjAwODAsI0ZGRDcwMCwjMDBCRkZGLCNGRjAwODApO1xuICAgICAgICAgIGJhY2tncm91bmQtc2l6ZToyMDAlIGF1dG87XG4gICAgICAgICAgLXdlYmtpdC1iYWNrZ3JvdW5kLWNsaXA6dGV4dDtcbiAgICAgICAgICAtd2Via2l0LXRleHQtZmlsbC1jb2xvcjp0cmFuc3BhcmVudDtcbiAgICAgICAgICBiYWNrZ3JvdW5kLWNsaXA6dGV4dDtcbiAgICAgICAgICBhbmltYXRpb246IGhvbG9UZXh0IDIuNHMgbGluZWFyIGluZmluaXRlO1xuICAgICAgICAgIGZvbnQtc2l6ZTo4cHg7IGZvbnQtd2VpZ2h0OjcwMDtcbiAgICAgICAgfVxuICAgICAgYH08L3N0eWxlPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJob2xvLWJvcmRlci13cmFwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaG9sby1ib3JkZXItcmluZ1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaG9sby1ib3JkZXItc3BpblwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJob2xvLWJvcmRlci1iZ1wiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImhvbG8tY2FyZC1pbm5lcjJcIj5cbiAgICAgICAgICA8ZGl2IHN0eWxlPXt7IGRpc3BsYXk6ICdmbGV4JywgYWxpZ25JdGVtczogJ2NlbnRlcicsIGp1c3RpZnlDb250ZW50OiAnY2VudGVyJywgZ2FwOiAnNXB4JywgbWFyZ2luQm90dG9tOiAnNXB4JyB9fT5cbiAgICAgICAgICAgIDxTaGllbGQgc2l6ZT17MTF9IGNvbG9yPVwiIzIyRDNFRVwiIHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJob2xvLWxhYmVsXCI+VkxVRSDtlITrpqzrr7jsl4Q8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBzdHlsZT17eyBjb2xvcjogJyNmZmYnLCBmb250V2VpZ2h0OiA5MDAsIGZvbnRTaXplOiAnMTJweCcsIGxldHRlclNwYWNpbmc6ICctMC4wMmVtJywgbWFyZ2luQm90dG9tOiAnMnB4JyB9fT57b3JnTmFtZX08L2Rpdj5cbiAgICAgICAgICA8ZGl2IHN0eWxlPXt7IGNvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwwLjQ1KScsIGZvbnRTaXplOiAnOXB4JyB9fT57ZGVwdH08L2Rpdj5cbiAgICAgICAgICA8ZGl2IHN0eWxlPXt7IGRpc3BsYXk6ICdmbGV4JywgYWxpZ25JdGVtczogJ2NlbnRlcicsIGp1c3RpZnlDb250ZW50OiAnY2VudGVyJywgZ2FwOiAnNHB4JywgbWFyZ2luVG9wOiAnNHB4JyB9fT5cbiAgICAgICAgICAgIDxDaGVja0NpcmNsZSBzaXplPXs5fSBjb2xvcj1cIiMyMkQzRUVcIiAvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaG9sby1iYWRnZVwiPu2ZgOuhnOq3uOueqCDsnbjspp08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIExldHRlcmluZ0NhbGxTY3JlZW4oeyBtb2RlIH06IHsgbW9kZTogJ2JlZm9yZScgfCAnYWZ0ZXInIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBzdHlsZT17e1xuICAgICAgICB3aWR0aDogJzE4MHB4JyxcbiAgICAgICAgaGVpZ2h0OiAnMzgwcHgnLFxuICAgICAgICBmbGV4U2hyaW5rOiAwLFxuICAgICAgICBiYWNrZ3JvdW5kOiBtb2RlID09PSAnYmVmb3JlJ1xuICAgICAgICAgID8gJ2xpbmVhci1ncmFkaWVudCgxODBkZWcsIzFBMTEyMCAwJSwjMEYwQTE4IDEwMCUpJ1xuICAgICAgICAgIDogJ2xpbmVhci1ncmFkaWVudCgxODBkZWcsIzBDMTUyMCAwJSwjMEExMDE4IDEwMCUpJyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnMi4ycmVtJyxcbiAgICAgICAgYm94U2hhZG93OiBtb2RlID09PSAnYmVmb3JlJ1xuICAgICAgICAgID8gJzAgMjBweCA2MHB4IHJnYmEoMCwwLDAsMC44KSdcbiAgICAgICAgICA6ICcwIDIwcHggNjBweCByZ2JhKDQ5LDEzMCwyNDYsMC4yKScsXG4gICAgICAgIGJvcmRlcjogbW9kZSA9PT0gJ2JlZm9yZSdcbiAgICAgICAgICA/ICcycHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjA3KSdcbiAgICAgICAgICA6ICcycHggc29saWQgcmdiYSg0OSwxMzAsMjQ2LDAuMyknLFxuICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcbiAgICAgICAgb3ZlcmZsb3c6ICdoaWRkZW4nLFxuICAgICAgfX1cbiAgICA+XG4gICAgICA8ZGl2IHN0eWxlPXt7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLCB0b3A6IDAsIGxlZnQ6ICc1MCUnLCB0cmFuc2Zvcm06ICd0cmFuc2xhdGVYKC01MCUpJyxcbiAgICAgICAgd2lkdGg6ICc2MHB4JywgaGVpZ2h0OiAnMThweCcsIGJhY2tncm91bmQ6ICcjMDAwJywgYm9yZGVyUmFkaXVzOiAnMCAwIDEycHggMTJweCcsIHpJbmRleDogMjAsXG4gICAgICB9fSAvPlxuXG4gICAgICA8ZGl2IHN0eWxlPXt7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLCBpbnNldDogMCwgZGlzcGxheTogJ2ZsZXgnLCBmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcbiAgICAgICAgYWxpZ25JdGVtczogJ2NlbnRlcicsIGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYmV0d2VlbicsXG4gICAgICAgIHBhZGRpbmc6ICczMHB4IDE0cHggMjJweCcsIHpJbmRleDogMTAsXG4gICAgICB9fT5cbiAgICAgICAgPGRpdiBzdHlsZT17eyB0ZXh0QWxpZ246ICdjZW50ZXInIH19PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgY29sb3I6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMyknLCBmb250U2l6ZTogJzlweCcsIGxldHRlclNwYWNpbmc6ICcwLjFlbScsIGZvbnRXZWlnaHQ6IDYwMCB9fT7siJjsi6Ag7KCE7ZmUPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICcxMDAlJywgZGlzcGxheTogJ2ZsZXgnLCBmbGV4RGlyZWN0aW9uOiAnY29sdW1uJywgYWxpZ25JdGVtczogJ2NlbnRlcicsIGdhcDogJzEwcHgnIH19PlxuICAgICAgICAgIHttb2RlID09PSAnYmVmb3JlJyA/IChcbiAgICAgICAgICAgIDxkaXYgc3R5bGU9e3tcbiAgICAgICAgICAgICAgd2lkdGg6ICc4OCUnLCBiYWNrZ3JvdW5kOiAncmdiYSgyMzksNjgsNjgsMC4xMiknLFxuICAgICAgICAgICAgICBib3JkZXI6ICcxLjVweCBzb2xpZCByZ2JhKDIzOSw2OCw2OCwwLjQpJyxcbiAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAnMTJweCcsIHBhZGRpbmc6ICcxMHB4IDEwcHgnLCB0ZXh0QWxpZ246ICdjZW50ZXInLFxuICAgICAgICAgICAgfX0+XG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLCBnYXA6ICc1cHgnLCBtYXJnaW5Cb3R0b206ICc1cHgnIH19PlxuICAgICAgICAgICAgICAgIDxBbGVydFRyaWFuZ2xlIHNpemU9ezExfSBjb2xvcj1cIiNGODcxNzFcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPXt7IGNvbG9yOiAnI0Y4NzE3MScsIGZvbnRTaXplOiAnMTBweCcsIGZvbnRXZWlnaHQ6IDgwMCB9fT7siqTtjLgg7KO87J2YPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBjb2xvcjogJ3JnYmEoMjU1LDI1NSwyNTUsMC41NSknLCBmb250U2l6ZTogJzExcHgnLCBmb250RmFtaWx5OiAnbW9ub3NwYWNlJyB9fT4xNTg4LTk5OTk8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBjb2xvcjogJ3JnYmEoMjU1LDI1NSwyNTUsMC4yNSknLCBmb250U2l6ZTogJzlweCcsIG1hcmdpblRvcDogJzJweCcgfX0+7JWMIOyImCDsl4bripQg67KI7Zi4PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogKFxuICAgICAgICAgICAgPGRpdiBzdHlsZT17e1xuICAgICAgICAgICAgICB3aWR0aDogJzg4JScsIGJhY2tncm91bmQ6ICdyZ2JhKDQ5LDEzMCwyNDYsMC4xMiknLFxuICAgICAgICAgICAgICBib3JkZXI6ICcxLjVweCBzb2xpZCByZ2JhKDQ5LDEzMCwyNDYsMC41KScsXG4gICAgICAgICAgICAgIGJvcmRlclJhZGl1czogJzEycHgnLCBwYWRkaW5nOiAnMTBweCAxMHB4JywgdGV4dEFsaWduOiAnY2VudGVyJyxcbiAgICAgICAgICAgICAgYmFja2Ryb3BGaWx0ZXI6ICdibHVyKDhweCknLFxuICAgICAgICAgICAgfX0+XG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLCBnYXA6ICc1cHgnLCBtYXJnaW5Cb3R0b206ICc1cHgnIH19PlxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICcxNHB4JywgaGVpZ2h0OiAnMTRweCcsIGJvcmRlclJhZGl1czogJzUwJScsIGJhY2tncm91bmQ6ICcjM0I4MkY2JywgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInIH19PlxuICAgICAgICAgICAgICAgICAgPFNoaWVsZCBzaXplPXs5fSBjb2xvcj1cIndoaXRlXCIgc3Ryb2tlV2lkdGg9ezIuNX0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8c3BhbiBzdHlsZT17eyBjb2xvcjogJyM5M0M1RkQnLCBmb250U2l6ZTogJzlweCcsIGZvbnRXZWlnaHQ6IDkwMCwgbGV0dGVyU3BhY2luZzogJzAuMDJlbScgfX0+W1ZMVUUg7J247Kad6riw6rSAXTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgY29sb3I6ICcjZmZmJywgZm9udFdlaWdodDogOTAwLCBmb250U2l6ZTogJzEzcHgnLCBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScgfX0+6rWt66+87J2A7ZaJPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgY29sb3I6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNCknLCBmb250U2l6ZTogJzlweCcsIGZvbnRGYW1pbHk6ICdtb25vc3BhY2UnLCBtYXJnaW5Ub3A6ICcycHgnIH19PjE1ODgtOTk5OTwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cblxuICAgICAgICAgIDxkaXYgc3R5bGU9e3tcbiAgICAgICAgICAgIHdpZHRoOiAnNDhweCcsIGhlaWdodDogJzQ4cHgnLCBib3JkZXJSYWRpdXM6ICc1MCUnLFxuICAgICAgICAgICAgYmFja2dyb3VuZDogbW9kZSA9PT0gJ2JlZm9yZScgPyAncmdiYSgyNTUsMjU1LDI1NSwwLjA3KScgOiAncmdiYSg1OSwxMzAsMjQ2LDAuMTgpJyxcbiAgICAgICAgICAgIGJvcmRlcjogbW9kZSA9PT0gJ2JlZm9yZScgPyAnMS41cHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjEyKScgOiAnMnB4IHNvbGlkIHJnYmEoNTksMTMwLDI0NiwwLjUpJyxcbiAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JywgYWxpZ25JdGVtczogJ2NlbnRlcicsIGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcbiAgICAgICAgICB9fT5cbiAgICAgICAgICAgIHttb2RlID09PSAnYmVmb3JlJ1xuICAgICAgICAgICAgICA/IDxzcGFuIHN0eWxlPXt7IGNvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwwLjMpJywgZm9udFNpemU6ICcyMHB4JywgbGluZUhlaWdodDogMSB9fT4/PC9zcGFuPlxuICAgICAgICAgICAgICA6IDxTaGllbGQgc2l6ZT17MjB9IGNvbG9yPVwiIzYwQTVGQVwiIHN0cm9rZVdpZHRoPXsyfSAvPlxuICAgICAgICAgICAgfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IHN0eWxlPXt7IHdpZHRoOiAnMTAwJScsIGRpc3BsYXk6ICdmbGV4JywganVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnIH19PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3sgd2lkdGg6ICc0NHB4JywgaGVpZ2h0OiAnNDRweCcsIGJvcmRlclJhZGl1czogJzUwJScsIGJhY2tncm91bmQ6ICcjRUY0NDQ0JywgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJywganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLCBib3hTaGFkb3c6ICcwIDRweCAxMnB4IHJnYmEoMjM5LDY4LDY4LDAuNCknIH19PlxuICAgICAgICAgICAgPFggc2l6ZT17MTh9IGNvbG9yPVwid2hpdGVcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgc3R5bGU9e3tcbiAgICAgICAgICAgIHdpZHRoOiAnNDRweCcsIGhlaWdodDogJzQ0cHgnLCBib3JkZXJSYWRpdXM6ICc1MCUnLFxuICAgICAgICAgICAgYmFja2dyb3VuZDogbW9kZSA9PT0gJ2JlZm9yZScgPyAnIzRCNTU2MycgOiAnIzEwQjk4MScsXG4gICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsIGFsaWduSXRlbXM6ICdjZW50ZXInLCBqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG4gICAgICAgICAgICBib3hTaGFkb3c6IG1vZGUgPT09ICdhZnRlcicgPyAnMCA0cHggMTJweCByZ2JhKDE2LDE4NSwxMjksMC40NSknIDogJ25vbmUnLFxuICAgICAgICAgIH19PlxuICAgICAgICAgICAgPFBob25lIHNpemU9ezE4fSBjb2xvcj17bW9kZSA9PT0gJ2JlZm9yZScgPyAncmdiYSgyNTUsMjU1LDI1NSwwLjQpJyA6ICd3aGl0ZSd9IHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFByaWNpbmdQYWdlKHsgdXNlciwgb25Mb2dpbkNsaWNrIH06IFByaWNpbmdQYWdlUHJvcHMpIHtcbiAgY29uc3QgW2FjdGl2ZUdyYWRlLCBzZXRBY3RpdmVHcmFkZV0gPSB1c2VTdGF0ZTxEZXZpY2VHcmFkZT4oJ3N0YW5kYXJkJyk7XG5cbiAgcmV0dXJuIChcbiAgICA8bWFpbiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctZ3JheS01MCBwdC0xNlwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSBib3JkZXItYiBib3JkZXItZ3JheS0xMDBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS0xMiB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMS41IG1iLTQgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTIwMCB0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPlxuICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICDsnbjspp3si6Dssq0o7JqU6riI7KCcKVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBzbTp0ZXh0LTR4bCBmb250LWJsYWNrIHRleHQtZ3JheS05MDAgbWItM1wiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMzVlbScgfX0+64KY7JeQ6rKMIOunnuuKlCDsnbjspp0g65Ox6riJIOyEoO2DnTwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LWJhc2UgbWF4LXctbGcgbXgtYXV0byBsZWFkaW5nLXJlbGF4ZWRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICDrqqjrk6Ag7ISc67mE7Iqk64qUIOuhnOq3uOyduCDtm4Qg7J207JqpIOqwgOuKpe2VqeuLiOuLpC48YnIgLz5cbiAgICAgICAgICAgIOq4sOq0gCDqt5zrqqjsmYAg7ZWE7JqU7JeQIOunnuuKlCDsmpTquIjsoJzrpbwg7ISg7YOd7ZWY7IS47JqULlxuICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS0xMlwiPlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMyBnYXAtNiBtYi0xNlwiPlxuICAgICAgICAgIHtwcmljaW5nVGllcnMubWFwKCh0aWVyLCBpZHgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IEljb24gPSBUSUVSX0lDT05TW2lkeF07XG4gICAgICAgICAgICBjb25zdCBjb2xvcnMgPSBUSUVSX0NPTE9SU1t0aWVyLmNvbG9yIGFzIGtleW9mIHR5cGVvZiBUSUVSX0NPTE9SU10gPz8gVElFUl9DT0xPUlMuZ3JheTtcbiAgICAgICAgICAgIGNvbnN0IGlzQmx1ZSA9IHRpZXIuY29sb3IgPT09ICdibHVlJztcbiAgICAgICAgICAgIGNvbnN0IGlzR29sZCA9IHRpZXIuY29sb3IgPT09ICdnb2xkJztcblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgIGtleT17dGllci5pZH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2Byb3VuZGVkLTN4bCBib3JkZXIgb3ZlcmZsb3ctaGlkZGVuIHJlbGF0aXZlIGZsZXggZmxleC1jb2wgc2hhZG93LWNhcmQgJHtjb2xvcnMuYm9yZGVyfSAke2lzQmx1ZSA/ICdzY2FsZS1bMS4wMl0gc2hhZG93LWNhcmQtaG92ZXInIDogJyd9YH1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIHt0aWVyLnJlY29tbWVuZGVkICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTQgcmlnaHQtNCBweC0yLjUgcHktMSBiZy13aGl0ZSByb3VuZGVkLWZ1bGwgdGV4dC1wcmltYXJ5LTYwMCB0ZXh0LXhzIGZvbnQtYmxhY2sgc2hhZG93LXNtIHotMTBcIj5cbiAgICAgICAgICAgICAgICAgICAg7LaU7LKcXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgJHtjb2xvcnMuaGVhZGVyfSBweC02IHB0LTYgcGItOGB9PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC0yLjUgcHktMSByb3VuZGVkLWZ1bGwgdGV4dC14cyBmb250LXNlbWlib2xkIG1iLTMgJHtjb2xvcnMuYmFkZ2V9YH0+XG4gICAgICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAgICAgICAge3RpZXIubmFtZX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BtYi0yICR7aXNCbHVlIHx8IGlzR29sZCA/ICd0ZXh0LXdoaXRlJyA6ICd0ZXh0LWdyYXktOTAwJ31gfT5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1ibGFjayBmb250LWludGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAge3RpZXIucHJpY2UgPT09IDAgPyAn66y066OMJyA6IHRpZXIucHJpY2UudG9Mb2NhbGVTdHJpbmcoKX1cbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICB7dGllci5wcmljZSA+IDAgJiYgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1iYXNlIGZvbnQtbWVkaXVtXCI+7JuQL3t0aWVyLnBlcmlvZH08L3NwYW4+fVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9e2B0ZXh0LXNtICR7aXNCbHVlIHx8IGlzR29sZCA/ICd0ZXh0LXdoaXRlLzcwJyA6ICd0ZXh0LWdyYXktNTAwJ31gfT57dGllci5kZXNjcmlwdGlvbn08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHB4LTYgcHktNiBmbGV4LTEgZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cInNwYWNlLXktMyBtYi02IGZsZXgtMVwiPlxuICAgICAgICAgICAgICAgICAgICB7dGllci5mZWF0dXJlcy5tYXAoKGZlYXR1cmUpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8bGkga2V5PXtmZWF0dXJlfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yLjUgdGV4dC1zbSB0ZXh0LWdyYXktNzAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNjAwIGZsZXgtc2hyaW5rLTAgbXQtMC41XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT57ZmVhdHVyZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGlmICghdXNlciAmJiBvbkxvZ2luQ2xpY2spIG9uTG9naW5DbGljaygpOyB9fVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2B3LWZ1bGwgcHktMi41IHJvdW5kZWQteGwgZm9udC1zZW1pYm9sZCB0ZXh0LXNtIHRyYW5zaXRpb24tY29sb3JzIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjUgJHtcbiAgICAgICAgICAgICAgICAgICAgICBpc0JsdWUgPyAnYnRuLXByaW1hcnknIDogaXNHb2xkXG4gICAgICAgICAgICAgICAgICAgICAgICA/ICdiZy1hbWJlci00MDAgdGV4dC1ncmF5LTkwMCBob3ZlcjpiZy1hbWJlci0zMDAgZm9udC1ib2xkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgOiAnYnRuLXNlY29uZGFyeSdcbiAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHt0aWVyLnByaWNlID09PSAwID8gJ+ustOujjOuhnCDsi5zsnpHtlZjquLAnIDogJ+yduOymnSDsi6Dssq3tlZjquLAnfVxuICAgICAgICAgICAgICAgICAgICA8QXJyb3dSaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItMTZcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtY2VudGVyIG1iLThcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMS41IG1iLTMgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTIwMCB0ZXh0LXByaW1hcnktNzAwIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPlxuICAgICAgICAgICAgICA8UGhvbmUgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICDsi6TsoJwg7IiY7IugIO2ZlOuptCDrr7jrpqzrs7TquLBcbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBtYi0yXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PlxuICAgICAgICAgICAgICDthrXtmZQg7KSRIOuUlOyngO2EuCDrqoXtlagg4oCUIOuTseq4ieuzhCDsi6TrrLwgVUlcbiAgICAgICAgICAgIDwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIHRleHQtc20gbWF4LXcteGwgbXgtYXV0b1wiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAg7Iuk7KCcIEdhbGF4eSDsiJjsi6Ag7ZmU66m0IOychOyXkCDrgpjtg4DrgpjripQg66qF7ZWoIO2MneyXheydhCDrr7jrpqwg7ZmV7J247ZWY7IS47JqULjxiciAvPlxuICAgICAgICAgICAgICDrk7HquInrs4TroZwg7YWM65GQ66asIO2aqOqzvOyZgCDsnbjspp0g66CI7J207Ja06rCAIOuLrOudvOynkeuLiOuLpC5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LXdyYXAgZ2FwLTIganVzdGlmeS1jZW50ZXIgbWItOFwiPlxuICAgICAgICAgICAgeyhbJ2Jhc2ljJywgJ3N0YW5kYXJkJywgJ3ByZW1pdW0nXSBhcyBEZXZpY2VHcmFkZVtdKS5tYXAoKGcpID0+IChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIGtleT17Z31cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVHcmFkZShnKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC01IHB5LTIuNSB0ZXh0LXhzIGZvbnQtYm9sZCByb3VuZGVkLTJ4bCBib3JkZXIgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgIGFjdGl2ZUdyYWRlID09PSBnXG4gICAgICAgICAgICAgICAgICAgID8gZyA9PT0gJ3ByZW1pdW0nXG4gICAgICAgICAgICAgICAgICAgICAgPyAnYmctZ3JheS05MDAgdGV4dC13aGl0ZSBib3JkZXItZ3JheS05MDAgc2hhZG93LW1kJ1xuICAgICAgICAgICAgICAgICAgICAgIDogZyA9PT0gJ3N0YW5kYXJkJ1xuICAgICAgICAgICAgICAgICAgICAgID8gJ2JnLWFtYmVyLTQwMCB0ZXh0LWdyYXktOTAwIGJvcmRlci1hbWJlci00MDAgc2hhZG93LW1kJ1xuICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXByaW1hcnktNTAwIHRleHQtd2hpdGUgYm9yZGVyLXByaW1hcnktNTAwIHNoYWRvdy1tZCdcbiAgICAgICAgICAgICAgICAgICAgOiAnYmctd2hpdGUgdGV4dC1ncmF5LTUwMCBib3JkZXItZ3JheS0yMDAgaG92ZXI6Ym9yZGVyLWdyYXktMzAwJ1xuICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAge2cgPT09ICdiYXNpYycgPyAn6riw67O47ZiVICjsl7DruJTro6gpJyA6IGcgPT09ICdzdGFuZGFyZCcgPyAn7Iqk7YOg64uk65OcICjqs6jrk5wpJyA6ICftlITrpqzrr7jsl4QgKO2ZgOuhnOq3uOueqCknfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ncmFkaWVudC10by1iciBmcm9tLWdyYXktOTAwIHRvLWdyYXktODAwIHJvdW5kZWQtM3hsIHAtOCBsZzpwLTEyXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgbGc6ZmxleC1yb3cgaXRlbXMtY2VudGVyIGdhcC0xMCBsZzpnYXAtMTZcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICA8R2FsYXh5Q2FsbFNjcmVlbiBncmFkZT17YWN0aXZlR3JhZGV9IC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIHRleHQtd2hpdGUgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgIHthY3RpdmVHcmFkZSA9PT0gJ2Jhc2ljJyAmJiAoXG4gICAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIG1iLTRcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLXhsIGJnLXByaW1hcnktNTAwLzIwIGJvcmRlciBib3JkZXItcHJpbWFyeS01MDAvNDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtcHJpbWFyeS00MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdGV4dC14bFwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMmVtJyB9fT7quLDrs7jtmJUg4oCUIOyXsOu4lOujqCDthYzrkZDrpqw8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzYwIHRleHQtc20gbWItNSBsZWFkaW5nLXJlbGF4ZWRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAgICAgICAg7Iuk7KCcIEdhbGF4eSDsiJjsi6Ag7ZmU66m0IOychOyXkCA8c3Ryb25nIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS0zMDBcIj7sl7DtlZwg7YyM656A7IOJIO2FjOuRkOumrDwvc3Ryb25nPuqwgCDsoIHsmqnrkJwg66qF7ZWoIO2MneyXheydtCDsmKTrsoTroIjsnbTrkKnri4jri6QuIFZMVUUg7J247KadIOuniO2BrOyZgCDquLDqtIDrqoXsnbQg7KaJ7IucIO2RnOyLnOuQmOyWtCDsiJjsi6DsnpDqsIAg7JWI7Ius7ZWY6rOgIO2Gte2ZlO2VoCDsiJgg7J6I7Iq164uI64ukLlxuICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC00IGJnLXdoaXRlLzUgcm91bmRlZC0yeGxcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMi41IGgtMi41IHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTQwMCBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQtc21cIj7sl7DruJTro6gg67O0642UIMK3IFZMVUUg7J247KadIOuniO2BrCDCtyDquLDqtIDrqoUg67CPIOu2gOyEnOuqhSDtkZzsi5w8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7YWN0aXZlR3JhZGUgPT09ICdzdGFuZGFyZCcgJiYgKFxuICAgICAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi00XCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgcm91bmRlZC14bCBiZy1hbWJlci01MDAvMjAgYm9yZGVyIGJvcmRlci1hbWJlci01MDAvNDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFN0YXIgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LWFtYmVyLTQwMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LXhsXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19PuyKpO2DoOuLpOuTnCDigJQg6rOo65OcIOyVoOuLiOuplOydtOyFmDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC1zbSBtYi01IGxlYWRpbmctcmVsYXhlZFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAgICAgICAgICDsiJjsi6Ag7ZmU66m0IOychOyXkCDtjJ3sl4XrkJjripQg66qF7ZWo7J2YIO2FjOuRkOumrOulvCA8c3Ryb25nIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwXCI+6riI67mbIOu5m+ydtCDtmozsoIQ8L3N0cm9uZz7tlZjrqbAg7Z2Q66aF64uI64ukLiDqs6DquInsiqTrn6zsmrQg7LKr7J247IOB7Jy866GcIOq4sOq0gOydmCDsi6DrorDrj4Trpbwg64aS7J6F64uI64ukLlxuICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC00IGJnLXdoaXRlLzUgcm91bmRlZC0yeGxcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMi41IGgtMi41IHJvdW5kZWQtZnVsbCBiZy1hbWJlci00MDAgZmxleC1zaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXNtXCI+7ZqM7KCEIOqzqOuTnCDruZsg7YWM65GQ66asIMK3IOyduOymnSDrk7HquIkg67Cw7KeAIMK3IOyKpO2DoOuLpOuTnCDsnbTsg4Eg7KCc6rO1PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAge2FjdGl2ZUdyYWRlID09PSAncHJlbWl1bScgJiYgKFxuICAgICAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi00XCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgcm91bmRlZC14bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6ICdyZ2JhKDM0LDIxMSwyMzgsMC4xNSknLCBib3JkZXI6ICcxcHggc29saWQgcmdiYSgzNCwyMTEsMjM4LDAuNCknIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFNwYXJrbGVzIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1jeWFuLTMwMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LXhsXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19Pu2UhOumrOuvuOyXhCDigJQg7ZmA66Gc6re4656oIO2aqOqzvDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNjAgdGV4dC1zbSBtYi01IGxlYWRpbmctcmVsYXhlZFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAgICAgICAgICDrqoXtlagg7Yyd7JeFIO2FjOuRkOumrOyXkCA8c3Ryb25nIGNsYXNzTmFtZT1cInRleHQtY3lhbi0zMDBcIj7rrLTsp4DqsJzruZsg7ZmA66Gc6re4656oPC9zdHJvbmc+7J20IO2ajOyghO2VmOupsCDrsJjsgqzrkKnri4jri6QuIO2FjeyKpO2KuOq5jOyngCDtmYDroZzqt7jrnqgg6re4652865SU7Ja47Yq466GcIO2RnO2YhOuQmOuKlCDstZzqs6DquIkg65SU7J6Q7J247J6F64uI64ukLlxuICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC00IGJnLXdoaXRlLzUgcm91bmRlZC0yeGxcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMi41IGgtMi41IHJvdW5kZWQtZnVsbCBiZy1jeWFuLTQwMCBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQtc21cIj7rrLTsp4DqsJwg7ZmA66Gc6re4656oIOuztOuNlCDCtyDthY3siqTtirgg6re4652865SU7Ja47Yq4IMK3IO2UhOumrOuvuOyXhCDsoITsmqk8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi0xNlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXIgbWItOFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtMyBweS0xLjUgbWItMyByb3VuZGVkLWZ1bGwgYmctYW1iZXItNTAgYm9yZGVyIGJvcmRlci1hbWJlci0yMDAgdGV4dC1hbWJlci03MDAgdGV4dC14cyBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICAgIDxDcmVkaXRDYXJkIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAg66CI7YSw66eBIOyEnOu5hOyKpFxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1ibGFjayB0ZXh0LWdyYXktOTAwIG1iLTJcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDNlbScgfX0+XG4gICAgICAgICAgICAgIOyImOyLoCDtmZTrqbTsnbQg64us65287KeR64uI64ukIOKAlCBCZWZvcmUgLyBBZnRlclxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1zbSBtYXgtdy1sZyBteC1hdXRvXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICBWTFVFIOugiO2EsOungSDsoIHsmqkg7KCE6rO8IO2bhOulvCDsp4HsoJEg67mE6rWQ7ZWY7IS47JqULjxiciAvPlxuICAgICAgICAgICAgICDsiqTtjLgg6rK96rOgIOuMgOyLoCA8c3Ryb25nPlZMVUUg7Im065OcIOyVhOydtOy9mDwvc3Ryb25nPuqzvCA8c3Ryb25nPltWTFVFIOyduOymneq4sOq0gF08L3N0cm9uZz4g7Yyd7JeF7J20IO2RnOyLnOuQqeuLiOuLpC5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1ncmF5LTkwMCB2aWEtZ3JheS04NTAgdG8tZ3JheS04MDAgcm91bmRlZC0zeGwgcC04IGxnOnAtMTJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTggbGc6Z2FwLTE2XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTRcIj5cbiAgICAgICAgICAgICAgICA8TGV0dGVyaW5nQ2FsbFNjcmVlbiBtb2RlPVwiYmVmb3JlXCIgLz5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJpbmxpbmUtYmxvY2sgcHgtNCBweS0xLjUgYmctcmVkLTUwMC8yMCBib3JkZXIgYm9yZGVyLXJlZC01MDAvNDAgdGV4dC1yZWQtNDAwIHRleHQteHMgZm9udC1ibGFjayByb3VuZGVkLWZ1bGxcIj5CRUZPUkU8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzQwIHRleHQteHMgbXQtMS41XCI+7J247KadIOyXhuuKlCDsnbzrsJgg7IiY7IugPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtd2hpdGUvMzBcIj5cbiAgICAgICAgICAgICAgICA8QXJyb3dSaWdodCBjbGFzc05hbWU9XCJ3LTggaC04XCIgLz5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGRcIj5WTFVFIOyggeyaqTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICAgICAgIDxMZXR0ZXJpbmdDYWxsU2NyZWVuIG1vZGU9XCJhZnRlclwiIC8+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWJsb2NrIHB4LTQgcHktMS41IGJnLXByaW1hcnktNTAwLzIwIGJvcmRlciBib3JkZXItcHJpbWFyeS01MDAvNDAgdGV4dC1wcmltYXJ5LTMwMCB0ZXh0LXhzIGZvbnQtYmxhY2sgcm91bmRlZC1mdWxsXCI+QUZURVI8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzQwIHRleHQteHMgbXQtMS41XCI+VkxVRSDsnbjspp0g7IiY7IugIO2ZlOuptDwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xMCBtYXgtdy0yeGwgbXgtYXV0byBiZy13aGl0ZS81IHJvdW5kZWQtMnhsIHAtNVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOCBoLTggcm91bmRlZC14bCBiZy1wcmltYXJ5LTUwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ib2xkIHRleHQtc20gbWItMS41XCI+66CI7YSw66eBIOyEnOu5hOyKpCDrj5nsnpEg67Cp7IudPC9wPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS81NSB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAgICAgICAgVkxVReyXkCDrk7HroZ3rkJwg7J247Kad6riw6rSAIOuwnOyLoOuyiO2YuOqwgCDsiJjsi6DrkKAg65WMLCDsiJjsi6Ag7ZmU66m0IOychOyXkCDtkbjrpbjsg4kgVkxVRSDsibTrk5wg7JWE7J207L2Y6rO8XG4gICAgICAgICAgICAgICAgICAgIDxzdHJvbmcgY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTMwMFwiPiBbVkxVRSDsnbjspp3quLDqtIBdPC9zdHJvbmc+IOuzvOuTnCDthY3siqTtirjqsIAg64u06ri0IO2MneyXheydtCDsnpDrj5nsnLzroZwg7Jik67KE66CI7J2065Cp64uI64ukLlxuICAgICAgICAgICAgICAgICAgICDsiqTtjLgg642w7J207YSw67Kg7J207Iqk7JeQIOyXhuuKlCDrsojtmLjrj4QgVkxVRSDsnbjspp0g7Jes67aA66W8IOymieyLnCDtmZXsnbjtlaAg7IiYIOyeiOyKteuLiOuLpC5cbiAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMyBmbGV4IGZsZXgtd3JhcCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgICB7WyfsiqTtg6Dri6Trk5wg7J207IOBIO2PrO2VqCcsICfsi6Tsi5zqsIQg7J247KadIOuMgOyhsCcsICfthrXsi6Dsgqwg66y06rSAIOyggeyaqScsICfsgqzsua0g7JuQ7LKcIOywqOuLqCddLm1hcCgodGFnKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4ga2V5PXt0YWd9IGNsYXNzTmFtZT1cInB4LTIuNSBweS0xIGJnLXByaW1hcnktNTAwLzE1IGJvcmRlciBib3JkZXItcHJpbWFyeS01MDAvMzAgdGV4dC1wcmltYXJ5LTMwMCByb3VuZGVkLWZ1bGwgdGV4dC14cyBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7dGFnfVxuICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ncmFkaWVudC10by1yIGZyb20tZ3JheS05MDAgdG8tZ3JheS04MDAgcm91bmRlZC0zeGwgcC02IHNtOnAtOCBtYi0xMFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBsZzpmbGV4LXJvdyBpdGVtcy1zdGFydCBsZzppdGVtcy1jZW50ZXIgZ2FwLTZcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNSBtYi0zXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IHJvdW5kZWQteGwgYmctd2hpdGUvMTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgIDxCdWlsZGluZzIgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ib2xkIHRleHQtbGdcIj5CMkIg6riw7JeFIOunnuy2pCDsmpTquIjsoJw8L2gzPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS82MCB0ZXh0LXhzXCI+NTDsnbgg7J207IOBIOq4sOyXhSDrjIDrn4kg6rCA7J6FIMK3IOuzhOuPhCDtmJHsnZg8L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQtc20gbGVhZGluZy1yZWxheGVkIG1iLTRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAg7J6E7KeB7JuQIOyghOyytCBWTFVFIOyduOymnSwg7KCE7JqpIEFQSSwg67O07JWIIOq1kOycoSDtjKjtgqTsp4AsIOyghOuLtCDrs7TslYgg66ek64uI7KCAIOuwsOyglSDrk7Eg6riw7JeFIOunnuy2pO2YlSDshpTro6jshZjsnYQg7KCc6rO17ZWp64uI64ukLlxuICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAge1sn64yA65+JIOyehOyngeybkCDsnbjspp0nLCAn7KCE7JqpIOq0gOumrCDsvZjshpQnLCAn7Luk7Iqk7YWAIEFQSSDsl7Drj5knLCAn7JuU6rCEIOuztOyViCDrpqztj6ztirgnXS5tYXAoKGYpID0+IChcbiAgICAgICAgICAgICAgICAgIDxsaSBrZXk9e2Z9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgdGV4dC14cyB0ZXh0LXdoaXRlLzgwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxTcGFya2xlcyBjbGFzc05hbWU9XCJ3LTMgaC0zIHRleHQtYW1iZXItNDAwIGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICB7Zn1cbiAgICAgICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4geyBpZiAoIXVzZXIgJiYgb25Mb2dpbkNsaWNrKSBvbkxvZ2luQ2xpY2soKTsgfX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC02IHB5LTMgYmctYW1iZXItNDAwIGhvdmVyOmJnLWFtYmVyLTMwMCB0ZXh0LWdyYXktOTAwIGZvbnQtYm9sZCB0ZXh0LXNtIHJvdW5kZWQtMnhsIHRyYW5zaXRpb24tYWxsIHdoaXRlc3BhY2Utbm93cmFwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxCdWlsZGluZzIgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgQjJCIOq4sOyXhSDsg4Hri7Qg7Iug7LKtXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCByb3VuZGVkLTN4bCBwLTYgc206cC04XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yLjUgbWF4LXctMnhsIG14LWF1dG9cIj5cbiAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNjAwIG10LTAuNSBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS02MDAgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgIDxzdHJvbmcgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTgwMFwiPuuztOyViCDslYjrgrTrrLjqtawg7J6Q64+ZIO2RnOyLnDo8L3N0cm9uZz4g66qo65OgIOuUlOyngO2EuCDrqoXtlagg7ZWY64uo7JeQICZsZHF1bzvrs7gg66qF7ZWo7J2AIFZMVUUg7J247KadIO2ajOybkOyehOydhCDspp3rqoXtlanri4jri6QuIOyduOymneuQnCDsg4Htg5wg7KSRIOyWtOuWoO2VnCDqsr3smrDsl5Drj4Qg7Jyg7ISg7IOBIOyGoeq4iOydtOuCmCDqsJzsnbjsoJXrs7Trpbwg7JqU6rWs7ZWY7KeAIOyViuycvOuLiCDsgqzsua3sl5Ag7KO87J2Y7ZWY7Iut7Iuc7JikLiZyZHF1bzsg66y46rWs6rCAIOyekOuPmeycvOuhnCDtj6ztlajrkKnri4jri6QuXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9QcmljaW5nUGFnZS50c3gifQ==