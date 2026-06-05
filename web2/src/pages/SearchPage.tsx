import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/SearchPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/SearchPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Search, Shield, CheckCircle, AlertCircle, ExternalLink, Building2, Phone, MapPin, Calendar, Hash, Clock, ArrowLeft } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { certifiedOrgs, publicDataResults } from "/src/data/mockData.ts";
function matchPublic(q) {
  const lower = q.toLowerCase();
  return publicDataResults.filter(
    (r) => r.name.toLowerCase().includes(lower) || r.address.toLowerCase().includes(lower) || r.phone.includes(lower)
  );
}
function matchCertified(q) {
  const lower = q.toLowerCase();
  return certifiedOrgs.filter(
    (r) => r.name.toLowerCase().includes(lower) || r.address.toLowerCase().includes(lower) || r.phone.includes(lower) || r.tags.some((t) => t.includes(lower))
  );
}
function PublicCard({ item }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-200 p-5", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-3 mb-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Building2, { className: "w-5 h-5 text-gray-500" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 31,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 30,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm", style: { letterSpacing: "-0.015em" }, children: item.name }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 34,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 text-xs", children: item.category }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 35,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 33,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 29,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "badge-green flex-shrink-0", children: item.status }, void 0, false, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 38,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 28,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-2 text-xs text-gray-500", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-2", children: [
        /* @__PURE__ */ jsxDEV(MapPin, { className: "w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 42,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: item.address }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 43,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 41,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(Phone, { className: "w-3.5 h-3.5 flex-shrink-0 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 46,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "font-inter", children: item.phone }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 47,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 45,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 pt-2.5 mt-2.5 border-t border-gray-100", children: [
        /* @__PURE__ */ jsxDEV(ExternalLink, { className: "w-3.5 h-3.5 flex-shrink-0 text-gray-300" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 50,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400", children: [
          "출처: ",
          item.source,
          " · 업데이트: ",
          item.lastUpdated
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 51,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 49,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 40,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/SearchPage.tsx",
    lineNumber: 27,
    columnNumber: 5
  }, this);
}
_c = PublicCard;
function CertifiedCard({ item }) {
  const isActive = item.status === "active";
  const cardBg = isActive ? "bg-gradient-to-br from-primary-50 to-blue-light border-primary-200 shadow-soft hover:shadow-card" : "bg-gray-50 border-gray-200";
  const iconBg = isActive ? "bg-primary-500 shadow-soft" : "bg-gray-300";
  const statusCls = isActive ? "text-primary-600 bg-white border border-primary-200 shadow-sm" : "text-gray-500 bg-white border border-gray-200";
  const innerBg = isActive ? "bg-white/70 border-primary-100" : "bg-white border-gray-100";
  const tagCls = isActive ? "text-primary-600 bg-primary-100" : "text-gray-500 bg-gray-100";
  const tagBorder = isActive ? "border-primary-100" : "border-gray-100";
  return /* @__PURE__ */ jsxDEV("div", { className: `rounded-3xl border p-5 transition-all duration-200 ${cardBg}`, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-3 mb-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: `w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`, children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 74,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 73,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm", style: { letterSpacing: "-0.015em" }, children: item.name }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 77,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 text-xs", children: item.category }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 78,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 76,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 72,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: `flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusCls}`, children: [
        isActive ? /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 82,
          columnNumber: 23
        }, this) : /* @__PURE__ */ jsxDEV(AlertCircle, { className: "w-3 h-3" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 82,
          columnNumber: 61
        }, this),
        isActive ? "VLUE 인증" : "만료"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 81,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 71,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2", children: item.description }, void 0, false, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 87,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: `rounded-2xl p-3 mb-3 border ${innerBg}`, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mb-2", children: [
        /* @__PURE__ */ jsxDEV(Clock, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 91,
          columnNumber: 11
        }, this),
        "실시간 인증 확인: ",
        item.lastVerified
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 90,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 text-xs text-gray-500", children: [
        /* @__PURE__ */ jsxDEV(Calendar, { className: "w-3.5 h-3.5 flex-shrink-0 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 95,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          item.certifiedDate,
          " ~ ",
          item.validUntil
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 96,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 89,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5 text-xs text-gray-600", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-2", children: [
        /* @__PURE__ */ jsxDEV(MapPin, { className: "w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 102,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: item.address }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 103,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 101,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(Phone, { className: "w-3.5 h-3.5 flex-shrink-0 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 106,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "font-inter", children: item.phone }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 107,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 105,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(Building2, { className: "w-3.5 h-3.5 flex-shrink-0 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 110,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          "대표자: ",
          item.representative,
          " · 사업자: ",
          item.businessNumber
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 111,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 109,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(Hash, { className: "w-3.5 h-3.5 flex-shrink-0 text-gray-400" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 114,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "font-inter text-gray-500", children: item.certNumber }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 115,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 113,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 100,
      columnNumber: 7
    }, this),
    item.tags.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: `flex flex-wrap gap-1.5 mt-3 pt-3 border-t ${tagBorder}`, children: item.tags.map(
      (tag) => /* @__PURE__ */ jsxDEV("span", { className: `text-xs px-2.5 py-0.5 rounded-full font-medium ${tagCls}`, children: [
        "#",
        tag
      ] }, tag, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 122,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 120,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/SearchPage.tsx",
    lineNumber: 70,
    columnNumber: 5
  }, this);
}
_c2 = CertifiedCard;
export default function SearchPage({ initialQuery, onBack }) {
  _s();
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const pubResults = matchPublic(activeQuery);
  const certResults = matchCertified(activeQuery);
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) setActiveQuery(query.trim());
  };
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-16", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white border-b border-gray-100 sticky top-16 z-40 shadow-sm", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onBack, className: "p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all flex-shrink-0", children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 150,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 149,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSearch, className: "flex-1 max-w-xl", children: /* @__PURE__ */ jsxDEV("div", { className: "relative flex items-center", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 154,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            className: "w-full pl-10 pr-20 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-gray-50 focus:bg-white transition-all",
            style: { letterSpacing: "-0.01em" }
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 155,
            columnNumber: 17
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", className: "absolute right-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors", children: "검색" }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 162,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 153,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 152,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500 hidden sm:block", style: { letterSpacing: "-0.01em" }, children: [
        /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-gray-900", children: [
          '"',
          activeQuery,
          '"'
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 168,
          columnNumber: 15
        }, this),
        " 검색 결과"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 167,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 148,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 147,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 146,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-5 px-1", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(ExternalLink, { className: "w-4 h-4 text-gray-500" }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 179,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 178,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-bold text-sm", style: { letterSpacing: "-0.02em" }, children: "공공데이터포털 자료" }, void 0, false, {
              fileName: "/home/project/src/pages/SearchPage.tsx",
              lineNumber: 182,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "정부 공식 데이터 기반 정보" }, void 0, false, {
              fileName: "/home/project/src/pages/SearchPage.tsx",
              lineNumber: 183,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 181,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "badge-blue", children: [
            pubResults.length,
            "건"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 185,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 177,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: pubResults.length > 0 ? pubResults.map((item) => /* @__PURE__ */ jsxDEV(PublicCard, { item }, item.id, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 189,
          columnNumber: 40
        }, this)) : /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl border border-gray-100 py-14 text-center shadow-card", children: [
          /* @__PURE__ */ jsxDEV(AlertCircle, { className: "w-10 h-10 text-gray-200 mx-auto mb-3" }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 192,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-sm", children: "공공데이터에서 결과를 찾을 수 없습니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 193,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 191,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 187,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 176,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-5 px-1", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-2xl bg-primary-100 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4 text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 203,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 202,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-bold text-sm", style: { letterSpacing: "-0.02em" }, children: "VLUE 인증 신뢰 데이터" }, void 0, false, {
              fileName: "/home/project/src/pages/SearchPage.tsx",
              lineNumber: 206,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "VLUE 직접 검증 · 실시간 인증" }, void 0, false, {
              fileName: "/home/project/src/pages/SearchPage.tsx",
              lineNumber: 207,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 205,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "badge-blue", children: [
            certResults.length,
            "건"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 209,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 201,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: certResults.length > 0 ? certResults.map((item) => /* @__PURE__ */ jsxDEV(CertifiedCard, { item }, item.id, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 213,
          columnNumber: 41
        }, this)) : /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl border border-gray-100 py-14 text-center shadow-card", children: [
          /* @__PURE__ */ jsxDEV(Shield, { className: "w-10 h-10 text-gray-200 mx-auto mb-3" }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 216,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-sm", children: "VLUE 인증 데이터에서 결과를 찾을 수 없습니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SearchPage.tsx",
            lineNumber: 217,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 215,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SearchPage.tsx",
          lineNumber: 211,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SearchPage.tsx",
        lineNumber: 200,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 175,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SearchPage.tsx",
      lineNumber: 174,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/SearchPage.tsx",
    lineNumber: 145,
    columnNumber: 5
  }, this);
}
_s(SearchPage, "ieABFDdE6F2SQ7bukzlfz6w8Ufo=");
_c3 = SearchPage;
var _c, _c2, _c3;
$RefreshReg$(_c, "PublicCard");
$RefreshReg$(_c2, "CertifiedCard");
$RefreshReg$(_c3, "SearchPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/SearchPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/SearchPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFBO0FBQUFvQixhQUFBRCxLQUFBIiwibmFtZXMiOlsiRm9ybUV2ZW50IiwiU2VhcmNoIiwiU2hpZWxkIiwiQ2hlY2tDaXJjbGUiLCJBbGVydENpcmNsZSIsIkV4dGVybmFsTGluayIsIkJ1aWxkaW5nMiIsIlBob25lIiwiTWFwUGluIiwiQ2FsZW5kYXIiLCJIYXNoIiwiQ2xvY2siLCJBcnJvd0xlZnQiLCJjZXJ0aWZpZWRPcmdzIiwicHVibGljRGF0YVJlc3VsdHMiLCJtYXRjaFB1YmxpYyIsInEiLCJsb3dlciIsInRvTG93ZXJDYXNlIiwiZmlsdGVyIiwiciIsIm5hbWUiLCJpbmNsdWRlcyIsImFkZHJlc3MiLCJwaG9uZSIsIm1hdGNoQ2VydGlmaWVkIiwidGFncyIsInNvbWUiLCJ0IiwiUHVibGljQ2FyZCIsIml0ZW0iLCJsZXR0ZXJTcGFjaW5nIiwiY2F0ZWdvcnkiLCJzdGF0dXMiLCJzb3VyY2UiLCJsYXN0VXBkYXRlZCIsIl9jIiwiQ2VydGlmaWVkQ2FyZCIsImlzQWN0aXZlIiwiY2FyZEJnIiwiaWNvbkJnIiwic3RhdHVzQ2xzIiwiaW5uZXJCZyIsInRhZ0NscyIsInRhZ0JvcmRlciIsImRlc2NyaXB0aW9uIiwibGFzdFZlcmlmaWVkIiwiY2VydGlmaWVkRGF0ZSIsInZhbGlkVW50aWwiLCJyZXByZXNlbnRhdGl2ZSIsImJ1c2luZXNzTnVtYmVyIiwiY2VydE51bWJlciIsImxlbmd0aCIsIm1hcCIsInRhZyIsIl9jMiIsIlNlYXJjaFBhZ2UiLCJpbml0aWFsUXVlcnkiLCJvbkJhY2siLCJfcyIsInF1ZXJ5Iiwic2V0UXVlcnkiLCJ1c2VTdGF0ZSIsImFjdGl2ZVF1ZXJ5Iiwic2V0QWN0aXZlUXVlcnkiLCJwdWJSZXN1bHRzIiwiY2VydFJlc3VsdHMiLCJoYW5kbGVTZWFyY2giLCJlIiwicHJldmVudERlZmF1bHQiLCJ0cmltIiwidGFyZ2V0IiwidmFsdWUiLCJpZCIsIl9jMyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJTZWFyY2hQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSwgRm9ybUV2ZW50IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgU2VhcmNoLCBTaGllbGQsIENoZWNrQ2lyY2xlLCBBbGVydENpcmNsZSwgRXh0ZXJuYWxMaW5rLCBCdWlsZGluZzIsIFBob25lLCBNYXBQaW4sIENhbGVuZGFyLCBIYXNoLCBDbG9jaywgQXJyb3dMZWZ0IH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IENlcnRpZmllZE9yZywgUHVibGljRGF0YVJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGNlcnRpZmllZE9yZ3MsIHB1YmxpY0RhdGFSZXN1bHRzIH0gZnJvbSAnLi4vZGF0YS9tb2NrRGF0YSc7XG5cbmludGVyZmFjZSBTZWFyY2hQYWdlUHJvcHMge1xuICBpbml0aWFsUXVlcnk6IHN0cmluZztcbiAgb25CYWNrOiAoKSA9PiB2b2lkO1xufVxuXG5mdW5jdGlvbiBtYXRjaFB1YmxpYyhxOiBzdHJpbmcpOiBQdWJsaWNEYXRhUmVzdWx0W10ge1xuICBjb25zdCBsb3dlciA9IHEudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHB1YmxpY0RhdGFSZXN1bHRzLmZpbHRlcihcbiAgICAocikgPT4gci5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXIpIHx8IHIuYWRkcmVzcy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyKSB8fCByLnBob25lLmluY2x1ZGVzKGxvd2VyKVxuICApO1xufVxuXG5mdW5jdGlvbiBtYXRjaENlcnRpZmllZChxOiBzdHJpbmcpOiBDZXJ0aWZpZWRPcmdbXSB7XG4gIGNvbnN0IGxvd2VyID0gcS50b0xvd2VyQ2FzZSgpO1xuICByZXR1cm4gY2VydGlmaWVkT3Jncy5maWx0ZXIoXG4gICAgKHIpID0+IHIubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyKSB8fCByLmFkZHJlc3MudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlcikgfHwgci5waG9uZS5pbmNsdWRlcyhsb3dlcikgfHwgci50YWdzLnNvbWUoKHQpID0+IHQuaW5jbHVkZXMobG93ZXIpKVxuICApO1xufVxuXG5mdW5jdGlvbiBQdWJsaWNDYXJkKHsgaXRlbSB9OiB7IGl0ZW06IFB1YmxpY0RhdGFSZXN1bHQgfSkge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCBzaGFkb3ctY2FyZCBob3ZlcjpzaGFkb3ctY2FyZC1ob3ZlciB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0yMDAgcC01XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC0zIG1iLTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtMnhsIGJnLWdyYXktMTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgIDxCdWlsZGluZzIgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LWdyYXktNTAwXCIgLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc21cIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDE1ZW0nIH19PntpdGVtLm5hbWV9PC9oMz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14c1wiPntpdGVtLmNhdGVnb3J5fTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImJhZGdlLWdyZWVuIGZsZXgtc2hyaW5rLTBcIj57aXRlbS5zdGF0dXN9PC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMiB0ZXh0LXhzIHRleHQtZ3JheS01MDBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yXCI+XG4gICAgICAgICAgPE1hcFBpbiBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSBmbGV4LXNocmluay0wIG10LTAuNSB0ZXh0LWdyYXktNDAwXCIgLz5cbiAgICAgICAgICA8c3Bhbj57aXRlbS5hZGRyZXNzfTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8UGhvbmUgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgZmxleC1zaHJpbmstMCB0ZXh0LWdyYXktNDAwXCIgLz5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWludGVyXCI+e2l0ZW0ucGhvbmV9PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBwdC0yLjUgbXQtMi41IGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgZmxleC1zaHJpbmstMCB0ZXh0LWdyYXktMzAwXCIgLz5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwXCI+7Lac7LKYOiB7aXRlbS5zb3VyY2V9IMK3IOyXheuNsOydtO2KuDoge2l0ZW0ubGFzdFVwZGF0ZWR9PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBDZXJ0aWZpZWRDYXJkKHsgaXRlbSB9OiB7IGl0ZW06IENlcnRpZmllZE9yZyB9KSB7XG4gIGNvbnN0IGlzQWN0aXZlID0gaXRlbS5zdGF0dXMgPT09ICdhY3RpdmUnO1xuICBjb25zdCBjYXJkQmcgPSBpc0FjdGl2ZSA/ICdiZy1ncmFkaWVudC10by1iciBmcm9tLXByaW1hcnktNTAgdG8tYmx1ZS1saWdodCBib3JkZXItcHJpbWFyeS0yMDAgc2hhZG93LXNvZnQgaG92ZXI6c2hhZG93LWNhcmQnIDogJ2JnLWdyYXktNTAgYm9yZGVyLWdyYXktMjAwJztcbiAgY29uc3QgaWNvbkJnID0gaXNBY3RpdmUgPyAnYmctcHJpbWFyeS01MDAgc2hhZG93LXNvZnQnIDogJ2JnLWdyYXktMzAwJztcbiAgY29uc3Qgc3RhdHVzQ2xzID0gaXNBY3RpdmVcbiAgICA/ICd0ZXh0LXByaW1hcnktNjAwIGJnLXdoaXRlIGJvcmRlciBib3JkZXItcHJpbWFyeS0yMDAgc2hhZG93LXNtJ1xuICAgIDogJ3RleHQtZ3JheS01MDAgYmctd2hpdGUgYm9yZGVyIGJvcmRlci1ncmF5LTIwMCc7XG4gIGNvbnN0IGlubmVyQmcgPSBpc0FjdGl2ZSA/ICdiZy13aGl0ZS83MCBib3JkZXItcHJpbWFyeS0xMDAnIDogJ2JnLXdoaXRlIGJvcmRlci1ncmF5LTEwMCc7XG4gIGNvbnN0IHRhZ0NscyA9IGlzQWN0aXZlID8gJ3RleHQtcHJpbWFyeS02MDAgYmctcHJpbWFyeS0xMDAnIDogJ3RleHQtZ3JheS01MDAgYmctZ3JheS0xMDAnO1xuICBjb25zdCB0YWdCb3JkZXIgPSBpc0FjdGl2ZSA/ICdib3JkZXItcHJpbWFyeS0xMDAnIDogJ2JvcmRlci1ncmF5LTEwMCc7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT17YHJvdW5kZWQtM3hsIGJvcmRlciBwLTUgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMjAwICR7Y2FyZEJnfWB9PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyBtYi00XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMTAgaC0xMCByb3VuZGVkLTJ4bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wICR7aWNvbkJnfWB9PlxuICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LWJvbGQgdGV4dC1zbVwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMTVlbScgfX0+e2l0ZW0ubmFtZX08L2gzPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzXCI+e2l0ZW0uY2F0ZWdvcnl9PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC14cyBmb250LXNlbWlib2xkIHB4LTIuNSBweS0xIHJvdW5kZWQtZnVsbCBmbGV4LXNocmluay0wICR7c3RhdHVzQ2xzfWB9PlxuICAgICAgICAgIHtpc0FjdGl2ZSA/IDxDaGVja0NpcmNsZSBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz4gOiA8QWxlcnRDaXJjbGUgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+fVxuICAgICAgICAgIHtpc0FjdGl2ZSA/ICdWTFVFIOyduOymnScgOiAn66eM66OMJ31cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWQgbWItNCBsaW5lLWNsYW1wLTJcIj57aXRlbS5kZXNjcmlwdGlvbn08L3A+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPXtgcm91bmRlZC0yeGwgcC0zIG1iLTMgYm9yZGVyICR7aW5uZXJCZ31gfT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQteHMgdGV4dC1lbWVyYWxkLTYwMCBmb250LXNlbWlib2xkIG1iLTJcIj5cbiAgICAgICAgICA8Q2xvY2sgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgIOyLpOyLnOqwhCDsnbjspp0g7ZmV7J24OiB7aXRlbS5sYXN0VmVyaWZpZWR9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgdGV4dC14cyB0ZXh0LWdyYXktNTAwXCI+XG4gICAgICAgICAgPENhbGVuZGFyIGNsYXNzTmFtZT1cInctMy41IGgtMy41IGZsZXgtc2hyaW5rLTAgdGV4dC1ncmF5LTQwMFwiIC8+XG4gICAgICAgICAgPHNwYW4+e2l0ZW0uY2VydGlmaWVkRGF0ZX0gfiB7aXRlbS52YWxpZFVudGlsfTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEuNSB0ZXh0LXhzIHRleHQtZ3JheS02MDBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0yXCI+XG4gICAgICAgICAgPE1hcFBpbiBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSBmbGV4LXNocmluay0wIG10LTAuNSB0ZXh0LWdyYXktNDAwXCIgLz5cbiAgICAgICAgICA8c3Bhbj57aXRlbS5hZGRyZXNzfTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8UGhvbmUgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgZmxleC1zaHJpbmstMCB0ZXh0LWdyYXktNDAwXCIgLz5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWludGVyXCI+e2l0ZW0ucGhvbmV9PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgIDxCdWlsZGluZzIgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgZmxleC1zaHJpbmstMCB0ZXh0LWdyYXktNDAwXCIgLz5cbiAgICAgICAgICA8c3Bhbj7rjIDtkZzsnpA6IHtpdGVtLnJlcHJlc2VudGF0aXZlfSDCtyDsgqzsl4XsnpA6IHtpdGVtLmJ1c2luZXNzTnVtYmVyfTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8SGFzaCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSBmbGV4LXNocmluay0wIHRleHQtZ3JheS00MDBcIiAvPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtaW50ZXIgdGV4dC1ncmF5LTUwMFwiPntpdGVtLmNlcnROdW1iZXJ9PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICB7aXRlbS50YWdzLmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGZsZXggZmxleC13cmFwIGdhcC0xLjUgbXQtMyBwdC0zIGJvcmRlci10ICR7dGFnQm9yZGVyfWB9PlxuICAgICAgICAgIHtpdGVtLnRhZ3MubWFwKCh0YWcpID0+IChcbiAgICAgICAgICAgIDxzcGFuIGtleT17dGFnfSBjbGFzc05hbWU9e2B0ZXh0LXhzIHB4LTIuNSBweS0wLjUgcm91bmRlZC1mdWxsIGZvbnQtbWVkaXVtICR7dGFnQ2xzfWB9PlxuICAgICAgICAgICAgICAje3RhZ31cbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTZWFyY2hQYWdlKHsgaW5pdGlhbFF1ZXJ5LCBvbkJhY2sgfTogU2VhcmNoUGFnZVByb3BzKSB7XG4gIGNvbnN0IFtxdWVyeSwgc2V0UXVlcnldID0gdXNlU3RhdGUoaW5pdGlhbFF1ZXJ5KTtcbiAgY29uc3QgW2FjdGl2ZVF1ZXJ5LCBzZXRBY3RpdmVRdWVyeV0gPSB1c2VTdGF0ZShpbml0aWFsUXVlcnkpO1xuXG4gIGNvbnN0IHB1YlJlc3VsdHMgPSBtYXRjaFB1YmxpYyhhY3RpdmVRdWVyeSk7XG4gIGNvbnN0IGNlcnRSZXN1bHRzID0gbWF0Y2hDZXJ0aWZpZWQoYWN0aXZlUXVlcnkpO1xuXG4gIGNvbnN0IGhhbmRsZVNlYXJjaCA9IChlOiBGb3JtRXZlbnQpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYgKHF1ZXJ5LnRyaW0oKSkgc2V0QWN0aXZlUXVlcnkocXVlcnkudHJpbSgpKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxtYWluIGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ibHVlLXRpbnQgcHQtMTZcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgYm9yZGVyLWIgYm9yZGVyLWdyYXktMTAwIHN0aWNreSB0b3AtMTYgei00MCBzaGFkb3ctc21cIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS0zXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbkJhY2t9IGNsYXNzTmFtZT1cInAtMS41IHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1wcmltYXJ5LTUwMCBob3ZlcjpiZy1wcmltYXJ5LTUwIHJvdW5kZWQteGwgdHJhbnNpdGlvbi1hbGwgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICA8QXJyb3dMZWZ0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17aGFuZGxlU2VhcmNofSBjbGFzc05hbWU9XCJmbGV4LTEgbWF4LXcteGxcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSBmbGV4IGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVwiYWJzb2x1dGUgbGVmdC0zLjUgdy00IGgtNCB0ZXh0LWdyYXktNDAwIHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgdmFsdWU9e3F1ZXJ5fVxuICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRRdWVyeShlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcGwtMTAgcHItMjAgcHktMi41IHRleHQtc20gYm9yZGVyIGJvcmRlci1ncmF5LTIwMCByb3VuZGVkLTJ4bCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLXByaW1hcnktNDAwIGZvY3VzOnJpbmctMiBmb2N1czpyaW5nLXByaW1hcnktMTAwIGJnLWdyYXktNTAgZm9jdXM6Ymctd2hpdGUgdHJhbnNpdGlvbi1hbGxcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAxZW0nIH19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJzdWJtaXRcIiBjbGFzc05hbWU9XCJhYnNvbHV0ZSByaWdodC0xLjUgcHgtMyBweS0xLjUgdGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtd2hpdGUgYmctcHJpbWFyeS01MDAgaG92ZXI6YmctcHJpbWFyeS02MDAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICAgICAg6rKA7IOJXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LWdyYXktNTAwIGhpZGRlbiBzbTpibG9ja1wiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMWVtJyB9fT5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZ3JheS05MDBcIj5cInthY3RpdmVRdWVyeX1cIjwvc3Bhbj4g6rKA7IOJIOqysOqzvFxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB5LTZcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIGxnOmdyaWQtY29scy0yIGdhcC02XCI+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgbWItNSBweC0xXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLTJ4bCBiZy1ncmF5LTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWdyYXktNTAwXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc21cIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScgfX0+6rO16rO1642w7J207YSw7Y+s7YS4IOyekOujjDwvaDI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzXCI+7KCV67aAIOqzteyLnSDrjbDsnbTthLAg6riw67CYIOygleuztDwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImJhZGdlLWJsdWVcIj57cHViUmVzdWx0cy5sZW5ndGh96rG0PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktM1wiPlxuICAgICAgICAgICAgICB7cHViUmVzdWx0cy5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgPyBwdWJSZXN1bHRzLm1hcCgoaXRlbSkgPT4gPFB1YmxpY0NhcmQga2V5PXtpdGVtLmlkfSBpdGVtPXtpdGVtfSAvPilcbiAgICAgICAgICAgICAgICA6IChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCBweS0xNCB0ZXh0LWNlbnRlciBzaGFkb3ctY2FyZFwiPlxuICAgICAgICAgICAgICAgICAgICA8QWxlcnRDaXJjbGUgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHRleHQtZ3JheS0yMDAgbXgtYXV0byBtYi0zXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXNtXCI+6rO16rO1642w7J207YSw7JeQ7IScIOqysOqzvOulvCDssL7snYQg7IiYIOyXhuyKteuLiOuLpC48L3A+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgbWItNSBweC0xXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLTJ4bCBiZy1wcmltYXJ5LTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNjAwXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc21cIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScgfX0+VkxVRSDsnbjspp0g7Iug66KwIOuNsOydtO2EsDwvaDI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzXCI+VkxVRSDsp4HsoJEg6rKA7KadIMK3IOyLpOyLnOqwhCDsnbjspp08L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJiYWRnZS1ibHVlXCI+e2NlcnRSZXN1bHRzLmxlbmd0aH3qsbQ8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zXCI+XG4gICAgICAgICAgICAgIHtjZXJ0UmVzdWx0cy5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgPyBjZXJ0UmVzdWx0cy5tYXAoKGl0ZW0pID0+IDxDZXJ0aWZpZWRDYXJkIGtleT17aXRlbS5pZH0gaXRlbT17aXRlbX0gLz4pXG4gICAgICAgICAgICAgICAgOiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItZ3JheS0xMDAgcHktMTQgdGV4dC1jZW50ZXIgc2hhZG93LWNhcmRcIj5cbiAgICAgICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgdGV4dC1ncmF5LTIwMCBteC1hdXRvIG1iLTNcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQtc21cIj5WTFVFIOyduOymnSDrjbDsnbTthLDsl5DshJwg6rKw6rO866W8IOywvuydhCDsiJgg7JeG7Iq164uI64ukLjwvcD5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9TZWFyY2hQYWdlLnRzeCJ9