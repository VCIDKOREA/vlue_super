import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/EmergencyButton.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/EmergencyButton.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { AlertTriangle, X, Phone, Shield, ChevronRight, Bell } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
export default function EmergencyButton() {
  _s();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const handleReport = () => {
    setReported(true);
    setTimeout(() => {
      setReported(false);
      setOpen(false);
    }, 2500);
  };
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("style", { children: `
        @keyframes sirenPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%        { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
        @keyframes emergencyIn {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .emergency-btn {
          animation: sirenPulse 2s ease-in-out infinite;
        }
      ` }, void 0, false, {
      fileName: "/home/project/src/components/EmergencyButton.tsx",
      lineNumber: 18,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3", children: [
      open && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "bg-white rounded-3xl shadow-2xl border border-gray-100 w-72 overflow-hidden",
          style: { animation: "emergencyIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-6 h-6 rounded-full bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-3.5 h-3.5 text-white" }, void 0, false, {
                  fileName: "/home/project/src/components/EmergencyButton.tsx",
                  lineNumber: 41,
                  columnNumber: 19
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/components/EmergencyButton.tsx",
                  lineNumber: 40,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-white font-bold text-sm", children: "긴급 신고 / 피싱 경보" }, void 0, false, {
                  fileName: "/home/project/src/components/EmergencyButton.tsx",
                  lineNumber: 43,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 39,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("button", { onClick: () => setOpen(false), className: "text-white/70 hover:text-white transition-colors", children: /* @__PURE__ */ jsxDEV(X, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 46,
                columnNumber: 17
              }, this) }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 45,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/EmergencyButton.tsx",
              lineNumber: 38,
              columnNumber: 13
            }, this),
            !reported ? /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-2.5", children: [
              /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: "tel:112",
                  className: "flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl transition-all group",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Phone, { className: "w-4 h-4 text-white" }, void 0, false, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 58,
                        columnNumber: 23
                      }, this) }, void 0, false, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 57,
                        columnNumber: 21
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-red-700", children: "경찰청 신고" }, void 0, false, {
                          fileName: "/home/project/src/components/EmergencyButton.tsx",
                          lineNumber: 61,
                          columnNumber: 23
                        }, this),
                        /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-red-500", children: "112 즉시 연결" }, void 0, false, {
                          fileName: "/home/project/src/components/EmergencyButton.tsx",
                          lineNumber: 62,
                          columnNumber: 23
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 60,
                        columnNumber: 21
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/home/project/src/components/EmergencyButton.tsx",
                      lineNumber: 56,
                      columnNumber: 19
                    }, this),
                    /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" }, void 0, false, {
                      fileName: "/home/project/src/components/EmergencyButton.tsx",
                      lineNumber: 65,
                      columnNumber: 19
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/home/project/src/components/EmergencyButton.tsx",
                  lineNumber: 52,
                  columnNumber: 17
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: "tel:1332",
                  className: "flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl transition-all group",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-white" }, void 0, false, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 74,
                        columnNumber: 23
                      }, this) }, void 0, false, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 73,
                        columnNumber: 21
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-orange-700", children: "금융감독원" }, void 0, false, {
                          fileName: "/home/project/src/components/EmergencyButton.tsx",
                          lineNumber: 77,
                          columnNumber: 23
                        }, this),
                        /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-orange-500", children: "1332 금융사기 신고" }, void 0, false, {
                          fileName: "/home/project/src/components/EmergencyButton.tsx",
                          lineNumber: 78,
                          columnNumber: 23
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 76,
                        columnNumber: 21
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/home/project/src/components/EmergencyButton.tsx",
                      lineNumber: 72,
                      columnNumber: 19
                    }, this),
                    /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" }, void 0, false, {
                      fileName: "/home/project/src/components/EmergencyButton.tsx",
                      lineNumber: 81,
                      columnNumber: 19
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/home/project/src/components/EmergencyButton.tsx",
                  lineNumber: 68,
                  columnNumber: 17
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: handleReport,
                  className: "w-full flex items-center justify-between p-3 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-2xl transition-all group",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Bell, { className: "w-4 h-4 text-white" }, void 0, false, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 90,
                        columnNumber: 23
                      }, this) }, void 0, false, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 89,
                        columnNumber: 21
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "text-left", children: [
                        /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-primary-700", children: "VLUE 피싱 경보" }, void 0, false, {
                          fileName: "/home/project/src/components/EmergencyButton.tsx",
                          lineNumber: 93,
                          columnNumber: 23
                        }, this),
                        /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-primary-500", children: "실시간 위험 번호 신고" }, void 0, false, {
                          fileName: "/home/project/src/components/EmergencyButton.tsx",
                          lineNumber: 94,
                          columnNumber: 23
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/home/project/src/components/EmergencyButton.tsx",
                        lineNumber: 92,
                        columnNumber: 21
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/home/project/src/components/EmergencyButton.tsx",
                      lineNumber: 88,
                      columnNumber: 19
                    }, this),
                    /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4 text-primary-400 group-hover:translate-x-0.5 transition-transform" }, void 0, false, {
                      fileName: "/home/project/src/components/EmergencyButton.tsx",
                      lineNumber: 97,
                      columnNumber: 19
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/home/project/src/components/EmergencyButton.tsx",
                  lineNumber: 84,
                  columnNumber: 17
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("p", { className: "text-center text-xs text-gray-400 pt-1", style: { wordBreak: "keep-all" }, children: "보이스피싱 피해를 입었다면 즉시 신고하세요" }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 100,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/EmergencyButton.tsx",
              lineNumber: 51,
              columnNumber: 11
            }, this) : /* @__PURE__ */ jsxDEV("div", { className: "p-6 text-center", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-3", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-6 h-6 text-primary-500" }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 107,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 106,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "font-bold text-gray-900 text-sm mb-1", children: "피싱 경보 신고 완료" }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 109,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-500", style: { wordBreak: "keep-all" }, children: "신고하신 번호는 즉시 VLUE 경보 데이터베이스에 등록됩니다" }, void 0, false, {
                fileName: "/home/project/src/components/EmergencyButton.tsx",
                lineNumber: 110,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/EmergencyButton.tsx",
              lineNumber: 105,
              columnNumber: 11
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/components/EmergencyButton.tsx",
          lineNumber: 34,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setOpen(!open),
          className: "emergency-btn w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-2xl transition-all active:scale-95",
          "aria-label": "긴급 신고",
          children: open ? /* @__PURE__ */ jsxDEV(X, { className: "w-6 h-6" }, void 0, false, {
            fileName: "/home/project/src/components/EmergencyButton.tsx",
            lineNumber: 124,
            columnNumber: 11
          }, this) : /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-6 h-6", strokeWidth: 2.5 }, void 0, false, {
            fileName: "/home/project/src/components/EmergencyButton.tsx",
            lineNumber: 126,
            columnNumber: 11
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/components/EmergencyButton.tsx",
          lineNumber: 118,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/components/EmergencyButton.tsx",
      lineNumber: 32,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/components/EmergencyButton.tsx",
    lineNumber: 17,
    columnNumber: 5
  }, this);
}
_s(EmergencyButton, "fXaupaHDDQDuqUC1iPMoEhF+Ihc=");
_c = EmergencyButton;
var _c;
$RefreshReg$(_c, "EmergencyButton");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/EmergencyButton.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/EmergencyButton.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QkFBb0Q7QUFBQTtBQUFBLFFBUnhEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQVVBO0FBQUEsU0FoR0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWlHQTtBQUFBLE9BaEhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FpSEE7QUFFSjtBQUFDRCxHQWhJdUJELGlCQUFlO0FBQUFXLEtBQWZYO0FBQWUsSUFBQVc7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbIkFsZXJ0VHJpYW5nbGUiLCJYIiwiUGhvbmUiLCJTaGllbGQiLCJDaGV2cm9uUmlnaHQiLCJCZWxsIiwiRW1lcmdlbmN5QnV0dG9uIiwiX3MiLCJvcGVuIiwic2V0T3BlbiIsInVzZVN0YXRlIiwicmVwb3J0ZWQiLCJzZXRSZXBvcnRlZCIsImhhbmRsZVJlcG9ydCIsInNldFRpbWVvdXQiLCJhbmltYXRpb24iLCJ3b3JkQnJlYWsiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJFbWVyZ2VuY3lCdXR0b24udHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQWxlcnRUcmlhbmdsZSwgWCwgUGhvbmUsIFNoaWVsZCwgQ2hldnJvblJpZ2h0LCBCZWxsIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRW1lcmdlbmN5QnV0dG9uKCkge1xuICBjb25zdCBbb3Blbiwgc2V0T3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtyZXBvcnRlZCwgc2V0UmVwb3J0ZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIGNvbnN0IGhhbmRsZVJlcG9ydCA9ICgpID0+IHtcbiAgICBzZXRSZXBvcnRlZCh0cnVlKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHNldFJlcG9ydGVkKGZhbHNlKTtcbiAgICAgIHNldE9wZW4oZmFsc2UpO1xuICAgIH0sIDI1MDApO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxzdHlsZT57YFxuICAgICAgICBAa2V5ZnJhbWVzIHNpcmVuUHVsc2Uge1xuICAgICAgICAgIDAlLCAxMDAlIHsgYm94LXNoYWRvdzogMCAwIDAgMCByZ2JhKDIzOSw2OCw2OCwwLjUpOyB9XG4gICAgICAgICAgNTAlICAgICAgICB7IGJveC1zaGFkb3c6IDAgMCAwIDEycHggcmdiYSgyMzksNjgsNjgsMCk7IH1cbiAgICAgICAgfVxuICAgICAgICBAa2V5ZnJhbWVzIGVtZXJnZW5jeUluIHtcbiAgICAgICAgICBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiBzY2FsZSgwLjg1KSB0cmFuc2xhdGVZKDEycHgpOyB9XG4gICAgICAgICAgdG8gICB7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybTogc2NhbGUoMSkgdHJhbnNsYXRlWSgwKTsgfVxuICAgICAgICB9XG4gICAgICAgIC5lbWVyZ2VuY3ktYnRuIHtcbiAgICAgICAgICBhbmltYXRpb246IHNpcmVuUHVsc2UgMnMgZWFzZS1pbi1vdXQgaW5maW5pdGU7XG4gICAgICAgIH1cbiAgICAgIGB9PC9zdHlsZT5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBib3R0b20tNiByaWdodC01IHotNDAgZmxleCBmbGV4LWNvbCBpdGVtcy1lbmQgZ2FwLTNcIj5cbiAgICAgICAge29wZW4gJiYgKFxuICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtM3hsIHNoYWRvdy0yeGwgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCB3LTcyIG92ZXJmbG93LWhpZGRlblwiXG4gICAgICAgICAgICBzdHlsZT17eyBhbmltYXRpb246ICdlbWVyZ2VuY3lJbiAwLjJzIGN1YmljLWJlemllcigwLjM0LDEuNTYsMC42NCwxKScgfX1cbiAgICAgICAgICA+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWdyYWRpZW50LXRvLXIgZnJvbS1yZWQtNjAwIHRvLXJlZC01MDAgcHgtNCBweS0zIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTYgaC02IHJvdW5kZWQtZnVsbCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZSBmb250LWJvbGQgdGV4dC1zbVwiPuq4tOq4iSDsi6Dqs6AgLyDtlLzsi7Eg6rK967O0PC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuKGZhbHNlKX0gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHshcmVwb3J0ZWQgPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC00IHNwYWNlLXktMi41XCI+XG4gICAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICAgIGhyZWY9XCJ0ZWw6MTEyXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBwLTMgYmctcmVkLTUwIGhvdmVyOmJnLXJlZC0xMDAgYm9yZGVyIGJvcmRlci1yZWQtMjAwIHJvdW5kZWQtMnhsIHRyYW5zaXRpb24tYWxsIGdyb3VwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IHJvdW5kZWQteGwgYmctcmVkLTUwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxQaG9uZSBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtcmVkLTcwMFwiPuqyveywsOyyrSDsi6Dqs6A8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1yZWQtNTAwXCI+MTEyIOymieyLnCDsl7DqsrA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxDaGV2cm9uUmlnaHQgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXJlZC00MDAgZ3JvdXAtaG92ZXI6dHJhbnNsYXRlLXgtMC41IHRyYW5zaXRpb24tdHJhbnNmb3JtXCIgLz5cbiAgICAgICAgICAgICAgICA8L2E+XG5cbiAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgaHJlZj1cInRlbDoxMzMyXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBwLTMgYmctb3JhbmdlLTUwIGhvdmVyOmJnLW9yYW5nZS0xMDAgYm9yZGVyIGJvcmRlci1vcmFuZ2UtMjAwIHJvdW5kZWQtMnhsIHRyYW5zaXRpb24tYWxsIGdyb3VwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IHJvdW5kZWQteGwgYmctb3JhbmdlLTUwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LW9yYW5nZS03MDBcIj7quIjsnLXqsJDrj4Xsm5A8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1vcmFuZ2UtNTAwXCI+MTMzMiDquIjsnLXsgqzquLAg7Iug6rOgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8Q2hldnJvblJpZ2h0IGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1vcmFuZ2UtNDAwIGdyb3VwLWhvdmVyOnRyYW5zbGF0ZS14LTAuNSB0cmFuc2l0aW9uLXRyYW5zZm9ybVwiIC8+XG4gICAgICAgICAgICAgICAgPC9hPlxuXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlUmVwb3J0fVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBwLTMgYmctcHJpbWFyeS01MCBob3ZlcjpiZy1wcmltYXJ5LTEwMCBib3JkZXIgYm9yZGVyLXByaW1hcnktMjAwIHJvdW5kZWQtMnhsIHRyYW5zaXRpb24tYWxsIGdyb3VwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IHJvdW5kZWQteGwgYmctcHJpbWFyeS01MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8QmVsbCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtcHJpbWFyeS03MDBcIj5WTFVFIO2UvOyLsSDqsr3rs7Q8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1wcmltYXJ5LTUwMFwiPuyLpOyLnOqwhCDsnITtl5gg67KI7Zi4IOyLoOqzoDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtcHJpbWFyeS00MDAgZ3JvdXAtaG92ZXI6dHJhbnNsYXRlLXgtMC41IHRyYW5zaXRpb24tdHJhbnNmb3JtXCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtY2VudGVyIHRleHQteHMgdGV4dC1ncmF5LTQwMCBwdC0xXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICAgICAg67O07J207Iqk7ZS87IuxIO2UvO2VtOulvCDsnoXsl4jri6TrqbQg7KaJ7IucIOyLoOqzoO2VmOyEuOyalFxuICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNiB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMiBoLTEyIHJvdW5kZWQtMnhsIGJnLXByaW1hcnktMTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG14LWF1dG8gbWItM1wiPlxuICAgICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTYgaC02IHRleHQtcHJpbWFyeS01MDBcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwIHRleHQtc20gbWItMVwiPu2UvOyLsSDqsr3rs7Qg7Iug6rOgIOyZhOujjDwvcD5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS01MDBcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAgICDsi6Dqs6DtlZjsi6Ag67KI7Zi464qUIOymieyLnCBWTFVFIOqyveuztCDrjbDsnbTthLDrsqDsnbTsiqTsl5Ag65Ox66Gd65Cp64uI64ukXG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE9wZW4oIW9wZW4pfVxuICAgICAgICAgIGNsYXNzTmFtZT1cImVtZXJnZW5jeS1idG4gdy0xNCBoLTE0IHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwIGhvdmVyOmJnLXJlZC02MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC13aGl0ZSBzaGFkb3ctMnhsIHRyYW5zaXRpb24tYWxsIGFjdGl2ZTpzY2FsZS05NVwiXG4gICAgICAgICAgYXJpYS1sYWJlbD1cIuq4tOq4iSDsi6Dqs6BcIlxuICAgICAgICA+XG4gICAgICAgICAge29wZW4gPyAoXG4gICAgICAgICAgICA8WCBjbGFzc05hbWU9XCJ3LTYgaC02XCIgLz5cbiAgICAgICAgICApIDogKFxuICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgY2xhc3NOYW1lPVwidy02IGgtNlwiIHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8Lz5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvY29tcG9uZW50cy9FbWVyZ2VuY3lCdXR0b24udHN4In0=