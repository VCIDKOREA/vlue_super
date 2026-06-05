import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/EventsPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/EventsPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import { Calendar, MapPin, ArrowLeft, Users, ChevronRight, Search } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import __vite__cjsImport4_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport4_react["useState"];
import { newsItems } from "/src/data/mockData.ts";
const REGION_COLORS = {
  "서울": "bg-primary-100 text-primary-700",
  "부산": "bg-cyan-100 text-cyan-700",
  "대구": "bg-orange-100 text-orange-700",
  "인천": "bg-emerald-100 text-emerald-700",
  "광주": "bg-teal-100 text-teal-700",
  "대전": "bg-amber-100 text-amber-700"
};
function getRegionColor(region) {
  if (!region) return "bg-gray-100 text-gray-600";
  const city = region.split(" ")[0];
  return REGION_COLORS[city] ?? "bg-gray-100 text-gray-600";
}
function EventCard({ event }) {
  const parts = event.date.split("-");
  return /* @__PURE__ */ jsxDEV("div", { className: "card group cursor-pointer p-5 flex items-start gap-4 hover:border-primary-200 hover:shadow-card-hover transition-all", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "w-14 h-14 rounded-2xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0 border border-primary-100", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "text-primary-600 text-lg font-black leading-none", children: parts[2] }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 30,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-primary-400 text-xs", children: [
        parts[1],
        "월"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 31,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 29,
      columnNumber: 7
    }, this),
    event.imageUrl && /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 hidden sm:block", children: /* @__PURE__ */ jsxDEV("img", { src: event.imageUrl, alt: event.title, className: "w-full h-full object-cover group-hover:scale-105 transition-transform", loading: "lazy" }, void 0, false, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 35,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 34,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1 flex-wrap", children: event.region && /* @__PURE__ */ jsxDEV("span", { className: `flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${getRegionColor(event.region)}`, children: [
        /* @__PURE__ */ jsxDEV(MapPin, { className: "w-2.5 h-2.5" }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 42,
          columnNumber: 15
        }, this),
        event.region
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 41,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 39,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("h4", { className: "text-gray-900 font-bold text-sm group-hover:text-primary-600 transition-colors mb-1", style: { wordBreak: "keep-all" }, children: event.title }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 47,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs line-clamp-2 leading-relaxed", children: event.summary }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 48,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 38,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-xs text-primary-500 font-semibold flex-shrink-0", children: [
      "신청",
      /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-3.5 h-3.5" }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 52,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 50,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/EventsPage.tsx",
    lineNumber: 28,
    columnNumber: 5
  }, this);
}
_c = EventCard;
export default function EventsPage({ onBack }) {
  _s();
  const [query, setQuery] = useState("");
  const events = newsItems.filter((n) => n.category === "event").filter(
    (e) => query === "" || e.title.toLowerCase().includes(query.toLowerCase()) || e.region?.toLowerCase().includes(query.toLowerCase())
  );
  const regions = ["전체", ...Array.from(new Set(newsItems.filter((n) => n.category === "event").map((e) => e.region?.split(" ")[0]).filter(Boolean)))];
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const filtered = selectedRegion === "전체" ? events : events.filter((e) => e.region?.startsWith(selectedRegion));
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-[60px]", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 py-10", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: onBack,
          className: "inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors",
          children: [
            /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/EventsPage.tsx",
              lineNumber: 81,
              columnNumber: 13
            }, this),
            "홈으로"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 77,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Calendar, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 86,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 85,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-sm font-semibold", children: "전국 보안 캠페인" }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 88,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 84,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-black text-white mb-1", children: "지역별 행사" }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 90,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mb-5", children: "전국 각 지역의 보이스피싱 예방 행사 및 VLUE 인증 설명회를 확인하세요." }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 91,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "relative max-w-xl", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl overflow-hidden focus-within:bg-white/25 transition-all", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-4 w-4 h-4 text-white/70 pointer-events-none" }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 94,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "행사명, 지역으로 검색...",
            className: "flex-1 pl-11 pr-4 py-3 bg-transparent text-white text-sm placeholder-white/60 focus:outline-none"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/EventsPage.tsx",
            lineNumber: 95,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 93,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 92,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 76,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 75,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1", children: regions.map(
        (r) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setSelectedRegion(r),
            className: `px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${selectedRegion === r ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-500 border-gray-200 hover:text-primary-600 hover:bg-primary-50"}`,
            children: r
          },
          r,
          false,
          {
            fileName: "/home/project/src/pages/EventsPage.tsx",
            lineNumber: 110,
            columnNumber: 11
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 108,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-5", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500", children: [
          "총 ",
          /* @__PURE__ */ jsxDEV("span", { className: "font-semibold text-gray-900", children: [
            filtered.length,
            "개"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/EventsPage.tsx",
            lineNumber: 126,
            columnNumber: 15
          }, this),
          "의 행사"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 125,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 text-xs text-primary-600", children: [
          /* @__PURE__ */ jsxDEV(Users, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/EventsPage.tsx",
            lineNumber: 129,
            columnNumber: 13
          }, this),
          "참가 신청 가능"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 128,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 124,
        columnNumber: 9
      }, this),
      filtered.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [
        /* @__PURE__ */ jsxDEV(Calendar, { className: "w-10 h-10 text-gray-200 mb-3" }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 136,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 font-semibold text-sm", children: "해당 지역 행사가 없습니다" }, void 0, false, {
          fileName: "/home/project/src/pages/EventsPage.tsx",
          lineNumber: 137,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 135,
        columnNumber: 9
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: filtered.map((event) => /* @__PURE__ */ jsxDEV(EventCard, { event }, event.id, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 141,
        columnNumber: 38
      }, this)) }, void 0, false, {
        fileName: "/home/project/src/pages/EventsPage.tsx",
        lineNumber: 140,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/EventsPage.tsx",
      lineNumber: 107,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/EventsPage.tsx",
    lineNumber: 74,
    columnNumber: 5
  }, this);
}
_s(EventsPage, "Udb6PRjWn0ko84HMHVsVtTME9nc=");
_c2 = EventsPage;
var _c, _c2;
$RefreshReg$(_c, "EventCard");
$RefreshReg$(_c2, "EventsPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/EventsPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/EventsPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QixJQUFBO0FBQUE2QixhQUFBRCxLQUFBIiwibmFtZXMiOlsiTWFwUGluIiwiQXJyb3dMZWZ0IiwiVXNlcnMiLCJDaGV2cm9uUmlnaHQiLCJ1c2VTdGF0ZSIsIm5ld3NJdGVtcyIsIlJFR0lPTl9DT0xPUlMiLCJnZXRSZWdpb25Db2xvciIsInJlZ2lvbiIsImNpdHkiLCJzcGxpdCIsIkV2ZW50Q2FyZCIsImV2ZW50IiwicGFydHMiLCJkYXRlIiwiaW1hZ2VVcmwiLCJ0aXRsZSIsIndvcmRCcmVhayIsInN1bW1hcnkiLCJfYyIsIkV2ZW50c1BhZ2UiLCJvbkJhY2siLCJfcyIsInF1ZXJ5Iiwic2V0UXVlcnkiLCJldmVudHMiLCJmaWx0ZXIiLCJuIiwiY2F0ZWdvcnkiLCJlIiwidG9Mb3dlckNhc2UiLCJpbmNsdWRlcyIsInJlZ2lvbnMiLCJBcnJheSIsImZyb20iLCJTZXQiLCJtYXAiLCJCb29sZWFuIiwic2VsZWN0ZWRSZWdpb24iLCJzZXRTZWxlY3RlZFJlZ2lvbiIsImZpbHRlcmVkIiwic3RhcnRzV2l0aCIsInRhcmdldCIsInZhbHVlIiwiciIsImxlbmd0aCIsImlkIiwiX2MyIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkV2ZW50c1BhZ2UudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENhbGVuZGFyLCBNYXBQaW4sIEFycm93TGVmdCwgVXNlcnMsIENoZXZyb25SaWdodCwgU2VhcmNoIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgbmV3c0l0ZW1zIH0gZnJvbSAnLi4vZGF0YS9tb2NrRGF0YSc7XG5pbXBvcnQgeyBOZXdzSXRlbSB9IGZyb20gJy4uL3R5cGVzJztcblxuaW50ZXJmYWNlIEV2ZW50c1BhZ2VQcm9wcyB7XG4gIG9uQmFjazogKCkgPT4gdm9pZDtcbn1cblxuY29uc3QgUkVHSU9OX0NPTE9SUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgJ+yEnOyauCc6ICdiZy1wcmltYXJ5LTEwMCB0ZXh0LXByaW1hcnktNzAwJyxcbiAgJ+u2gOyCsCc6ICdiZy1jeWFuLTEwMCB0ZXh0LWN5YW4tNzAwJyxcbiAgJ+uMgOq1rCc6ICdiZy1vcmFuZ2UtMTAwIHRleHQtb3JhbmdlLTcwMCcsXG4gICfsnbjsspwnOiAnYmctZW1lcmFsZC0xMDAgdGV4dC1lbWVyYWxkLTcwMCcsXG4gICfqtJHso7wnOiAnYmctdGVhbC0xMDAgdGV4dC10ZWFsLTcwMCcsXG4gICfrjIDsoIQnOiAnYmctYW1iZXItMTAwIHRleHQtYW1iZXItNzAwJyxcbn07XG5cbmZ1bmN0aW9uIGdldFJlZ2lvbkNvbG9yKHJlZ2lvbj86IHN0cmluZykge1xuICBpZiAoIXJlZ2lvbikgcmV0dXJuICdiZy1ncmF5LTEwMCB0ZXh0LWdyYXktNjAwJztcbiAgY29uc3QgY2l0eSA9IHJlZ2lvbi5zcGxpdCgnICcpWzBdO1xuICByZXR1cm4gUkVHSU9OX0NPTE9SU1tjaXR5XSA/PyAnYmctZ3JheS0xMDAgdGV4dC1ncmF5LTYwMCc7XG59XG5cbmZ1bmN0aW9uIEV2ZW50Q2FyZCh7IGV2ZW50IH06IHsgZXZlbnQ6IE5ld3NJdGVtIH0pIHtcbiAgY29uc3QgcGFydHMgPSBldmVudC5kYXRlLnNwbGl0KCctJyk7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJjYXJkIGdyb3VwIGN1cnNvci1wb2ludGVyIHAtNSBmbGV4IGl0ZW1zLXN0YXJ0IGdhcC00IGhvdmVyOmJvcmRlci1wcmltYXJ5LTIwMCBob3ZlcjpzaGFkb3ctY2FyZC1ob3ZlciB0cmFuc2l0aW9uLWFsbFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE0IGgtMTQgcm91bmRlZC0yeGwgYmctcHJpbWFyeS01MCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDBcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTYwMCB0ZXh0LWxnIGZvbnQtYmxhY2sgbGVhZGluZy1ub25lXCI+e3BhcnRzWzJdfTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTQwMCB0ZXh0LXhzXCI+e3BhcnRzWzFdfeyblDwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgICAge2V2ZW50LmltYWdlVXJsICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE2IGgtMTQgcm91bmRlZC14bCBvdmVyZmxvdy1oaWRkZW4gZmxleC1zaHJpbmstMCBiZy1ncmF5LTEwMCBoaWRkZW4gc206YmxvY2tcIj5cbiAgICAgICAgICA8aW1nIHNyYz17ZXZlbnQuaW1hZ2VVcmx9IGFsdD17ZXZlbnQudGl0bGV9IGNsYXNzTmFtZT1cInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyIGdyb3VwLWhvdmVyOnNjYWxlLTEwNSB0cmFuc2l0aW9uLXRyYW5zZm9ybVwiIGxvYWRpbmc9XCJsYXp5XCIgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgbWluLXctMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTEgZmxleC13cmFwXCI+XG4gICAgICAgICAge2V2ZW50LnJlZ2lvbiAmJiAoXG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMC41IHRleHQteHMgZm9udC1zZW1pYm9sZCBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGwgJHtnZXRSZWdpb25Db2xvcihldmVudC5yZWdpb24pfWB9PlxuICAgICAgICAgICAgICA8TWFwUGluIGNsYXNzTmFtZT1cInctMi41IGgtMi41XCIgLz5cbiAgICAgICAgICAgICAge2V2ZW50LnJlZ2lvbn1cbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGg0IGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc20gZ3JvdXAtaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCB0cmFuc2l0aW9uLWNvbG9ycyBtYi0xXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PntldmVudC50aXRsZX08L2g0PlxuICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQteHMgbGluZS1jbGFtcC0yIGxlYWRpbmctcmVsYXhlZFwiPntldmVudC5zdW1tYXJ5fTwvcD5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LXhzIHRleHQtcHJpbWFyeS01MDAgZm9udC1zZW1pYm9sZCBmbGV4LXNocmluay0wXCI+XG4gICAgICAgIOyLoOyyrVxuICAgICAgICA8Q2hldnJvblJpZ2h0IGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBFdmVudHNQYWdlKHsgb25CYWNrIH06IEV2ZW50c1BhZ2VQcm9wcykge1xuICBjb25zdCBbcXVlcnksIHNldFF1ZXJ5XSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgZXZlbnRzID0gbmV3c0l0ZW1zLmZpbHRlcigobikgPT4gbi5jYXRlZ29yeSA9PT0gJ2V2ZW50JykuZmlsdGVyKChlKSA9PlxuICAgIHF1ZXJ5ID09PSAnJyB8fFxuICAgIChlLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkudG9Mb3dlckNhc2UoKSkpIHx8XG4gICAgKGUucmVnaW9uPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpKVxuICApO1xuXG4gIGNvbnN0IHJlZ2lvbnMgPSBbJ+yghOyytCcsIC4uLkFycmF5LmZyb20obmV3IFNldChuZXdzSXRlbXMuZmlsdGVyKChuKSA9PiBuLmNhdGVnb3J5ID09PSAnZXZlbnQnKS5tYXAoKGUpID0+IGUucmVnaW9uPy5zcGxpdCgnICcpWzBdKS5maWx0ZXIoQm9vbGVhbikgYXMgc3RyaW5nW10pKV07XG4gIGNvbnN0IFtzZWxlY3RlZFJlZ2lvbiwgc2V0U2VsZWN0ZWRSZWdpb25dID0gdXNlU3RhdGUoJ+yghOyytCcpO1xuXG4gIGNvbnN0IGZpbHRlcmVkID0gc2VsZWN0ZWRSZWdpb24gPT09ICfsoITssrQnXG4gICAgPyBldmVudHNcbiAgICA6IGV2ZW50cy5maWx0ZXIoKGUpID0+IGUucmVnaW9uPy5zdGFydHNXaXRoKHNlbGVjdGVkUmVnaW9uKSk7XG5cbiAgcmV0dXJuIChcbiAgICA8bWFpbiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctYmx1ZS10aW50IHB0LVs2MHB4XVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1wcmltYXJ5LTYwMCBweS0xMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04XCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17b25CYWNrfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgdGV4dC13aGl0ZS83MCBob3Zlcjp0ZXh0LXdoaXRlIHRleHQtc20gbWItNCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPEFycm93TGVmdCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgIO2ZiOycvOuhnFxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgbWItMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTkgaC05IHJvdW5kZWQteGwgYmctd2hpdGUvMjAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPENhbGVuZGFyIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvODAgdGV4dC1zbSBmb250LXNlbWlib2xkXCI+7KCE6rWtIOuztOyViCDsuqDtjpjsnbg8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBtYi0xXCI+7KeA7Jet67OEIO2WieyCrDwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXNtIG1iLTVcIj7soITqta0g6rCBIOyngOyXreydmCDrs7TsnbTsiqTtlLzsi7Eg7JiI67CpIO2WieyCrCDrsI8gVkxVRSDsnbjspp0g7ISk66qF7ZqM66W8IO2ZleyduO2VmOyEuOyalC48L3A+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSBtYXgtdy14bFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBiZy13aGl0ZS8xNSBiYWNrZHJvcC1ibHVyLXNtIGJvcmRlciBib3JkZXItd2hpdGUvMzAgcm91bmRlZC0zeGwgb3ZlcmZsb3ctaGlkZGVuIGZvY3VzLXdpdGhpbjpiZy13aGl0ZS8yNSB0cmFuc2l0aW9uLWFsbFwiPlxuICAgICAgICAgICAgICA8U2VhcmNoIGNsYXNzTmFtZT1cImFic29sdXRlIGxlZnQtNCB3LTQgaC00IHRleHQtd2hpdGUvNzAgcG9pbnRlci1ldmVudHMtbm9uZVwiIC8+XG4gICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17cXVlcnl9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRRdWVyeShlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLtlonsgqzrqoUsIOyngOyXreycvOuhnCDqsoDsg4kuLi5cIlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXgtMSBwbC0xMSBwci00IHB5LTMgYmctdHJhbnNwYXJlbnQgdGV4dC13aGl0ZSB0ZXh0LXNtIHBsYWNlaG9sZGVyLXdoaXRlLzYwIGZvY3VzOm91dGxpbmUtbm9uZVwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS04XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgbWItNiBvdmVyZmxvdy14LWF1dG8gaGlkZS1zY3JvbGxiYXIgcGItMVwiPlxuICAgICAgICAgIHtyZWdpb25zLm1hcCgocikgPT4gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBrZXk9e3J9XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkUmVnaW9uKHIpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0zLjUgcHktMS41IHRleHQteHMgZm9udC1zZW1pYm9sZCByb3VuZGVkLWZ1bGwgd2hpdGVzcGFjZS1ub3dyYXAgdHJhbnNpdGlvbi1hbGwgYm9yZGVyICR7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRSZWdpb24gPT09IHJcbiAgICAgICAgICAgICAgICAgID8gJ2JnLXByaW1hcnktNjAwIHRleHQtd2hpdGUgYm9yZGVyLXByaW1hcnktNjAwJ1xuICAgICAgICAgICAgICAgICAgOiAnYmctd2hpdGUgdGV4dC1ncmF5LTUwMCBib3JkZXItZ3JheS0yMDAgaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCBob3ZlcjpiZy1wcmltYXJ5LTUwJ1xuICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3J9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gbWItNVwiPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1ncmF5LTUwMFwiPlxuICAgICAgICAgICAg7LSdIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTkwMFwiPntmaWx0ZXJlZC5sZW5ndGh96rCcPC9zcGFuPuydmCDtlonsgqxcbiAgICAgICAgICA8L3A+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQteHMgdGV4dC1wcmltYXJ5LTYwMFwiPlxuICAgICAgICAgICAgPFVzZXJzIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgIOywuOqwgCDsi6Dssq0g6rCA64qlXG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHtmaWx0ZXJlZC5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweS0yNCB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgPENhbGVuZGFyIGNsYXNzTmFtZT1cInctMTAgaC0xMCB0ZXh0LWdyYXktMjAwIG1iLTNcIiAvPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCBmb250LXNlbWlib2xkIHRleHQtc21cIj7tlbTri7kg7KeA7JetIO2WieyCrOqwgCDsl4bsirXri4jri6Q8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTNcIj5cbiAgICAgICAgICAgIHtmaWx0ZXJlZC5tYXAoKGV2ZW50KSA9PiA8RXZlbnRDYXJkIGtleT17ZXZlbnQuaWR9IGV2ZW50PXtldmVudH0gLz4pfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9FdmVudHNQYWdlLnRzeCJ9