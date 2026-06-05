import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/ResourcesPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/ResourcesPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"]; const useEffect = __vite__cjsImport3_react["useEffect"];
import { FileText, Search, Home, Building2, FileCheck, Briefcase, ClipboardList, Shield, ChevronRight, CreditCard as Edit3, Printer, Tag, AlertCircle, Download, User } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { supabase, isSupabaseAvailable } from "/src/lib/supabase.ts";
import DocumentEditor from "/src/components/DocumentEditor.tsx";
const CATEGORY_ICONS = {
  "부동산 계약서": Home,
  "거래확인서": FileCheck,
  "발주·거래 서류": ClipboardList,
  "각종 계약서": Briefcase,
  "업무 서식": FileText,
  "보이스피싱 예방": Shield
};
const CATEGORY_COLORS = {
  "부동산 계약서": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", iconBg: "bg-blue-100" },
  "거래확인서": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100", iconBg: "bg-teal-100" },
  "발주·거래 서류": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", iconBg: "bg-amber-100" },
  "각종 계약서": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", iconBg: "bg-rose-100" },
  "업무 서식": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", iconBg: "bg-emerald-100" },
  "보이스피싱 예방": { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", iconBg: "bg-red-100" }
};
const DEFAULT_COLOR = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", iconBg: "bg-gray-100" };
function getUserDisplayName(email) {
  const local = email.split("@")[0];
  return local.length > 2 ? local.slice(0, local.length - 1) + "*" : local;
}
export default function ResourcesPage({ user }) {
  _s();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);
  useEffect(() => {
    loadDocuments();
  }, []);
  async function loadDocuments() {
    setLoading(true);
    if (!isSupabaseAvailable) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("documents").select("*").eq("is_active", true).order("sort_order");
    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }
  const categories = ["전체", ...Array.from(new Set(documents.map((d) => d.category)))];
  const filtered = documents.filter((d) => {
    const matchCat = selectedCategory === "전체" || d.category === selectedCategory;
    const matchQ = query === "" || d.title.toLowerCase().includes(query.toLowerCase()) || d.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });
  const grouped = filtered.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});
  const displayName = user ? getUserDisplayName(user.email) : null;
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-16", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 py-10", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(FileText, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 102,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 101,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-sm font-semibold", children: "VLUE 공식 자료실" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 104,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 100,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-black text-white mb-1", children: "업무 서류 자료실" }, void 0, false, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 106,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mb-5", children: [
        "각종 계약서 및 업무 서식을 열어 작성·수정하고 바로 인쇄하세요.",
        displayName && /* @__PURE__ */ jsxDEV("span", { className: "ml-2 text-white/90 font-semibold", children: [
          "(",
          displayName,
          "님 이름 자동입력)"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 110,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 107,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "relative max-w-xl", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl overflow-hidden focus-within:bg-white/25 focus-within:border-white/50 transition-all duration-200", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-4 w-4 h-4 text-white/70 pointer-events-none" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 115,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "서류명 검색...",
            className: "flex-1 pl-11 pr-4 py-3 bg-transparent text-white text-sm placeholder-white/60 focus:outline-none"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 116,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 114,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 113,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ResourcesPage.tsx",
      lineNumber: 99,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/ResourcesPage.tsx",
      lineNumber: 98,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-3", children: [
      !user && /* @__PURE__ */ jsxDEV("div", { className: "bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3", children: [
        /* @__PURE__ */ jsxDEV(AlertCircle, { className: "w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 131,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-amber-800 font-semibold text-sm", children: "로그인이 필요한 서비스입니다." }, void 0, false, {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 133,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-amber-600 text-xs mt-0.5", children: "모든 서비스는 회원가입 및 로그인 후 이용 가능합니다." }, void 0, false, {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 134,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 132,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 130,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white border border-gray-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-card", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(User, { className: "w-5 h-5 text-primary-600" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 140,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 139,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-900 font-bold text-sm", children: "VLUE 표준 이력서 다운로드" }, void 0, false, {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 143,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs mt-0.5", style: { wordBreak: "keep-all" }, children: "VLUE 인증 기관 취업에 최적화된 공식 표준 이력서 양식입니다. 구인구직 메뉴에서 'VLUE 이력서 즉시 지원' 기능과 연동됩니다." }, void 0, false, {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 144,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 142,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "a",
          {
            href: "#",
            onClick: (e) => e.preventDefault(),
            className: "flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex-shrink-0",
            children: [
              /* @__PURE__ */ jsxDEV(Download, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/ResourcesPage.tsx",
                lineNumber: 153,
                columnNumber: 13
              }, this),
              "이력서 다운로드"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 148,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 138,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ResourcesPage.tsx",
      lineNumber: 128,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-6 overflow-x-auto pb-1", style: { scrollbarWidth: "none" }, children: categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat];
        return /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setSelectedCategory(cat),
            className: `flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${selectedCategory === cat ? "bg-primary-600 text-white border-primary-600 shadow-sm" : "bg-white text-gray-500 hover:text-primary-600 hover:bg-primary-50 border-gray-200"}`,
            children: [
              Icon && /* @__PURE__ */ jsxDEV(Icon, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/ResourcesPage.tsx",
                lineNumber: 173,
                columnNumber: 26
              }, this),
              cat
            ]
          },
          cat,
          true,
          {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 164,
            columnNumber: 15
          },
          this
        );
      }) }, void 0, false, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 160,
        columnNumber: 9
      }, this),
      loading ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center py-32", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 182,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-sm", children: "서류 목록을 불러오는 중..." }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 183,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 181,
        columnNumber: 9
      }, this) : filtered.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "w-10 h-10 text-gray-200 mb-3" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 187,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 font-semibold text-sm mb-1", children: "검색 결과가 없습니다" }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 188,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "다른 키워드로 검색해보세요." }, void 0, false, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 189,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 186,
        columnNumber: 9
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "space-y-10", children: Object.entries(grouped).map(([cat, docs]) => {
        const Icon = CATEGORY_ICONS[cat] || Building2;
        const color = CATEGORY_COLORS[cat] || DEFAULT_COLOR;
        return /* @__PURE__ */ jsxDEV("section", { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5 mb-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: `w-8 h-8 rounded-xl ${color.iconBg} flex items-center justify-center`, children: /* @__PURE__ */ jsxDEV(Icon, { className: `w-4 h-4 ${color.text}` }, void 0, false, {
              fileName: "/home/project/src/pages/ResourcesPage.tsx",
              lineNumber: 200,
              columnNumber: 23
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/ResourcesPage.tsx",
              lineNumber: 199,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-bold text-base", style: { letterSpacing: "-0.01em" }, children: cat }, void 0, false, {
              fileName: "/home/project/src/pages/ResourcesPage.tsx",
              lineNumber: 202,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: `text-xs px-2 py-0.5 rounded-full font-semibold border ${color.bg} ${color.text} ${color.border}`, children: [
              docs.length,
              "건"
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/ResourcesPage.tsx",
              lineNumber: 203,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 198,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: docs.map((doc) => {
            const c = CATEGORY_COLORS[doc.category] || DEFAULT_COLOR;
            return /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "card p-5 flex flex-col gap-3 hover:border-primary-200 hover:shadow-md transition-all group cursor-pointer",
                onClick: () => setEditingDoc(doc),
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-2", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: `w-9 h-9 rounded-2xl ${c.iconBg} flex items-center justify-center flex-shrink-0`, children: /* @__PURE__ */ jsxDEV(FileText, { className: `w-4.5 h-4.5 ${c.text}`, style: { width: "18px", height: "18px" } }, void 0, false, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 219,
                      columnNumber: 31
                    }, this) }, void 0, false, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 218,
                      columnNumber: 29
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: `text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${c.bg} ${c.text} ${c.border}`, children: [
                      /* @__PURE__ */ jsxDEV(Tag, { className: "w-2.5 h-2.5 inline mr-0.5" }, void 0, false, {
                        fileName: "/home/project/src/pages/ResourcesPage.tsx",
                        lineNumber: 222,
                        columnNumber: 31
                      }, this),
                      doc.tag
                    ] }, void 0, true, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 221,
                      columnNumber: 29
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/ResourcesPage.tsx",
                    lineNumber: 217,
                    columnNumber: 27
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
                    /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm leading-snug mb-1 group-hover:text-primary-600 transition-colors", style: { letterSpacing: "-0.01em" }, children: doc.title }, void 0, false, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 228,
                      columnNumber: 29
                    }, this),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs leading-relaxed line-clamp-2", children: doc.description }, void 0, false, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 231,
                      columnNumber: 29
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/ResourcesPage.tsx",
                    lineNumber: 227,
                    columnNumber: 27
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between pt-2 border-t border-gray-100", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400", children: [
                      doc.template_fields.length,
                      "개 항목"
                    ] }, void 0, true, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 237,
                      columnNumber: 29
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-xs text-gray-400", children: [
                        /* @__PURE__ */ jsxDEV(Edit3, { className: "w-3 h-3" }, void 0, false, {
                          fileName: "/home/project/src/pages/ResourcesPage.tsx",
                          lineNumber: 240,
                          columnNumber: 33
                        }, this),
                        " 작성"
                      ] }, void 0, true, {
                        fileName: "/home/project/src/pages/ResourcesPage.tsx",
                        lineNumber: 239,
                        columnNumber: 31
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-xs text-gray-400", children: [
                        /* @__PURE__ */ jsxDEV(Printer, { className: "w-3 h-3" }, void 0, false, {
                          fileName: "/home/project/src/pages/ResourcesPage.tsx",
                          lineNumber: 243,
                          columnNumber: 33
                        }, this),
                        " 인쇄"
                      ] }, void 0, true, {
                        fileName: "/home/project/src/pages/ResourcesPage.tsx",
                        lineNumber: 242,
                        columnNumber: 31
                      }, this),
                      /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4 text-gray-300 group-hover:text-primary-400 transition-colors" }, void 0, false, {
                        fileName: "/home/project/src/pages/ResourcesPage.tsx",
                        lineNumber: 245,
                        columnNumber: 31
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/home/project/src/pages/ResourcesPage.tsx",
                      lineNumber: 238,
                      columnNumber: 29
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/ResourcesPage.tsx",
                    lineNumber: 236,
                    columnNumber: 27
                  }, this)
                ]
              },
              doc.id,
              true,
              {
                fileName: "/home/project/src/pages/ResourcesPage.tsx",
                lineNumber: 212,
                columnNumber: 23
              },
              this
            );
          }) }, void 0, false, {
            fileName: "/home/project/src/pages/ResourcesPage.tsx",
            lineNumber: 208,
            columnNumber: 19
          }, this)
        ] }, cat, true, {
          fileName: "/home/project/src/pages/ResourcesPage.tsx",
          lineNumber: 197,
          columnNumber: 15
        }, this);
      }) }, void 0, false, {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 192,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ResourcesPage.tsx",
      lineNumber: 159,
      columnNumber: 7
    }, this),
    editingDoc && /* @__PURE__ */ jsxDEV(
      DocumentEditor,
      {
        title: editingDoc.title,
        category: editingDoc.category,
        fields: editingDoc.template_fields,
        userName: displayName ?? void 0,
        onClose: () => setEditingDoc(null)
      },
      void 0,
      false,
      {
        fileName: "/home/project/src/pages/ResourcesPage.tsx",
        lineNumber: 260,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/ResourcesPage.tsx",
    lineNumber: 97,
    columnNumber: 5
  }, this);
}
_s(ResourcesPage, "TmZVpF+MKXD4gVlypfH7qPj97J0=");
_c = ResourcesPage;
var _c;
$RefreshReg$(_c, "ResourcesPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/ResourcesPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/ResourcesPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QTtBQUFBO0FBQUEsNkJBRUE7QUFBQSxzQkFDQSx1QkFBQyxnQkFBYSxXQUFVLDBFQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLDZCQUE4RjtBQUFBLHlCQVBoRztBQUFBO0FBQUE7QUFBQTtBQUFBLDJCQVFBO0FBQUEsdUJBVkY7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFXQTtBQUFBO0FBQUE7QUFBQSxjQWxDS3dDLElBQUlxQjtBQUFBQSxjQURYO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFvQ0E7QUFBQSxVQUVKLENBQUMsS0ExQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkEyQ0E7QUFBQSxhQXREWVosS0FBZDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBdURBO0FBQUEsTUFFSixDQUFDLEtBOURIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUErREE7QUFBQSxTQWhHSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBa0dBO0FBQUEsSUFFQ25DLGNBQ0M7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLE9BQU9BLFdBQVdtQjtBQUFBQSxRQUNsQixVQUFVbkIsV0FBV2M7QUFBQUEsUUFDckIsUUFBUWQsV0FBVzhDO0FBQUFBLFFBQ25CLFVBQVVsQixlQUFlb0I7QUFBQUEsUUFDekIsU0FBUyxNQUFNL0MsY0FBYyxJQUFJO0FBQUE7QUFBQSxNQUxuQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFLcUM7QUFBQSxPQXhLekM7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTJLQTtBQUVKO0FBQUNYLEdBdk51QkYsZUFBYTtBQUFBNkQsS0FBYjdEO0FBQWEsSUFBQTZEO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJ1c2VFZmZlY3QiLCJGaWxlVGV4dCIsIlNlYXJjaCIsIkhvbWUiLCJCdWlsZGluZzIiLCJGaWxlQ2hlY2siLCJCcmllZmNhc2UiLCJDbGlwYm9hcmRMaXN0IiwiU2hpZWxkIiwiQ2hldnJvblJpZ2h0IiwiQ3JlZGl0Q2FyZCIsIkVkaXQzIiwiUHJpbnRlciIsIlRhZyIsIkFsZXJ0Q2lyY2xlIiwiRG93bmxvYWQiLCJVc2VyIiwic3VwYWJhc2UiLCJpc1N1cGFiYXNlQXZhaWxhYmxlIiwiRG9jdW1lbnRFZGl0b3IiLCJDQVRFR09SWV9JQ09OUyIsIkNBVEVHT1JZX0NPTE9SUyIsImJnIiwidGV4dCIsImJvcmRlciIsImljb25CZyIsIkRFRkFVTFRfQ09MT1IiLCJnZXRVc2VyRGlzcGxheU5hbWUiLCJlbWFpbCIsImxvY2FsIiwic3BsaXQiLCJsZW5ndGgiLCJzbGljZSIsIlJlc291cmNlc1BhZ2UiLCJ1c2VyIiwiX3MiLCJkb2N1bWVudHMiLCJzZXREb2N1bWVudHMiLCJ1c2VTdGF0ZSIsImxvYWRpbmciLCJzZXRMb2FkaW5nIiwic2VsZWN0ZWRDYXRlZ29yeSIsInNldFNlbGVjdGVkQ2F0ZWdvcnkiLCJxdWVyeSIsInNldFF1ZXJ5IiwiZWRpdGluZ0RvYyIsInNldEVkaXRpbmdEb2MiLCJsb2FkRG9jdW1lbnRzIiwiZGF0YSIsImVycm9yIiwiZnJvbSIsInNlbGVjdCIsImVxIiwib3JkZXIiLCJjYXRlZ29yaWVzIiwiQXJyYXkiLCJTZXQiLCJtYXAiLCJkIiwiY2F0ZWdvcnkiLCJmaWx0ZXJlZCIsImZpbHRlciIsIm1hdGNoQ2F0IiwibWF0Y2hRIiwidGl0bGUiLCJ0b0xvd2VyQ2FzZSIsImluY2x1ZGVzIiwiZGVzY3JpcHRpb24iLCJncm91cGVkIiwicmVkdWNlIiwiYWNjIiwiZG9jIiwicHVzaCIsImRpc3BsYXlOYW1lIiwiZSIsInRhcmdldCIsInZhbHVlIiwid29yZEJyZWFrIiwicHJldmVudERlZmF1bHQiLCJzY3JvbGxiYXJXaWR0aCIsImNhdCIsIkljb24iLCJPYmplY3QiLCJlbnRyaWVzIiwiZG9jcyIsImNvbG9yIiwibGV0dGVyU3BhY2luZyIsImMiLCJ3aWR0aCIsImhlaWdodCIsInRhZyIsInRlbXBsYXRlX2ZpZWxkcyIsImlkIiwidW5kZWZpbmVkIiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiUmVzb3VyY2VzUGFnZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEZpbGVUZXh0LCBTZWFyY2gsIEhvbWUsIEJ1aWxkaW5nMiwgRmlsZUNoZWNrLCBCcmllZmNhc2UsIENsaXBib2FyZExpc3QsIFNoaWVsZCwgQ2hldnJvblJpZ2h0LCBDcmVkaXRDYXJkIGFzIEVkaXQzLCBQcmludGVyLCBUYWcsIEFsZXJ0Q2lyY2xlLCBEb3dubG9hZCwgVXNlciB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyBzdXBhYmFzZSwgaXNTdXBhYmFzZUF2YWlsYWJsZSB9IGZyb20gJy4uL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgRG9jdW1lbnRFZGl0b3IgZnJvbSAnLi4vY29tcG9uZW50cy9Eb2N1bWVudEVkaXRvcic7XG5cbmludGVyZmFjZSBUZW1wbGF0ZUZpZWxkIHtcbiAga2V5OiBzdHJpbmc7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIHR5cGU6ICd0ZXh0JyB8ICdkYXRlJyB8ICd0ZXh0YXJlYScgfCAnc2VsZWN0JztcbiAgcGxhY2Vob2xkZXI/OiBzdHJpbmc7XG4gIG9wdGlvbnM/OiBzdHJpbmdbXTtcbiAgcmVxdWlyZWQ6IGJvb2xlYW47XG4gIGF1dG9GaWxsPzogJ25hbWUnO1xufVxuXG5pbnRlcmZhY2UgRG9jdW1lbnQge1xuICBpZDogc3RyaW5nO1xuICBjYXRlZ29yeTogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICB0ZW1wbGF0ZV9maWVsZHM6IFRlbXBsYXRlRmllbGRbXTtcbiAgdGFnOiBzdHJpbmc7XG4gIHNvcnRfb3JkZXI6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFJlc291cmNlc1BhZ2VQcm9wcyB7XG4gIHVzZXI/OiB7IGVtYWlsOiBzdHJpbmcgfSB8IG51bGw7XG59XG5cbmNvbnN0IENBVEVHT1JZX0lDT05TOiBSZWNvcmQ8c3RyaW5nLCBSZWFjdC5FbGVtZW50VHlwZT4gPSB7XG4gICfrtoDrj5nsgrAg6rOE7JW97IScJzogSG9tZSxcbiAgJ+qxsOuemO2ZleyduOyEnCc6IEZpbGVDaGVjayxcbiAgJ+uwnOyjvMK36rGw656YIOyEnOulmCc6IENsaXBib2FyZExpc3QsXG4gICfqsIHsooUg6rOE7JW97IScJzogQnJpZWZjYXNlLFxuICAn7JeF66y0IOyEnOyLnSc6IEZpbGVUZXh0LFxuICAn67O07J207Iqk7ZS87IuxIOyYiOuwqSc6IFNoaWVsZCxcbn07XG5cbmNvbnN0IENBVEVHT1JZX0NPTE9SUzogUmVjb3JkPHN0cmluZywgeyBiZzogc3RyaW5nOyB0ZXh0OiBzdHJpbmc7IGJvcmRlcjogc3RyaW5nOyBpY29uQmc6IHN0cmluZyB9PiA9IHtcbiAgJ+u2gOuPmeyCsCDqs4Tslb3shJwnOiAgeyBiZzogJ2JnLWJsdWUtNTAnLCAgIHRleHQ6ICd0ZXh0LWJsdWUtNzAwJywgICBib3JkZXI6ICdib3JkZXItYmx1ZS0xMDAnLCAgIGljb25CZzogJ2JnLWJsdWUtMTAwJyAgIH0sXG4gICfqsbDrnpjtmZXsnbjshJwnOiAgICB7IGJnOiAnYmctdGVhbC01MCcsICAgIHRleHQ6ICd0ZXh0LXRlYWwtNzAwJywgICBib3JkZXI6ICdib3JkZXItdGVhbC0xMDAnLCAgIGljb25CZzogJ2JnLXRlYWwtMTAwJyAgIH0sXG4gICfrsJzso7zCt+qxsOuemCDshJzrpZgnOiB7IGJnOiAnYmctYW1iZXItNTAnLCAgdGV4dDogJ3RleHQtYW1iZXItNzAwJywgIGJvcmRlcjogJ2JvcmRlci1hbWJlci0xMDAnLCAgaWNvbkJnOiAnYmctYW1iZXItMTAwJyAgfSxcbiAgJ+qwgeyihSDqs4Tslb3shJwnOiAgIHsgYmc6ICdiZy1yb3NlLTUwJywgICAgdGV4dDogJ3RleHQtcm9zZS03MDAnLCAgIGJvcmRlcjogJ2JvcmRlci1yb3NlLTEwMCcsICAgaWNvbkJnOiAnYmctcm9zZS0xMDAnICAgfSxcbiAgJ+yXheustCDshJzsi50nOiAgICAgeyBiZzogJ2JnLWVtZXJhbGQtNTAnLCB0ZXh0OiAndGV4dC1lbWVyYWxkLTcwMCcsIGJvcmRlcjogJ2JvcmRlci1lbWVyYWxkLTEwMCcsIGljb25CZzogJ2JnLWVtZXJhbGQtMTAwJ30sXG4gICfrs7TsnbTsiqTtlLzsi7Eg7JiI67CpJzogeyBiZzogJ2JnLXJlZC01MCcsICAgdGV4dDogJ3RleHQtcmVkLTcwMCcsICAgIGJvcmRlcjogJ2JvcmRlci1yZWQtMTAwJywgICAgaWNvbkJnOiAnYmctcmVkLTEwMCcgICAgfSxcbn07XG5cbmNvbnN0IERFRkFVTFRfQ09MT1IgPSB7IGJnOiAnYmctZ3JheS01MCcsIHRleHQ6ICd0ZXh0LWdyYXktNzAwJywgYm9yZGVyOiAnYm9yZGVyLWdyYXktMjAwJywgaWNvbkJnOiAnYmctZ3JheS0xMDAnIH07XG5cbmZ1bmN0aW9uIGdldFVzZXJEaXNwbGF5TmFtZShlbWFpbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbG9jYWwgPSBlbWFpbC5zcGxpdCgnQCcpWzBdO1xuICByZXR1cm4gbG9jYWwubGVuZ3RoID4gMiA/IGxvY2FsLnNsaWNlKDAsIGxvY2FsLmxlbmd0aCAtIDEpICsgJyonIDogbG9jYWw7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFJlc291cmNlc1BhZ2UoeyB1c2VyIH06IFJlc291cmNlc1BhZ2VQcm9wcykge1xuICBjb25zdCBbZG9jdW1lbnRzLCBzZXREb2N1bWVudHNdID0gdXNlU3RhdGU8RG9jdW1lbnRbXT4oW10pO1xuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcbiAgY29uc3QgW3NlbGVjdGVkQ2F0ZWdvcnksIHNldFNlbGVjdGVkQ2F0ZWdvcnldID0gdXNlU3RhdGUoJ+yghOyytCcpO1xuICBjb25zdCBbcXVlcnksIHNldFF1ZXJ5XSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2VkaXRpbmdEb2MsIHNldEVkaXRpbmdEb2NdID0gdXNlU3RhdGU8RG9jdW1lbnQgfCBudWxsPihudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGxvYWREb2N1bWVudHMoKTtcbiAgfSwgW10pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWREb2N1bWVudHMoKSB7XG4gICAgc2V0TG9hZGluZyh0cnVlKTtcbiAgICBpZiAoIWlzU3VwYWJhc2VBdmFpbGFibGUpIHsgc2V0TG9hZGluZyhmYWxzZSk7IHJldHVybjsgfVxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnZG9jdW1lbnRzJylcbiAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgLmVxKCdpc19hY3RpdmUnLCB0cnVlKVxuICAgICAgLm9yZGVyKCdzb3J0X29yZGVyJyk7XG4gICAgaWYgKCFlcnJvciAmJiBkYXRhKSB7XG4gICAgICBzZXREb2N1bWVudHMoZGF0YSBhcyBEb2N1bWVudFtdKTtcbiAgICB9XG4gICAgc2V0TG9hZGluZyhmYWxzZSk7XG4gIH1cblxuICBjb25zdCBjYXRlZ29yaWVzID0gWyfsoITssrQnLCAuLi5BcnJheS5mcm9tKG5ldyBTZXQoZG9jdW1lbnRzLm1hcCgoZCkgPT4gZC5jYXRlZ29yeSkpKV07XG5cbiAgY29uc3QgZmlsdGVyZWQgPSBkb2N1bWVudHMuZmlsdGVyKChkKSA9PiB7XG4gICAgY29uc3QgbWF0Y2hDYXQgPSBzZWxlY3RlZENhdGVnb3J5ID09PSAn7KCE7LK0JyB8fCBkLmNhdGVnb3J5ID09PSBzZWxlY3RlZENhdGVnb3J5O1xuICAgIGNvbnN0IG1hdGNoUSA9IHF1ZXJ5ID09PSAnJyB8fCBkLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkudG9Mb3dlckNhc2UoKSkgfHwgZC5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpO1xuICAgIHJldHVybiBtYXRjaENhdCAmJiBtYXRjaFE7XG4gIH0pO1xuXG4gIGNvbnN0IGdyb3VwZWQgPSBmaWx0ZXJlZC5yZWR1Y2U8UmVjb3JkPHN0cmluZywgRG9jdW1lbnRbXT4+KChhY2MsIGRvYykgPT4ge1xuICAgIGlmICghYWNjW2RvYy5jYXRlZ29yeV0pIGFjY1tkb2MuY2F0ZWdvcnldID0gW107XG4gICAgYWNjW2RvYy5jYXRlZ29yeV0ucHVzaChkb2MpO1xuICAgIHJldHVybiBhY2M7XG4gIH0sIHt9KTtcblxuICBjb25zdCBkaXNwbGF5TmFtZSA9IHVzZXIgPyBnZXRVc2VyRGlzcGxheU5hbWUodXNlci5lbWFpbCkgOiBudWxsO1xuXG4gIHJldHVybiAoXG4gICAgPG1haW4gY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLWJsdWUtdGludCBwdC0xNlwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1wcmltYXJ5LTYwMCBweS0xMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOSBoLTkgcm91bmRlZC14bCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICA8RmlsZVRleHQgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS84MCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGRcIj5WTFVFIOqzteyLnSDsnpDro4zsi6Q8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBtYi0xXCI+7JeF66y0IOyEnOulmCDsnpDro4zsi6Q8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNzAgdGV4dC1zbSBtYi01XCI+XG4gICAgICAgICAgICDqsIHsooUg6rOE7JW97IScIOuwjyDsl4XrrLQg7ISc7Iud7J2EIOyXtOyWtCDsnpHshLHCt+yImOygle2VmOqzoCDrsJTroZwg7J247IeE7ZWY7IS47JqULlxuICAgICAgICAgICAge2Rpc3BsYXlOYW1lICYmIChcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibWwtMiB0ZXh0LXdoaXRlLzkwIGZvbnQtc2VtaWJvbGRcIj4oe2Rpc3BsYXlOYW1lfeuLmCDsnbTrpoQg7J6Q64+Z7J6F66ClKTwvc3Bhbj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9wPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgbWF4LXcteGxcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgYmctd2hpdGUvMTUgYmFja2Ryb3AtYmx1ci1zbSBib3JkZXIgYm9yZGVyLXdoaXRlLzMwIHJvdW5kZWQtM3hsIG92ZXJmbG93LWhpZGRlbiBmb2N1cy13aXRoaW46Ymctd2hpdGUvMjUgZm9jdXMtd2l0aGluOmJvcmRlci13aGl0ZS81MCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0yMDBcIj5cbiAgICAgICAgICAgICAgPFNlYXJjaCBjbGFzc05hbWU9XCJhYnNvbHV0ZSBsZWZ0LTQgdy00IGgtNCB0ZXh0LXdoaXRlLzcwIHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9e3F1ZXJ5fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UXVlcnkoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi7ISc66WY66qFIOqygOyDiS4uLlwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIHBsLTExIHByLTQgcHktMyBiZy10cmFuc3BhcmVudCB0ZXh0LXdoaXRlIHRleHQtc20gcGxhY2Vob2xkZXItd2hpdGUvNjAgZm9jdXM6b3V0bGluZS1ub25lXCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB0LTYgc3BhY2UteS0zXCI+XG4gICAgICAgIHshdXNlciAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1hbWJlci01MCBib3JkZXIgYm9yZGVyLWFtYmVyLTIwMCByb3VuZGVkLTJ4bCBweC01IHB5LTQgZmxleCBpdGVtcy1zdGFydCBnYXAtM1wiPlxuICAgICAgICAgICAgPEFsZXJ0Q2lyY2xlIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1hbWJlci01MDAgZmxleC1zaHJpbmstMCBtdC0wLjVcIiAvPlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1hbWJlci04MDAgZm9udC1zZW1pYm9sZCB0ZXh0LXNtXCI+66Gc6re47J247J20IO2VhOyalO2VnCDshJzruYTsiqTsnoXri4jri6QuPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTYwMCB0ZXh0LXhzIG10LTAuNVwiPuuqqOuToCDshJzruYTsiqTripQg7ZqM7JuQ6rCA7J6FIOuwjyDroZzqt7jsnbgg7ZuEIOydtOyaqSDqsIDriqXtlanri4jri6QuPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCByb3VuZGVkLTJ4bCBweC01IHB5LTQgZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBpdGVtcy1zdGFydCBzbTppdGVtcy1jZW50ZXIgZ2FwLTQgc2hhZG93LWNhcmRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLTJ4bCBiZy1wcmltYXJ5LTUwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgIDxVc2VyIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1wcmltYXJ5LTYwMFwiIC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTFcIj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc21cIj5WTFVFIO2RnOykgCDsnbTroKXshJwg64uk7Jq066Gc65OcPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LXhzIG10LTAuNVwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAgVkxVRSDsnbjspp0g6riw6rSAIOy3qOyXheyXkCDstZzsoIHtmZTrkJwg6rO17IudIO2RnOykgCDsnbTroKXshJwg7JaR7Iud7J6F64uI64ukLiDqtazsnbjqtazsp4Eg66mU64m07JeQ7IScICdWTFVFIOydtOugpeyEnCDsponsi5wg7KeA7JuQJyDquLDriqXqs7wg7Jew64+Z65Cp64uI64ukLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxhXG4gICAgICAgICAgICBocmVmPVwiI1wiXG4gICAgICAgICAgICBvbkNsaWNrPXsoZSkgPT4gZS5wcmV2ZW50RGVmYXVsdCgpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC00IHB5LTIgYmctcHJpbWFyeS02MDAgaG92ZXI6YmctcHJpbWFyeS03MDAgdGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9ycyB3aGl0ZXNwYWNlLW5vd3JhcCBmbGV4LXNocmluay0wXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8RG93bmxvYWQgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAg7J2066Cl7IScIOuLpOyatOuhnOuTnFxuICAgICAgICAgIDwvYT5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS04XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgbWItNiBvdmVyZmxvdy14LWF1dG8gcGItMVwiIHN0eWxlPXt7IHNjcm9sbGJhcldpZHRoOiAnbm9uZScgfX0+XG4gICAgICAgICAge2NhdGVnb3JpZXMubWFwKChjYXQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IEljb24gPSBDQVRFR09SWV9JQ09OU1tjYXRdO1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIGtleT17Y2F0fVxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkQ2F0ZWdvcnkoY2F0KX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMuNSBweS0yIHRleHQteHMgZm9udC1zZW1pYm9sZCByb3VuZGVkLWZ1bGwgd2hpdGVzcGFjZS1ub3dyYXAgdHJhbnNpdGlvbi1hbGwgYm9yZGVyICR7XG4gICAgICAgICAgICAgICAgICBzZWxlY3RlZENhdGVnb3J5ID09PSBjYXRcbiAgICAgICAgICAgICAgICAgICAgPyAnYmctcHJpbWFyeS02MDAgdGV4dC13aGl0ZSBib3JkZXItcHJpbWFyeS02MDAgc2hhZG93LXNtJ1xuICAgICAgICAgICAgICAgICAgICA6ICdiZy13aGl0ZSB0ZXh0LWdyYXktNTAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgaG92ZXI6YmctcHJpbWFyeS01MCBib3JkZXItZ3JheS0yMDAnXG4gICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7SWNvbiAmJiA8SWNvbiBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+fVxuICAgICAgICAgICAgICAgIHtjYXR9XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAge2xvYWRpbmcgPyAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweS0zMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTggaC04IGJvcmRlci0yIGJvcmRlci1wcmltYXJ5LTIwMCBib3JkZXItdC1wcmltYXJ5LTYwMCByb3VuZGVkLWZ1bGwgYW5pbWF0ZS1zcGluIG1iLTNcIiAvPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXNtXCI+7ISc66WYIOuqqeuhneydhCDrtojrn6zsmKTripQg7KSRLi4uPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApIDogZmlsdGVyZWQubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHktMjQgdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVwidy0xMCBoLTEwIHRleHQtZ3JheS0yMDAgbWItM1wiIC8+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIGZvbnQtc2VtaWJvbGQgdGV4dC1zbSBtYi0xXCI+6rKA7IOJIOqysOqzvOqwgCDsl4bsirXri4jri6Q8L3A+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQteHNcIj7ri6Trpbgg7YKk7JuM65Oc66GcIOqygOyDie2VtOuztOyEuOyalC48L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEwXCI+XG4gICAgICAgICAgICB7T2JqZWN0LmVudHJpZXMoZ3JvdXBlZCkubWFwKChbY2F0LCBkb2NzXSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBJY29uID0gQ0FURUdPUllfSUNPTlNbY2F0XSB8fCBCdWlsZGluZzI7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gQ0FURUdPUllfQ09MT1JTW2NhdF0gfHwgREVGQVVMVF9DT0xPUjtcbiAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8c2VjdGlvbiBrZXk9e2NhdH0+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjUgbWItNFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctOCBoLTggcm91bmRlZC14bCAke2NvbG9yLmljb25CZ30gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJgfT5cbiAgICAgICAgICAgICAgICAgICAgICA8SWNvbiBjbGFzc05hbWU9e2B3LTQgaC00ICR7Y29sb3IudGV4dH1gfSAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtYmFzZVwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMWVtJyB9fT57Y2F0fTwvaDI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQteHMgcHgtMiBweS0wLjUgcm91bmRlZC1mdWxsIGZvbnQtc2VtaWJvbGQgYm9yZGVyICR7Y29sb3IuYmd9ICR7Y29sb3IudGV4dH0gJHtjb2xvci5ib3JkZXJ9YH0+XG4gICAgICAgICAgICAgICAgICAgICAge2RvY3MubGVuZ3RofeqxtFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIHNtOmdyaWQtY29scy0yIGxnOmdyaWQtY29scy0zIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICAgIHtkb2NzLm1hcCgoZG9jKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYyA9IENBVEVHT1JZX0NPTE9SU1tkb2MuY2F0ZWdvcnldIHx8IERFRkFVTFRfQ09MT1I7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtkb2MuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImNhcmQgcC01IGZsZXggZmxleC1jb2wgZ2FwLTMgaG92ZXI6Ym9yZGVyLXByaW1hcnktMjAwIGhvdmVyOnNoYWRvdy1tZCB0cmFuc2l0aW9uLWFsbCBncm91cCBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEVkaXRpbmdEb2MoZG9jKX1cbiAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy05IGgtOSByb3VuZGVkLTJ4bCAke2MuaWNvbkJnfSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wYH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8RmlsZVRleHQgY2xhc3NOYW1lPXtgdy00LjUgaC00LjUgJHtjLnRleHR9YH0gc3R5bGU9e3sgd2lkdGg6ICcxOHB4JywgaGVpZ2h0OiAnMThweCcgfX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LXhzIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbCBmb250LXNlbWlib2xkIGJvcmRlciBmbGV4LXNocmluay0wICR7Yy5iZ30gJHtjLnRleHR9ICR7Yy5ib3JkZXJ9YH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VGFnIGNsYXNzTmFtZT1cInctMi41IGgtMi41IGlubGluZSBtci0wLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2RvYy50YWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtYm9sZCB0ZXh0LXNtIGxlYWRpbmctc251ZyBtYi0xIGdyb3VwLWhvdmVyOnRleHQtcHJpbWFyeS02MDAgdHJhbnNpdGlvbi1jb2xvcnNcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDFlbScgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZG9jLnRpdGxlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvaDM+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZCBsaW5lLWNsYW1wLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtkb2MuZGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBwdC0yIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTQwMFwiPntkb2MudGVtcGxhdGVfZmllbGRzLmxlbmd0aH3qsJwg7ZWt66qpPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC14cyB0ZXh0LWdyYXktNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxFZGl0MyBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz4g7J6R7ISxXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC14cyB0ZXh0LWdyYXktNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxQcmludGVyIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPiDsnbjsh4RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtZ3JheS0zMDAgZ3JvdXAtaG92ZXI6dGV4dC1wcmltYXJ5LTQwMCB0cmFuc2l0aW9uLWNvbG9yc1wiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L3NlY3Rpb24+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICB7ZWRpdGluZ0RvYyAmJiAoXG4gICAgICAgIDxEb2N1bWVudEVkaXRvclxuICAgICAgICAgIHRpdGxlPXtlZGl0aW5nRG9jLnRpdGxlfVxuICAgICAgICAgIGNhdGVnb3J5PXtlZGl0aW5nRG9jLmNhdGVnb3J5fVxuICAgICAgICAgIGZpZWxkcz17ZWRpdGluZ0RvYy50ZW1wbGF0ZV9maWVsZHN9XG4gICAgICAgICAgdXNlck5hbWU9e2Rpc3BsYXlOYW1lID8/IHVuZGVmaW5lZH1cbiAgICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXRFZGl0aW5nRG9jKG51bGwpfVxuICAgICAgICAvPlxuICAgICAgKX1cbiAgICA8L21haW4+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL3BhZ2VzL1Jlc291cmNlc1BhZ2UudHN4In0=