import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/sections/HeroSection.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/sections/HeroSection.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Search, Shield, CheckCircle, AlertTriangle, ChevronRight } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const QUICK = ["명경채 요양병원", "다다오피스", "한국신뢰금융", "02-1234-5678"];
const STATS = [
  { icon: Shield, label: "VLUE 인증 기관", value: "2,847", unit: "개" },
  { icon: CheckCircle, label: "검증 완료", value: "18.3만", unit: "건" },
  { icon: AlertTriangle, label: "사기 차단", value: "9,402", unit: "건" }
];
export default function HeroSection({ onSearch, onNavigate }) {
  _s();
  const [query, setQuery] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };
  return /* @__PURE__ */ jsxDEV("section", { className: "hero-section relative flex flex-col items-center justify-center overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-gradient-to-b from-primary-50/70 via-blue-tint to-blue-tint pointer-events-none" }, void 0, false, {
      fileName: "/home/project/src/sections/HeroSection.tsx",
      lineNumber: 27,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "relative z-10 w-full max-w-3xl mx-auto text-center hero-inner", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "hero-badge inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-600 font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Shield, { className: "hero-badge-icon flex-shrink-0" }, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 31,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { style: { wordBreak: "keep-all", whiteSpace: "nowrap" }, children: "보이스피싱 예방 통합 인증 플랫폼" }, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 32,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 30,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "hero-title font-black text-gray-900", style: { letterSpacing: "-0.035em", wordBreak: "keep-all" }, children: [
        "의심되는 기관,",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 36,
          columnNumber: 19
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-primary-500", children: "지금 바로 확인" }, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 37,
          columnNumber: 11
        }, this),
        "하세요"
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 35,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "hero-desc mx-auto text-gray-600", style: { wordBreak: "keep-all", lineHeight: "1.8" }, children: [
        "전화·문자를 받기 전, 공공데이터와 VLUE 인증 데이터를 동시에 비교분석하여",
        " ",
        /* @__PURE__ */ jsxDEV("span", { className: "text-primary-500 font-bold", children: "실시간으로 사기 여부를 즉시 판별합니다." }, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 42,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 40,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "w-full hero-search-wrap mx-auto", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center bg-white border border-gray-200 rounded-3xl shadow-card hover:shadow-card-hover focus-within:border-primary-400 focus-within:shadow-card-hover transition-all duration-200", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "relative flex-1 flex items-center min-w-0", children: [
          /* @__PURE__ */ jsxDEV(Search, { className: "hero-search-icon absolute text-gray-400 pointer-events-none flex-shrink-0" }, void 0, false, {
            fileName: "/home/project/src/sections/HeroSection.tsx",
            lineNumber: 49,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: "기관명, 전화번호, 사업자번호...",
              className: "w-full text-gray-900 focus:outline-none placeholder-gray-400 bg-transparent hero-search-input",
              style: { letterSpacing: "-0.01em" }
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/sections/HeroSection.tsx",
              lineNumber: 50,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 48,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "submit",
            onClick: () => {
              if (query.trim()) onSearch(query.trim());
            },
            className: "hero-search-btn bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold rounded-2xl transition-all duration-150 flex-shrink-0 shadow-soft flex items-center justify-center gap-1",
            children: [
              /* @__PURE__ */ jsxDEV(Search, { className: "hero-search-btn-icon" }, void 0, false, {
                fileName: "/home/project/src/sections/HeroSection.tsx",
                lineNumber: 64,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "hero-search-btn-text", children: "검색" }, void 0, false, {
                fileName: "/home/project/src/sections/HeroSection.tsx",
                lineNumber: 65,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/sections/HeroSection.tsx",
            lineNumber: 59,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 47,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 46,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "hero-quick flex flex-wrap items-center justify-center", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 hero-quick-label flex-shrink-0", children: "빠른 검색:" }, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 71,
          columnNumber: 11
        }, this),
        QUICK.map(
          (term) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                setQuery(term);
                onSearch(term);
              },
              className: "hero-quick-btn text-gray-500 bg-white hover:bg-primary-50 hover:text-primary-600 border border-gray-200 hover:border-primary-200 rounded-full transition-all duration-150 whitespace-nowrap",
              children: term
            },
            term,
            false,
            {
              fileName: "/home/project/src/sections/HeroSection.tsx",
              lineNumber: 73,
              columnNumber: 11
            },
            this
          )
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 70,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "hero-stats mx-auto", children: STATS.map(
        ({ icon: Icon, label, value, unit }) => /* @__PURE__ */ jsxDEV("div", { className: "hero-stat-item flex flex-col items-center", children: [
          /* @__PURE__ */ jsxDEV(Icon, { className: "hero-stat-icon text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/sections/HeroSection.tsx",
            lineNumber: 87,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "font-black text-gray-900 font-inter hero-stat-value leading-tight", children: [
            value,
            /* @__PURE__ */ jsxDEV("span", { className: "text-gray-500 font-semibold hero-stat-unit", children: unit }, void 0, false, {
              fileName: "/home/project/src/sections/HeroSection.tsx",
              lineNumber: 89,
              columnNumber: 24
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/HeroSection.tsx",
            lineNumber: 88,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 text-center hero-stat-label", children: label }, void 0, false, {
            fileName: "/home/project/src/sections/HeroSection.tsx",
            lineNumber: 91,
            columnNumber: 15
          }, this)
        ] }, label, true, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 86,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 84,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap items-center justify-center hero-cta-wrap", children: [
        /* @__PURE__ */ jsxDEV("button", { onClick: () => onNavigate("pricing"), className: "btn-primary", children: [
          "VLUE 인증 신청하기",
          /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4" }, void 0, false, {
            fileName: "/home/project/src/sections/HeroSection.tsx",
            lineNumber: 99,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 97,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: () => onNavigate("shopping"), className: "btn-secondary", children: "블루쇼핑 바로가기" }, void 0, false, {
          fileName: "/home/project/src/sections/HeroSection.tsx",
          lineNumber: 101,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/HeroSection.tsx",
        lineNumber: 96,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/HeroSection.tsx",
      lineNumber: 29,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/sections/HeroSection.tsx",
    lineNumber: 26,
    columnNumber: 5
  }, this);
}
_s(HeroSection, "qO/HZodsWTfJhuzZtdaxiosei2U=");
_c = HeroSection;
var _c;
$RefreshReg$(_c, "HeroSection");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/sections/HeroSection.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/sections/HeroSection.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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SyxXQUFVLHFDQUFoQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFpRDtBQUFBLFVBQ2pELHVCQUFDLFVBQUssV0FBVSxxRUFDYkQ7QUFBQUE7QUFBQUEsWUFBTSx1QkFBQyxVQUFLLFdBQVUsOENBQThDQyxrQkFBOUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBbUU7QUFBQSxlQUQ1RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsVUFDQSx1QkFBQyxVQUFLLFdBQVUsNkNBQTZDRixtQkFBN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBbUU7QUFBQSxhQUwzREEsT0FBVjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBTUE7QUFBQSxNQUNELEtBVEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVVBO0FBQUEsTUFFQSx1QkFBQyxTQUFJLFdBQVUsNERBQ2I7QUFBQSwrQkFBQyxZQUFPLFNBQVMsTUFBTUssV0FBVyxTQUFTLEdBQUcsV0FBVSxlQUFhO0FBQUE7QUFBQSxVQUVuRSx1QkFBQyxnQkFBYSxXQUFVLGFBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWlDO0FBQUEsYUFGbkM7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUdBO0FBQUEsUUFDQSx1QkFBQyxZQUFPLFNBQVMsTUFBTUEsV0FBVyxVQUFVLEdBQUcsV0FBVSxpQkFBZSx5QkFBeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsV0FQRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBUUE7QUFBQSxTQTNFRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBNEVBO0FBQUEsT0EvRUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWdGQTtBQUVKO0FBQUNDLEdBM0Z1QkgsYUFBVztBQUFBbUIsS0FBWG5CO0FBQVcsSUFBQW1CO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJGb3JtRXZlbnQiLCJTZWFyY2giLCJTaGllbGQiLCJDaGVja0NpcmNsZSIsIkFsZXJ0VHJpYW5nbGUiLCJDaGV2cm9uUmlnaHQiLCJRVUlDSyIsIlNUQVRTIiwiaWNvbiIsImxhYmVsIiwidmFsdWUiLCJ1bml0IiwiSGVyb1NlY3Rpb24iLCJvblNlYXJjaCIsIm9uTmF2aWdhdGUiLCJfcyIsInF1ZXJ5Iiwic2V0UXVlcnkiLCJ1c2VTdGF0ZSIsImhhbmRsZVN1Ym1pdCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaW0iLCJ3b3JkQnJlYWsiLCJ3aGl0ZVNwYWNlIiwibGV0dGVyU3BhY2luZyIsImxpbmVIZWlnaHQiLCJ0YXJnZXQiLCJtYXAiLCJ0ZXJtIiwiSWNvbiIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkhlcm9TZWN0aW9uLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSwgRm9ybUV2ZW50IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgU2VhcmNoLCBTaGllbGQsIENoZWNrQ2lyY2xlLCBBbGVydFRyaWFuZ2xlLCBDaGV2cm9uUmlnaHQgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuXG5pbnRlcmZhY2UgSGVyb1NlY3Rpb25Qcm9wcyB7XG4gIG9uU2VhcmNoOiAocXVlcnk6IHN0cmluZykgPT4gdm9pZDtcbiAgb25OYXZpZ2F0ZTogKHZpZXc6ICdwcmljaW5nJyB8ICdzaG9wcGluZycpID0+IHZvaWQ7XG59XG5cbmNvbnN0IFFVSUNLID0gWyfrqoXqsr3ssYQg7JqU7JaR67OR7JuQJywgJ+uLpOuLpOyYpO2UvOyKpCcsICftlZzqta3si6DrorDquIjsnLUnLCAnMDItMTIzNC01Njc4J107XG5cbmNvbnN0IFNUQVRTID0gW1xuICB7IGljb246IFNoaWVsZCwgbGFiZWw6ICdWTFVFIOyduOymnSDquLDqtIAnLCB2YWx1ZTogJzIsODQ3JywgdW5pdDogJ+qwnCcgfSxcbiAgeyBpY29uOiBDaGVja0NpcmNsZSwgbGFiZWw6ICfqsoDspp0g7JmE66OMJywgdmFsdWU6ICcxOC4z66eMJywgdW5pdDogJ+qxtCcgfSxcbiAgeyBpY29uOiBBbGVydFRyaWFuZ2xlLCBsYWJlbDogJ+yCrOq4sCDssKjri6gnLCB2YWx1ZTogJzksNDAyJywgdW5pdDogJ+qxtCcgfSxcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEhlcm9TZWN0aW9uKHsgb25TZWFyY2gsIG9uTmF2aWdhdGUgfTogSGVyb1NlY3Rpb25Qcm9wcykge1xuICBjb25zdCBbcXVlcnksIHNldFF1ZXJ5XSA9IHVzZVN0YXRlKCcnKTtcblxuICBjb25zdCBoYW5kbGVTdWJtaXQgPSAoZTogRm9ybUV2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmIChxdWVyeS50cmltKCkpIG9uU2VhcmNoKHF1ZXJ5LnRyaW0oKSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJoZXJvLXNlY3Rpb24gcmVsYXRpdmUgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgYmctZ3JhZGllbnQtdG8tYiBmcm9tLXByaW1hcnktNTAvNzAgdmlhLWJsdWUtdGludCB0by1ibHVlLXRpbnQgcG9pbnRlci1ldmVudHMtbm9uZVwiIC8+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgei0xMCB3LWZ1bGwgbWF4LXctM3hsIG14LWF1dG8gdGV4dC1jZW50ZXIgaGVyby1pbm5lclwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImhlcm8tYmFkZ2UgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTIwMCB0ZXh0LXByaW1hcnktNjAwIGZvbnQtc2VtaWJvbGRcIj5cbiAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cImhlcm8tYmFkZ2UtaWNvbiBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICA8c3BhbiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcsIHdoaXRlU3BhY2U6ICdub3dyYXAnIH19PuuztOydtOyKpO2UvOyLsSDsmIjrsKkg7Ya17ZWpIOyduOymnSDtlIzrnqvtj7w8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxoMSBjbGFzc05hbWU9XCJoZXJvLXRpdGxlIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMFwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMzVlbScsIHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICDsnZjsi6zrkJjripQg6riw6rSALDxiciAvPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS01MDBcIj7sp4DquIgg67CU66GcIO2ZleyduDwvc3Bhbj7tlZjshLjsmpRcbiAgICAgICAgPC9oMT5cblxuICAgICAgICA8cCBjbGFzc05hbWU9XCJoZXJvLWRlc2MgbXgtYXV0byB0ZXh0LWdyYXktNjAwXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnLCBsaW5lSGVpZ2h0OiAnMS44JyB9fT5cbiAgICAgICAgICDsoITtmZTCt+usuOyekOulvCDrsJvquLAg7KCELCDqs7Xqs7XrjbDsnbTthLDsmYAgVkxVRSDsnbjspp0g642w7J207YSw66W8IOuPmeyLnOyXkCDruYTqtZDrtoTshJ3tlZjsl6x7JyAnfVxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS01MDAgZm9udC1ib2xkXCI+7Iuk7Iuc6rCE7Jy866GcIOyCrOq4sCDsl6zrtoDrpbwg7KaJ7IucIO2MkOuzhO2VqeuLiOuLpC48L3NwYW4+XG4gICAgICAgIDwvcD5cblxuICAgICAgICB7Lyog6rKA7IOJ7LC9OiDrsoTtirzsnbQg7KCI64yAIOyemOumrOyngCDslYrrj4TroZ0gZmxleC1zaHJpbmstMCArIOy1nOyGjCDrhIjruYQg6rOg7KCVICovfVxuICAgICAgICA8Zm9ybSBvblN1Ym1pdD17aGFuZGxlU3VibWl0fSBjbGFzc05hbWU9XCJ3LWZ1bGwgaGVyby1zZWFyY2gtd3JhcCBteC1hdXRvXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBiZy13aGl0ZSBib3JkZXIgYm9yZGVyLWdyYXktMjAwIHJvdW5kZWQtM3hsIHNoYWRvdy1jYXJkIGhvdmVyOnNoYWRvdy1jYXJkLWhvdmVyIGZvY3VzLXdpdGhpbjpib3JkZXItcHJpbWFyeS00MDAgZm9jdXMtd2l0aGluOnNoYWRvdy1jYXJkLWhvdmVyIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTIwMFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSBmbGV4LTEgZmxleCBpdGVtcy1jZW50ZXIgbWluLXctMFwiPlxuICAgICAgICAgICAgICA8U2VhcmNoIGNsYXNzTmFtZT1cImhlcm8tc2VhcmNoLWljb24gYWJzb2x1dGUgdGV4dC1ncmF5LTQwMCBwb2ludGVyLWV2ZW50cy1ub25lIGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9e3F1ZXJ5fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UXVlcnkoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi6riw6rSA66qFLCDsoITtmZTrsojtmLgsIOyCrOyXheyekOuyiO2YuC4uLlwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtZ3JheS05MDAgZm9jdXM6b3V0bGluZS1ub25lIHBsYWNlaG9sZGVyLWdyYXktNDAwIGJnLXRyYW5zcGFyZW50IGhlcm8tc2VhcmNoLWlucHV0XCJcbiAgICAgICAgICAgICAgICBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDFlbScgfX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICB0eXBlPVwic3VibWl0XCJcbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4geyBpZiAocXVlcnkudHJpbSgpKSBvblNlYXJjaChxdWVyeS50cmltKCkpOyB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoZXJvLXNlYXJjaC1idG4gYmctcHJpbWFyeS01MDAgaG92ZXI6YmctcHJpbWFyeS02MDAgYWN0aXZlOmJnLXByaW1hcnktNzAwIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCByb3VuZGVkLTJ4bCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0xNTAgZmxleC1zaHJpbmstMCBzaGFkb3ctc29mdCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVwiaGVyby1zZWFyY2gtYnRuLWljb25cIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJoZXJvLXNlYXJjaC1idG4tdGV4dFwiPuqygOyDiTwvc3Bhbj5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Zvcm0+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoZXJvLXF1aWNrIGZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgaGVyby1xdWljay1sYWJlbCBmbGV4LXNocmluay0wXCI+67mg66W4IOqygOyDiTo8L3NwYW4+XG4gICAgICAgICAge1FVSUNLLm1hcCgodGVybSkgPT4gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBrZXk9e3Rlcm19XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHsgc2V0UXVlcnkodGVybSk7IG9uU2VhcmNoKHRlcm0pOyB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoZXJvLXF1aWNrLWJ0biB0ZXh0LWdyYXktNTAwIGJnLXdoaXRlIGhvdmVyOmJnLXByaW1hcnktNTAgaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCBib3JkZXIgYm9yZGVyLWdyYXktMjAwIGhvdmVyOmJvcmRlci1wcmltYXJ5LTIwMCByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwIHdoaXRlc3BhY2Utbm93cmFwXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3Rlcm19XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qIO2GteqzhDog7KKB7J2AIO2ZlOuptOyXkOyEnCDsnpDsl7DsiqTrn73qsowgd3JhcCAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoZXJvLXN0YXRzIG14LWF1dG9cIj5cbiAgICAgICAgICB7U1RBVFMubWFwKCh7IGljb246IEljb24sIGxhYmVsLCB2YWx1ZSwgdW5pdCB9KSA9PiAoXG4gICAgICAgICAgICA8ZGl2IGtleT17bGFiZWx9IGNsYXNzTmFtZT1cImhlcm8tc3RhdC1pdGVtIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cImhlcm8tc3RhdC1pY29uIHRleHQtcHJpbWFyeS02MDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRleHQtZ3JheS05MDAgZm9udC1pbnRlciBoZXJvLXN0YXQtdmFsdWUgbGVhZGluZy10aWdodFwiPlxuICAgICAgICAgICAgICAgIHt2YWx1ZX08c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIGZvbnQtc2VtaWJvbGQgaGVyby1zdGF0LXVuaXRcIj57dW5pdH08L3NwYW4+XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LWNlbnRlciBoZXJvLXN0YXQtbGFiZWxcIj57bGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGhlcm8tY3RhLXdyYXBcIj5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IG9uTmF2aWdhdGUoJ3ByaWNpbmcnKX0gY2xhc3NOYW1lPVwiYnRuLXByaW1hcnlcIj5cbiAgICAgICAgICAgIFZMVUUg7J247KadIOyLoOyyre2VmOq4sFxuICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IG9uTmF2aWdhdGUoJ3Nob3BwaW5nJyl9IGNsYXNzTmFtZT1cImJ0bi1zZWNvbmRhcnlcIj5cbiAgICAgICAgICAgIOu4lOujqOyHvO2VkSDrsJTroZzqsIDquLBcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL3NlY3Rpb25zL0hlcm9TZWN0aW9uLnRzeCJ9