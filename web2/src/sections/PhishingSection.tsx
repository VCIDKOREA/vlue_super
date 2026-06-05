import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/sections/PhishingSection.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/sections/PhishingSection.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { PhoneOff, Eye, ShieldX, AlertTriangle, PhoneCall } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const WARNINGS = [
  {
    icon: PhoneOff,
    title: "즉시 전화 끊기",
    desc: "금융기관·수사기관을 사칭하며 돈, 계좌, 앱 설치를 요구하면 즉시 전화를 끊으세요.",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-100"
  },
  {
    icon: Eye,
    title: "공식 번호로 확인",
    desc: "의심스러운 전화를 받으면 반드시 해당 기관의 공식 대표번호로 직접 재발신하여 사실 여부를 확인하세요.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100"
  },
  {
    icon: ShieldX,
    title: "앱 설치 절대 금지",
    desc: "문자·전화로 유도하는 어떤 앱도 절대 설치하지 마세요. 원격제어 앱(팀뷰어, 애니덱 등)은 즉시 삭제하세요.",
    color: "text-primary-600",
    bg: "bg-primary-50",
    border: "border-primary-100"
  }
];
const TIPS = [
  "금융기관은 절대 전화로 비밀번호·OTP를 요구하지 않습니다",
  "검찰·경찰·금감원 사칭 전화는 100% 사기입니다",
  "가족 납치·사고 빙자 송금 요구 — 반드시 직접 확인하세요",
  "대출 승인 빙자 수수료 요구는 전형적인 사기 수법입니다",
  "의심스러우면 즉시 끊고 112 또는 1332에 신고하세요"
];
export default function PhishingSection() {
  return /* @__PURE__ */ jsxDEV("section", { className: "bg-white py-20 border-t border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-12", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 44,
          columnNumber: 13
        }, this),
        "보이스피싱 경각심"
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 43,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "section-title", children: "이렇게 당하지 마세요" }, void 0, false, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 47,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "section-subtitle max-w-lg mx-auto", children: [
        "보이스피싱 피해는 누구에게나 발생할 수 있습니다.",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 49,
          columnNumber: 40
        }, this),
        "아래 3가지 원칙만 기억하세요."
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 48,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/PhishingSection.tsx",
      lineNumber: 42,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-14", children: WARNINGS.map(
      ({ icon: Icon, title, desc, color, bg, border }) => /* @__PURE__ */ jsxDEV("div", { className: `card p-6 ${bg} border ${border}`, children: [
        /* @__PURE__ */ jsxDEV("div", { className: `w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm`, children: /* @__PURE__ */ jsxDEV(Icon, { className: `w-6 h-6 ${color}` }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 58,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 57,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-base mb-2", children: title }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 60,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm leading-relaxed", children: desc }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 61,
          columnNumber: 15
        }, this)
      ] }, title, true, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 56,
        columnNumber: 11
      }, this)
    ) }, void 0, false, {
      fileName: "/home/project/src/sections/PhishingSection.tsx",
      lineNumber: 54,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-6 sm:p-8", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col lg:flex-row items-start lg:items-center gap-6", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsxDEV(PhoneCall, { className: "w-5 h-5 text-white" }, void 0, false, {
            fileName: "/home/project/src/sections/PhishingSection.tsx",
            lineNumber: 70,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h3", { className: "text-white font-bold text-lg", children: "보이스피싱 주요 수법 안내" }, void 0, false, {
            fileName: "/home/project/src/sections/PhishingSection.tsx",
            lineNumber: 71,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 69,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("ul", { className: "space-y-2.5", children: TIPS.map(
          (tip, i) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-start gap-2.5", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5", children: i + 1 }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 76,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-white/90 text-sm leading-relaxed", children: tip }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 79,
              columnNumber: 21
            }, this)
          ] }, i, true, {
            fileName: "/home/project/src/sections/PhishingSection.tsx",
            lineNumber: 75,
            columnNumber: 17
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 73,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 68,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "lg:text-right flex-shrink-0", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white/10 border border-white/20 rounded-2xl p-5 text-white", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-xs mb-1", children: "피해 신고 즉시 연락" }, void 0, false, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 86,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 justify-start lg:justify-end", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-sm", children: "금융감독원" }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 89,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xl font-black font-inter", children: "1332" }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 90,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/PhishingSection.tsx",
            lineNumber: 88,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 justify-start lg:justify-end", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-sm", children: "경찰청" }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 93,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xl font-black font-inter", children: "112" }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 94,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/PhishingSection.tsx",
            lineNumber: 92,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 justify-start lg:justify-end", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-sm", children: "인터넷진흥원" }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 97,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xl font-black font-inter", children: "118" }, void 0, false, {
              fileName: "/home/project/src/sections/PhishingSection.tsx",
              lineNumber: 98,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/PhishingSection.tsx",
            lineNumber: 96,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/PhishingSection.tsx",
          lineNumber: 87,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 85,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/sections/PhishingSection.tsx",
        lineNumber: 84,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/PhishingSection.tsx",
      lineNumber: 67,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/home/project/src/sections/PhishingSection.tsx",
      lineNumber: 66,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/sections/PhishingSection.tsx",
    lineNumber: 41,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/sections/PhishingSection.tsx",
    lineNumber: 40,
    columnNumber: 5
  }, this);
}
_c = PhishingSection;
var _c;
$RefreshReg$(_c, "PhishingSection");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/sections/PhishingSection.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/sections/PhishingSection.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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LHdEQUNiO0FBQUEsbUNBQUMsVUFBSyxXQUFVLHlCQUF3QixzQkFBeEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBOEM7QUFBQSxZQUM5Qyx1QkFBQyxVQUFLLFdBQVUsaUNBQWdDLG1CQUFoRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFtRDtBQUFBLGVBRnJEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxhQVpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFhQTtBQUFBLFdBZkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWdCQSxLQWpCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBa0JBO0FBQUEsU0FuQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQW9DQSxLQXJDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBc0NBO0FBQUEsT0EvREY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWdFQSxLQWpFRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBa0VBO0FBRUo7QUFBQ0MsS0F0RXVCTDtBQUFlLElBQUFLO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJTaGllbGRYIiwiQWxlcnRUcmlhbmdsZSIsIlBob25lQ2FsbCIsIldBUk5JTkdTIiwiaWNvbiIsIlBob25lT2ZmIiwidGl0bGUiLCJkZXNjIiwiY29sb3IiLCJiZyIsImJvcmRlciIsIkV5ZSIsIlRJUFMiLCJQaGlzaGluZ1NlY3Rpb24iLCJtYXAiLCJJY29uIiwidGlwIiwiaSIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlBoaXNoaW5nU2VjdGlvbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGhvbmVPZmYsIEV5ZSwgU2hpZWxkWCwgQWxlcnRUcmlhbmdsZSwgUGhvbmVDYWxsIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuY29uc3QgV0FSTklOR1MgPSBbXG4gIHtcbiAgICBpY29uOiBQaG9uZU9mZixcbiAgICB0aXRsZTogJ+ymieyLnCDsoITtmZQg64GK6riwJyxcbiAgICBkZXNjOiAn6riI7Jy16riw6rSAwrfsiJjsgqzquLDqtIDsnYQg7IKs7Lmt7ZWY66mwIOuPiCwg6rOE7KKMLCDslbEg7ISk7LmY66W8IOyalOq1rO2VmOuptCDsponsi5wg7KCE7ZmU66W8IOuBiuycvOyEuOyalC4nLFxuICAgIGNvbG9yOiAndGV4dC1yZWQtNTAwJyxcbiAgICBiZzogJ2JnLXJlZC01MCcsXG4gICAgYm9yZGVyOiAnYm9yZGVyLXJlZC0xMDAnLFxuICB9LFxuICB7XG4gICAgaWNvbjogRXllLFxuICAgIHRpdGxlOiAn6rO17IudIOuyiO2YuOuhnCDtmZXsnbgnLFxuICAgIGRlc2M6ICfsnZjsi6zsiqTrn6zsmrQg7KCE7ZmU66W8IOuwm+ycvOuptCDrsJjrk5zsi5wg7ZW064u5IOq4sOq0gOydmCDqs7Xsi50g64yA7ZGc67KI7Zi466GcIOyngeygkSDsnqzrsJzsi6DtlZjsl6wg7IKs7IukIOyXrOu2gOulvCDtmZXsnbjtlZjshLjsmpQuJyxcbiAgICBjb2xvcjogJ3RleHQtYW1iZXItNTAwJyxcbiAgICBiZzogJ2JnLWFtYmVyLTUwJyxcbiAgICBib3JkZXI6ICdib3JkZXItYW1iZXItMTAwJyxcbiAgfSxcbiAge1xuICAgIGljb246IFNoaWVsZFgsXG4gICAgdGl0bGU6ICfslbEg7ISk7LmYIOygiOuMgCDquIjsp4AnLFxuICAgIGRlc2M6ICfrrLjsnpDCt+yghO2ZlOuhnCDsnKDrj4TtlZjripQg7Ja065akIOyVseuPhCDsoIjrjIAg7ISk7LmY7ZWY7KeAIOuniOyEuOyalC4g7JuQ6rKp7KCc7Ja0IOyVsSjtjIDrt7DslrQsIOyVoOuLiOuNsSDrk7Ep7J2AIOymieyLnCDsgq3soJztlZjshLjsmpQuJyxcbiAgICBjb2xvcjogJ3RleHQtcHJpbWFyeS02MDAnLFxuICAgIGJnOiAnYmctcHJpbWFyeS01MCcsXG4gICAgYm9yZGVyOiAnYm9yZGVyLXByaW1hcnktMTAwJyxcbiAgfSxcbl07XG5cbmNvbnN0IFRJUFMgPSBbXG4gICfquIjsnLXquLDqtIDsnYAg7KCI64yAIOyghO2ZlOuhnCDruYTrsIDrsojtmLjCt09UUOulvCDsmpTqtaztlZjsp4Ag7JWK7Iq164uI64ukJyxcbiAgJ+qygOywsMK36rK97LCwwrfquIjqsJDsm5Ag7IKs7LmtIOyghO2ZlOuKlCAxMDAlIOyCrOq4sOyeheuLiOuLpCcsXG4gICfqsIDsobEg64Kp7LmYwrfsgqzqs6Ag67mZ7J6QIOyGoeq4iCDsmpTqtawg4oCUIOuwmOuTnOyLnCDsp4HsoJEg7ZmV7J247ZWY7IS47JqUJyxcbiAgJ+uMgOy2nCDsirnsnbgg67mZ7J6QIOyImOyImOujjCDsmpTqtazripQg7KCE7ZiV7KCB7J24IOyCrOq4sCDsiJjrspXsnoXri4jri6QnLFxuICAn7J2Y7Ius7Iqk65+s7Jqw66m0IOymieyLnCDrgYrqs6AgMTEyIOuYkOuKlCAxMzMy7JeQIOyLoOqzoO2VmOyEuOyalCcsXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQaGlzaGluZ1NlY3Rpb24oKSB7XG4gIHJldHVybiAoXG4gICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiYmctd2hpdGUgcHktMjAgYm9yZGVyLXQgYm9yZGVyLWdyYXktMTAwXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXIgbWItMTJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC0zIHB5LTEuNSBtYi00IHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAgYm9yZGVyIGJvcmRlci1yZWQtMjAwIHRleHQtcmVkLTYwMCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGRcIj5cbiAgICAgICAgICAgIDxBbGVydFRyaWFuZ2xlIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgIOuztOydtOyKpO2UvOyLsSDqsr3qsIHsi6xcbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwic2VjdGlvbi10aXRsZVwiPuydtOugh+qyjCDri7ntlZjsp4Ag66eI7IS47JqUPC9oMj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJzZWN0aW9uLXN1YnRpdGxlIG1heC13LWxnIG14LWF1dG9cIj5cbiAgICAgICAgICAgIOuztOydtOyKpO2UvOyLsSDtlLztlbTripQg64iE6rWs7JeQ6rKM64KYIOuwnOyDne2VoCDsiJgg7J6I7Iq164uI64ukLjxiciAvPlxuICAgICAgICAgICAg7JWE656YIDPqsIDsp4Ag7JuQ7LmZ66eMIOq4sOyWte2VmOyEuOyalC5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMyBnYXAtNiBtYi0xNFwiPlxuICAgICAgICAgIHtXQVJOSU5HUy5tYXAoKHsgaWNvbjogSWNvbiwgdGl0bGUsIGRlc2MsIGNvbG9yLCBiZywgYm9yZGVyIH0pID0+IChcbiAgICAgICAgICAgIDxkaXYga2V5PXt0aXRsZX0gY2xhc3NOYW1lPXtgY2FyZCBwLTYgJHtiZ30gYm9yZGVyICR7Ym9yZGVyfWB9PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMTIgaC0xMiByb3VuZGVkLTJ4bCBiZy13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtYi00IHNoYWRvdy1zbWB9PlxuICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT17YHctNiBoLTYgJHtjb2xvcn1gfSAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtYmFzZSBtYi0yXCI+e3RpdGxlfTwvaDM+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1zbSBsZWFkaW5nLXJlbGF4ZWRcIj57ZGVzY308L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ncmFkaWVudC10by1yIGZyb20tcHJpbWFyeS02MDAgdG8tcHJpbWFyeS03MDAgcm91bmRlZC0zeGwgcC02IHNtOnAtOFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBsZzpmbGV4LXJvdyBpdGVtcy1zdGFydCBsZzppdGVtcy1jZW50ZXIgZ2FwLTZcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgbWItNFwiPlxuICAgICAgICAgICAgICAgIDxQaG9uZUNhbGwgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC13aGl0ZSBmb250LWJvbGQgdGV4dC1sZ1wiPuuztOydtOyKpO2UvOyLsSDso7zsmpQg7IiY67KVIOyViOuCtDwvaDM+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8dWwgY2xhc3NOYW1lPVwic3BhY2UteS0yLjVcIj5cbiAgICAgICAgICAgICAgICB7VElQUy5tYXAoKHRpcCwgaSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGxpIGtleT17aX0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMi41XCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInctNSBoLTUgcm91bmRlZC1mdWxsIGJnLXdoaXRlLzIwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtd2hpdGUgdGV4dC14cyBmb250LWJvbGQgZmxleC1zaHJpbmstMCBtdC0wLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7aSArIDF9XG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS85MCB0ZXh0LXNtIGxlYWRpbmctcmVsYXhlZFwiPnt0aXB9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsZzp0ZXh0LXJpZ2h0IGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZS8xMCBib3JkZXIgYm9yZGVyLXdoaXRlLzIwIHJvdW5kZWQtMnhsIHAtNSB0ZXh0LXdoaXRlXCI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXhzIG1iLTFcIj7tlLztlbQg7Iug6rOgIOymieyLnCDsl7Drnb08L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEuNVwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBqdXN0aWZ5LXN0YXJ0IGxnOmp1c3RpZnktZW5kXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNzAgdGV4dC1zbVwiPuq4iOycteqwkOuPheybkDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14bCBmb250LWJsYWNrIGZvbnQtaW50ZXJcIj4xMzMyPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGp1c3RpZnktc3RhcnQgbGc6anVzdGlmeS1lbmRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXNtXCI+6rK97LCw7LKtPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYmxhY2sgZm9udC1pbnRlclwiPjExMjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBqdXN0aWZ5LXN0YXJ0IGxnOmp1c3RpZnktZW5kXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNzAgdGV4dC1zbVwiPuyduO2EsOuEt+ynhO2dpeybkDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14bCBmb250LWJsYWNrIGZvbnQtaW50ZXJcIj4xMTg8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL3NlY3Rpb25zL1BoaXNoaW5nU2VjdGlvbi50c3gifQ==