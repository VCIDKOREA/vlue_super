import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/ShoppingPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/ShoppingPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Shield, Star, ShoppingBag, Filter, ChevronDown, Search, X, CreditCard, Package, CheckCircle, Lock } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { products } from "/src/data/mockData.ts";
const CATEGORIES = ["전체", "의료상담", "의료", "오피스", "교육", "컨설팅"];
function ProductCard({ product, onLoginClick, user }) {
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const handleBuy = () => {
    if (!user && onLoginClick) onLoginClick();
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "card group cursor-pointer overflow-hidden flex flex-col", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "h-44 overflow-hidden bg-gray-100 relative flex-shrink-0", children: [
      /* @__PURE__ */ jsxDEV(
        "img",
        {
          src: product.imageUrl,
          alt: product.name,
          className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
          loading: "lazy"
        },
        void 0,
        false,
        {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 25,
          columnNumber: 9
        },
        this
      ),
      product.certified && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-primary-600 rounded-full text-white text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Shield, { className: "w-2.5 h-2.5" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 33,
          columnNumber: 13
        }, this),
        "VLUE 인증"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 32,
        columnNumber: 9
      }, this),
      product.isGroupBuy && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-orange-500 rounded-full text-white text-xs font-semibold", children: [
        /* @__PURE__ */ jsxDEV(Package, { className: "w-2.5 h-2.5" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 39,
          columnNumber: 13
        }, this),
        "공구"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 38,
        columnNumber: 9
      }, this),
      discount > 0 && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-black", children: [
        discount,
        "%"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 44,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 24,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "p-4 flex flex-col flex-1", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 mb-0.5", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-primary-600 text-xs font-medium", children: product.seller }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 51,
          columnNumber: 11
        }, this),
        product.certified && /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-0.5 text-xs text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-full font-semibold", children: [
          /* @__PURE__ */ jsxDEV(Shield, { className: "w-2.5 h-2.5" }, void 0, false, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 54,
            columnNumber: 15
          }, this),
          "인증"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 53,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 50,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-semibold text-sm leading-snug mb-2 flex-1", children: product.name }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 59,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 mb-3", children: [
        /* @__PURE__ */ jsxDEV(Star, { className: "w-3.5 h-3.5 text-amber-400 fill-amber-400" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 61,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-700 font-inter", children: product.rating }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 62,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 font-inter", children: [
          "(",
          product.reviews,
          ")"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 63,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 60,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          product.originalPrice && /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 line-through font-inter", children: [
            product.originalPrice.toLocaleString(),
            "원"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 68,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-900 font-black text-base font-inter", children: product.price === 0 ? "무료" : `${product.price.toLocaleString()}원` }, void 0, false, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 72,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 66,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: handleBuy, className: "px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors", children: "자세히" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 76,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 65,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handleBuy,
          className: "w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors",
          children: [
            /* @__PURE__ */ jsxDEV(CreditCard, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/ShoppingPage.tsx",
              lineNumber: 84,
              columnNumber: 11
            }, this),
            "블루페이 안심결제"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 80,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 49,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/ShoppingPage.tsx",
    lineNumber: 23,
    columnNumber: 5
  }, this);
}
_c = ProductCard;
export default function ShoppingPage({ user, onLoginClick }) {
  _s();
  const [category, setCategory] = useState("전체");
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState("추천순");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [tab, setTab] = useState("certified");
  const base = tab === "certified" ? products.filter((p) => p.certified) : products.filter((p) => p.isGroupBuy);
  const filtered = (category === "전체" ? base : base.filter((p) => p.category === category)).filter(
    (p) => searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.seller.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };
  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-gray-50 pt-16", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 py-10", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-4 flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(ShoppingBag, { className: "w-5 h-5 text-white" }, void 0, false, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 128,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 127,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-sm font-semibold", children: "VLUE 인증 업체 전용 커머스" }, void 0, false, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 130,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 126,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              if (!user && onLoginClick) onLoginClick();
            },
            className: "flex items-center gap-1.5 px-4 py-2 bg-white text-primary-600 font-bold text-xs rounded-xl hover:bg-primary-50 transition-colors",
            children: [
              /* @__PURE__ */ jsxDEV(CreditCard, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/ShoppingPage.tsx",
                lineNumber: 136,
                columnNumber: 15
              }, this),
              "블루페이(Blue Pay) 바로가기"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 132,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 125,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-black text-white mb-1", children: "블루쇼핑" }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 140,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mb-5", style: { wordBreak: "keep-all" }, children: "검증된 VLUE 인증 기관의 서비스와 상품을 안전하게 이용하세요." }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 141,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSearch, className: "relative max-w-xl", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl overflow-hidden focus-within:bg-white/25 focus-within:border-white/50 transition-all duration-200", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-4 w-4 h-4 text-white/70 pointer-events-none" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 145,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: searchInput,
            onChange: (e) => setSearchInput(e.target.value),
            placeholder: "제품명, 업체명으로 검색...",
            className: "flex-1 pl-11 pr-4 py-3 bg-transparent text-white text-sm placeholder-white/60 focus:outline-none"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 146,
            columnNumber: 15
          },
          this
        ),
        searchInput && /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: clearSearch, className: "p-2 text-white/70 hover:text-white transition-colors", children: /* @__PURE__ */ jsxDEV(X, { className: "w-4 h-4" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 155,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 154,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", className: "m-1.5 px-4 py-2 bg-white text-primary-600 font-semibold text-xs rounded-2xl hover:bg-primary-50 transition-colors flex-shrink-0", children: "검색" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 158,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 144,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 143,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 124,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 123,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-start gap-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5", children: /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-4 h-4 text-primary-600" }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 169,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 168,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-primary-800 font-bold text-sm mb-0.5", children: "블루페이(Blue Pay) 안심결제 안내" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 172,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-primary-600 text-xs leading-relaxed", style: { wordBreak: "keep-all" }, children: "물품 수령 확정 시까지 결제 대금을 안전하게 보호합니다. 구매자가 수령을 확인하기 전까지 판매자에게 대금이 지급되지 않으며, 분쟁 발생 시 VLUE가 중재합니다." }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 173,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 171,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 167,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 166,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white border-b border-gray-100 sticky top-16 z-30", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex border-b border-gray-100", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setTab("certified"),
            className: `flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === "certified" ? "text-primary-600 border-primary-600" : "text-gray-400 border-transparent hover:text-gray-600"}`,
            children: [
              /* @__PURE__ */ jsxDEV(Shield, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/ShoppingPage.tsx",
                lineNumber: 189,
                columnNumber: 15
              }, this),
              "인증 제품"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 183,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setTab("groupbuy"),
            className: `flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === "groupbuy" ? "text-orange-500 border-orange-500" : "text-gray-400 border-transparent hover:text-gray-600"}`,
            children: [
              /* @__PURE__ */ jsxDEV(Package, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/ShoppingPage.tsx",
                lineNumber: 198,
                columnNumber: 15
              }, this),
              "일반 공구"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 192,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 182,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between py-2 gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 overflow-x-auto hide-scrollbar", children: CATEGORIES.map(
          (cat) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setCategory(cat),
              className: `px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${category === cat ? "bg-primary-600 text-white" : "text-gray-500 hover:text-primary-600 hover:bg-primary-50"}`,
              children: cat
            },
            cat,
            false,
            {
              fileName: "/home/project/src/pages/ShoppingPage.tsx",
              lineNumber: 205,
              columnNumber: 15
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 203,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "relative flex-shrink-0", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setSortOpen(!sortOpen),
              className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-primary-200 transition-colors",
              children: [
                /* @__PURE__ */ jsxDEV(Filter, { className: "w-3.5 h-3.5" }, void 0, false, {
                  fileName: "/home/project/src/pages/ShoppingPage.tsx",
                  lineNumber: 221,
                  columnNumber: 17
                }, this),
                sort,
                /* @__PURE__ */ jsxDEV(ChevronDown, { className: `w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}` }, void 0, false, {
                  fileName: "/home/project/src/pages/ShoppingPage.tsx",
                  lineNumber: 223,
                  columnNumber: 17
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/home/project/src/pages/ShoppingPage.tsx",
              lineNumber: 217,
              columnNumber: 15
            },
            this
          ),
          sortOpen && /* @__PURE__ */ jsxDEV("div", { className: "absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-card py-1 z-10", children: ["추천순", "최신순", "가격낮은순", "평점순"].map(
            (s) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  setSort(s);
                  setSortOpen(false);
                },
                className: `w-full text-left px-3 py-1.5 text-xs transition-colors ${sort === s ? "text-primary-600 bg-primary-50" : "text-gray-600 hover:bg-gray-50"}`,
                children: s
              },
              s,
              false,
              {
                fileName: "/home/project/src/pages/ShoppingPage.tsx",
                lineNumber: 228,
                columnNumber: 17
              },
              this
            )
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 226,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 216,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 202,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 181,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 180,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6", children: [
      !user && /* @__PURE__ */ jsxDEV("div", { className: "mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV(Lock, { className: "w-4 h-4 text-amber-500 flex-shrink-0" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 246,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-amber-800 text-sm font-medium flex-1", style: { wordBreak: "keep-all" }, children: "로그인이 필요한 서비스입니다. 구매 및 결제는 로그인 후 이용 가능합니다." }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 247,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => onLoginClick?.(),
            className: "flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors",
            children: "로그인"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/ShoppingPage.tsx",
            lineNumber: 250,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 245,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "font-semibold text-gray-900", children: [
          filtered.length,
          "개"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 260,
          columnNumber: 13
        }, this),
        "의 상품"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 259,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 258,
        columnNumber: 9
      }, this),
      filtered.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "w-10 h-10 text-gray-200 mb-3" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 265,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 font-semibold text-sm mb-1", children: "상품이 없습니다" }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 266,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "다른 카테고리 또는 키워드로 검색해보세요." }, void 0, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 267,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 264,
        columnNumber: 9
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5", children: filtered.map(
        (product) => /* @__PURE__ */ jsxDEV(ProductCard, { product, user, onLoginClick }, product.id, false, {
          fileName: "/home/project/src/pages/ShoppingPage.tsx",
          lineNumber: 272,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/ShoppingPage.tsx",
        lineNumber: 270,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/ShoppingPage.tsx",
      lineNumber: 243,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/ShoppingPage.tsx",
    lineNumber: 122,
    columnNumber: 5
  }, this);
}
_s(ShoppingPage, "n/nVMrB+9yY/oXcIIVUNo2Hvxh8=");
_c2 = ShoppingPage;
var _c, _c2;
$RefreshReg$(_c, "ProductCard");
$RefreshReg$(_c2, "ShoppingPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/ShoppingPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/ShoppingPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFabEM7QUFBWSxJQUFBRCxJQUFBbUM7QUFBQUMsYUFBQXBDLElBQUE7QUFBQW9DLGFBQUFELEtBQUEiLCJuYW1lcyI6WyJTaGllbGQiLCJTdGFyIiwiU2hvcHBpbmdCYWciLCJGaWx0ZXIiLCJDaGV2cm9uRG93biIsIlNlYXJjaCIsIlgiLCJDcmVkaXRDYXJkIiwiUGFja2FnZSIsIkNoZWNrQ2lyY2xlIiwiTG9jayIsInByb2R1Y3RzIiwiQ0FURUdPUklFUyIsIlByb2R1Y3RDYXJkIiwicHJvZHVjdCIsIm9uTG9naW5DbGljayIsInVzZXIiLCJkaXNjb3VudCIsIm9yaWdpbmFsUHJpY2UiLCJNYXRoIiwicm91bmQiLCJwcmljZSIsImhhbmRsZUJ1eSIsImltYWdlVXJsIiwibmFtZSIsImNlcnRpZmllZCIsImlzR3JvdXBCdXkiLCJzZWxsZXIiLCJyYXRpbmciLCJyZXZpZXdzIiwidG9Mb2NhbGVTdHJpbmciLCJfYyIsIlNob3BwaW5nUGFnZSIsIl9zIiwiY2F0ZWdvcnkiLCJzZXRDYXRlZ29yeSIsInVzZVN0YXRlIiwic29ydE9wZW4iLCJzZXRTb3J0T3BlbiIsInNvcnQiLCJzZXRTb3J0Iiwic2VhcmNoUXVlcnkiLCJzZXRTZWFyY2hRdWVyeSIsInNlYXJjaElucHV0Iiwic2V0U2VhcmNoSW5wdXQiLCJ0YWIiLCJzZXRUYWIiLCJiYXNlIiwiZmlsdGVyIiwicCIsImZpbHRlcmVkIiwidG9Mb3dlckNhc2UiLCJpbmNsdWRlcyIsImhhbmRsZVNlYXJjaCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRyaW0iLCJjbGVhclNlYXJjaCIsIndvcmRCcmVhayIsInRhcmdldCIsInZhbHVlIiwibWFwIiwiY2F0IiwicyIsImxlbmd0aCIsImlkIiwiX2MyIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlNob3BwaW5nUGFnZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBTaGllbGQsIFN0YXIsIFNob3BwaW5nQmFnLCBGaWx0ZXIsIENoZXZyb25Eb3duLCBTZWFyY2gsIFgsIENyZWRpdENhcmQsIFBhY2thZ2UsIENoZWNrQ2lyY2xlLCBMb2NrIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IHByb2R1Y3RzIH0gZnJvbSAnLi4vZGF0YS9tb2NrRGF0YSc7XG5pbXBvcnQgeyBQcm9kdWN0IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5pbnRlcmZhY2UgU2hvcHBpbmdQYWdlUHJvcHMge1xuICB1c2VyPzogeyBlbWFpbDogc3RyaW5nIH0gfCBudWxsO1xuICBvbkxvZ2luQ2xpY2s/OiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBDQVRFR09SSUVTID0gWyfsoITssrQnLCAn7J2Y66OM7IOB64u0JywgJ+ydmOujjCcsICfsmKTtlLzsiqQnLCAn6rWQ7JyhJywgJ+y7qOyEpO2MhSddO1xuXG5mdW5jdGlvbiBQcm9kdWN0Q2FyZCh7IHByb2R1Y3QsIG9uTG9naW5DbGljaywgdXNlciB9OiB7IHByb2R1Y3Q6IFByb2R1Y3Q7IG9uTG9naW5DbGljaz86ICgpID0+IHZvaWQ7IHVzZXI/OiB7IGVtYWlsOiBzdHJpbmcgfSB8IG51bGwgfSkge1xuICBjb25zdCBkaXNjb3VudCA9IHByb2R1Y3Qub3JpZ2luYWxQcmljZVxuICAgID8gTWF0aC5yb3VuZCgoMSAtIHByb2R1Y3QucHJpY2UgLyBwcm9kdWN0Lm9yaWdpbmFsUHJpY2UpICogMTAwKVxuICAgIDogMDtcblxuICBjb25zdCBoYW5kbGVCdXkgPSAoKSA9PiB7XG4gICAgaWYgKCF1c2VyICYmIG9uTG9naW5DbGljaykgb25Mb2dpbkNsaWNrKCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImNhcmQgZ3JvdXAgY3Vyc29yLXBvaW50ZXIgb3ZlcmZsb3ctaGlkZGVuIGZsZXggZmxleC1jb2xcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC00NCBvdmVyZmxvdy1oaWRkZW4gYmctZ3JheS0xMDAgcmVsYXRpdmUgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICA8aW1nXG4gICAgICAgICAgc3JjPXtwcm9kdWN0LmltYWdlVXJsfVxuICAgICAgICAgIGFsdD17cHJvZHVjdC5uYW1lfVxuICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyIGdyb3VwLWhvdmVyOnNjYWxlLTEwNSB0cmFuc2l0aW9uLXRyYW5zZm9ybSBkdXJhdGlvbi0zMDBcIlxuICAgICAgICAgIGxvYWRpbmc9XCJsYXp5XCJcbiAgICAgICAgLz5cbiAgICAgICAge3Byb2R1Y3QuY2VydGlmaWVkICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0yLjUgbGVmdC0yLjUgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMiBweS0wLjUgYmctcHJpbWFyeS02MDAgcm91bmRlZC1mdWxsIHRleHQtd2hpdGUgdGV4dC14cyBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctMi41IGgtMi41XCIgLz5cbiAgICAgICAgICAgIFZMVUUg7J247KadXG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICAgIHtwcm9kdWN0LmlzR3JvdXBCdXkgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTIuNSBsZWZ0LTIuNSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0yIHB5LTAuNSBiZy1vcmFuZ2UtNTAwIHJvdW5kZWQtZnVsbCB0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPlxuICAgICAgICAgICAgPFBhY2thZ2UgY2xhc3NOYW1lPVwidy0yLjUgaC0yLjVcIiAvPlxuICAgICAgICAgICAg6rO16rWsXG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICAgIHtkaXNjb3VudCA+IDAgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTIuNSByaWdodC0yLjUgdy05IGgtOSByb3VuZGVkLWZ1bGwgYmctcmVkLTUwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1ibGFja1wiPlxuICAgICAgICAgICAge2Rpc2NvdW50fSVcbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTQgZmxleCBmbGV4LWNvbCBmbGV4LTFcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IG1iLTAuNVwiPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS02MDAgdGV4dC14cyBmb250LW1lZGl1bVwiPntwcm9kdWN0LnNlbGxlcn08L3A+XG4gICAgICAgICAge3Byb2R1Y3QuY2VydGlmaWVkICYmIChcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMC41IHRleHQteHMgdGV4dC1wcmltYXJ5LTYwMCBiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDAgcHgtMS41IHB5LTAuNSByb3VuZGVkLWZ1bGwgZm9udC1zZW1pYm9sZFwiPlxuICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctMi41IGgtMi41XCIgLz5cbiAgICAgICAgICAgICAg7J247KadXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtc2VtaWJvbGQgdGV4dC1zbSBsZWFkaW5nLXNudWcgbWItMiBmbGV4LTFcIj57cHJvZHVjdC5uYW1lfTwvaDM+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgbWItM1wiPlxuICAgICAgICAgIDxTdGFyIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtYW1iZXItNDAwIGZpbGwtYW1iZXItNDAwXCIgLz5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTcwMCBmb250LWludGVyXCI+e3Byb2R1Y3QucmF0aW5nfTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDAgZm9udC1pbnRlclwiPih7cHJvZHVjdC5yZXZpZXdzfSk8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBtYi0zXCI+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIHtwcm9kdWN0Lm9yaWdpbmFsUHJpY2UgJiYgKFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDAgbGluZS10aHJvdWdoIGZvbnQtaW50ZXJcIj5cbiAgICAgICAgICAgICAgICB7cHJvZHVjdC5vcmlnaW5hbFByaWNlLnRvTG9jYWxlU3RyaW5nKCl97JuQXG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtYmxhY2sgdGV4dC1iYXNlIGZvbnQtaW50ZXJcIj5cbiAgICAgICAgICAgICAge3Byb2R1Y3QucHJpY2UgPT09IDAgPyAn66y066OMJyA6IGAke3Byb2R1Y3QucHJpY2UudG9Mb2NhbGVTdHJpbmcoKX3sm5BgfVxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxidXR0b24gb25DbGljaz17aGFuZGxlQnV5fSBjbGFzc05hbWU9XCJweC0zIHB5LTEuNSB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC13aGl0ZSBiZy1wcmltYXJ5LTYwMCBob3ZlcjpiZy1wcmltYXJ5LTcwMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICDsnpDshLjtnohcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVCdXl9XG4gICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjUgcHktMiB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1wcmltYXJ5LTYwMCBiZy1wcmltYXJ5LTUwIGhvdmVyOmJnLXByaW1hcnktMTAwIGJvcmRlciBib3JkZXItcHJpbWFyeS0yMDAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgID5cbiAgICAgICAgICA8Q3JlZGl0Q2FyZCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAg67iU66Oo7Y6Y7J20IOyViOyLrOqysOygnFxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTaG9wcGluZ1BhZ2UoeyB1c2VyLCBvbkxvZ2luQ2xpY2sgfTogU2hvcHBpbmdQYWdlUHJvcHMpIHtcbiAgY29uc3QgW2NhdGVnb3J5LCBzZXRDYXRlZ29yeV0gPSB1c2VTdGF0ZSgn7KCE7LK0Jyk7XG4gIGNvbnN0IFtzb3J0T3Blbiwgc2V0U29ydE9wZW5dID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbc29ydCwgc2V0U29ydF0gPSB1c2VTdGF0ZSgn7LaU7LKc7IicJyk7XG4gIGNvbnN0IFtzZWFyY2hRdWVyeSwgc2V0U2VhcmNoUXVlcnldID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbc2VhcmNoSW5wdXQsIHNldFNlYXJjaElucHV0XSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW3RhYiwgc2V0VGFiXSA9IHVzZVN0YXRlPCdjZXJ0aWZpZWQnIHwgJ2dyb3VwYnV5Jz4oJ2NlcnRpZmllZCcpO1xuXG4gIGNvbnN0IGJhc2UgPSB0YWIgPT09ICdjZXJ0aWZpZWQnXG4gICAgPyBwcm9kdWN0cy5maWx0ZXIoKHApID0+IHAuY2VydGlmaWVkKVxuICAgIDogcHJvZHVjdHMuZmlsdGVyKChwKSA9PiBwLmlzR3JvdXBCdXkpO1xuXG4gIGNvbnN0IGZpbHRlcmVkID0gKGNhdGVnb3J5ID09PSAn7KCE7LK0JyA/IGJhc2UgOiBiYXNlLmZpbHRlcigocCkgPT4gcC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkpKVxuICAgIC5maWx0ZXIoKHApID0+XG4gICAgICBzZWFyY2hRdWVyeSA9PT0gJycgfHxcbiAgICAgIHAubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFF1ZXJ5LnRvTG93ZXJDYXNlKCkpIHx8XG4gICAgICBwLnNlbGxlci50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFF1ZXJ5LnRvTG93ZXJDYXNlKCkpXG4gICAgKTtcblxuICBjb25zdCBoYW5kbGVTZWFyY2ggPSAoZTogUmVhY3QuRm9ybUV2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHNldFNlYXJjaFF1ZXJ5KHNlYXJjaElucHV0LnRyaW0oKSk7XG4gIH07XG5cbiAgY29uc3QgY2xlYXJTZWFyY2ggPSAoKSA9PiB7XG4gICAgc2V0U2VhcmNoSW5wdXQoJycpO1xuICAgIHNldFNlYXJjaFF1ZXJ5KCcnKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxtYWluIGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ncmF5LTUwIHB0LTE2XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXByaW1hcnktNjAwIHB5LTEwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctN3hsIG14LWF1dG8gcHgtNCBzbTpweC02IGxnOnB4LThcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBtYi00IGZsZXgtd3JhcCBnYXAtM1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOSBoLTkgcm91bmRlZC14bCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxTaG9wcGluZ0JhZyBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtd2hpdGVcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS84MCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGRcIj5WTFVFIOyduOymnSDsl4XssrQg7KCE7JqpIOy7pOuouOyKpDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGlmICghdXNlciAmJiBvbkxvZ2luQ2xpY2spIG9uTG9naW5DbGljaygpOyB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTQgcHktMiBiZy13aGl0ZSB0ZXh0LXByaW1hcnktNjAwIGZvbnQtYm9sZCB0ZXh0LXhzIHJvdW5kZWQteGwgaG92ZXI6YmctcHJpbWFyeS01MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxDcmVkaXRDYXJkIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAg67iU66Oo7Y6Y7J20KEJsdWUgUGF5KSDrsJTroZzqsIDquLBcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgbWItMVwiPuu4lOujqOyHvO2VkTwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXNtIG1iLTVcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+6rKA7Kad65CcIFZMVUUg7J247KadIOq4sOq0gOydmCDshJzruYTsiqTsmYAg7IOB7ZKI7J2EIOyViOyghO2VmOqyjCDsnbTsmqntlZjshLjsmpQuPC9wPlxuXG4gICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e2hhbmRsZVNlYXJjaH0gY2xhc3NOYW1lPVwicmVsYXRpdmUgbWF4LXcteGxcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgYmctd2hpdGUvMTUgYmFja2Ryb3AtYmx1ci1zbSBib3JkZXIgYm9yZGVyLXdoaXRlLzMwIHJvdW5kZWQtM3hsIG92ZXJmbG93LWhpZGRlbiBmb2N1cy13aXRoaW46Ymctd2hpdGUvMjUgZm9jdXMtd2l0aGluOmJvcmRlci13aGl0ZS81MCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0yMDBcIj5cbiAgICAgICAgICAgICAgPFNlYXJjaCBjbGFzc05hbWU9XCJhYnNvbHV0ZSBsZWZ0LTQgdy00IGgtNCB0ZXh0LXdoaXRlLzcwIHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9e3NlYXJjaElucHV0fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0U2VhcmNoSW5wdXQoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi7KCc7ZKI66qFLCDsl4XssrTrqoXsnLzroZwg6rKA7IOJLi4uXCJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LTEgcGwtMTEgcHItNCBweS0zIGJnLXRyYW5zcGFyZW50IHRleHQtd2hpdGUgdGV4dC1zbSBwbGFjZWhvbGRlci13aGl0ZS82MCBmb2N1czpvdXRsaW5lLW5vbmVcIlxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICB7c2VhcmNoSW5wdXQgJiYgKFxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2NsZWFyU2VhcmNofSBjbGFzc05hbWU9XCJwLTIgdGV4dC13aGl0ZS83MCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgICA8WCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwic3VibWl0XCIgY2xhc3NOYW1lPVwibS0xLjUgcHgtNCBweS0yIGJnLXdoaXRlIHRleHQtcHJpbWFyeS02MDAgZm9udC1zZW1pYm9sZCB0ZXh0LXhzIHJvdW5kZWQtMnhsIGhvdmVyOmJnLXByaW1hcnktNTAgdHJhbnNpdGlvbi1jb2xvcnMgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgIOqygOyDiVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBwdC02IHBiLTNcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDAgcm91bmRlZC0yeGwgcC00IGZsZXggaXRlbXMtc3RhcnQgZ2FwLTNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOCBoLTggcm91bmRlZC14bCBiZy1wcmltYXJ5LTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wIG10LTAuNVwiPlxuICAgICAgICAgICAgPENoZWNrQ2lyY2xlIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1wcmltYXJ5LTYwMFwiIC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS04MDAgZm9udC1ib2xkIHRleHQtc20gbWItMC41XCI+67iU66Oo7Y6Y7J20KEJsdWUgUGF5KSDslYjsi6zqsrDsoJwg7JWI64K0PC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTYwMCB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZFwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAg66y87ZKIIOyImOuguSDtmZXsoJUg7Iuc6rmM7KeAIOqysOygnCDrjIDquIjsnYQg7JWI7KCE7ZWY6rKMIOuztO2YuO2VqeuLiOuLpC4g6rWs66ek7J6Q6rCAIOyImOugueydhCDtmZXsnbjtlZjquLAg7KCE6rmM7KeAIO2MkOunpOyekOyXkOqyjCDrjIDquIjsnbQg7KeA6riJ65CY7KeAIOyViuycvOupsCwg67aE7J+BIOuwnOyDnSDsi5wgVkxVReqwgCDspJHsnqztlanri4jri6QuXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgYm9yZGVyLWIgYm9yZGVyLWdyYXktMTAwIHN0aWNreSB0b3AtMTYgei0zMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGJvcmRlci1iIGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUYWIoJ2NlcnRpZmllZCcpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTQgcHktMyB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgYm9yZGVyLWItMiB0cmFuc2l0aW9uLWNvbG9ycyAke1xuICAgICAgICAgICAgICAgIHRhYiA9PT0gJ2NlcnRpZmllZCcgPyAndGV4dC1wcmltYXJ5LTYwMCBib3JkZXItcHJpbWFyeS02MDAnIDogJ3RleHQtZ3JheS00MDAgYm9yZGVyLXRyYW5zcGFyZW50IGhvdmVyOnRleHQtZ3JheS02MDAnXG4gICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8U2hpZWxkIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAg7J247KadIOygnO2SiFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRhYignZ3JvdXBidXknKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC00IHB5LTMgdGV4dC1zbSBmb250LXNlbWlib2xkIGJvcmRlci1iLTIgdHJhbnNpdGlvbi1jb2xvcnMgJHtcbiAgICAgICAgICAgICAgICB0YWIgPT09ICdncm91cGJ1eScgPyAndGV4dC1vcmFuZ2UtNTAwIGJvcmRlci1vcmFuZ2UtNTAwJyA6ICd0ZXh0LWdyYXktNDAwIGJvcmRlci10cmFuc3BhcmVudCBob3Zlcjp0ZXh0LWdyYXktNjAwJ1xuICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPFBhY2thZ2UgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICDsnbzrsJgg6rO16rWsXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBweS0yIGdhcC0zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIG92ZXJmbG93LXgtYXV0byBoaWRlLXNjcm9sbGJhclwiPlxuICAgICAgICAgICAgICB7Q0FURUdPUklFUy5tYXAoKGNhdCkgPT4gKFxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGtleT17Y2F0fVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0Q2F0ZWdvcnkoY2F0KX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTMgcHktMS41IHRleHQteHMgZm9udC1zZW1pYm9sZCByb3VuZGVkLWZ1bGwgd2hpdGVzcGFjZS1ub3dyYXAgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkgPT09IGNhdCA/ICdiZy1wcmltYXJ5LTYwMCB0ZXh0LXdoaXRlJyA6ICd0ZXh0LWdyYXktNTAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgaG92ZXI6YmctcHJpbWFyeS01MCdcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtjYXR9XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNvcnRPcGVuKCFzb3J0T3Blbil9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC0zIHB5LTEuNSB0ZXh0LXhzIGZvbnQtbWVkaXVtIHRleHQtZ3JheS02MDAgYm9yZGVyIGJvcmRlci1ncmF5LTIwMCByb3VuZGVkLWxnIGhvdmVyOmJvcmRlci1wcmltYXJ5LTIwMCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8RmlsdGVyIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAgICB7c29ydH1cbiAgICAgICAgICAgICAgICA8Q2hldnJvbkRvd24gY2xhc3NOYW1lPXtgdy0zIGgtMyB0cmFuc2l0aW9uLXRyYW5zZm9ybSAke3NvcnRPcGVuID8gJ3JvdGF0ZS0xODAnIDogJyd9YH0gLz5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIHtzb3J0T3BlbiAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSByaWdodC0wIHRvcC1mdWxsIG10LTEgdy0zMiBiZy13aGl0ZSBib3JkZXIgYm9yZGVyLWdyYXktMTAwIHJvdW5kZWQteGwgc2hhZG93LWNhcmQgcHktMSB6LTEwXCI+XG4gICAgICAgICAgICAgICAgICB7WyfstpTsspzsiJwnLCAn7LWc7Iug7IicJywgJ+qwgOqyqeuCruydgOyInCcsICftj4nsoJDsiJwnXS5tYXAoKHMpID0+IChcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIGtleT17c31cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IHNldFNvcnQocyk7IHNldFNvcnRPcGVuKGZhbHNlKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2B3LWZ1bGwgdGV4dC1sZWZ0IHB4LTMgcHktMS41IHRleHQteHMgdHJhbnNpdGlvbi1jb2xvcnMgJHtzb3J0ID09PSBzID8gJ3RleHQtcHJpbWFyeS02MDAgYmctcHJpbWFyeS01MCcgOiAndGV4dC1ncmF5LTYwMCBob3ZlcjpiZy1ncmF5LTUwJ31gfVxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAge3N9XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS02XCI+XG4gICAgICAgIHshdXNlciAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi01IGJnLWFtYmVyLTUwIGJvcmRlciBib3JkZXItYW1iZXItMjAwIHJvdW5kZWQtMnhsIHB4LTUgcHktNCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgPExvY2sgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWFtYmVyLTUwMCBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtYW1iZXItODAwIHRleHQtc20gZm9udC1tZWRpdW0gZmxleC0xXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICDroZzqt7jsnbjsnbQg7ZWE7JqU7ZWcIOyEnOu5hOyKpOyeheuLiOuLpC4g6rWs66ekIOuwjyDqsrDsoJzripQg66Gc6re47J24IO2bhCDsnbTsmqkg6rCA64ql7ZWp64uI64ukLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbkxvZ2luQ2xpY2s/LigpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LXNocmluay0wIHB4LTMgcHktMS41IGJnLWFtYmVyLTUwMCBob3ZlcjpiZy1hbWJlci02MDAgdGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIOuhnOq3uOyduFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG1iLTRcIj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtZ3JheS01MDBcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTkwMFwiPntmaWx0ZXJlZC5sZW5ndGh96rCcPC9zcGFuPuydmCDsg4HtkohcbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICB7ZmlsdGVyZWQubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHktMjQgdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVwidy0xMCBoLTEwIHRleHQtZ3JheS0yMDAgbWItM1wiIC8+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIGZvbnQtc2VtaWJvbGQgdGV4dC1zbSBtYi0xXCI+7IOB7ZKI7J20IOyXhuyKteuLiOuLpDwvcD5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14c1wiPuuLpOuluCDsubTthYzqs6Drpqwg65iQ64qUIO2CpOybjOuTnOuhnCDqsoDsg4ntlbTrs7TshLjsmpQuPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApIDogKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBzbTpncmlkLWNvbHMtMiBtZDpncmlkLWNvbHMtMyB4bDpncmlkLWNvbHMtNCBnYXAtNVwiPlxuICAgICAgICAgICAge2ZpbHRlcmVkLm1hcCgocHJvZHVjdCkgPT4gKFxuICAgICAgICAgICAgICA8UHJvZHVjdENhcmQga2V5PXtwcm9kdWN0LmlkfSBwcm9kdWN0PXtwcm9kdWN0fSB1c2VyPXt1c2VyfSBvbkxvZ2luQ2xpY2s9e29uTG9naW5DbGlja30gLz5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9TaG9wcGluZ1BhZ2UudHN4In0=