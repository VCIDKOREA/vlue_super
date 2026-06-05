import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/sections/NewsSection.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/sections/NewsSection.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { Bell, Newspaper, AlertTriangle, ArrowRight, Calendar } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
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
  return /* @__PURE__ */ jsxDEV("article", { className: "card group cursor-pointer overflow-hidden flex flex-col", children: [
    item.imageUrl && /* @__PURE__ */ jsxDEV("div", { className: "h-40 overflow-hidden bg-gray-100 flex-shrink-0", children: /* @__PURE__ */ jsxDEV(
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
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 19,
        columnNumber: 11
      },
      this
    ) }, void 0, false, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 18,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex-1 flex flex-col", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: `badge-blue ${cfg.bg} ${cfg.color} ${cfg.border} border`, children: [
          /* @__PURE__ */ jsxDEV(Icon, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/sections/NewsSection.tsx",
            lineNumber: 30,
            columnNumber: 13
          }, this),
          cfg.label
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 29,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-xs text-gray-400", children: [
          /* @__PURE__ */ jsxDEV(Calendar, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/sections/NewsSection.tsx",
            lineNumber: 34,
            columnNumber: 13
          }, this),
          item.date
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 33,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 28,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-semibold text-sm leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2", children: item.title }, void 0, false, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 38,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs leading-relaxed line-clamp-3 flex-1", children: item.summary }, void 0, false, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 41,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 mt-3 text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity", children: [
        "자세히 보기 ",
        /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-3 h-3" }, void 0, false, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 43,
          columnNumber: 18
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 42,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 27,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/sections/NewsSection.tsx",
    lineNumber: 16,
    columnNumber: 5
  }, this);
}
_c = NewsCard;
export default function NewsSection() {
  const displayItems = newsItems.filter((n) => n.category !== "event").slice(0, 4);
  return /* @__PURE__ */ jsxDEV("section", { className: "bg-gray-50 py-20 border-t border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-end justify-between mb-8", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-xs font-semibold", children: [
          /* @__PURE__ */ jsxDEV(Newspaper, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/sections/NewsSection.tsx",
            lineNumber: 59,
            columnNumber: 15
          }, this),
          "최근 뉴스"
        ] }, void 0, true, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 58,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "section-title", children: "보안 및 기업 소식" }, void 0, false, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 62,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "section-subtitle", children: "최신 보이스피싱 경보와 VLUE 공지사항을 확인하세요." }, void 0, false, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 63,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 57,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { className: "hidden sm:flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline", children: [
        "전체보기 ",
        /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4" }, void 0, false, {
          fileName: "/home/project/src/sections/NewsSection.tsx",
          lineNumber: 66,
          columnNumber: 18
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 65,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 56,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5", children: displayItems.map((item) => /* @__PURE__ */ jsxDEV(NewsCard, { item }, item.id, false, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 70,
      columnNumber: 39
    }, this)) }, void 0, false, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 69,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "mt-6 flex sm:hidden justify-center", children: /* @__PURE__ */ jsxDEV("button", { className: "flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline", children: [
      "전체보기 ",
      /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4" }, void 0, false, {
        fileName: "/home/project/src/sections/NewsSection.tsx",
        lineNumber: 74,
        columnNumber: 18
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 73,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/home/project/src/sections/NewsSection.tsx",
      lineNumber: 72,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/sections/NewsSection.tsx",
    lineNumber: 55,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/sections/NewsSection.tsx",
    lineNumber: 54,
    columnNumber: 5
  }, this);
}
_c2 = NewsSection;
var _c, _c2;
$RefreshReg$(_c, "NewsCard");
$RefreshReg$(_c2, "NewsSection");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/sections/NewsSection.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/sections/NewsSection.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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YUFBQVQsSUFBQTtBQUFBUyxhQUFBRCxLQUFBIiwibmFtZXMiOlsiQWxlcnRUcmlhbmdsZSIsIkFycm93UmlnaHQiLCJuZXdzSXRlbXMiLCJDRkciLCJhbGVydCIsImxhYmVsIiwiY29sb3IiLCJiZyIsImJvcmRlciIsImljb24iLCJub3RpY2UiLCJCZWxsIiwibmV3cyIsIk5ld3NwYXBlciIsIk5ld3NDYXJkIiwiaXRlbSIsImNmZyIsImNhdGVnb3J5IiwiSWNvbiIsImltYWdlVXJsIiwidGl0bGUiLCJkYXRlIiwic3VtbWFyeSIsIl9jIiwiTmV3c1NlY3Rpb24iLCJkaXNwbGF5SXRlbXMiLCJmaWx0ZXIiLCJuIiwic2xpY2UiLCJtYXAiLCJpZCIsIl9jMiIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJOZXdzU2VjdGlvbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmVsbCwgTmV3c3BhcGVyLCBBbGVydFRyaWFuZ2xlLCBBcnJvd1JpZ2h0LCBDYWxlbmRhciB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyBuZXdzSXRlbXMgfSBmcm9tICcuLi9kYXRhL21vY2tEYXRhJztcbmltcG9ydCB7IE5ld3NJdGVtIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5jb25zdCBDRkc6IFJlY29yZDxzdHJpbmcsIHsgbGFiZWw6IHN0cmluZzsgY29sb3I6IHN0cmluZzsgYmc6IHN0cmluZzsgYm9yZGVyOiBzdHJpbmc7IGljb246IHR5cGVvZiBCZWxsIH0+ID0ge1xuICBhbGVydDogeyBsYWJlbDogJ+qyveuztCcsIGNvbG9yOiAndGV4dC1yZWQtNjAwJywgYmc6ICdiZy1yZWQtNTAnLCBib3JkZXI6ICdib3JkZXItcmVkLTIwMCcsIGljb246IEFsZXJ0VHJpYW5nbGUgfSxcbiAgbm90aWNlOiB7IGxhYmVsOiAn6rO17KeAJywgY29sb3I6ICd0ZXh0LXByaW1hcnktNjAwJywgYmc6ICdiZy1wcmltYXJ5LTUwJywgYm9yZGVyOiAnYm9yZGVyLXByaW1hcnktMjAwJywgaWNvbjogQmVsbCB9LFxuICBuZXdzOiB7IGxhYmVsOiAn64m07IqkJywgY29sb3I6ICd0ZXh0LWVtZXJhbGQtNjAwJywgYmc6ICdiZy1lbWVyYWxkLTUwJywgYm9yZGVyOiAnYm9yZGVyLWVtZXJhbGQtMjAwJywgaWNvbjogTmV3c3BhcGVyIH0sXG59O1xuXG5mdW5jdGlvbiBOZXdzQ2FyZCh7IGl0ZW0gfTogeyBpdGVtOiBOZXdzSXRlbSB9KSB7XG4gIGNvbnN0IGNmZyA9IENGR1tpdGVtLmNhdGVnb3J5XTtcbiAgaWYgKCFjZmcpIHJldHVybiBudWxsO1xuICBjb25zdCBJY29uID0gY2ZnLmljb247XG4gIHJldHVybiAoXG4gICAgPGFydGljbGUgY2xhc3NOYW1lPVwiY2FyZCBncm91cCBjdXJzb3ItcG9pbnRlciBvdmVyZmxvdy1oaWRkZW4gZmxleCBmbGV4LWNvbFwiPlxuICAgICAge2l0ZW0uaW1hZ2VVcmwgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtNDAgb3ZlcmZsb3ctaGlkZGVuIGJnLWdyYXktMTAwIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICA8aW1nXG4gICAgICAgICAgICBzcmM9e2l0ZW0uaW1hZ2VVcmx9XG4gICAgICAgICAgICBhbHQ9e2l0ZW0udGl0bGV9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb3ZlciBncm91cC1ob3ZlcjpzY2FsZS0xMDUgdHJhbnNpdGlvbi10cmFuc2Zvcm0gZHVyYXRpb24tMzAwXCJcbiAgICAgICAgICAgIGxvYWRpbmc9XCJsYXp5XCJcbiAgICAgICAgICAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNCBmbGV4LTEgZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTJcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2BiYWRnZS1ibHVlICR7Y2ZnLmJnfSAke2NmZy5jb2xvcn0gJHtjZmcuYm9yZGVyfSBib3JkZXJgfT5cbiAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPlxuICAgICAgICAgICAge2NmZy5sYWJlbH1cbiAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj5cbiAgICAgICAgICAgIDxDYWxlbmRhciBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz5cbiAgICAgICAgICAgIHtpdGVtLmRhdGV9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LXNlbWlib2xkIHRleHQtc20gbGVhZGluZy1zbnVnIG1iLTIgZ3JvdXAtaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCB0cmFuc2l0aW9uLWNvbG9ycyBsaW5lLWNsYW1wLTJcIj5cbiAgICAgICAgICB7aXRlbS50aXRsZX1cbiAgICAgICAgPC9oMz5cbiAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZCBsaW5lLWNsYW1wLTMgZmxleC0xXCI+e2l0ZW0uc3VtbWFyeX08L3A+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgbXQtMyB0ZXh0LXhzIHRleHQtcHJpbWFyeS02MDAgZm9udC1tZWRpdW0gb3BhY2l0eS0wIGdyb3VwLWhvdmVyOm9wYWNpdHktMTAwIHRyYW5zaXRpb24tb3BhY2l0eVwiPlxuICAgICAgICAgIOyekOyEuO2eiCDrs7TquLAgPEFycm93UmlnaHQgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9hcnRpY2xlPlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBOZXdzU2VjdGlvbigpIHtcbiAgY29uc3QgZGlzcGxheUl0ZW1zID0gbmV3c0l0ZW1zLmZpbHRlcigobikgPT4gbi5jYXRlZ29yeSAhPT0gJ2V2ZW50Jykuc2xpY2UoMCwgNCk7XG5cbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJiZy1ncmF5LTUwIHB5LTIwIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtZW5kIGp1c3RpZnktYmV0d2VlbiBtYi04XCI+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMS41IG1iLTMgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTIwMCB0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPlxuICAgICAgICAgICAgICA8TmV3c3BhcGVyIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAg7LWc6re8IOuJtOyKpFxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwic2VjdGlvbi10aXRsZVwiPuuztOyViCDrsI8g6riw7JeFIOyGjOyLnTwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJzZWN0aW9uLXN1YnRpdGxlXCI+7LWc7IugIOuztOydtOyKpO2UvOyLsSDqsr3rs7TsmYAgVkxVRSDqs7Xsp4Dsgqztla3snYQg7ZmV7J247ZWY7IS47JqULjwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cImhpZGRlbiBzbTpmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQtc20gdGV4dC1wcmltYXJ5LTYwMCBmb250LW1lZGl1bSBob3Zlcjp1bmRlcmxpbmVcIj5cbiAgICAgICAgICAgIOyghOyytOuztOq4sCA8QXJyb3dSaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBzbTpncmlkLWNvbHMtMiBsZzpncmlkLWNvbHMtNCBnYXAtNVwiPlxuICAgICAgICAgIHtkaXNwbGF5SXRlbXMubWFwKChpdGVtKSA9PiA8TmV3c0NhcmQga2V5PXtpdGVtLmlkfSBpdGVtPXtpdGVtfSAvPil9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgZmxleCBzbTpoaWRkZW4ganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgdGV4dC1zbSB0ZXh0LXByaW1hcnktNjAwIGZvbnQtbWVkaXVtIGhvdmVyOnVuZGVybGluZVwiPlxuICAgICAgICAgICAg7KCE7LK067O06riwIDxBcnJvd1JpZ2h0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvc2VjdGlvbj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvc2VjdGlvbnMvTmV3c1NlY3Rpb24udHN4In0=