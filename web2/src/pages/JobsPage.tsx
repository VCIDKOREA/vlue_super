import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/JobsPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/JobsPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Briefcase, Users, ArrowLeft, Shield, MapPin, Clock, Lock, Download, ChevronRight, Search } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
import { jobPosts, jobProfiles } from "/src/data/mockData.ts";
const TYPE_COLORS = {
  "정규직": "bg-primary-50 text-primary-700 border-primary-100",
  "계약직": "bg-amber-50 text-amber-700 border-amber-100",
  "인턴": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "파트타임": "bg-orange-50 text-orange-700 border-orange-100"
};
function JobCard({ job }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "card p-5 flex flex-col gap-3 hover:border-primary-200 hover:shadow-card-hover transition-all group cursor-pointer", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 mb-1 flex-wrap", children: [
          job.certified && /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 bg-primary-50 text-primary-600 border border-primary-100 rounded-full", children: [
            /* @__PURE__ */ jsxDEV(Shield, { className: "w-2.5 h-2.5" }, void 0, false, {
              fileName: "/home/project/src/pages/JobsPage.tsx",
              lineNumber: 27,
              columnNumber: 17
            }, this),
            "인증기관"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 26,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: `text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[job.type] ?? "bg-gray-50 text-gray-600 border-gray-100"}`, children: job.type }, void 0, false, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 31,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 24,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm group-hover:text-primary-600 transition-colors", style: { wordBreak: "keep-all" }, children: job.title }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 35,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 23,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors mt-0.5" }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 39,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 22,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("p", { className: "text-primary-600 text-xs font-semibold mb-1", children: job.company }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 42,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 text-xs text-gray-400 flex-wrap", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxDEV(MapPin, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 44,
            columnNumber: 53
          }, this),
          job.location
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 44,
          columnNumber: 11
        }, this),
        job.salary && /* @__PURE__ */ jsxDEV("span", { className: "text-gray-600 font-medium", children: job.salary }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 45,
          columnNumber: 26
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxDEV(Clock, { className: "w-3 h-3" }, void 0, false, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 46,
            columnNumber: 53
          }, this),
          job.deadline,
          " 마감"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 46,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 43,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 41,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1 pt-1 border-t border-gray-100", children: job.tags.map(
      (t) => /* @__PURE__ */ jsxDEV("span", { className: "text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100", children: t }, t, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 51,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 49,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { className: "w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors", children: [
      /* @__PURE__ */ jsxDEV(Download, { className: "w-3.5 h-3.5" }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 55,
        columnNumber: 9
      }, this),
      "VLUE 이력서 즉시 지원"
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 54,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/JobsPage.tsx",
    lineNumber: 21,
    columnNumber: 5
  }, this);
}
_c = JobCard;
function ProfileCard({ profile }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "card p-5 flex flex-col gap-3 hover:border-primary-200 transition-all", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Users, { className: "w-5 h-5 text-gray-400" }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 67,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 66,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-900 font-bold text-sm", children: profile.name }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 70,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-primary-600 text-xs font-semibold", children: profile.field }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 71,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 69,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: `ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${profile.available ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}`, children: profile.available ? "구직중" : "구직완료" }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 73,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 65,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-500 space-y-0.5", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 w-12 flex-shrink-0", children: "경력" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 78,
          columnNumber: 37
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: profile.experience }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 78,
          columnNumber: 97
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 78,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 w-12 flex-shrink-0", children: "지역" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 79,
          columnNumber: 37
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: profile.location }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 79,
          columnNumber: 97
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 79,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400 w-12 flex-shrink-0", children: "학력" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 80,
          columnNumber: 37
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: profile.education }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 80,
          columnNumber: 97
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 80,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 77,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1 pt-1 border-t border-gray-100", children: profile.tags.map(
      (t) => /* @__PURE__ */ jsxDEV("span", { className: "text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full border border-primary-100", children: t }, t, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 84,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 82,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/JobsPage.tsx",
    lineNumber: 64,
    columnNumber: 5
  }, this);
}
_c2 = ProfileCard;
export default function JobsPage({ user, onLoginClick, onBack }) {
  _s();
  const [tab, setTab] = useState("posts");
  const [query, setQuery] = useState("");
  const filteredPosts = jobPosts.filter(
    (j) => query === "" || j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase())
  );
  const isCorpUser = !!user;
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-[60px]", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 py-10", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: onBack,
          className: "inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors",
          children: [
            /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/JobsPage.tsx",
              lineNumber: 111,
              columnNumber: 13
            }, this),
            "홈으로"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 107,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Briefcase, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 116,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 115,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-sm font-semibold", children: "VLUE 인증 기관 채용" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 118,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 114,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-black text-white mb-1", children: "구인구직" }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 120,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm mb-5", style: { wordBreak: "keep-all" }, children: "VLUE 인증 기관의 채용공고를 확인하고 VLUE 이력서로 즉시 지원하세요." }, void 0, false, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 121,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 106,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 105,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setTab("posts"),
            className: `p-6 rounded-3xl border-2 text-left transition-all ${tab === "posts" ? "border-primary-500 bg-primary-50 shadow-card" : "border-gray-200 bg-white hover:border-primary-200"}`,
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxDEV(Briefcase, { className: "w-6 h-6 text-primary-600" }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 134,
                columnNumber: 15
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 133,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-black text-lg mb-1", style: { letterSpacing: "-0.03em" }, children: "채용공고 리스트" }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 136,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm", style: { wordBreak: "keep-all" }, children: "VLUE 인증 기관의 채용 정보를 확인하세요. 모든 회원이 열람 가능합니다." }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 137,
                columnNumber: 13
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 129,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setTab("profiles"),
            className: `p-6 rounded-3xl border-2 text-left transition-all relative ${tab === "profiles" ? "border-primary-500 bg-primary-50 shadow-card" : "border-gray-200 bg-white hover:border-primary-200"}`,
            children: [
              !isCorpUser && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full", children: [
                /* @__PURE__ */ jsxDEV(Lock, { className: "w-3 h-3" }, void 0, false, {
                  fileName: "/home/project/src/pages/JobsPage.tsx",
                  lineNumber: 147,
                  columnNumber: 17
                }, this),
                "기업회원"
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 146,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxDEV(Users, { className: "w-6 h-6 text-emerald-600" }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 152,
                columnNumber: 15
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 151,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-black text-lg mb-1", style: { letterSpacing: "-0.03em" }, children: "구직희망 리스트" }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 154,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-sm", style: { wordBreak: "keep-all" }, children: "인재풀을 확인하세요. 스탠다드 이상 기업 회원만 열람 가능합니다." }, void 0, false, {
                fileName: "/home/project/src/pages/JobsPage.tsx",
                lineNumber: 155,
                columnNumber: 13
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 141,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 128,
        columnNumber: 9
      }, this),
      tab === "posts" && /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "mb-5 relative", children: [
          /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" }, void 0, false, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 164,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: "직무명, 회사명으로 검색...",
              className: "input-field pl-11"
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/pages/JobsPage.tsx",
              lineNumber: 165,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 163,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500 mb-4", children: [
          "총 ",
          /* @__PURE__ */ jsxDEV("span", { className: "font-semibold text-gray-900", children: [
            filteredPosts.length,
            "개"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 174,
            columnNumber: 17
          }, this),
          "의 채용공고"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 173,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: filteredPosts.map((job) => /* @__PURE__ */ jsxDEV(JobCard, { job }, job.id, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 177,
          columnNumber: 43
        }, this)) }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 176,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 162,
        columnNumber: 9
      }, this),
      tab === "profiles" && !isCorpUser && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxDEV(Lock, { className: "w-8 h-8 text-amber-400" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 185,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 184,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-base mb-2", children: "기업 회원(스탠다드 이상)만 열람 가능합니다" }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 187,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-sm mb-5 max-w-sm", style: { wordBreak: "keep-all" }, children: "구직 희망자 인재풀 열람은 스탠다드 이상의 인증을 보유한 기업 회원에게만 제공됩니다." }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 188,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              if (!user && onLoginClick) onLoginClick();
            },
            className: "btn-primary",
            children: "인증신청(요금제) 보기"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 191,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 183,
        columnNumber: 9
      }, this),
      tab === "profiles" && isCorpUser && /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500 mb-4", children: [
          "총 ",
          /* @__PURE__ */ jsxDEV("span", { className: "font-semibold text-gray-900", children: [
            jobProfiles.length,
            "명"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/JobsPage.tsx",
            lineNumber: 203,
            columnNumber: 17
          }, this),
          "의 구직 희망자"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 202,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: jobProfiles.map((p) => /* @__PURE__ */ jsxDEV(ProfileCard, { profile: p }, p.id, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 206,
          columnNumber: 39
        }, this)) }, void 0, false, {
          fileName: "/home/project/src/pages/JobsPage.tsx",
          lineNumber: 205,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/JobsPage.tsx",
        lineNumber: 201,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/JobsPage.tsx",
      lineNumber: 127,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/JobsPage.tsx",
    lineNumber: 104,
    columnNumber: 5
  }, this);
}
_s(JobsPage, "VhT89eo2N6XdTr8+v1r7xrTaEqc=");
_c3 = JobsPage;
var _c, _c2, _c3;
$RefreshReg$(_c, "JobCard");
$RefreshReg$(_c2, "ProfileCard");
$RefreshReg$(_c3, "JobsPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/JobsPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/JobsPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUEsV0FORjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBT0E7QUFBQSxTQWpGSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBbUZBO0FBQUEsT0ExR0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTJHQTtBQUVKO0FBQUNqQixHQTFIdUJKLFVBQVE7QUFBQXVCLE1BQVJ2QjtBQUFRLElBQUFULElBQUFRLEtBQUF3QjtBQUFBQyxhQUFBakMsSUFBQTtBQUFBaUMsYUFBQXpCLEtBQUE7QUFBQXlCLGFBQUFELEtBQUEiLCJuYW1lcyI6WyJCcmllZmNhc2UiLCJVc2VycyIsIkFycm93TGVmdCIsIlNoaWVsZCIsIk1hcFBpbiIsIkNsb2NrIiwiTG9jayIsIkRvd25sb2FkIiwiQ2hldnJvblJpZ2h0IiwiU2VhcmNoIiwiam9iUG9zdHMiLCJqb2JQcm9maWxlcyIsIlRZUEVfQ09MT1JTIiwiSm9iQ2FyZCIsImpvYiIsImNlcnRpZmllZCIsInR5cGUiLCJ3b3JkQnJlYWsiLCJ0aXRsZSIsImNvbXBhbnkiLCJsb2NhdGlvbiIsInNhbGFyeSIsImRlYWRsaW5lIiwidGFncyIsIm1hcCIsInQiLCJfYyIsIlByb2ZpbGVDYXJkIiwicHJvZmlsZSIsIm5hbWUiLCJmaWVsZCIsImF2YWlsYWJsZSIsImV4cGVyaWVuY2UiLCJlZHVjYXRpb24iLCJfYzIiLCJKb2JzUGFnZSIsInVzZXIiLCJvbkxvZ2luQ2xpY2siLCJvbkJhY2siLCJfcyIsInRhYiIsInNldFRhYiIsInVzZVN0YXRlIiwicXVlcnkiLCJzZXRRdWVyeSIsImZpbHRlcmVkUG9zdHMiLCJmaWx0ZXIiLCJqIiwidG9Mb3dlckNhc2UiLCJpbmNsdWRlcyIsImlzQ29ycFVzZXIiLCJsZXR0ZXJTcGFjaW5nIiwiZSIsInRhcmdldCIsInZhbHVlIiwibGVuZ3RoIiwiaWQiLCJwIiwiX2MzIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkpvYnNQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEJyaWVmY2FzZSwgVXNlcnMsIEFycm93TGVmdCwgU2hpZWxkLCBNYXBQaW4sIENsb2NrLCBMb2NrLCBEb3dubG9hZCwgQ2hldnJvblJpZ2h0LCBTZWFyY2ggfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgam9iUG9zdHMsIGpvYlByb2ZpbGVzIH0gZnJvbSAnLi4vZGF0YS9tb2NrRGF0YSc7XG5pbXBvcnQgeyBKb2JQb3N0LCBKb2JQcm9maWxlIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5pbnRlcmZhY2UgSm9ic1BhZ2VQcm9wcyB7XG4gIHVzZXI/OiB7IGVtYWlsOiBzdHJpbmcgfSB8IG51bGw7XG4gIG9uTG9naW5DbGljaz86ICgpID0+IHZvaWQ7XG4gIG9uQmFjazogKCkgPT4gdm9pZDtcbn1cblxuY29uc3QgVFlQRV9DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICfsoJXqt5zsp4EnOiAnYmctcHJpbWFyeS01MCB0ZXh0LXByaW1hcnktNzAwIGJvcmRlci1wcmltYXJ5LTEwMCcsXG4gICfqs4Tslb3sp4EnOiAnYmctYW1iZXItNTAgdGV4dC1hbWJlci03MDAgYm9yZGVyLWFtYmVyLTEwMCcsXG4gICfsnbjthLQnOiAnYmctZW1lcmFsZC01MCB0ZXh0LWVtZXJhbGQtNzAwIGJvcmRlci1lbWVyYWxkLTEwMCcsXG4gICftjIztirjtg4DsnoQnOiAnYmctb3JhbmdlLTUwIHRleHQtb3JhbmdlLTcwMCBib3JkZXItb3JhbmdlLTEwMCcsXG59O1xuXG5mdW5jdGlvbiBKb2JDYXJkKHsgam9iIH06IHsgam9iOiBKb2JQb3N0IH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImNhcmQgcC01IGZsZXggZmxleC1jb2wgZ2FwLTMgaG92ZXI6Ym9yZGVyLXByaW1hcnktMjAwIGhvdmVyOnNoYWRvdy1jYXJkLWhvdmVyIHRyYW5zaXRpb24tYWxsIGdyb3VwIGN1cnNvci1wb2ludGVyXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC0yXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIG1pbi13LTBcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgbWItMSBmbGV4LXdyYXBcIj5cbiAgICAgICAgICAgIHtqb2IuY2VydGlmaWVkICYmIChcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0wLjUgdGV4dC14cyBmb250LXNlbWlib2xkIHB4LTEuNSBweS0wLjUgYmctcHJpbWFyeS01MCB0ZXh0LXByaW1hcnktNjAwIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDAgcm91bmRlZC1mdWxsXCI+XG4gICAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTIuNSBoLTIuNVwiIC8+XG4gICAgICAgICAgICAgICAg7J247Kad6riw6rSAXG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgcHgtMiBweS0wLjUgcm91bmRlZC1mdWxsIGJvcmRlciAke1RZUEVfQ09MT1JTW2pvYi50eXBlXSA/PyAnYmctZ3JheS01MCB0ZXh0LWdyYXktNjAwIGJvcmRlci1ncmF5LTEwMCd9YH0+XG4gICAgICAgICAgICAgIHtqb2IudHlwZX1cbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LWJvbGQgdGV4dC1zbSBncm91cC1ob3Zlcjp0ZXh0LXByaW1hcnktNjAwIHRyYW5zaXRpb24tY29sb3JzXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAge2pvYi50aXRsZX1cbiAgICAgICAgICA8L2gzPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtZ3JheS0zMDAgZ3JvdXAtaG92ZXI6dGV4dC1wcmltYXJ5LTQwMCBmbGV4LXNocmluay0wIHRyYW5zaXRpb24tY29sb3JzIG10LTAuNVwiIC8+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXY+XG4gICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS02MDAgdGV4dC14cyBmb250LXNlbWlib2xkIG1iLTFcIj57am9iLmNvbXBhbnl9PC9wPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQteHMgdGV4dC1ncmF5LTQwMCBmbGV4LXdyYXBcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPjxNYXBQaW4gY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+e2pvYi5sb2NhdGlvbn08L3NwYW4+XG4gICAgICAgICAge2pvYi5zYWxhcnkgJiYgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTYwMCBmb250LW1lZGl1bVwiPntqb2Iuc2FsYXJ5fTwvc3Bhbj59XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj48Q2xvY2sgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+e2pvYi5kZWFkbGluZX0g66eI6rCQPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBnYXAtMSBwdC0xIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICB7am9iLnRhZ3MubWFwKCh0KSA9PiAoXG4gICAgICAgICAgPHNwYW4ga2V5PXt0fSBjbGFzc05hbWU9XCJ0ZXh0LXhzIHB4LTIgcHktMC41IGJnLWdyYXktNTAgdGV4dC1ncmF5LTUwMCByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1ncmF5LTEwMFwiPnt0fTwvc3Bhbj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjUgcHktMiB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1wcmltYXJ5LTYwMCBiZy1wcmltYXJ5LTUwIGhvdmVyOmJnLXByaW1hcnktMTAwIGJvcmRlciBib3JkZXItcHJpbWFyeS0yMDAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICA8RG93bmxvYWQgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICBWTFVFIOydtOugpeyEnCDsponsi5wg7KeA7JuQXG4gICAgICA8L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUHJvZmlsZUNhcmQoeyBwcm9maWxlIH06IHsgcHJvZmlsZTogSm9iUHJvZmlsZSB9KSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJjYXJkIHAtNSBmbGV4IGZsZXgtY29sIGdhcC0zIGhvdmVyOmJvcmRlci1wcmltYXJ5LTIwMCB0cmFuc2l0aW9uLWFsbFwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLWZ1bGwgYmctZ3JheS0xMDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgIDxVc2VycyBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtZ3JheS00MDBcIiAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtYm9sZCB0ZXh0LXNtXCI+e3Byb2ZpbGUubmFtZX08L3A+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTYwMCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGRcIj57cHJvZmlsZS5maWVsZH08L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YG1sLWF1dG8gcHgtMiBweS0wLjUgcm91bmRlZC1mdWxsIHRleHQteHMgZm9udC1zZW1pYm9sZCAke3Byb2ZpbGUuYXZhaWxhYmxlID8gJ2JnLWVtZXJhbGQtNTAgdGV4dC1lbWVyYWxkLTcwMCcgOiAnYmctZ3JheS01MCB0ZXh0LWdyYXktNTAwJ31gfT5cbiAgICAgICAgICB7cHJvZmlsZS5hdmFpbGFibGUgPyAn6rWs7KeB7KSRJyA6ICfqtazsp4HsmYTro4wnfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS01MDAgc3BhY2UteS0wLjVcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+PHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB3LTEyIGZsZXgtc2hyaW5rLTBcIj7qsr3roKU8L3NwYW4+PHNwYW4+e3Byb2ZpbGUuZXhwZXJpZW5jZX08L3NwYW4+PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPjxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdy0xMiBmbGV4LXNocmluay0wXCI+7KeA7JetPC9zcGFuPjxzcGFuPntwcm9maWxlLmxvY2F0aW9ufTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+PHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB3LTEyIGZsZXgtc2hyaW5rLTBcIj7tlZnroKU8L3NwYW4+PHNwYW4+e3Byb2ZpbGUuZWR1Y2F0aW9ufTwvc3Bhbj48L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBnYXAtMSBwdC0xIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICB7cHJvZmlsZS50YWdzLm1hcCgodCkgPT4gKFxuICAgICAgICAgIDxzcGFuIGtleT17dH0gY2xhc3NOYW1lPVwidGV4dC14cyBweC0yIHB5LTAuNSBiZy1wcmltYXJ5LTUwIHRleHQtcHJpbWFyeS02MDAgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDBcIj57dH08L3NwYW4+XG4gICAgICAgICkpfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEpvYnNQYWdlKHsgdXNlciwgb25Mb2dpbkNsaWNrLCBvbkJhY2sgfTogSm9ic1BhZ2VQcm9wcykge1xuICBjb25zdCBbdGFiLCBzZXRUYWJdID0gdXNlU3RhdGU8J3Bvc3RzJyB8ICdwcm9maWxlcyc+KCdwb3N0cycpO1xuICBjb25zdCBbcXVlcnksIHNldFF1ZXJ5XSA9IHVzZVN0YXRlKCcnKTtcblxuICBjb25zdCBmaWx0ZXJlZFBvc3RzID0gam9iUG9zdHMuZmlsdGVyKChqKSA9PlxuICAgIHF1ZXJ5ID09PSAnJyB8fFxuICAgIGoudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeS50b0xvd2VyQ2FzZSgpKSB8fFxuICAgIGouY29tcGFueS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpXG4gICk7XG5cbiAgY29uc3QgaXNDb3JwVXNlciA9ICEhdXNlcjtcblxuICByZXR1cm4gKFxuICAgIDxtYWluIGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ibHVlLXRpbnQgcHQtWzYwcHhdXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXByaW1hcnktNjAwIHB5LTEwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctN3hsIG14LWF1dG8gcHgtNCBzbTpweC02IGxnOnB4LThcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXtvbkJhY2t9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSB0ZXh0LXdoaXRlLzcwIGhvdmVyOnRleHQtd2hpdGUgdGV4dC1zbSBtYi00IHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8QXJyb3dMZWZ0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAg7ZmI7Jy866GcXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOSBoLTkgcm91bmRlZC14bCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICA8QnJpZWZjYXNlIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvODAgdGV4dC1zbSBmb250LXNlbWlib2xkXCI+VkxVRSDsnbjspp0g6riw6rSAIOyxhOyaqTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIG1iLTFcIj7qtazsnbjqtazsp4E8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNzAgdGV4dC1zbSBtYi01XCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgVkxVRSDsnbjspp0g6riw6rSA7J2YIOyxhOyaqeqzteqzoOulvCDtmZXsnbjtlZjqs6AgVkxVRSDsnbTroKXshJzroZwg7KaJ7IucIOyngOybkO2VmOyEuOyalC5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctN3hsIG14LWF1dG8gcHgtNCBzbTpweC02IGxnOnB4LTggcHktOFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgZ2FwLTQgbWItOFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRhYigncG9zdHMnKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHAtNiByb3VuZGVkLTN4bCBib3JkZXItMiB0ZXh0LWxlZnQgdHJhbnNpdGlvbi1hbGwgJHt0YWIgPT09ICdwb3N0cycgPyAnYm9yZGVyLXByaW1hcnktNTAwIGJnLXByaW1hcnktNTAgc2hhZG93LWNhcmQnIDogJ2JvcmRlci1ncmF5LTIwMCBiZy13aGl0ZSBob3Zlcjpib3JkZXItcHJpbWFyeS0yMDAnfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEyIGgtMTIgcm91bmRlZC0yeGwgYmctcHJpbWFyeS0xMDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgbWItNFwiPlxuICAgICAgICAgICAgICA8QnJpZWZjYXNlIGNsYXNzTmFtZT1cInctNiBoLTYgdGV4dC1wcmltYXJ5LTYwMFwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtYmxhY2sgdGV4dC1sZyBtYi0xXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PuyxhOyaqeqzteqzoCDrpqzsiqTtirg8L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LXNtXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICBWTFVFIOyduOymnSDquLDqtIDsnZgg7LGE7JqpIOygleuztOulvCDtmZXsnbjtlZjshLjsmpQuIOuqqOuToCDtmozsm5DsnbQg7Je0656MIOqwgOuKpe2VqeuLiOuLpC5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUYWIoJ3Byb2ZpbGVzJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BwLTYgcm91bmRlZC0zeGwgYm9yZGVyLTIgdGV4dC1sZWZ0IHRyYW5zaXRpb24tYWxsIHJlbGF0aXZlICR7dGFiID09PSAncHJvZmlsZXMnID8gJ2JvcmRlci1wcmltYXJ5LTUwMCBiZy1wcmltYXJ5LTUwIHNoYWRvdy1jYXJkJyA6ICdib3JkZXItZ3JheS0yMDAgYmctd2hpdGUgaG92ZXI6Ym9yZGVyLXByaW1hcnktMjAwJ31gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIHshaXNDb3JwVXNlciAmJiAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTQgcmlnaHQtNCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0yIHB5LTAuNSBiZy1hbWJlci0xMDAgdGV4dC1hbWJlci03MDAgdGV4dC14cyBmb250LXNlbWlib2xkIHJvdW5kZWQtZnVsbFwiPlxuICAgICAgICAgICAgICAgIDxMb2NrIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPlxuICAgICAgICAgICAgICAgIOq4sOyXhe2ajOybkFxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTIgaC0xMiByb3VuZGVkLTJ4bCBiZy1lbWVyYWxkLTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtYi00XCI+XG4gICAgICAgICAgICAgIDxVc2VycyBjbGFzc05hbWU9XCJ3LTYgaC02IHRleHQtZW1lcmFsZC02MDBcIiAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LWJsYWNrIHRleHQtbGcgbWItMVwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wM2VtJyB9fT7qtazsp4Htnazrp50g66as7Iqk7Yq4PC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1zbVwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgICAg7J247J6s7ZKA7J2EIO2ZleyduO2VmOyEuOyalC4g7Iqk7YOg64uk65OcIOydtOyDgSDquLDsl4Ug7ZqM7JuQ66eMIOyXtOuejCDqsIDriqXtlanri4jri6QuXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHt0YWIgPT09ICdwb3N0cycgJiYgKFxuICAgICAgICAgIDw+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTUgcmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgPFNlYXJjaCBjbGFzc05hbWU9XCJhYnNvbHV0ZSBsZWZ0LTQgdG9wLTEvMiAtdHJhbnNsYXRlLXktMS8yIHctNCBoLTQgdGV4dC1ncmF5LTQwMCBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgIHZhbHVlPXtxdWVyeX1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFF1ZXJ5KGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIuyngeustOuqhSwg7ZqM7IKs66qF7Jy866GcIOqygOyDiS4uLlwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5wdXQtZmllbGQgcGwtMTFcIlxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtZ3JheS01MDAgbWItNFwiPlxuICAgICAgICAgICAgICDstJ0gPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktOTAwXCI+e2ZpbHRlcmVkUG9zdHMubGVuZ3RofeqwnDwvc3Bhbj7snZgg7LGE7Jqp6rO16rOgXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLTRcIj5cbiAgICAgICAgICAgICAge2ZpbHRlcmVkUG9zdHMubWFwKChqb2IpID0+IDxKb2JDYXJkIGtleT17am9iLmlkfSBqb2I9e2pvYn0gLz4pfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC8+XG4gICAgICAgICl9XG5cbiAgICAgICAge3RhYiA9PT0gJ3Byb2ZpbGVzJyAmJiAhaXNDb3JwVXNlciAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweS0yMCB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC0zeGwgYmctYW1iZXItNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgbWItNFwiPlxuICAgICAgICAgICAgICA8TG9jayBjbGFzc05hbWU9XCJ3LTggaC04IHRleHQtYW1iZXItNDAwXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtYmFzZSBtYi0yXCI+6riw7JeFIO2ajOybkCjsiqTtg6Dri6Trk5wg7J207IOBKeunjCDsl7Trnowg6rCA64ql7ZWp64uI64ukPC9oMz5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC1zbSBtYi01IG1heC13LXNtXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICDqtazsp4Eg7Z2s66ed7J6QIOyduOyerO2SgCDsl7TrnozsnYAg7Iqk7YOg64uk65OcIOydtOyDgeydmCDsnbjspp3snYQg67O07Jyg7ZWcIOq4sOyXhSDtmozsm5Dsl5Dqsozrp4wg7KCc6rO165Cp64uI64ukLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IGlmICghdXNlciAmJiBvbkxvZ2luQ2xpY2spIG9uTG9naW5DbGljaygpOyB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJidG4tcHJpbWFyeVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIOyduOymneyLoOyyrSjsmpTquIjsoJwpIOuztOq4sFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAge3RhYiA9PT0gJ3Byb2ZpbGVzJyAmJiBpc0NvcnBVc2VyICYmIChcbiAgICAgICAgICA8PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LWdyYXktNTAwIG1iLTRcIj5cbiAgICAgICAgICAgICAg7LSdIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTkwMFwiPntqb2JQcm9maWxlcy5sZW5ndGh966qFPC9zcGFuPuydmCDqtazsp4Eg7Z2s66ed7J6QXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLTRcIj5cbiAgICAgICAgICAgICAge2pvYlByb2ZpbGVzLm1hcCgocCkgPT4gPFByb2ZpbGVDYXJkIGtleT17cC5pZH0gcHJvZmlsZT17cH0gLz4pfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC8+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L21haW4+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL3BhZ2VzL0pvYnNQYWdlLnRzeCJ9