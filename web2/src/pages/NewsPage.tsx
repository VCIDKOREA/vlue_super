import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/NewsPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/NewsPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { Bell, Newspaper, AlertTriangle, Calendar, ArrowLeft, Tag } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { newsItems } from "/src/data/mockData.ts";
const CFG = {
  alert: { label: "경보", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
  notice: { label: "공지", color: "text-primary-600", bg: "bg-primary-50", border: "border-primary-200", icon: Bell },
  news: { label: "뉴스", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: Newspaper }
};
function NewsCard({ item }) {
  const cfg = CFG[item.category];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return /* @__PURE__ */ jsxDEV("article", { className: "card group cursor-pointer overflow-hidden flex flex-col hover:shadow-card-hover transition-all", children: [
    item.imageUrl && /* @__PURE__ */ jsxDEV("div", { className: "h-48 overflow-hidden bg-gray-100 flex-shrink-0", children: /* @__PURE__ */ jsxDEV(
      "img",
      {
        src: item.imageUrl,
        alt: item.title,
        className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
        loading: "lazy"
      },
      void 0,
      false,
      {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 23,
        columnNumber: 11
      },
      this
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/NewsPage.tsx",
      lineNumber: 22,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "p-5 flex-1 flex flex-col", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-2.5", children: [
        /* @__PURE__ */ jsxDEV("span", { className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`, children: [
          /* @__PURE__ */ jsxDEV(Icon, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/pages/NewsPage.tsx",
            lineNumber: 34,
            columnNumber: 13
          }, this),
          cfg.label
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 33,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-xs text-gray-400", children: [
          /* @__PURE__ */ jsxDEV(Calendar, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/pages/NewsPage.tsx",
            lineNumber: 38,
            columnNumber: 13
          }, this),
          item.date
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 37,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 32,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2 flex-1", style: { wordBreak: "keep-all" }, children: item.title }, void 0, false, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 42,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs leading-relaxed line-clamp-3", children: item.summary }, void 0, false, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 45,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/NewsPage.tsx",
      lineNumber: 31,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/NewsPage.tsx",
    lineNumber: 20,
    columnNumber: 5
  }, this);
}
_c = NewsCard;
export default function NewsPage({ onBack }) {
  const newsOnly = newsItems.filter((n) => n.category !== "event");
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-[60px]", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 py-10", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: onBack,
          className: "inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors",
          children: [
            /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/NewsPage.tsx",
              lineNumber: 62,
              columnNumber: 13
            }, this),
            "홈으로"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 58,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Newspaper, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 67,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 66,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-sm font-semibold", children: "VLUE 공식 채널" }, void 0, false, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 69,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 65,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-black text-white mb-1", children: "기업뉴스 & 광고" }, void 0, false, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 71,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm", children: "최신 보안 뉴스, VLUE 공지, 보이스피싱 경보를 확인하세요." }, void 0, false, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 72,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/NewsPage.tsx",
      lineNumber: 57,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/NewsPage.tsx",
      lineNumber: 56,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-6 flex-wrap", children: [
        Object.entries(CFG).map(([key, c]) => {
          const Icon = c.icon;
          return /* @__PURE__ */ jsxDEV("span", { className: `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.color} ${c.border}`, children: [
            /* @__PURE__ */ jsxDEV(Icon, { className: "w-3 h-3" }, void 0, false, {
              fileName: "/home/project/src/pages/NewsPage.tsx",
              lineNumber: 82,
              columnNumber: 17
            }, this),
            c.label
          ] }, key, true, {
            fileName: "/home/project/src/pages/NewsPage.tsx",
            lineNumber: 81,
            columnNumber: 15
          }, this);
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 ml-1", children: [
          "총 ",
          newsOnly.length,
          "건"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 87,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 77,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5", children: newsOnly.map((item) => /* @__PURE__ */ jsxDEV(NewsCard, { item }, item.id, false, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 91,
        columnNumber: 35
      }, this)) }, void 0, false, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 90,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "mt-10 bg-primary-600 rounded-3xl p-8 text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-full bg-white/20 text-white text-xs font-semibold", children: [
          /* @__PURE__ */ jsxDEV(Tag, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/pages/NewsPage.tsx",
            lineNumber: 96,
            columnNumber: 13
          }, this),
          "VLUE 광고 배너"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 95,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "text-white font-black text-xl mb-2", style: { letterSpacing: "-0.03em" }, children: "VLUE 인증으로 신뢰를 높이세요" }, void 0, false, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 99,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mb-4", style: { wordBreak: "keep-all" }, children: "VLUE 인증 기관은 고객에게 신뢰를 제공하고 보이스피싱 피해를 예방합니다." }, void 0, false, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 102,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { className: "px-6 py-2.5 bg-white text-primary-600 font-bold text-sm rounded-2xl hover:bg-primary-50 transition-colors", children: "인증 신청하기" }, void 0, false, {
          fileName: "/home/project/src/pages/NewsPage.tsx",
          lineNumber: 105,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/NewsPage.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/NewsPage.tsx",
      lineNumber: 76,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/NewsPage.tsx",
    lineNumber: 55,
    columnNumber: 5
  }, this);
}
_c2 = NewsPage;
var _c, _c2;
$RefreshReg$(_c, "NewsCard");
$RefreshReg$(_c2, "NewsPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/NewsPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/NewsPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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cyIsIkNGRyIsImFsZXJ0IiwibGFiZWwiLCJjb2xvciIsImJnIiwiYm9yZGVyIiwiaWNvbiIsIm5vdGljZSIsIkJlbGwiLCJuZXdzIiwiTmV3c3BhcGVyIiwiTmV3c0NhcmQiLCJpdGVtIiwiY2ZnIiwiY2F0ZWdvcnkiLCJJY29uIiwiaW1hZ2VVcmwiLCJ0aXRsZSIsImRhdGUiLCJ3b3JkQnJlYWsiLCJzdW1tYXJ5IiwiX2MiLCJOZXdzUGFnZSIsIm9uQmFjayIsIm5ld3NPbmx5IiwiZmlsdGVyIiwibiIsIk9iamVjdCIsImVudHJpZXMiLCJtYXAiLCJrZXkiLCJjIiwibGVuZ3RoIiwiaWQiLCJsZXR0ZXJTcGFjaW5nIiwiX2MyIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIk5ld3NQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCZWxsLCBOZXdzcGFwZXIsIEFsZXJ0VHJpYW5nbGUsIENhbGVuZGFyLCBBcnJvd0xlZnQsIFRhZyB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyBuZXdzSXRlbXMgfSBmcm9tICcuLi9kYXRhL21vY2tEYXRhJztcbmltcG9ydCB7IE5ld3NJdGVtIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5pbnRlcmZhY2UgTmV3c1BhZ2VQcm9wcyB7XG4gIG9uQmFjazogKCkgPT4gdm9pZDtcbn1cblxuY29uc3QgQ0ZHOiBSZWNvcmQ8c3RyaW5nLCB7IGxhYmVsOiBzdHJpbmc7IGNvbG9yOiBzdHJpbmc7IGJnOiBzdHJpbmc7IGJvcmRlcjogc3RyaW5nOyBpY29uOiB0eXBlb2YgQmVsbCB9PiA9IHtcbiAgYWxlcnQ6IHsgbGFiZWw6ICfqsr3rs7QnLCBjb2xvcjogJ3RleHQtcmVkLTYwMCcsIGJnOiAnYmctcmVkLTUwJywgYm9yZGVyOiAnYm9yZGVyLXJlZC0yMDAnLCBpY29uOiBBbGVydFRyaWFuZ2xlIH0sXG4gIG5vdGljZTogeyBsYWJlbDogJ+qzteyngCcsIGNvbG9yOiAndGV4dC1wcmltYXJ5LTYwMCcsIGJnOiAnYmctcHJpbWFyeS01MCcsIGJvcmRlcjogJ2JvcmRlci1wcmltYXJ5LTIwMCcsIGljb246IEJlbGwgfSxcbiAgbmV3czogeyBsYWJlbDogJ+uJtOyKpCcsIGNvbG9yOiAndGV4dC1lbWVyYWxkLTYwMCcsIGJnOiAnYmctZW1lcmFsZC01MCcsIGJvcmRlcjogJ2JvcmRlci1lbWVyYWxkLTIwMCcsIGljb246IE5ld3NwYXBlciB9LFxufTtcblxuZnVuY3Rpb24gTmV3c0NhcmQoeyBpdGVtIH06IHsgaXRlbTogTmV3c0l0ZW0gfSkge1xuICBjb25zdCBjZmcgPSBDRkdbaXRlbS5jYXRlZ29yeV07XG4gIGlmICghY2ZnKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgSWNvbiA9IGNmZy5pY29uO1xuICByZXR1cm4gKFxuICAgIDxhcnRpY2xlIGNsYXNzTmFtZT1cImNhcmQgZ3JvdXAgY3Vyc29yLXBvaW50ZXIgb3ZlcmZsb3ctaGlkZGVuIGZsZXggZmxleC1jb2wgaG92ZXI6c2hhZG93LWNhcmQtaG92ZXIgdHJhbnNpdGlvbi1hbGxcIj5cbiAgICAgIHtpdGVtLmltYWdlVXJsICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTQ4IG92ZXJmbG93LWhpZGRlbiBiZy1ncmF5LTEwMCBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgPGltZ1xuICAgICAgICAgICAgc3JjPXtpdGVtLmltYWdlVXJsfVxuICAgICAgICAgICAgYWx0PXtpdGVtLnRpdGxlfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGgtZnVsbCBvYmplY3QtY292ZXIgZ3JvdXAtaG92ZXI6c2NhbGUtMTA1IHRyYW5zaXRpb24tdHJhbnNmb3JtIGR1cmF0aW9uLTMwMFwiXG4gICAgICAgICAgICBsb2FkaW5nPVwibGF6eVwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTUgZmxleC0xIGZsZXggZmxleC1jb2xcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0yLjVcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2BpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMi41IHB5LTAuNSByb3VuZGVkLWZ1bGwgdGV4dC14cyBmb250LXNlbWlib2xkIGJvcmRlciAke2NmZy5iZ30gJHtjZmcuY29sb3J9ICR7Y2ZnLmJvcmRlcn1gfT5cbiAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPlxuICAgICAgICAgICAge2NmZy5sYWJlbH1cbiAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj5cbiAgICAgICAgICAgIDxDYWxlbmRhciBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz5cbiAgICAgICAgICAgIHtpdGVtLmRhdGV9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LWJvbGQgdGV4dC1zbSBsZWFkaW5nLXNudWcgbWItMiBncm91cC1ob3Zlcjp0ZXh0LXByaW1hcnktNjAwIHRyYW5zaXRpb24tY29sb3JzIGxpbmUtY2xhbXAtMiBmbGV4LTFcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAge2l0ZW0udGl0bGV9XG4gICAgICAgIDwvaDM+XG4gICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWQgbGluZS1jbGFtcC0zXCI+e2l0ZW0uc3VtbWFyeX08L3A+XG4gICAgICA8L2Rpdj5cbiAgICA8L2FydGljbGU+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE5ld3NQYWdlKHsgb25CYWNrIH06IE5ld3NQYWdlUHJvcHMpIHtcbiAgY29uc3QgbmV3c09ubHkgPSBuZXdzSXRlbXMuZmlsdGVyKChuKSA9PiBuLmNhdGVnb3J5ICE9PSAnZXZlbnQnKTtcblxuICByZXR1cm4gKFxuICAgIDxtYWluIGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ibHVlLXRpbnQgcHQtWzYwcHhdXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXByaW1hcnktNjAwIHB5LTEwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctN3hsIG14LWF1dG8gcHgtNCBzbTpweC02IGxnOnB4LThcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXtvbkJhY2t9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSB0ZXh0LXdoaXRlLzcwIGhvdmVyOnRleHQtd2hpdGUgdGV4dC1zbSBtYi00IHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8QXJyb3dMZWZ0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAg7ZmI7Jy866GcXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOSBoLTkgcm91bmRlZC14bCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICA8TmV3c3BhcGVyIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvODAgdGV4dC1zbSBmb250LXNlbWlib2xkXCI+VkxVRSDqs7Xsi50g7LGE64SQPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgbWItMVwiPuq4sOyXheuJtOyKpCAmYW1wOyDqtJHqs6A8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNzAgdGV4dC1zbVwiPuy1nOyLoCDrs7TslYgg64m07IqkLCBWTFVFIOqzteyngCwg67O07J207Iqk7ZS87IuxIOqyveuztOulvCDtmZXsnbjtlZjshLjsmpQuPC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB5LThcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi02IGZsZXgtd3JhcFwiPlxuICAgICAgICAgIHtPYmplY3QuZW50cmllcyhDRkcpLm1hcCgoW2tleSwgY10pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IEljb24gPSBjLmljb247XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICA8c3BhbiBrZXk9e2tleX0gY2xhc3NOYW1lPXtgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTIuNSBweS0xIHJvdW5kZWQtZnVsbCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgYm9yZGVyICR7Yy5iZ30gJHtjLmNvbG9yfSAke2MuYm9yZGVyfWB9PlxuICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPlxuICAgICAgICAgICAgICAgIHtjLmxhYmVsfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTQwMCBtbC0xXCI+7LSdIHtuZXdzT25seS5sZW5ndGh96rG0PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLTVcIj5cbiAgICAgICAgICB7bmV3c09ubHkubWFwKChpdGVtKSA9PiA8TmV3c0NhcmQga2V5PXtpdGVtLmlkfSBpdGVtPXtpdGVtfSAvPil9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTAgYmctcHJpbWFyeS02MDAgcm91bmRlZC0zeGwgcC04IHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC0zIHB5LTEuNSBtYi0zIHJvdW5kZWQtZnVsbCBiZy13aGl0ZS8yMCB0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPlxuICAgICAgICAgICAgPFRhZyBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz5cbiAgICAgICAgICAgIFZMVUUg6rSR6rOgIOuwsOuEiFxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIGZvbnQtYmxhY2sgdGV4dC14bCBtYi0yXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PlxuICAgICAgICAgICAgVkxVRSDsnbjspp3snLzroZwg7Iug66Kw66W8IOuGkuydtOyEuOyalFxuICAgICAgICAgIDwvaDI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXNtIG1iLTRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICBWTFVFIOyduOymnSDquLDqtIDsnYAg6rOg6rCd7JeQ6rKMIOyLoOuisOulvCDsoJzqs7XtlZjqs6Ag67O07J207Iqk7ZS87IuxIO2UvO2VtOulvCDsmIjrsKntlanri4jri6QuXG4gICAgICAgICAgPC9wPlxuICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicHgtNiBweS0yLjUgYmctd2hpdGUgdGV4dC1wcmltYXJ5LTYwMCBmb250LWJvbGQgdGV4dC1zbSByb3VuZGVkLTJ4bCBob3ZlcjpiZy1wcmltYXJ5LTUwIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICDsnbjspp0g7Iug7LKt7ZWY6riwXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9OZXdzUGFnZS50c3gifQ==