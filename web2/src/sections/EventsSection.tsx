import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/sections/EventsSection.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/sections/EventsSection.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { MapPin, Calendar, ArrowRight, Users, ChevronRight } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { newsItems } from "/src/data/mockData.ts";
const REGION_COLORS = {
  "서울": "bg-primary-100 text-primary-700",
  "부산": "bg-cyan-100 text-cyan-700",
  "대구": "bg-orange-100 text-orange-700",
  "인천": "bg-emerald-100 text-emerald-700",
  "광주": "bg-violet-100 text-violet-700",
  "대전": "bg-amber-100 text-amber-700"
};
function getRegionColor(region) {
  if (!region) return "bg-gray-100 text-gray-600";
  const city = region.split(" ")[0];
  return REGION_COLORS[city] ?? "bg-gray-100 text-gray-600";
}
const FEATURED_ORGS = [
  {
    name: "명경채 요양병원",
    category: "의료기관",
    desc: "VLUE 인증 의료기관. 노인 요양 및 재활 전문.",
    imageUrl: "https://images.pexels.com/photos/305565/pexels-photo-305565.jpeg?auto=compress&cs=tinysrgb&w=300",
    region: "서울 강남구"
  },
  {
    name: "다다오피스",
    category: "공유오피스",
    desc: "VLUE 인증 프리미엄 공유오피스. 보안 비즈니스 환경 제공.",
    imageUrl: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=300",
    region: "서울 마포구"
  },
  {
    name: "한국신뢰금융",
    category: "금융기관",
    desc: "VLUE 인증 대출중개. 금융감독원 등록 합법 기관.",
    imageUrl: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=300",
    region: "서울 중구"
  }
];
export default function EventsSection() {
  const events = newsItems.filter((n) => n.category === "event");
  return /* @__PURE__ */ jsxDEV("section", { className: "bg-white py-20 border-t border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-10", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Calendar, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/sections/EventsSection.tsx",
          lineNumber: 52,
          columnNumber: 15
        }, this),
        "지역별 행사"
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 51,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "section-title mb-1", children: "지역 이벤트 & 행사" }, void 0, false, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 55,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "section-subtitle mb-6", children: "전국 각 지역의 보이스피싱 예방 행사에 참여해 보세요." }, void 0, false, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 56,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: events.map(
        (event) => /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "card group cursor-pointer p-4 flex items-start gap-4 hover:border-primary-200",
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-11 h-11 rounded-xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0 border border-primary-100", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-primary-600 text-xs font-black leading-none", children: event.date.split("-")[2] }, void 0, false, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 65,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-primary-400 text-xs", children: [
                  event.date.split("-")[1],
                  "월"
                ] }, void 0, true, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 68,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 64,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1", children: event.region && /* @__PURE__ */ jsxDEV("span", { className: `text-xs font-semibold px-2 py-0.5 rounded-full ${getRegionColor(event.region)}`, children: /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-0.5", children: [
                  /* @__PURE__ */ jsxDEV(MapPin, { className: "w-2.5 h-2.5" }, void 0, false, {
                    fileName: "/home/project/src/sections/EventsSection.tsx",
                    lineNumber: 77,
                    columnNumber: 29
                  }, this),
                  event.region
                ] }, void 0, true, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 76,
                  columnNumber: 27
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 75,
                  columnNumber: 21
                }, this) }, void 0, false, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 73,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("h4", { className: "text-gray-900 font-semibold text-sm group-hover:text-primary-600 transition-colors", children: event.title }, void 0, false, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 83,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs mt-0.5 line-clamp-2", children: event.summary }, void 0, false, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 84,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 72,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-xs text-primary-500 font-medium flex-shrink-0", children: [
                "신청",
                /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-3.5 h-3.5" }, void 0, false, {
                  fileName: "/home/project/src/sections/EventsSection.tsx",
                  lineNumber: 88,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 86,
                columnNumber: 19
              }, this)
            ]
          },
          event.id,
          true,
          {
            fileName: "/home/project/src/sections/EventsSection.tsx",
            lineNumber: 60,
            columnNumber: 15
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 58,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("button", { className: "mt-4 flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline", children: [
        "전체 행사 보기 ",
        /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4" }, void 0, false, {
          fileName: "/home/project/src/sections/EventsSection.tsx",
          lineNumber: 94,
          columnNumber: 24
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 93,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/EventsSection.tsx",
      lineNumber: 50,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-2", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Users, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/sections/EventsSection.tsx",
          lineNumber: 100,
          columnNumber: 15
        }, this),
        "인증 업체 홍보"
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 99,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "section-title mb-1", children: "VLUE 인증 기관" }, void 0, false, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 103,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "section-subtitle mb-6", children: "검증된 기관과 안전하게 거래하세요." }, void 0, false, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 104,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: FEATURED_ORGS.map(
        (org) => /* @__PURE__ */ jsxDEV("div", { className: "card group cursor-pointer flex items-center gap-3 p-3 hover:border-primary-200", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100", children: /* @__PURE__ */ jsxDEV("img", { src: org.imageUrl, alt: org.name, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300", loading: "lazy" }, void 0, false, {
            fileName: "/home/project/src/sections/EventsSection.tsx",
            lineNumber: 110,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/home/project/src/sections/EventsSection.tsx",
            lineNumber: 109,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 mb-0.5", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-900", children: org.name }, void 0, false, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 114,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "badge-green text-xs py-0 px-1.5", children: "인증" }, void 0, false, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 115,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/sections/EventsSection.tsx",
              lineNumber: 113,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-primary-500 font-medium", children: org.category }, void 0, false, {
              fileName: "/home/project/src/sections/EventsSection.tsx",
              lineNumber: 117,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-400 mt-0.5 line-clamp-1", children: org.desc }, void 0, false, {
              fileName: "/home/project/src/sections/EventsSection.tsx",
              lineNumber: 118,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 mt-0.5", children: [
              /* @__PURE__ */ jsxDEV(MapPin, { className: "w-2.5 h-2.5 text-gray-400" }, void 0, false, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 120,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400", children: org.region }, void 0, false, {
                fileName: "/home/project/src/sections/EventsSection.tsx",
                lineNumber: 121,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/sections/EventsSection.tsx",
              lineNumber: 119,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/sections/EventsSection.tsx",
            lineNumber: 112,
            columnNumber: 19
          }, this)
        ] }, org.name, true, {
          fileName: "/home/project/src/sections/EventsSection.tsx",
          lineNumber: 108,
          columnNumber: 15
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/sections/EventsSection.tsx",
        lineNumber: 106,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/EventsSection.tsx",
      lineNumber: 98,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/sections/EventsSection.tsx",
    lineNumber: 49,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "/home/project/src/sections/EventsSection.tsx",
    lineNumber: 48,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/sections/EventsSection.tsx",
    lineNumber: 47,
    columnNumber: 5
  }, this);
}
_c = EventsSection;
var _c;
$RefreshReg$(_c, "EventsSection");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/sections/EventsSection.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/sections/EventsSection.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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LGVBVkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFXQTtBQUFBLGFBZlFrQixJQUFJZCxNQUFkO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFnQkE7QUFBQSxNQUNELEtBbkJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFvQkE7QUFBQSxTQTVCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBNkJBO0FBQUEsT0E5RUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQStFQSxLQWhGRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBaUZBLEtBbEZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FtRkE7QUFFSjtBQUFDZSxLQXpGdUJYO0FBQWEsSUFBQVc7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbIkFycm93UmlnaHQiLCJDaGV2cm9uUmlnaHQiLCJuZXdzSXRlbXMiLCJSRUdJT05fQ09MT1JTIiwiZ2V0UmVnaW9uQ29sb3IiLCJyZWdpb24iLCJjaXR5Iiwic3BsaXQiLCJGRUFUVVJFRF9PUkdTIiwibmFtZSIsImNhdGVnb3J5IiwiZGVzYyIsImltYWdlVXJsIiwiRXZlbnRzU2VjdGlvbiIsImV2ZW50cyIsImZpbHRlciIsIm4iLCJtYXAiLCJldmVudCIsImRhdGUiLCJ0aXRsZSIsInN1bW1hcnkiLCJpZCIsIm9yZyIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkV2ZW50c1NlY3Rpb24udHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1hcFBpbiwgQ2FsZW5kYXIsIEFycm93UmlnaHQsIFVzZXJzLCBDaGV2cm9uUmlnaHQgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgbmV3c0l0ZW1zIH0gZnJvbSAnLi4vZGF0YS9tb2NrRGF0YSc7XG5cbmNvbnN0IFJFR0lPTl9DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICfshJzsmrgnOiAnYmctcHJpbWFyeS0xMDAgdGV4dC1wcmltYXJ5LTcwMCcsXG4gICfrtoDsgrAnOiAnYmctY3lhbi0xMDAgdGV4dC1jeWFuLTcwMCcsXG4gICfrjIDqtawnOiAnYmctb3JhbmdlLTEwMCB0ZXh0LW9yYW5nZS03MDAnLFxuICAn7J247LKcJzogJ2JnLWVtZXJhbGQtMTAwIHRleHQtZW1lcmFsZC03MDAnLFxuICAn6rSR7KO8JzogJ2JnLXZpb2xldC0xMDAgdGV4dC12aW9sZXQtNzAwJyxcbiAgJ+uMgOyghCc6ICdiZy1hbWJlci0xMDAgdGV4dC1hbWJlci03MDAnLFxufTtcblxuZnVuY3Rpb24gZ2V0UmVnaW9uQ29sb3IocmVnaW9uPzogc3RyaW5nKSB7XG4gIGlmICghcmVnaW9uKSByZXR1cm4gJ2JnLWdyYXktMTAwIHRleHQtZ3JheS02MDAnO1xuICBjb25zdCBjaXR5ID0gcmVnaW9uLnNwbGl0KCcgJylbMF07XG4gIHJldHVybiBSRUdJT05fQ09MT1JTW2NpdHldID8/ICdiZy1ncmF5LTEwMCB0ZXh0LWdyYXktNjAwJztcbn1cblxuY29uc3QgRkVBVFVSRURfT1JHUyA9IFtcbiAge1xuICAgIG5hbWU6ICfrqoXqsr3ssYQg7JqU7JaR67OR7JuQJyxcbiAgICBjYXRlZ29yeTogJ+ydmOujjOq4sOq0gCcsXG4gICAgZGVzYzogJ1ZMVUUg7J247KadIOydmOujjOq4sOq0gC4g64W47J24IOyalOyWkSDrsI8g7J6s7ZmcIOyghOusuC4nLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMzA1NTY1L3BleGVscy1waG90by0zMDU1NjUuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9MzAwJyxcbiAgICByZWdpb246ICfshJzsmrgg6rCV64Ko6rWsJyxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICfri6Tri6TsmKTtlLzsiqQnLFxuICAgIGNhdGVnb3J5OiAn6rO17Jyg7Jik7ZS87IqkJyxcbiAgICBkZXNjOiAnVkxVRSDsnbjspp0g7ZSE66as66+47JeEIOqzteycoOyYpO2UvOyKpC4g67O07JWIIOu5hOymiOuLiOyKpCDtmZjqsr0g7KCc6rO1LicsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xMTgxNDY3L3BleGVscy1waG90by0xMTgxNDY3LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTMwMCcsXG4gICAgcmVnaW9uOiAn7ISc7Jq4IOuniO2PrOq1rCcsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAn7ZWc6rWt7Iug66Kw6riI7Jy1JyxcbiAgICBjYXRlZ29yeTogJ+q4iOycteq4sOq0gCcsXG4gICAgZGVzYzogJ1ZMVUUg7J247KadIOuMgOy2nOykkeqwnC4g6riI7Jy16rCQ64+F7JuQIOuTseuhnSDtlanrspUg6riw6rSALicsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8zMTgzMTUwL3BleGVscy1waG90by0zMTgzMTUwLmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTMwMCcsXG4gICAgcmVnaW9uOiAn7ISc7Jq4IOykkeq1rCcsXG4gIH0sXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBFdmVudHNTZWN0aW9uKCkge1xuICBjb25zdCBldmVudHMgPSBuZXdzSXRlbXMuZmlsdGVyKChuKSA9PiBuLmNhdGVnb3J5ID09PSAnZXZlbnQnKTtcblxuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImJnLXdoaXRlIHB5LTIwIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbGc6Z3JpZC1jb2xzLTUgZ2FwLTEwXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsZzpjb2wtc3Bhbi0zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC0zIHB5LTEuNSBtYi0zIHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0yMDAgdGV4dC1wcmltYXJ5LTYwMCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGRcIj5cbiAgICAgICAgICAgICAgPENhbGVuZGFyIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAg7KeA7Jet67OEIO2WieyCrFxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwic2VjdGlvbi10aXRsZSBtYi0xXCI+7KeA7JetIOydtOuypO2KuCAmYW1wOyDtlonsgqw8L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwic2VjdGlvbi1zdWJ0aXRsZSBtYi02XCI+7KCE6rWtIOqwgSDsp4Dsl63snZgg67O07J207Iqk7ZS87IuxIOyYiOuwqSDtlonsgqzsl5Ag7LC47Jes7ZW0IOuztOyEuOyalC48L3A+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zXCI+XG4gICAgICAgICAgICAgIHtldmVudHMubWFwKChldmVudCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgIGtleT17ZXZlbnQuaWR9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJjYXJkIGdyb3VwIGN1cnNvci1wb2ludGVyIHAtNCBmbGV4IGl0ZW1zLXN0YXJ0IGdhcC00IGhvdmVyOmJvcmRlci1wcmltYXJ5LTIwMFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTExIGgtMTEgcm91bmRlZC14bCBiZy1wcmltYXJ5LTUwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgZm9udC1ibGFjayBsZWFkaW5nLW5vbmVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7ZXZlbnQuZGF0ZS5zcGxpdCgnLScpWzJdfVxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS00MDAgdGV4dC14c1wiPlxuICAgICAgICAgICAgICAgICAgICAgIHtldmVudC5kYXRlLnNwbGl0KCctJylbMV197JuUXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7ZXZlbnQucmVnaW9uICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQteHMgZm9udC1zZW1pYm9sZCBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGwgJHtnZXRSZWdpb25Db2xvcihldmVudC5yZWdpb24pfWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPE1hcFBpbiBjbGFzc05hbWU9XCJ3LTIuNSBoLTIuNVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2V2ZW50LnJlZ2lvbn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LXNlbWlib2xkIHRleHQtc20gZ3JvdXAtaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPntldmVudC50aXRsZX08L2g0PlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQteHMgbXQtMC41IGxpbmUtY2xhbXAtMlwiPntldmVudC5zdW1tYXJ5fTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LXhzIHRleHQtcHJpbWFyeS01MDAgZm9udC1tZWRpdW0gZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICDsi6Dssq1cbiAgICAgICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwibXQtNCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQtc20gdGV4dC1wcmltYXJ5LTYwMCBmb250LW1lZGl1bSBob3Zlcjp1bmRlcmxpbmVcIj5cbiAgICAgICAgICAgICAg7KCE7LK0IO2WieyCrCDrs7TquLAgPEFycm93UmlnaHQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGc6Y29sLXNwYW4tMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtMyBweS0xLjUgbWItMyByb3VuZGVkLWZ1bGwgYmctZW1lcmFsZC01MCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtMjAwIHRleHQtZW1lcmFsZC03MDAgdGV4dC14cyBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICAgIDxVc2VycyBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgIOyduOymnSDsl4XssrQg7ZmN67O0XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJzZWN0aW9uLXRpdGxlIG1iLTFcIj5WTFVFIOyduOymnSDquLDqtIA8L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwic2VjdGlvbi1zdWJ0aXRsZSBtYi02XCI+6rKA7Kad65CcIOq4sOq0gOqzvCDslYjsoITtlZjqsowg6rGw656Y7ZWY7IS47JqULjwvcD5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTNcIj5cbiAgICAgICAgICAgICAge0ZFQVRVUkVEX09SR1MubWFwKChvcmcpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGtleT17b3JnLm5hbWV9IGNsYXNzTmFtZT1cImNhcmQgZ3JvdXAgY3Vyc29yLXBvaW50ZXIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC0zIGhvdmVyOmJvcmRlci1wcmltYXJ5LTIwMFwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE0IGgtMTQgcm91bmRlZC14bCBvdmVyZmxvdy1oaWRkZW4gZmxleC1zaHJpbmstMCBiZy1ncmF5LTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW1nIHNyYz17b3JnLmltYWdlVXJsfSBhbHQ9e29yZy5uYW1lfSBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb3ZlciBncm91cC1ob3ZlcjpzY2FsZS0xMDUgdHJhbnNpdGlvbi10cmFuc2Zvcm0gZHVyYXRpb24tMzAwXCIgbG9hZGluZz1cImxhenlcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBtYi0wLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTkwMFwiPntvcmcubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYmFkZ2UtZ3JlZW4gdGV4dC14cyBweS0wIHB4LTEuNVwiPuyduOymnTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1wcmltYXJ5LTUwMCBmb250LW1lZGl1bVwiPntvcmcuY2F0ZWdvcnl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDAgbXQtMC41IGxpbmUtY2xhbXAtMVwiPntvcmcuZGVzY308L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgbXQtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgPE1hcFBpbiBjbGFzc05hbWU9XCJ3LTIuNSBoLTIuNSB0ZXh0LWdyYXktNDAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj57b3JnLnJlZ2lvbn08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9zZWN0aW9uPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9zZWN0aW9ucy9FdmVudHNTZWN0aW9uLnRzeCJ9