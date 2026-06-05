import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/Footer.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/Footer.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { Shield, Mail, Phone, MapPin } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const FOOTER_SECTIONS = [
  {
    label: "서비스",
    links: [
      { text: "기관 검색", view: "home" },
      { text: "VLUE 인증 신청", view: "pricing" },
      { text: "블루쇼핑", view: "shopping" },
      { text: "자료실", view: "resources" }
    ]
  },
  {
    label: "정보",
    links: [
      { text: "서비스소개", view: "home" },
      { text: "기업뉴스", view: "home" },
      { text: "지역별행사", view: "home" },
      { text: "인증절차안내", view: "pricing" }
    ]
  },
  {
    label: "지원",
    links: [
      { text: "고객지원", view: "home" },
      { text: "구인구직", view: "home" },
      { text: "피해신고", view: "home" },
      { text: "API 문서", view: "home" }
    ]
  },
  {
    label: "법적 고지",
    links: [
      { text: "이용약관", view: "home" },
      { text: "개인정보처리방침", view: "home" },
      { text: "저작권 정책", view: "home" },
      { text: "쿠키 정책", view: "home" }
    ]
  }
];
export default function Footer({ onNavigate }) {
  return /* @__PURE__ */ jsxDEV("footer", { className: "bg-gray-900 text-gray-300", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-8 mb-10", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-white", strokeWidth: 2.5 }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 55,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 54,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-lg font-black text-white tracking-tight", children: "VLUE" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 57,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Footer.tsx",
          lineNumber: 53,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs leading-relaxed mb-5", children: [
          "보이스피싱 피해 예방을 위한",
          /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 60,
            columnNumber: 30
          }, this),
          "통합 인증 및 검증 플랫폼"
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Footer.tsx",
          lineNumber: 59,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-xs text-gray-400", children: [
            /* @__PURE__ */ jsxDEV(Phone, { className: "w-3.5 h-3.5 text-primary-400" }, void 0, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 65,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "1588-0000 (평일 09~18시)" }, void 0, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 66,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 64,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-xs text-gray-400", children: [
            /* @__PURE__ */ jsxDEV(Mail, { className: "w-3.5 h-3.5 text-primary-400" }, void 0, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 69,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "support@vlue.kr" }, void 0, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 70,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 68,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 text-xs text-gray-400", children: [
            /* @__PURE__ */ jsxDEV(MapPin, { className: "w-3.5 h-3.5 text-primary-400" }, void 0, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 73,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "서울특별시 강남구 테헤란로 427" }, void 0, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 74,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 72,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Footer.tsx",
          lineNumber: 63,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/Footer.tsx",
        lineNumber: 52,
        columnNumber: 11
      }, this),
      FOOTER_SECTIONS.map(
        ({ label, links }) => /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-white text-xs font-bold uppercase tracking-wider mb-3", children: label }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 81,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("ul", { className: "space-y-2", children: links.map(
            ({ text, view }) => /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => onNavigate(view),
                className: "text-gray-400 text-xs hover:text-white transition-colors",
                children: text
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/components/Footer.tsx",
                lineNumber: 85,
                columnNumber: 21
              },
              this
            ) }, text, false, {
              fileName: "/home/project/src/components/Footer.tsx",
              lineNumber: 84,
              columnNumber: 15
            }, this)
          ) }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 82,
            columnNumber: 15
          }, this)
        ] }, label, true, {
          fileName: "/home/project/src/components/Footer.tsx",
          lineNumber: 80,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/components/Footer.tsx",
      lineNumber: 51,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs", children: "© 2026 VLUE Inc. All rights reserved. | 사업자등록번호: 000-00-00000" }, void 0, false, {
        fileName: "/home/project/src/components/Footer.tsx",
        lineNumber: 99,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 104,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-gray-500 text-xs", children: "시스템 정상 운영 중" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 105,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Footer.tsx",
          lineNumber: 103,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-gray-500 text-xs", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "피해 신고:" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 108,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-primary-400 font-semibold", children: "1332" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 109,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "/" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 110,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-primary-400 font-semibold", children: "112" }, void 0, false, {
            fileName: "/home/project/src/components/Footer.tsx",
            lineNumber: 111,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/Footer.tsx",
          lineNumber: 107,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/Footer.tsx",
        lineNumber: 102,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/Footer.tsx",
      lineNumber: 98,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/components/Footer.tsx",
    lineNumber: 50,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/components/Footer.tsx",
    lineNumber: 49,
    columnNumber: 5
  }, this);
}
_c = Footer;
var _c;
$RefreshReg$(_c, "Footer");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/Footer.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/Footer.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUEsSUFFQSx1QkFBQyxTQUFJLFdBQVUsOEZBQ2I7QUFBQSw2QkFBQyxPQUFFLFdBQVUseUJBQXVCLDZFQUFwQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSwyQkFDYjtBQUFBLCtCQUFDLFNBQUksV0FBVSw2QkFDYjtBQUFBLGlDQUFDLFVBQUssV0FBVSwyREFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdUU7QUFBQSxVQUN2RSx1QkFBQyxVQUFLLFdBQVUseUJBQXdCLDJCQUF4QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFtRDtBQUFBLGFBRnJEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFHQTtBQUFBLFFBQ0EsdUJBQUMsU0FBSSxXQUFVLGlEQUNiO0FBQUEsaUNBQUMsVUFBSyxzQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFZO0FBQUEsVUFDWix1QkFBQyxVQUFLLFdBQVUsa0NBQWlDLG9CQUFqRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFxRDtBQUFBLFVBQ3JELHVCQUFDLFVBQUssaUJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBTztBQUFBLFVBQ1AsdUJBQUMsVUFBSyxXQUFVLGtDQUFpQyxtQkFBakQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBb0Q7QUFBQSxhQUp0RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBS0E7QUFBQSxXQVZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFXQTtBQUFBLFNBZkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWdCQTtBQUFBLE9BaEVGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FpRUEsS0FsRUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQW1FQTtBQUVKO0FBQUNPLEtBdkV1Qkg7QUFBTSxJQUFBRztBQUFBQyxhQUFBRCxJQUFBIiwibmFtZXMiOlsiUGhvbmUiLCJGT09URVJfU0VDVElPTlMiLCJsYWJlbCIsImxpbmtzIiwidGV4dCIsInZpZXciLCJGb290ZXIiLCJvbk5hdmlnYXRlIiwibWFwIiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiRm9vdGVyLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTaGllbGQsIE1haWwsIFBob25lLCBNYXBQaW4gfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgVmlldyB9IGZyb20gJy4uL3R5cGVzJztcblxuaW50ZXJmYWNlIEZvb3RlclByb3BzIHtcbiAgb25OYXZpZ2F0ZTogKHZpZXc6IFZpZXcpID0+IHZvaWQ7XG59XG5cbmNvbnN0IEZPT1RFUl9TRUNUSU9OUyA9IFtcbiAge1xuICAgIGxhYmVsOiAn7ISc67mE7IqkJyxcbiAgICBsaW5rczogW1xuICAgICAgeyB0ZXh0OiAn6riw6rSAIOqygOyDiScsIHZpZXc6ICdob21lJyBhcyBWaWV3IH0sXG4gICAgICB7IHRleHQ6ICdWTFVFIOyduOymnSDsi6Dssq0nLCB2aWV3OiAncHJpY2luZycgYXMgVmlldyB9LFxuICAgICAgeyB0ZXh0OiAn67iU66Oo7Ie87ZWRJywgdmlldzogJ3Nob3BwaW5nJyBhcyBWaWV3IH0sXG4gICAgICB7IHRleHQ6ICfsnpDro4zsi6QnLCB2aWV3OiAncmVzb3VyY2VzJyBhcyBWaWV3IH0sXG4gICAgXSxcbiAgfSxcbiAge1xuICAgIGxhYmVsOiAn7KCV67O0JyxcbiAgICBsaW5rczogW1xuICAgICAgeyB0ZXh0OiAn7ISc67mE7Iqk7IaM6rCcJywgdmlldzogJ2hvbWUnIGFzIFZpZXcgfSxcbiAgICAgIHsgdGV4dDogJ+q4sOyXheuJtOyKpCcsIHZpZXc6ICdob21lJyBhcyBWaWV3IH0sXG4gICAgICB7IHRleHQ6ICfsp4Dsl63rs4TtlonsgqwnLCB2aWV3OiAnaG9tZScgYXMgVmlldyB9LFxuICAgICAgeyB0ZXh0OiAn7J247Kad7KCI7LCo7JWI64K0JywgdmlldzogJ3ByaWNpbmcnIGFzIFZpZXcgfSxcbiAgICBdLFxuICB9LFxuICB7XG4gICAgbGFiZWw6ICfsp4Dsm5AnLFxuICAgIGxpbmtzOiBbXG4gICAgICB7IHRleHQ6ICfqs6DqsJ3sp4Dsm5AnLCB2aWV3OiAnaG9tZScgYXMgVmlldyB9LFxuICAgICAgeyB0ZXh0OiAn6rWs7J246rWs7KeBJywgdmlldzogJ2hvbWUnIGFzIFZpZXcgfSxcbiAgICAgIHsgdGV4dDogJ+2UvO2VtOyLoOqzoCcsIHZpZXc6ICdob21lJyBhcyBWaWV3IH0sXG4gICAgICB7IHRleHQ6ICdBUEkg66y47IScJywgdmlldzogJ2hvbWUnIGFzIFZpZXcgfSxcbiAgICBdLFxuICB9LFxuICB7XG4gICAgbGFiZWw6ICfrspXsoIEg6rOg7KeAJyxcbiAgICBsaW5rczogW1xuICAgICAgeyB0ZXh0OiAn7J207Jqp7JW96rSAJywgdmlldzogJ2hvbWUnIGFzIFZpZXcgfSxcbiAgICAgIHsgdGV4dDogJ+qwnOyduOygleuztOyymOumrOuwqey5qCcsIHZpZXc6ICdob21lJyBhcyBWaWV3IH0sXG4gICAgICB7IHRleHQ6ICfsoIDsnpHqtowg7KCV7LGFJywgdmlldzogJ2hvbWUnIGFzIFZpZXcgfSxcbiAgICAgIHsgdGV4dDogJ+y/oO2CpCDsoJXssYUnLCB2aWV3OiAnaG9tZScgYXMgVmlldyB9LFxuICAgIF0sXG4gIH0sXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBGb290ZXIoeyBvbk5hdmlnYXRlIH06IEZvb3RlclByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPGZvb3RlciBjbGFzc05hbWU9XCJiZy1ncmF5LTkwMCB0ZXh0LWdyYXktMzAwXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB5LTEyXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtNSBnYXAtOCBtYi0xMFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWQ6Y29sLXNwYW4tMVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLWxnIGJnLXByaW1hcnktNjAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtd2hpdGVcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJsYWNrIHRleHQtd2hpdGUgdHJhY2tpbmctdGlnaHRcIj5WTFVFPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQteHMgbGVhZGluZy1yZWxheGVkIG1iLTVcIj5cbiAgICAgICAgICAgICAg67O07J207Iqk7ZS87IuxIO2UvO2VtCDsmIjrsKnsnYQg7JyE7ZWcPGJyIC8+XG4gICAgICAgICAgICAgIO2Gte2VqSDsnbjspp0g67CPIOqygOymnSDtlIzrnqvtj7xcbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC14cyB0ZXh0LWdyYXktNDAwXCI+XG4gICAgICAgICAgICAgICAgPFBob25lIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtcHJpbWFyeS00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPjE1ODgtMDAwMCAo7Y+J7J28IDA5fjE47IucKTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC14cyB0ZXh0LWdyYXktNDAwXCI+XG4gICAgICAgICAgICAgICAgPE1haWwgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgdGV4dC1wcmltYXJ5LTQwMFwiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4+c3VwcG9ydEB2bHVlLmtyPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj5cbiAgICAgICAgICAgICAgICA8TWFwUGluIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtcHJpbWFyeS00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPuyEnOyauO2KueuzhOyLnCDqsJXrgqjqtawg7YWM7Zek656A66GcIDQyNzwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHtGT09URVJfU0VDVElPTlMubWFwKCh7IGxhYmVsLCBsaW5rcyB9KSA9PiAoXG4gICAgICAgICAgICA8ZGl2IGtleT17bGFiZWx9PlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIgbWItM1wiPntsYWJlbH08L2g0PlxuICAgICAgICAgICAgICA8dWwgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgICAge2xpbmtzLm1hcCgoeyB0ZXh0LCB2aWV3IH0pID0+IChcbiAgICAgICAgICAgICAgICAgIDxsaSBrZXk9e3RleHR9PlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25OYXZpZ2F0ZSh2aWV3KX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQteHMgaG92ZXI6dGV4dC13aGl0ZSB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICB7dGV4dH1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHQtNiBib3JkZXItdCBib3JkZXItZ3JheS04MDAgZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0zXCI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LXhzXCI+XG4gICAgICAgICAgICDCqSAyMDI2IFZMVUUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLiB8IOyCrOyXheyekOuTseuhneuyiO2YuDogMDAwLTAwLTAwMDAwXG4gICAgICAgICAgPC9wPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ3LTEuNSBoLTEuNSByb3VuZGVkLWZ1bGwgYmctZW1lcmFsZC00MDAgYW5pbWF0ZS1wdWxzZVwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC14c1wiPuyLnOyKpO2FnCDsoJXsg4Eg7Jq07JiBIOykkTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LWdyYXktNTAwIHRleHQteHNcIj5cbiAgICAgICAgICAgICAgPHNwYW4+7ZS87ZW0IOyLoOqzoDo8L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS00MDAgZm9udC1zZW1pYm9sZFwiPjEzMzI8L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuPi88L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS00MDAgZm9udC1zZW1pYm9sZFwiPjExMjwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9vdGVyPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9jb21wb25lbnRzL0Zvb3Rlci50c3gifQ==