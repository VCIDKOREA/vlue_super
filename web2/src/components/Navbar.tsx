import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/Navbar.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/Navbar.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Menu, X, User, ChevronDown, LogOut, MapPin, Shield, Lock, Download, CreditCard, LayoutDashboard, Award } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const NAV_ITEMS = [
  { label: "서비스소개", view: "about" },
  { label: "기업뉴스", view: "news" },
  { label: "지역별행사", view: "events" },
  { label: "고객지원", view: "support" },
  { label: "자료실", view: "resources" },
  { label: "인증신청(요금제)", view: "pricing" },
  { label: "구인구직", view: "jobs" },
  { label: "블루쇼핑", view: "shopping", highlight: true },
  { label: "보안메일", view: "mail" }
];
export default function Navbar({ currentView, onNavigate, user, onLoginClick, onLogout }) {
  _s();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const handleNav = (view) => {
    if (view) onNavigate(view);
    setMobileOpen(false);
    setUserMenuOpen(false);
  };
  return /* @__PURE__ */ jsxDEV("header", { className: "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center h-15", style: { height: "60px" }, children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => handleNav("home"),
          className: "flex items-center gap-1.5 mr-6 flex-shrink-0 focus:outline-none group",
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-4.5 h-4.5 text-white", strokeWidth: 2.5, style: { width: "18px", height: "18px" } }, void 0, false, {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 44,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 43,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV(
              "span",
              {
                className: "text-xl font-black tracking-tight",
                style: { color: "#3182F6", fontFamily: "'Pretendard Variable', Pretendard, Inter, sans-serif", letterSpacing: "-0.04em" },
                children: "VLUE"
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 46,
                columnNumber: 13
              },
              this
            )
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/components/Navbar.tsx",
          lineNumber: 39,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("nav", { className: "hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto", children: NAV_ITEMS.map(
        (item) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => handleNav(item.view),
            className: `px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 ${item.view === currentView && item.view !== "home" ? "text-primary-600 bg-primary-50 font-semibold" : "text-gray-600 hover:text-primary-600 hover:bg-primary-50"} ${item.highlight ? "text-primary-600 font-semibold" : ""}`,
            style: { letterSpacing: "-0.01em" },
            children: [
              item.label === "보안메일" && /* @__PURE__ */ jsxDEV(Lock, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 66,
                columnNumber: 43
              }, this),
              item.label
            ]
          },
          item.label,
          true,
          {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 56,
            columnNumber: 13
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/home/project/src/components/Navbar.tsx",
        lineNumber: 54,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "hidden lg:flex items-center gap-1.5 ml-3 flex-shrink-0", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => handleNav("download"),
            className: `flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 whitespace-nowrap ${currentView === "download" ? "bg-primary-100 border-primary-300 text-primary-700" : "bg-primary-50 border-primary-200 text-primary-600 hover:bg-primary-100 hover:border-primary-300"}`,
            children: [
              /* @__PURE__ */ jsxDEV(Download, { className: "w-3 h-3 flex-shrink-0" }, void 0, false, {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 82,
                columnNumber: 15
              }, this),
              "APP 다운로드"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 74,
            columnNumber: 13
          },
          this
        ),
        user ? /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setUserMenuOpen(!userMenuOpen),
              className: "flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all",
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(User, { className: "w-3.5 h-3.5 text-white" }, void 0, false, {
                  fileName: "/home/project/src/components/Navbar.tsx",
                  lineNumber: 93,
                  columnNumber: 21
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/components/Navbar.tsx",
                  lineNumber: 92,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "max-w-28 truncate", children: user.email.split("@")[0] }, void 0, false, {
                  fileName: "/home/project/src/components/Navbar.tsx",
                  lineNumber: 95,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV(ChevronDown, { className: `w-3.5 h-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}` }, void 0, false, {
                  fileName: "/home/project/src/components/Navbar.tsx",
                  lineNumber: 96,
                  columnNumber: 19
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 88,
              columnNumber: 17
            },
            this
          ),
          userMenuOpen && /* @__PURE__ */ jsxDEV("div", { className: "absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-2xl shadow-card py-1 z-50", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2.5 border-b border-gray-100", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-500", children: "로그인 계정" }, void 0, false, {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 101,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-medium text-gray-900 truncate", children: user.email }, void 0, false, {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 102,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 100,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  handleNav("mypage");
                },
                className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV(LayoutDashboard, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/Navbar.tsx",
                    lineNumber: 108,
                    columnNumber: 23
                  }, this),
                  "마이페이지"
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 104,
                columnNumber: 21
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  handleNav("bizcard");
                },
                className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV(CreditCard, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/Navbar.tsx",
                    lineNumber: 115,
                    columnNumber: 23
                  }, this),
                  "디지털 명함"
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 111,
                columnNumber: 21
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  handleNav("pricing");
                },
                className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV(Award, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/Navbar.tsx",
                    lineNumber: 122,
                    columnNumber: 23
                  }, this),
                  "신뢰인증 신청"
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 118,
                columnNumber: 21
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  handleNav("safezone");
                },
                className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV(MapPin, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/Navbar.tsx",
                    lineNumber: 129,
                    columnNumber: 23
                  }, this),
                  "안심영역 설정"
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 125,
                columnNumber: 21
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  onLogout();
                  setUserMenuOpen(false);
                },
                className: "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV(LogOut, { className: "w-4 h-4" }, void 0, false, {
                    fileName: "/home/project/src/components/Navbar.tsx",
                    lineNumber: 136,
                    columnNumber: 23
                  }, this),
                  "로그아웃"
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/components/Navbar.tsx",
                lineNumber: 132,
                columnNumber: 21
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 99,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Navbar.tsx",
          lineNumber: 87,
          columnNumber: 13
        }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: onLoginClick,
              className: "px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors whitespace-nowrap",
              children: "로그인"
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 144,
              columnNumber: 17
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: onLoginClick,
              className: "btn-primary text-xs px-3.5 py-1.5 whitespace-nowrap",
              children: "회원가입"
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 150,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Navbar.tsx",
          lineNumber: 143,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/Navbar.tsx",
        lineNumber: 72,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          className: "lg:hidden ml-auto p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors",
          onClick: () => setMobileOpen(!mobileOpen),
          children: mobileOpen ? /* @__PURE__ */ jsxDEV(X, { className: "w-5 h-5" }, void 0, false, {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 164,
            columnNumber: 27
          }, this) : /* @__PURE__ */ jsxDEV(Menu, { className: "w-5 h-5" }, void 0, false, {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 164,
            columnNumber: 55
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/components/Navbar.tsx",
          lineNumber: 160,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/components/Navbar.tsx",
      lineNumber: 38,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/components/Navbar.tsx",
      lineNumber: 37,
      columnNumber: 7
    }, this),
    mobileOpen && /* @__PURE__ */ jsxDEV("div", { className: "lg:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-0.5 animate-fade-in", children: [
      NAV_ITEMS.map(
        (item) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => handleNav(item.view),
            className: "w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all",
            children: item.label
          },
          item.label,
          false,
          {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 172,
            columnNumber: 9
          },
          this
        )
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => handleNav("download"),
          className: "w-full text-left px-3 py-2.5 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-all flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsxDEV(Download, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/components/Navbar.tsx",
              lineNumber: 185,
              columnNumber: 13
            }, this),
            "APP 다운로드"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/components/Navbar.tsx",
          lineNumber: 181,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "pt-3 border-t border-gray-100 flex gap-2", children: user ? /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => {
            onLogout();
            setMobileOpen(false);
          },
          className: "flex-1 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors",
          children: "로그아웃"
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/components/Navbar.tsx",
          lineNumber: 190,
          columnNumber: 11
        },
        this
      ) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              onLoginClick();
              setMobileOpen(false);
            },
            className: "flex-1 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors",
            children: "로그인"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 198,
            columnNumber: 17
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              onLoginClick();
              setMobileOpen(false);
            },
            className: "flex-1 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors",
            children: "회원가입"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/Navbar.tsx",
            lineNumber: 204,
            columnNumber: 17
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/components/Navbar.tsx",
        lineNumber: 197,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/components/Navbar.tsx",
        lineNumber: 188,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/Navbar.tsx",
      lineNumber: 170,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/components/Navbar.tsx",
    lineNumber: 36,
    columnNumber: 5
  }, this);
}
_s(Navbar, "hKczyQNU/CeEDUzKy1K9LizMGww=");
_c = Navbar;
var _c;
$RefreshReg$(_c, "Navbar");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/Navbar.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/Navbar.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFBLFVBQWlIO0FBQUE7QUFBQSxRQUY3SDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFLQSxJQUVBLG1DQUNFO0FBQUE7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUNDLFNBQVMsTUFBTTtBQUFFSiwyQkFBYTtBQUFHSSw0QkFBYyxLQUFLO0FBQUEsWUFBRztBQUFBLFlBQ3ZELFdBQVU7QUFBQSxZQUE0SDtBQUFBO0FBQUEsVUFGeEk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBS0E7QUFBQSxRQUNBO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFDQyxTQUFTLE1BQU07QUFBRUosMkJBQWE7QUFBR0ksNEJBQWMsS0FBSztBQUFBLFlBQUc7QUFBQSxZQUN2RCxXQUFVO0FBQUEsWUFBK0c7QUFBQTtBQUFBLFVBRjNIO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUtBO0FBQUEsV0FaRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBYUEsS0F0Qko7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQXdCQTtBQUFBLFNBMUNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0EyQ0E7QUFBQSxPQWpMSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBbUxBO0FBRUo7QUFBQ0YsR0FoTXVCTixRQUFNO0FBQUFzQixLQUFOdEI7QUFBTSxJQUFBc0I7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbIk1lbnUiLCJYIiwiVXNlciIsIkNoZXZyb25Eb3duIiwiTG9nT3V0IiwiTWFwUGluIiwiU2hpZWxkIiwiTG9jayIsIkRvd25sb2FkIiwiQ3JlZGl0Q2FyZCIsIkxheW91dERhc2hib2FyZCIsIkF3YXJkIiwiTkFWX0lURU1TIiwibGFiZWwiLCJ2aWV3IiwiaGlnaGxpZ2h0IiwiTmF2YmFyIiwiY3VycmVudFZpZXciLCJvbk5hdmlnYXRlIiwidXNlciIsIm9uTG9naW5DbGljayIsIm9uTG9nb3V0IiwiX3MiLCJtb2JpbGVPcGVuIiwic2V0TW9iaWxlT3BlbiIsInVzZVN0YXRlIiwidXNlck1lbnVPcGVuIiwic2V0VXNlck1lbnVPcGVuIiwiaGFuZGxlTmF2IiwiaGVpZ2h0Iiwid2lkdGgiLCJjb2xvciIsImZvbnRGYW1pbHkiLCJsZXR0ZXJTcGFjaW5nIiwibWFwIiwiaXRlbSIsImVtYWlsIiwic3BsaXQiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJOYXZiYXIudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgTWVudSwgWCwgVXNlciwgQ2hldnJvbkRvd24sIExvZ091dCwgTWFwUGluLCBTaGllbGQsIExvY2ssIERvd25sb2FkLCBDcmVkaXRDYXJkLCBMYXlvdXREYXNoYm9hcmQsIEF3YXJkIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IFZpZXcgfSBmcm9tICcuLi90eXBlcyc7XG5cbmludGVyZmFjZSBOYXZiYXJQcm9wcyB7XG4gIGN1cnJlbnRWaWV3OiBWaWV3O1xuICBvbk5hdmlnYXRlOiAodmlldzogVmlldykgPT4gdm9pZDtcbiAgdXNlcjogeyBlbWFpbDogc3RyaW5nIH0gfCBudWxsO1xuICBvbkxvZ2luQ2xpY2s6ICgpID0+IHZvaWQ7XG4gIG9uTG9nb3V0OiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBOQVZfSVRFTVM6IHsgbGFiZWw6IHN0cmluZzsgdmlldz86IFZpZXc7IGhyZWY/OiBzdHJpbmc7IGhpZ2hsaWdodD86IGJvb2xlYW4gfVtdID0gW1xuICB7IGxhYmVsOiAn7ISc67mE7Iqk7IaM6rCcJywgdmlldzogJ2Fib3V0JyB9LFxuICB7IGxhYmVsOiAn6riw7JeF64m07IqkJywgdmlldzogJ25ld3MnIH0sXG4gIHsgbGFiZWw6ICfsp4Dsl63rs4TtlonsgqwnLCB2aWV3OiAnZXZlbnRzJyB9LFxuICB7IGxhYmVsOiAn6rOg6rCd7KeA7JuQJywgdmlldzogJ3N1cHBvcnQnIH0sXG4gIHsgbGFiZWw6ICfsnpDro4zsi6QnLCB2aWV3OiAncmVzb3VyY2VzJyB9LFxuICB7IGxhYmVsOiAn7J247Kad7Iug7LKtKOyalOq4iOygnCknLCB2aWV3OiAncHJpY2luZycgfSxcbiAgeyBsYWJlbDogJ+q1rOyduOq1rOyngScsIHZpZXc6ICdqb2JzJyB9LFxuICB7IGxhYmVsOiAn67iU66Oo7Ie87ZWRJywgdmlldzogJ3Nob3BwaW5nJywgaGlnaGxpZ2h0OiB0cnVlIH0sXG4gIHsgbGFiZWw6ICfrs7TslYjrqZTsnbwnLCB2aWV3OiAnbWFpbCcgfSxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE5hdmJhcih7IGN1cnJlbnRWaWV3LCBvbk5hdmlnYXRlLCB1c2VyLCBvbkxvZ2luQ2xpY2ssIG9uTG9nb3V0IH06IE5hdmJhclByb3BzKSB7XG4gIGNvbnN0IFttb2JpbGVPcGVuLCBzZXRNb2JpbGVPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3VzZXJNZW51T3Blbiwgc2V0VXNlck1lbnVPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICBjb25zdCBoYW5kbGVOYXYgPSAodmlldz86IFZpZXcpID0+IHtcbiAgICBpZiAodmlldykgb25OYXZpZ2F0ZSh2aWV3KTtcbiAgICBzZXRNb2JpbGVPcGVuKGZhbHNlKTtcbiAgICBzZXRVc2VyTWVudU9wZW4oZmFsc2UpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGhlYWRlciBjbGFzc05hbWU9XCJmaXhlZCB0b3AtMCBsZWZ0LTAgcmlnaHQtMCB6LTUwIGJnLXdoaXRlLzk1IGJhY2tkcm9wLWJsdXItbWQgYm9yZGVyLWIgYm9yZGVyLWdyYXktMTAwIHNoYWRvdy1zbVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTZcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBoLTE1XCIgc3R5bGU9e3sgaGVpZ2h0OiAnNjBweCcgfX0+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlTmF2KCdob21lJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IG1yLTYgZmxleC1zaHJpbmstMCBmb2N1czpvdXRsaW5lLW5vbmUgZ3JvdXBcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLWxnIGJnLXByaW1hcnktNjAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy1zbSBncm91cC1ob3ZlcjpiZy1wcmltYXJ5LTcwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctNC41IGgtNC41IHRleHQtd2hpdGVcIiBzdHJva2VXaWR0aD17Mi41fSBzdHlsZT17eyB3aWR0aDogJzE4cHgnLCBoZWlnaHQ6ICcxOHB4JyB9fSAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdHJhY2tpbmctdGlnaHRcIlxuICAgICAgICAgICAgICBzdHlsZT17eyBjb2xvcjogJyMzMTgyRjYnLCBmb250RmFtaWx5OiBcIidQcmV0ZW5kYXJkIFZhcmlhYmxlJywgUHJldGVuZGFyZCwgSW50ZXIsIHNhbnMtc2VyaWZcIiwgbGV0dGVyU3BhY2luZzogJy0wLjA0ZW0nIH19XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIFZMVUVcbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIDxuYXYgY2xhc3NOYW1lPVwiaGlkZGVuIGxnOmZsZXggaXRlbXMtY2VudGVyIGdhcC0wLjUgZmxleC0xIG92ZXJmbG93LXgtYXV0b1wiPlxuICAgICAgICAgICAge05BVl9JVEVNUy5tYXAoKGl0ZW0pID0+IChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIGtleT17aXRlbS5sYWJlbH1cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVOYXYoaXRlbS52aWV3KX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0zIHB5LTIgdGV4dC1zbSBmb250LW1lZGl1bSByb3VuZGVkLXhsIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTE1MCB3aGl0ZXNwYWNlLW5vd3JhcCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41ICR7XG4gICAgICAgICAgICAgICAgICBpdGVtLnZpZXcgPT09IGN1cnJlbnRWaWV3ICYmIGl0ZW0udmlldyAhPT0gJ2hvbWUnXG4gICAgICAgICAgICAgICAgICAgID8gJ3RleHQtcHJpbWFyeS02MDAgYmctcHJpbWFyeS01MCBmb250LXNlbWlib2xkJ1xuICAgICAgICAgICAgICAgICAgICA6ICd0ZXh0LWdyYXktNjAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgaG92ZXI6YmctcHJpbWFyeS01MCdcbiAgICAgICAgICAgICAgICB9ICR7aXRlbS5oaWdobGlnaHQgPyAndGV4dC1wcmltYXJ5LTYwMCBmb250LXNlbWlib2xkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAxZW0nIH19XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7aXRlbS5sYWJlbCA9PT0gJ+uztOyViOuplOydvCcgJiYgPExvY2sgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+fVxuICAgICAgICAgICAgICAgIHtpdGVtLmxhYmVsfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvbmF2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoaWRkZW4gbGc6ZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBtbC0zIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgIHsvKiDslbEg64uk7Jq066Gc65OcIOuyhO2KvCAqL31cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlTmF2KCdkb3dubG9hZCcpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0zIHB5LTEuNSB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgcm91bmRlZC14bCBib3JkZXIgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwIHdoaXRlc3BhY2Utbm93cmFwICR7XG4gICAgICAgICAgICAgICAgY3VycmVudFZpZXcgPT09ICdkb3dubG9hZCdcbiAgICAgICAgICAgICAgICAgID8gJ2JnLXByaW1hcnktMTAwIGJvcmRlci1wcmltYXJ5LTMwMCB0ZXh0LXByaW1hcnktNzAwJ1xuICAgICAgICAgICAgICAgICAgOiAnYmctcHJpbWFyeS01MCBib3JkZXItcHJpbWFyeS0yMDAgdGV4dC1wcmltYXJ5LTYwMCBob3ZlcjpiZy1wcmltYXJ5LTEwMCBob3Zlcjpib3JkZXItcHJpbWFyeS0zMDAnXG4gICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8RG93bmxvYWQgY2xhc3NOYW1lPVwidy0zIGgtMyBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgICAgQVBQIOuLpOyatOuhnOuTnFxuICAgICAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgICAgIHt1c2VyID8gKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlXCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VXNlck1lbnVPcGVuKCF1c2VyTWVudU9wZW4pfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtMyBweS0xLjUgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LWdyYXktNzAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgaG92ZXI6YmctcHJpbWFyeS01MCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctNyBoLTcgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNjAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxVc2VyIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJtYXgtdy0yOCB0cnVuY2F0ZVwiPnt1c2VyLmVtYWlsLnNwbGl0KCdAJylbMF19PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPENoZXZyb25Eb3duIGNsYXNzTmFtZT17YHctMy41IGgtMy41IHRyYW5zaXRpb24tdHJhbnNmb3JtICR7dXNlck1lbnVPcGVuID8gJ3JvdGF0ZS0xODAnIDogJyd9YH0gLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICB7dXNlck1lbnVPcGVuICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgcmlnaHQtMCB0b3AtZnVsbCBtdC0xIHctNTYgYmctd2hpdGUgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCByb3VuZGVkLTJ4bCBzaGFkb3ctY2FyZCBweS0xIHotNTBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC00IHB5LTIuNSBib3JkZXItYiBib3JkZXItZ3JheS0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS01MDBcIj7roZzqt7jsnbgg6rOE7KCVPC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTkwMCB0cnVuY2F0ZVwiPnt1c2VyLmVtYWlsfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGhhbmRsZU5hdignbXlwYWdlJyk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjUgcHgtNCBweS0yIHRleHQtc20gdGV4dC1ncmF5LTcwMCBob3ZlcjpiZy1wcmltYXJ5LTUwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgPExheW91dERhc2hib2FyZCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICDrp4jsnbTtjpjsnbTsp4BcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGhhbmRsZU5hdignYml6Y2FyZCcpOyB9fVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41IHB4LTQgcHktMiB0ZXh0LXNtIHRleHQtZ3JheS03MDAgaG92ZXI6YmctcHJpbWFyeS01MCBob3Zlcjp0ZXh0LXByaW1hcnktNjAwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxDcmVkaXRDYXJkIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIOuUlOyngO2EuCDrqoXtlahcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGhhbmRsZU5hdigncHJpY2luZycpOyB9fVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41IHB4LTQgcHktMiB0ZXh0LXNtIHRleHQtZ3JheS03MDAgaG92ZXI6YmctYW1iZXItNTAgaG92ZXI6dGV4dC1hbWJlci02MDAgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgPEF3YXJkIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIOyLoOuisOyduOymnSDsi6Dssq1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGhhbmRsZU5hdignc2FmZXpvbmUnKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNSBweC00IHB5LTIgdGV4dC1zbSB0ZXh0LWdyYXktNzAwIGhvdmVyOmJnLXByaW1hcnktNTAgaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8TWFwUGluIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIOyViOyLrOyYgeyXrSDshKTsoJVcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IG9uTG9nb3V0KCk7IHNldFVzZXJNZW51T3BlbihmYWxzZSk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjUgcHgtNCBweS0yIHRleHQtc20gdGV4dC1yZWQtNjAwIGhvdmVyOmJnLXJlZC01MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8TG9nT3V0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIOuhnOq3uOyVhOybg1xuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXtvbkxvZ2luQ2xpY2t9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0zIHB5LTEuNSB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtZ3JheS03MDAgaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCB0cmFuc2l0aW9uLWNvbG9ycyB3aGl0ZXNwYWNlLW5vd3JhcFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAg66Gc6re47J24XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17b25Mb2dpbkNsaWNrfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYnRuLXByaW1hcnkgdGV4dC14cyBweC0zLjUgcHktMS41IHdoaXRlc3BhY2Utbm93cmFwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICDtmozsm5DqsIDsnoVcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgY2xhc3NOYW1lPVwibGc6aGlkZGVuIG1sLWF1dG8gcC0yIHRleHQtZ3JheS01MDAgaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCBob3ZlcjpiZy1wcmltYXJ5LTUwIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0TW9iaWxlT3BlbighbW9iaWxlT3Blbil9XG4gICAgICAgICAgPlxuICAgICAgICAgICAge21vYmlsZU9wZW4gPyA8WCBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz4gOiA8TWVudSBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz59XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIHttb2JpbGVPcGVuICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsZzpoaWRkZW4gYmctd2hpdGUgYm9yZGVyLXQgYm9yZGVyLWdyYXktMTAwIHB4LTQgcHktMyBzcGFjZS15LTAuNSBhbmltYXRlLWZhZGUtaW5cIj5cbiAgICAgICAgICB7TkFWX0lURU1TLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBrZXk9e2l0ZW0ubGFiZWx9XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZU5hdihpdGVtLnZpZXcpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgdGV4dC1sZWZ0IHB4LTMgcHktMi41IHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTcwMCBob3Zlcjp0ZXh0LXByaW1hcnktNjAwIGhvdmVyOmJnLXByaW1hcnktNTAgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWFsbFwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtpdGVtLmxhYmVsfVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgKSl9XG4gICAgICAgICAgey8qIOuqqOuwlOydvCDslbEg64uk7Jq066Gc65OcICovfVxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZU5hdignZG93bmxvYWQnKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCB0ZXh0LWxlZnQgcHgtMyBweS0yLjUgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtcHJpbWFyeS02MDAgYmctcHJpbWFyeS01MCBob3ZlcjpiZy1wcmltYXJ5LTEwMCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8RG93bmxvYWQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICBBUFAg64uk7Jq066Gc65OcXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwdC0zIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMCBmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICB7dXNlciA/IChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHsgb25Mb2dvdXQoKTsgc2V0TW9iaWxlT3BlbihmYWxzZSk7IH19XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIHB5LTIgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXJlZC02MDAgYm9yZGVyIGJvcmRlci1yZWQtMjAwIHJvdW5kZWQtbGcgaG92ZXI6YmctcmVkLTUwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIOuhnOq3uOyVhOybg1xuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4geyBvbkxvZ2luQ2xpY2soKTsgc2V0TW9iaWxlT3BlbihmYWxzZSk7IH19XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LTEgcHktMiB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtZ3JheS03MDAgYm9yZGVyIGJvcmRlci1ncmF5LTIwMCByb3VuZGVkLWxnIGhvdmVyOmJvcmRlci1wcmltYXJ5LTMwMCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAg66Gc6re47J24XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4geyBvbkxvZ2luQ2xpY2soKTsgc2V0TW9iaWxlT3BlbihmYWxzZSk7IH19XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LTEgcHktMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZSBiZy1wcmltYXJ5LTYwMCByb3VuZGVkLWxnIGhvdmVyOmJnLXByaW1hcnktNzAwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICDtmozsm5DqsIDsnoVcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgPC9oZWFkZXI+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL2NvbXBvbmVudHMvTmF2YmFyLnRzeCJ9