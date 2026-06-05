import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/MyPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/MyPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Shield, CheckCircle, Clock, Camera, Grid2x2 as Grid, Star, MapPin, Bell, ChevronRight, Award, Lock, Upload, Video, AlertTriangle, TrendingUp, Eye, Heart, MessageCircle, Bookmark, User, Settings, LogOut } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const FEED_ITEMS = [
  {
    id: 1,
    type: "product",
    img: "https://images.pexels.com/photos/305565/pexels-photo-305565.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "요양병원 입원 상담",
    likes: 128,
    certified: true
  },
  {
    id: 2,
    type: "security",
    img: "https://images.pexels.com/photos/5935794/pexels-photo-5935794.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "보이스피싱 경보",
    likes: 342,
    certified: false,
    alert: true
  },
  {
    id: 3,
    type: "product",
    img: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "공유오피스 월 이용권",
    likes: 204,
    certified: true
  },
  {
    id: 4,
    type: "news",
    img: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "VLUE × 경찰청 MOU",
    likes: 89,
    certified: false
  },
  {
    id: 5,
    type: "product",
    img: "https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "보안 교육 패키지",
    likes: 67,
    certified: true
  },
  {
    id: 6,
    type: "security",
    img: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "API 연동 서비스",
    likes: 156,
    certified: true
  },
  {
    id: 7,
    type: "product",
    img: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "스마트 보안 컨설팅",
    likes: 45,
    certified: true
  },
  {
    id: 8,
    type: "news",
    img: "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "예방 교육 행사",
    likes: 93,
    certified: false
  },
  {
    id: 9,
    type: "product",
    img: "https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=400",
    title: "사무용 에르고의자",
    likes: 189,
    certified: false
  }
];
export default function MyPage({ user, onNavigate, onLogout }) {
  _s();
  const [activeTab, setActiveTab] = useState("feed");
  const [certStep, setCertStep] = useState("idle");
  const [likedItems, setLikedItems] = useState(/* @__PURE__ */ new Set());
  const isCertified = user.grade === "certified";
  const reviewProgress = 30;
  const isUnderReview = certStep === "review";
  const username = user.email.split("@")[0];
  const toggleLike = (id) => {
    setLikedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else
        next.add(id);
      return next;
    });
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen pt-16 bg-gray-50", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-2xl mx-auto", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white border-b border-gray-100", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "px-5 pt-6 pb-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative flex-shrink-0", children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg",
                style: {
                  background: isCertified ? "linear-gradient(135deg, #F59E0B, #D97706)" : "linear-gradient(135deg, #3182F6, #1D4ED8)"
                },
                children: username.charAt(0).toUpperCase()
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 79,
                columnNumber: 17
              },
              this
            ),
            isCertified && /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow", children: /* @__PURE__ */ jsxDEV(Award, { className: "w-3.5 h-3.5 text-white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 91,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 90,
              columnNumber: 17
            }, this),
            !isCertified && /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center shadow", children: /* @__PURE__ */ jsxDEV(User, { className: "w-3.5 h-3.5 text-white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 96,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 95,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 78,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1", children: [
              /* @__PURE__ */ jsxDEV("h2", { className: "text-lg font-black text-gray-900 truncate", style: { letterSpacing: "-0.02em" }, children: username }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 103,
                columnNumber: 19
              }, this),
              isCertified ? /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700", children: [
                /* @__PURE__ */ jsxDEV(Award, { className: "w-3 h-3" }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 108,
                  columnNumber: 23
                }, this),
                " 신뢰인증"
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 107,
                columnNumber: 19
              }, this) : /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-500", children: [
                /* @__PURE__ */ jsxDEV(User, { className: "w-3 h-3" }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 112,
                  columnNumber: 23
                }, this),
                " 일반회원"
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 111,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 102,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-500 mb-2 truncate", children: user.email }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 116,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 119,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-emerald-700 font-medium", children: "최근 로그인: 서울 강남 (정상)" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 120,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 118,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 101,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1.5 flex-shrink-0", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: onLogout,
                className: "p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all",
                title: "로그아웃",
                children: /* @__PURE__ */ jsxDEV(LogOut, { className: "w-4 h-4" }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 130,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 125,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("button", { className: "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all", children: /* @__PURE__ */ jsxDEV(Settings, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 133,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 132,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 124,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 77,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-6 mt-4 pt-4 border-t border-gray-100", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-lg font-black text-gray-900", style: { letterSpacing: "-0.02em" }, children: "9" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 140,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-400", children: "게시물" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 141,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 139,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-lg font-black text-gray-900", style: { letterSpacing: "-0.02em" }, children: "142" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 144,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-400", children: "팔로워" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 145,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 143,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-lg font-black text-gray-900", style: { letterSpacing: "-0.02em" }, children: "38" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 148,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-400", children: "팔로잉" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 149,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 147,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "ml-auto flex items-end", children: /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => onNavigate("pricing"),
              className: "flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-xl transition-all shadow-soft",
              children: [
                /* @__PURE__ */ jsxDEV(Star, { className: "w-3 h-3" }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 156,
                  columnNumber: 19
                }, this),
                "요금제 업그레이드"
              ]
            },
            void 0,
            true,
            {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 152,
              columnNumber: 17
            },
            this
          ) }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 151,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 138,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 76,
        columnNumber: 11
      }, this),
      isUnderReview && /* @__PURE__ */ jsxDEV("div", { className: "mx-5 mb-4 p-4 bg-primary-50 border border-primary-100 rounded-2xl", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(Clock, { className: "w-4 h-4 text-primary-500" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 167,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold text-primary-700", style: { wordBreak: "keep-all" }, children: "AI 신뢰인증 검토 중" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 168,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 166,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-primary-500", children: [
            reviewProgress,
            "%"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 170,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 165,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "w-full h-2 bg-primary-100 rounded-full overflow-hidden", children: /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700",
            style: { width: `${reviewProgress}%` }
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 173,
            columnNumber: 17
          },
          this
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 172,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-primary-600 mt-2", style: { wordBreak: "keep-all" }, children: "현재 일반 회원 권한으로 모든 서비스를 정상 이용 중입니다 (약 5~10일 소요)" }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 178,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 164,
        columnNumber: 11
      }, this),
      !isCertified && !isUnderReview && /* @__PURE__ */ jsxDEV("div", { className: "mx-5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxDEV(Award, { className: "w-5 h-5 text-amber-600 flex-shrink-0" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 187,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold text-amber-800", style: { wordBreak: "keep-all" }, children: "신뢰인증 회원으로 상향 신청" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 189,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-amber-600", style: { wordBreak: "keep-all" }, children: "더 많은 혜택과 프리미엄 명함을 받으세요" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 190,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 188,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 186,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setActiveTab("cert"),
            className: "flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl whitespace-nowrap transition-all",
            children: [
              "신청",
              /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 198,
                columnNumber: 17
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 193,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 185,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex border-t border-gray-100", children: [
        { key: "feed", label: "피드", icon: Grid },
        { key: "cert", label: "인증관리", icon: Shield },
        { key: "security", label: "보안리포트", icon: TrendingUp }
      ].map(
        ({ key, label, icon: Icon }) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setActiveTab(key),
            className: `flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${activeTab === key ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-400 hover:text-gray-600"}`,
            children: [
              /* @__PURE__ */ jsxDEV(Icon, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 218,
                columnNumber: 17
              }, this),
              label
            ]
          },
          key,
          true,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 209,
            columnNumber: 13
          },
          this
        )
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 203,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/MyPage.tsx",
      lineNumber: 75,
      columnNumber: 9
    }, this),
    activeTab === "feed" && /* @__PURE__ */ jsxDEV("div", { className: "p-2", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-0.5", children: FEED_ITEMS.map(
      (item) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "relative aspect-square overflow-hidden cursor-pointer group",
          style: { borderRadius: "4px" },
          children: [
            /* @__PURE__ */ jsxDEV(
              "img",
              {
                src: item.img,
                alt: item.title,
                className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 234,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-white", children: [
                /* @__PURE__ */ jsxDEV(Heart, { className: "w-4 h-4", strokeWidth: 2.5 }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 241,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", children: likedItems.has(item.id) ? item.likes + 1 : item.likes }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 242,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 240,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-white", children: [
                /* @__PURE__ */ jsxDEV(MessageCircle, { className: "w-4 h-4", strokeWidth: 2.5 }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 245,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold", children: Math.floor(item.likes / 5) }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 246,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 244,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 239,
              columnNumber: 19
            }, this),
            item.certified && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shadow", children: /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3 text-white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 251,
              columnNumber: 23
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 250,
              columnNumber: 15
            }, this),
            item.alert && /* @__PURE__ */ jsxDEV("div", { className: "absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow", children: /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-3 h-3 text-white", strokeWidth: 2.5 }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 256,
              columnNumber: 23
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 255,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  toggleLike(item.id);
                },
                className: "absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
                children: /* @__PURE__ */ jsxDEV(Bookmark, { className: `w-4 h-4 ${likedItems.has(item.id) ? "text-yellow-400 fill-yellow-400" : "text-white"}` }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 263,
                  columnNumber: 21
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 259,
                columnNumber: 19
              },
              this
            )
          ]
        },
        item.id,
        true,
        {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 229,
          columnNumber: 13
        },
        this
      )
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/MyPage.tsx",
      lineNumber: 227,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/MyPage.tsx",
      lineNumber: 226,
      columnNumber: 9
    }, this),
    activeTab === "cert" && /* @__PURE__ */ jsxDEV("div", { className: "p-5 space-y-4", children: [
      certStep === "idle" && /* @__PURE__ */ jsxDEV(Fragment, { children: /* @__PURE__ */ jsxDEV("div", { className: "card p-5", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Award, { className: "w-5 h-5 text-amber-600" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 278,
            columnNumber: 23
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 277,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-gray-900 text-sm", style: { wordBreak: "keep-all" }, children: "신뢰인증 회원 상향 신청" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 281,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-500", children: "AI 기반 본인 인증 절차를 진행합니다" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 282,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 280,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 276,
          columnNumber: 19
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2.5 mb-5", children: [
          { step: 1, label: "PASS / 소셜 인증서 선택", icon: Shield, done: false },
          { step: 2, label: "신분증 제출", icon: Camera, done: false },
          { step: 3, label: "AI 본인 대조 영상통화", icon: Video, done: false },
          { step: 4, label: "승인 완료 → 프리미엄 활성화", icon: CheckCircle, done: false }
        ].map(
          ({ step, label, icon: Icon, done }) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl", children: [
            /* @__PURE__ */ jsxDEV("div", { className: `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-emerald-500 text-white" : "bg-primary-100 text-primary-600"}`, children: done ? /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 294,
              columnNumber: 35
            }, this) : step }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 293,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV(Icon, { className: "w-4 h-4 text-gray-400 flex-shrink-0" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 296,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-700 font-medium", style: { wordBreak: "keep-all" }, children: label }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 297,
              columnNumber: 25
            }, this)
          ] }, step, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 292,
            columnNumber: 17
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 285,
          columnNumber: 19
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setCertStep("pass"),
            className: "btn-primary w-full justify-center",
            children: [
              /* @__PURE__ */ jsxDEV(Shield, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 305,
                columnNumber: 21
              }, this),
              "신뢰인증 신청 시작"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 301,
            columnNumber: 19
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 275,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 274,
        columnNumber: 11
      }, this),
      certStep === "pass" && /* @__PURE__ */ jsxDEV("div", { className: "card p-5", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-gray-900 text-sm mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold", children: "1" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 315,
            columnNumber: 19
          }, this),
          "인증 수단 선택"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 314,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2.5", children: [
          { id: "pass", label: "PASS 인증서", desc: "이동통신사 공인 인증", icon: "📱" },
          { id: "kakao_cert", label: "카카오 인증서", desc: "카카오톡 인증서 활용", icon: "💬" },
          { id: "naver_cert", label: "네이버 인증서", desc: "네이버 인증서 활용", icon: "N" }
        ].map(
          (opt) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setCertStep("id"),
              className: "w-full flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-primary-50 border border-transparent hover:border-primary-200 rounded-2xl text-left transition-all",
              children: [
                /* @__PURE__ */ jsxDEV("span", { className: "w-9 h-9 flex items-center justify-center text-lg rounded-xl bg-white shadow-sm border border-gray-100", children: opt.icon }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 329,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-semibold text-gray-800", children: opt.label }, void 0, false, {
                    fileName: "/home/project/src/pages/MyPage.tsx",
                    lineNumber: 331,
                    columnNumber: 25
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-400", children: opt.desc }, void 0, false, {
                    fileName: "/home/project/src/pages/MyPage.tsx",
                    lineNumber: 332,
                    columnNumber: 25
                  }, this)
                ] }, void 0, true, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 330,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-4 h-4 text-gray-300 ml-auto" }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 334,
                  columnNumber: 23
                }, this)
              ]
            },
            opt.id,
            true,
            {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 324,
              columnNumber: 15
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 318,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 313,
        columnNumber: 11
      }, this),
      certStep === "id" && /* @__PURE__ */ jsxDEV("div", { className: "card p-5", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-gray-900 text-sm mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold", children: "2" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 344,
            columnNumber: 19
          }, this),
          "신분증 제출"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 343,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer",
            onClick: () => setCertStep("face"),
            children: [
              /* @__PURE__ */ jsxDEV(Upload, { className: "w-10 h-10 text-gray-300 mx-auto mb-3" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 351,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold text-gray-600", style: { wordBreak: "keep-all" }, children: "주민등록증 또는 운전면허증" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 352,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-400 mt-1", children: "클릭하여 파일 선택 또는 촬영" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 353,
                columnNumber: 19
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 347,
            columnNumber: 17
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "mt-3 p-3 bg-blue-50 rounded-2xl", children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-blue-600", style: { wordBreak: "keep-all" }, children: [
          /* @__PURE__ */ jsxDEV(Lock, { className: "w-3 h-3 inline mr-1" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 357,
            columnNumber: 21
          }, this),
          "제출된 신분증 정보는 암호화되어 인증 후 즉시 삭제됩니다"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 356,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 355,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 342,
        columnNumber: 11
      }, this),
      certStep === "face" && /* @__PURE__ */ jsxDEV("div", { className: "card p-5", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-gray-900 text-sm mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold", children: "3" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 367,
            columnNumber: 19
          }, this),
          "AI 본인 대조 영상통화"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 366,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-gray-900 rounded-2xl aspect-video flex flex-col items-center justify-center mb-4 relative overflow-hidden", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 371,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV(Video, { className: "w-12 h-12 text-white/50 relative z-10 mb-2" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 372,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm relative z-10", style: { wordBreak: "keep-all" }, children: "카메라를 활성화하여 얼굴을 인식시키세요" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 373,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-full relative z-10", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-2 h-2 rounded-full bg-white animate-pulse" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 375,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-white text-xs font-bold", children: "LIVE" }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 376,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 374,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "absolute inset-4 border-2 border-white/30 rounded-2xl",
              style: { boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.1)" }
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 378,
              columnNumber: 19
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 370,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setCertStep("review"),
            className: "btn-primary w-full justify-center",
            children: [
              /* @__PURE__ */ jsxDEV(Video, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 387,
                columnNumber: 19
              }, this),
              "AI 얼굴 인식 시작"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 383,
            columnNumber: 17
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 365,
        columnNumber: 11
      }, this),
      certStep === "review" && /* @__PURE__ */ jsxDEV("div", { className: "card p-6 text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxDEV(Clock, { className: "w-8 h-8 text-primary-500" }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 396,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 395,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "font-bold text-gray-900 mb-2", style: { wordBreak: "keep-all" }, children: "AI 검토 진행 중" }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 398,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500 mb-5", style: { wordBreak: "keep-all" }, children: [
          "제출하신 정보를 AI가 검토하고 있습니다.",
          /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 400,
            columnNumber: 42
          }, this),
          "약 ",
          /* @__PURE__ */ jsxDEV("strong", { children: "5~10일" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 401,
            columnNumber: 21
          }, this),
          " 이내에 결과를 알려드립니다."
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 399,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2", children: /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full",
            style: { width: `${reviewProgress}%`, transition: "width 1s ease" }
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 404,
            columnNumber: 19
          },
          this
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 403,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-primary-500 font-semibold mb-5", children: [
          "AI 검토 단계 ",
          reviewProgress,
          "%"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 409,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "p-3 bg-emerald-50 border border-emerald-100 rounded-2xl", children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-emerald-700 font-medium", style: { wordBreak: "keep-all" }, children: [
          /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3.5 h-3.5 inline mr-1" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 412,
            columnNumber: 21
          }, this),
          "검토 중에도 일반 회원 권한으로 모든 서비스 정상 이용 가능"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 411,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 410,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 394,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/MyPage.tsx",
      lineNumber: 272,
      columnNumber: 9
    }, this),
    activeTab === "security" && /* @__PURE__ */ jsxDEV("div", { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "card p-5", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-gray-900 mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(TrendingUp, { className: "w-4 h-4 text-primary-500" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 425,
            columnNumber: 17
          }, this),
          "최근 보안 활동"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 424,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
          { time: "오늘 09:32", action: "로그인", location: "서울 강남구", safe: true },
          { time: "어제 18:15", action: "명함 조회", location: "국민은행 대표번호", safe: true },
          { time: "3일 전 14:22", action: "검색", location: "한국신뢰금융 검증", safe: true },
          { time: "5일 전 11:04", action: "로그인 시도", location: "부산 (차단됨)", safe: false }
        ].map(
          (log, i) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-2xl", children: [
            /* @__PURE__ */ jsxDEV("div", { className: `w-2 h-2 rounded-full flex-shrink-0 ${log.safe ? "bg-emerald-400" : "bg-red-400"}` }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 436,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold text-gray-800", children: log.action }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 439,
                  columnNumber: 25
                }, this),
                !log.safe && /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-red-500 font-bold", children: "[차단]" }, void 0, false, {
                  fileName: "/home/project/src/pages/MyPage.tsx",
                  lineNumber: 440,
                  columnNumber: 39
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 438,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-400 truncate", children: log.location }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 442,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 437,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 whitespace-nowrap flex-shrink-0", children: log.time }, void 0, false, {
              fileName: "/home/project/src/pages/MyPage.tsx",
              lineNumber: 444,
              columnNumber: 21
            }, this)
          ] }, i, true, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 435,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 428,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 423,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
        { label: "이번 달 검증", value: "23건", icon: Eye, color: "text-primary-500", bg: "bg-primary-50" },
        { label: "사기 차단", value: "2건", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
        { label: "저장된 명함", value: "8개", icon: Bookmark, color: "text-amber-500", bg: "bg-amber-50" },
        { label: "알림 수신", value: "15건", icon: Bell, color: "text-emerald-600", bg: "bg-emerald-50" }
      ].map(
        ({ label, value, icon: Icon, color, bg }) => /* @__PURE__ */ jsxDEV("div", { className: `card p-4 ${bg}`, children: [
          /* @__PURE__ */ jsxDEV(Icon, { className: `w-5 h-5 ${color} mb-2` }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 458,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xl font-black text-gray-900", style: { letterSpacing: "-0.02em" }, children: value }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 459,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-gray-500", children: label }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 460,
            columnNumber: 19
          }, this)
        ] }, label, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 457,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 450,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "card p-5", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-gray-900 mb-3 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(MapPin, { className: "w-4 h-4 text-primary-500" }, void 0, false, {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 467,
            columnNumber: 17
          }, this),
          "안심 구역 설정"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 466,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-500 mb-3", style: { wordBreak: "keep-all" }, children: "위치 기반 안심 구역을 설정하면 해당 지역 외 접근 시 즉시 알림을 받습니다" }, void 0, false, {
          fileName: "/home/project/src/pages/MyPage.tsx",
          lineNumber: 470,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => onNavigate("safezone"),
            className: "btn-secondary w-full justify-center text-xs",
            children: [
              /* @__PURE__ */ jsxDEV(MapPin, { className: "w-3.5 h-3.5" }, void 0, false, {
                fileName: "/home/project/src/pages/MyPage.tsx",
                lineNumber: 477,
                columnNumber: 17
              }, this),
              "안심 구역 관리하기"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/MyPage.tsx",
            lineNumber: 473,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/MyPage.tsx",
        lineNumber: 465,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/MyPage.tsx",
      lineNumber: 422,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { style: { height: "100px" } }, void 0, false, {
      fileName: "/home/project/src/pages/MyPage.tsx",
      lineNumber: 484,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/MyPage.tsx",
    lineNumber: 73,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/pages/MyPage.tsx",
    lineNumber: 72,
    columnNumber: 5
  }, this);
}
_s(MyPage, "D5I0+EY3ayjogGfwsgSBMeWwWMo=");
_c = MyPage;
var _c;
$RefreshReg$(_c, "MyPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/MyPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/MyPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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TUE7QUFBQSxXQWRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFlQTtBQUFBLFNBMURGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0EyREE7QUFBQSxJQUdGLHVCQUFDLFNBQUksT0FBTyxFQUFFd0QsUUFBUSxRQUFRLEtBQTlCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBZ0M7QUFBQSxPQTNabEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTRaQSxLQTdaRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBOFpBO0FBRUo7QUFBQ3RELEdBcmJ1QkosUUFBTTtBQUFBMkQsS0FBTjNEO0FBQU0sSUFBQTJEO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJTaGllbGQiLCJDaGVja0NpcmNsZSIsIkNsb2NrIiwiQ2FtZXJhIiwiR3JpZDJ4MiIsIkdyaWQiLCJTdGFyIiwiTWFwUGluIiwiQmVsbCIsIkNoZXZyb25SaWdodCIsIkF3YXJkIiwiTG9jayIsIlVwbG9hZCIsIlZpZGVvIiwiQWxlcnRUcmlhbmdsZSIsIlRyZW5kaW5nVXAiLCJFeWUiLCJIZWFydCIsIk1lc3NhZ2VDaXJjbGUiLCJCb29rbWFyayIsIlVzZXIiLCJTZXR0aW5ncyIsIkxvZ091dCIsIkZFRURfSVRFTVMiLCJpZCIsInR5cGUiLCJpbWciLCJ0aXRsZSIsImxpa2VzIiwiY2VydGlmaWVkIiwiYWxlcnQiLCJNeVBhZ2UiLCJ1c2VyIiwib25OYXZpZ2F0ZSIsIm9uTG9nb3V0IiwiX3MiLCJhY3RpdmVUYWIiLCJzZXRBY3RpdmVUYWIiLCJ1c2VTdGF0ZSIsImNlcnRTdGVwIiwic2V0Q2VydFN0ZXAiLCJsaWtlZEl0ZW1zIiwic2V0TGlrZWRJdGVtcyIsIlNldCIsImlzQ2VydGlmaWVkIiwiZ3JhZGUiLCJyZXZpZXdQcm9ncmVzcyIsImlzVW5kZXJSZXZpZXciLCJ1c2VybmFtZSIsImVtYWlsIiwic3BsaXQiLCJ0b2dnbGVMaWtlIiwicHJldiIsIm5leHQiLCJoYXMiLCJkZWxldGUiLCJhZGQiLCJiYWNrZ3JvdW5kIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJsZXR0ZXJTcGFjaW5nIiwid29yZEJyZWFrIiwid2lkdGgiLCJrZXkiLCJsYWJlbCIsImljb24iLCJtYXAiLCJJY29uIiwiaXRlbSIsImJvcmRlclJhZGl1cyIsIk1hdGgiLCJmbG9vciIsImUiLCJzdG9wUHJvcGFnYXRpb24iLCJzdGVwIiwiZG9uZSIsImRlc2MiLCJvcHQiLCJib3hTaGFkb3ciLCJ0cmFuc2l0aW9uIiwidGltZSIsImFjdGlvbiIsImxvY2F0aW9uIiwic2FmZSIsImxvZyIsImkiLCJ2YWx1ZSIsImNvbG9yIiwiYmciLCJoZWlnaHQiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJNeVBhZ2UudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgU2hpZWxkLCBDaGVja0NpcmNsZSwgQ2xvY2ssIENhbWVyYSwgR3JpZDJ4MiBhcyBHcmlkLCBQbHVzLCBTdGFyLCBNYXBQaW4sIEJlbGwsIENoZXZyb25SaWdodCwgQXdhcmQsIExvY2ssIFVwbG9hZCwgVmlkZW8sIEFsZXJ0VHJpYW5nbGUsIFRyZW5kaW5nVXAsIEV5ZSwgSGVhcnQsIE1lc3NhZ2VDaXJjbGUsIEJvb2ttYXJrLCBVc2VyLCBTZXR0aW5ncywgTG9nT3V0IH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuaW50ZXJmYWNlIE15UGFnZVByb3BzIHtcbiAgdXNlcjogeyBlbWFpbDogc3RyaW5nOyBncmFkZT86ICdiYXNpYycgfCAnY2VydGlmaWVkJyB9O1xuICBvbk5hdmlnYXRlOiAodmlldzogc3RyaW5nKSA9PiB2b2lkO1xuICBvbkxvZ291dDogKCkgPT4gdm9pZDtcbn1cblxuY29uc3QgRkVFRF9JVEVNUyA9IFtcbiAge1xuICAgIGlkOiAxLCB0eXBlOiAncHJvZHVjdCcsIGltZzogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzMwNTU2NS9wZXhlbHMtcGhvdG8tMzA1NTY1LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgdGl0bGU6ICfsmpTslpHrs5Hsm5Ag7J6F7JuQIOyDgeuLtCcsIGxpa2VzOiAxMjgsIGNlcnRpZmllZDogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAyLCB0eXBlOiAnc2VjdXJpdHknLCBpbWc6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy81OTM1Nzk0L3BleGVscy1waG90by01OTM1Nzk0LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgdGl0bGU6ICfrs7TsnbTsiqTtlLzsi7Eg6rK967O0JywgbGlrZXM6IDM0MiwgY2VydGlmaWVkOiBmYWxzZSwgYWxlcnQ6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogMywgdHlwZTogJ3Byb2R1Y3QnLCBpbWc6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xMTgxNDY3L3BleGVscy1waG90by0xMTgxNDY3LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgdGl0bGU6ICfqs7XsnKDsmKTtlLzsiqQg7JuUIOydtOyaqeq2jCcsIGxpa2VzOiAyMDQsIGNlcnRpZmllZDogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiA0LCB0eXBlOiAnbmV3cycsIGltZzogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzMxODQyOTIvcGV4ZWxzLXBob3RvLTMxODQyOTIuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9NDAwJyxcbiAgICB0aXRsZTogJ1ZMVUUgw5cg6rK97LCw7LKtIE1PVScsIGxpa2VzOiA4OSwgY2VydGlmaWVkOiBmYWxzZSxcbiAgfSxcbiAge1xuICAgIGlkOiA1LCB0eXBlOiAncHJvZHVjdCcsIGltZzogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzMxODQ0MzEvcGV4ZWxzLXBob3RvLTMxODQ0MzEuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9NDAwJyxcbiAgICB0aXRsZTogJ+uztOyViCDqtZDsnKEg7Yyo7YKk7KeAJywgbGlrZXM6IDY3LCBjZXJ0aWZpZWQ6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogNiwgdHlwZTogJ3NlY3VyaXR5JywgaW1nOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMTE4MTI3MS9wZXhlbHMtcGhvdG8tMTE4MTI3MS5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICAgIHRpdGxlOiAnQVBJIOyXsOuPmSDshJzruYTsiqQnLCBsaWtlczogMTU2LCBjZXJ0aWZpZWQ6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogNywgdHlwZTogJ3Byb2R1Y3QnLCBpbWc6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8zMTgzMTUwL3BleGVscy1waG90by0zMTgzMTUwLmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgdGl0bGU6ICfsiqTrp4jtirgg67O07JWIIOy7qOyEpO2MhScsIGxpa2VzOiA0NSwgY2VydGlmaWVkOiB0cnVlLFxuICB9LFxuICB7XG4gICAgaWQ6IDgsIHR5cGU6ICduZXdzJywgaW1nOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvNzE3NjAyNi9wZXhlbHMtcGhvdG8tNzE3NjAyNi5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICAgIHRpdGxlOiAn7JiI67CpIOq1kOycoSDtlonsgqwnLCBsaWtlczogOTMsIGNlcnRpZmllZDogZmFsc2UsXG4gIH0sXG4gIHtcbiAgICBpZDogOSwgdHlwZTogJ3Byb2R1Y3QnLCBpbWc6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xOTU3NDc4L3BleGVscy1waG90by0xOTU3NDc4LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgdGl0bGU6ICfsgqzrrLTsmqkg7JeQ66W06rOg7J2Y7J6QJywgbGlrZXM6IDE4OSwgY2VydGlmaWVkOiBmYWxzZSxcbiAgfSxcbl07XG5cbnR5cGUgQ2VydFN0ZXAgPSAnaWRsZScgfCAncGFzcycgfCAnaWQnIHwgJ2ZhY2UnIHwgJ3JldmlldycgfCAnZG9uZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE15UGFnZSh7IHVzZXIsIG9uTmF2aWdhdGUsIG9uTG9nb3V0IH06IE15UGFnZVByb3BzKSB7XG4gIGNvbnN0IFthY3RpdmVUYWIsIHNldEFjdGl2ZVRhYl0gPSB1c2VTdGF0ZTwnZmVlZCcgfCAnY2VydCcgfCAnc2VjdXJpdHknPignZmVlZCcpO1xuICBjb25zdCBbY2VydFN0ZXAsIHNldENlcnRTdGVwXSA9IHVzZVN0YXRlPENlcnRTdGVwPignaWRsZScpO1xuICBjb25zdCBbbGlrZWRJdGVtcywgc2V0TGlrZWRJdGVtc10gPSB1c2VTdGF0ZTxTZXQ8bnVtYmVyPj4obmV3IFNldCgpKTtcblxuICBjb25zdCBpc0NlcnRpZmllZCA9IHVzZXIuZ3JhZGUgPT09ICdjZXJ0aWZpZWQnO1xuICBjb25zdCByZXZpZXdQcm9ncmVzcyA9IDMwO1xuICBjb25zdCBpc1VuZGVyUmV2aWV3ID0gY2VydFN0ZXAgPT09ICdyZXZpZXcnO1xuXG4gIGNvbnN0IHVzZXJuYW1lID0gdXNlci5lbWFpbC5zcGxpdCgnQCcpWzBdO1xuXG4gIGNvbnN0IHRvZ2dsZUxpa2UgPSAoaWQ6IG51bWJlcikgPT4ge1xuICAgIHNldExpa2VkSXRlbXMoKHByZXYpID0+IHtcbiAgICAgIGNvbnN0IG5leHQgPSBuZXcgU2V0KHByZXYpO1xuICAgICAgaWYgKG5leHQuaGFzKGlkKSkgbmV4dC5kZWxldGUoaWQpO1xuICAgICAgZWxzZSBuZXh0LmFkZChpZCk7XG4gICAgICByZXR1cm4gbmV4dDtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIHB0LTE2IGJnLWdyYXktNTBcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctMnhsIG14LWF1dG9cIj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIGJvcmRlci1iIGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtNSBwdC02IHBiLTRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtNFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTIwIGgtMjAgcm91bmRlZC1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtd2hpdGUgdGV4dC0yeGwgZm9udC1ibGFjayBzaGFkb3ctbGdcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogaXNDZXJ0aWZpZWRcbiAgICAgICAgICAgICAgICAgICAgICA/ICdsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjRjU5RTBCLCAjRDk3NzA2KSdcbiAgICAgICAgICAgICAgICAgICAgICA6ICdsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjMzE4MkY2LCAjMUQ0RUQ4KScsXG4gICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHt1c2VybmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICB7aXNDZXJ0aWZpZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtYm90dG9tLTEgLXJpZ2h0LTEgdy03IGgtNyByb3VuZGVkLWZ1bGwgYmctYW1iZXItNDAwIGJvcmRlci0yIGJvcmRlci13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3dcIj5cbiAgICAgICAgICAgICAgICAgICAgPEF3YXJkIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtd2hpdGVcIiBzdHJva2VXaWR0aD17Mi41fSAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7IWlzQ2VydGlmaWVkICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgLWJvdHRvbS0xIC1yaWdodC0xIHctNyBoLTcgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAwIGJvcmRlci0yIGJvcmRlci13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3dcIj5cbiAgICAgICAgICAgICAgICAgICAgPFVzZXIgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgdGV4dC13aGl0ZVwiIHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0xXCI+XG4gICAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJsYWNrIHRleHQtZ3JheS05MDAgdHJ1bmNhdGVcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScgfX0+XG4gICAgICAgICAgICAgICAgICAgIHt1c2VybmFtZX1cbiAgICAgICAgICAgICAgICAgIDwvaDI+XG4gICAgICAgICAgICAgICAgICB7aXNDZXJ0aWZpZWQgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTIgcHktMC41IGJnLWFtYmVyLTUwIGJvcmRlciBib3JkZXItYW1iZXItMjAwIHJvdW5kZWQtZnVsbCB0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTcwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxBd2FyZCBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz4g7Iug66Kw7J247KadXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTIgcHktMC41IGJnLWdyYXktMTAwIGJvcmRlciBib3JkZXItZ3JheS0yMDAgcm91bmRlZC1mdWxsIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPFVzZXIgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+IOydvOuwmO2ajOybkFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTUwMCBtYi0yIHRydW5jYXRlXCI+e3VzZXIuZW1haWx9PC9wPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTIuNSBweS0xLjUgYmctZW1lcmFsZC01MCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtMTAwIHJvdW5kZWQteGxcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xLjUgaC0xLjUgcm91bmRlZC1mdWxsIGJnLWVtZXJhbGQtNTAwIGFuaW1hdGUtcHVsc2VcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWVtZXJhbGQtNzAwIGZvbnQtbWVkaXVtXCI+7LWc6re8IOuhnOq3uOyduDog7ISc7Jq4IOqwleuCqCAo7KCV7IOBKTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e29uTG9nb3V0fVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1yZWQtNTAwIGhvdmVyOmJnLXJlZC01MCByb3VuZGVkLXhsIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICAgIHRpdGxlPVwi66Gc6re47JWE7JuDXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8TG9nT3V0IGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicC0yIHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1ncmF5LTYwMCBob3ZlcjpiZy1ncmF5LTEwMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tYWxsXCI+XG4gICAgICAgICAgICAgICAgICA8U2V0dGluZ3MgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtNiBtdC00IHB0LTQgYm9yZGVyLXQgYm9yZGVyLWdyYXktMTAwXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1ibGFjayB0ZXh0LWdyYXktOTAwXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19Pjk8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTQwMFwiPuqyjOyLnOusvDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJsYWNrIHRleHQtZ3JheS05MDBcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScgfX0+MTQyPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj7tjJTroZzsm4w8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1ibGFjayB0ZXh0LWdyYXktOTAwXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19PjM4PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj7tjJTroZzsnok8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWwtYXV0byBmbGV4IGl0ZW1zLWVuZFwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uTmF2aWdhdGUoJ3ByaWNpbmcnKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMyBweS0xLjUgYmctcHJpbWFyeS01MDAgaG92ZXI6YmctcHJpbWFyeS02MDAgdGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgcm91bmRlZC14bCB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctc29mdFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPFN0YXIgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgICAgICAgICAgICDsmpTquIjsoJwg7JeF6re466CI7J2065OcXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7aXNVbmRlclJldmlldyAmJiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LTUgbWItNCBwLTQgYmctcHJpbWFyeS01MCBib3JkZXIgYm9yZGVyLXByaW1hcnktMTAwIHJvdW5kZWQtMnhsXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG1iLTJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICA8Q2xvY2sgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNTAwXCIgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtcHJpbWFyeS03MDBcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+QUkg7Iug66Kw7J247KadIOqygO2GoCDspJE8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC1wcmltYXJ5LTUwMFwiPntyZXZpZXdQcm9ncmVzc30lPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgaC0yIGJnLXByaW1hcnktMTAwIHJvdW5kZWQtZnVsbCBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLWZ1bGwgYmctZ3JhZGllbnQtdG8tciBmcm9tLXByaW1hcnktNDAwIHRvLXByaW1hcnktNjAwIHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi03MDBcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGg6IGAke3Jldmlld1Byb2dyZXNzfSVgIH19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1wcmltYXJ5LTYwMCBtdC0yXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICAgIO2YhOyerCDsnbzrsJgg7ZqM7JuQIOq2jO2VnOycvOuhnCDrqqjrk6Ag7ISc67mE7Iqk66W8IOygleyDgSDsnbTsmqkg7KSR7J6F64uI64ukICjslb0gNX4xMOydvCDshozsmpQpXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG5cbiAgICAgICAgICB7IWlzQ2VydGlmaWVkICYmICFpc1VuZGVyUmV2aWV3ICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXgtNSBtYi00IHAtMyBiZy1hbWJlci01MCBib3JkZXIgYm9yZGVyLWFtYmVyLTIwMCByb3VuZGVkLTJ4bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTNcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41XCI+XG4gICAgICAgICAgICAgICAgPEF3YXJkIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1hbWJlci02MDAgZmxleC1zaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHRleHQtYW1iZXItODAwXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PuyLoOuisOyduOymnSDtmozsm5DsnLzroZwg7IOB7ZalIOyLoOyyrTwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1hbWJlci02MDBcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+642UIOunjuydgCDtmJztg53qs7wg7ZSE66as66+47JeEIOuqhe2VqOydhCDrsJvsnLzshLjsmpQ8L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlVGFiKCdjZXJ0Jyl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMyBweS0xLjUgYmctYW1iZXItNTAwIGhvdmVyOmJnLWFtYmVyLTYwMCB0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1ib2xkIHJvdW5kZWQteGwgd2hpdGVzcGFjZS1ub3dyYXAgdHJhbnNpdGlvbi1hbGxcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAg7Iug7LKtXG4gICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTMgaC0zXCIgLz5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgeyBrZXk6ICdmZWVkJywgbGFiZWw6ICftlLzrk5wnLCBpY29uOiBHcmlkIH0sXG4gICAgICAgICAgICAgIHsga2V5OiAnY2VydCcsIGxhYmVsOiAn7J247Kad6rSA66asJywgaWNvbjogU2hpZWxkIH0sXG4gICAgICAgICAgICAgIHsga2V5OiAnc2VjdXJpdHknLCBsYWJlbDogJ+uztOyViOumrO2PrO2KuCcsIGljb246IFRyZW5kaW5nVXAgfSxcbiAgICAgICAgICAgIF0ubWFwKCh7IGtleSwgbGFiZWwsIGljb246IEljb24gfSkgPT4gKFxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAga2V5PXtrZXl9XG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlVGFiKGtleSBhcyB0eXBlb2YgYWN0aXZlVGFiKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4LTEgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTEuNSBweS0zIHRleHQteHMgZm9udC1zZW1pYm9sZCB0cmFuc2l0aW9uLWNvbG9ycyAke1xuICAgICAgICAgICAgICAgICAgYWN0aXZlVGFiID09PSBrZXlcbiAgICAgICAgICAgICAgICAgICAgPyAndGV4dC1wcmltYXJ5LTYwMCBib3JkZXItYi0yIGJvcmRlci1wcmltYXJ5LTYwMCdcbiAgICAgICAgICAgICAgICAgICAgOiAndGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LWdyYXktNjAwJ1xuICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICAgIHtsYWJlbH1cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAge2FjdGl2ZVRhYiA9PT0gJ2ZlZWQnICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0zIGdhcC0wLjVcIj5cbiAgICAgICAgICAgICAge0ZFRURfSVRFTVMubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAga2V5PXtpdGVtLmlkfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicmVsYXRpdmUgYXNwZWN0LXNxdWFyZSBvdmVyZmxvdy1oaWRkZW4gY3Vyc29yLXBvaW50ZXIgZ3JvdXBcIlxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgYm9yZGVyUmFkaXVzOiAnNHB4JyB9fVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxpbWdcbiAgICAgICAgICAgICAgICAgICAgc3JjPXtpdGVtLmltZ31cbiAgICAgICAgICAgICAgICAgICAgYWx0PXtpdGVtLnRpdGxlfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb3ZlciBncm91cC1ob3ZlcjpzY2FsZS0xMDUgdHJhbnNpdGlvbi10cmFuc2Zvcm0gZHVyYXRpb24tMzAwXCJcbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgYmctYmxhY2svMCBncm91cC1ob3ZlcjpiZy1ibGFjay8zMCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0yMDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTMgb3BhY2l0eS0wIGdyb3VwLWhvdmVyOm9wYWNpdHktMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgdGV4dC13aGl0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxIZWFydCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgc3Ryb2tlV2lkdGg9ezIuNX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZFwiPntsaWtlZEl0ZW1zLmhhcyhpdGVtLmlkKSA/IGl0ZW0ubGlrZXMgKyAxIDogaXRlbS5saWtlc308L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHRleHQtd2hpdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8TWVzc2FnZUNpcmNsZSBjbGFzc05hbWU9XCJ3LTQgaC00XCIgc3Ryb2tlV2lkdGg9ezIuNX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZFwiPntNYXRoLmZsb29yKGl0ZW0ubGlrZXMgLyA1KX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICB7aXRlbS5jZXJ0aWZpZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0xLjUgbGVmdC0xLjUgdy01IGgtNSByb3VuZGVkLWZ1bGwgYmctcHJpbWFyeS01MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgc2hhZG93XCI+XG4gICAgICAgICAgICAgICAgICAgICAgPENoZWNrQ2lyY2xlIGNsYXNzTmFtZT1cInctMyBoLTMgdGV4dC13aGl0ZVwiIHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIHtpdGVtLmFsZXJ0ICYmIChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMS41IHJpZ2h0LTEuNSB3LTUgaC01IHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvd1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxBbGVydFRyaWFuZ2xlIGNsYXNzTmFtZT1cInctMyBoLTMgdGV4dC13aGl0ZVwiIHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdG9nZ2xlTGlrZShpdGVtLmlkKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgYm90dG9tLTEuNSByaWdodC0xLjUgb3BhY2l0eS0wIGdyb3VwLWhvdmVyOm9wYWNpdHktMTAwIHRyYW5zaXRpb24tb3BhY2l0eVwiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxCb29rbWFyayBjbGFzc05hbWU9e2B3LTQgaC00ICR7bGlrZWRJdGVtcy5oYXMoaXRlbS5pZCkgPyAndGV4dC15ZWxsb3ctNDAwIGZpbGwteWVsbG93LTQwMCcgOiAndGV4dC13aGl0ZSd9YH0gLz5cbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIHthY3RpdmVUYWIgPT09ICdjZXJ0JyAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTUgc3BhY2UteS00XCI+XG4gICAgICAgICAgICB7Y2VydFN0ZXAgPT09ICdpZGxlJyAmJiAoXG4gICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjYXJkIHAtNVwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi00XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtMnhsIGJnLWFtYmVyLTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxBd2FyZCBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtYW1iZXItNjAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwIHRleHQtc21cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+7Iug66Kw7J247KadIO2ajOybkCDsg4HtlqUg7Iug7LKtPC9oMz5cbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS01MDBcIj5BSSDquLDrsJgg67O47J24IOyduOymnSDsoIjssKjrpbwg7KeE7ZaJ7ZWp64uI64ukPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTIuNSBtYi01XCI+XG4gICAgICAgICAgICAgICAgICAgIHtbXG4gICAgICAgICAgICAgICAgICAgICAgeyBzdGVwOiAxLCBsYWJlbDogJ1BBU1MgLyDshozshZwg7J247Kad7IScIOyEoO2DnScsIGljb246IFNoaWVsZCwgZG9uZTogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICAgICAgICB7IHN0ZXA6IDIsIGxhYmVsOiAn7Iug67aE7KadIOygnOy2nCcsIGljb246IENhbWVyYSwgZG9uZTogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICAgICAgICB7IHN0ZXA6IDMsIGxhYmVsOiAnQUkg67O47J24IOuMgOyhsCDsmIHsg4HthrXtmZQnLCBpY29uOiBWaWRlbywgZG9uZTogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICAgICAgICB7IHN0ZXA6IDQsIGxhYmVsOiAn7Iq57J24IOyZhOujjCDihpIg7ZSE66as66+47JeEIO2ZnOyEse2ZlCcsIGljb246IENoZWNrQ2lyY2xlLCBkb25lOiBmYWxzZSB9LFxuICAgICAgICAgICAgICAgICAgICBdLm1hcCgoeyBzdGVwLCBsYWJlbCwgaWNvbjogSWNvbiwgZG9uZSB9KSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e3N0ZXB9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHAtMi41IGJnLWdyYXktNTAgcm91bmRlZC0yeGxcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy03IGgtNyByb3VuZGVkLWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC14cyBmb250LWJvbGQgJHtkb25lID8gJ2JnLWVtZXJhbGQtNTAwIHRleHQtd2hpdGUnIDogJ2JnLXByaW1hcnktMTAwIHRleHQtcHJpbWFyeS02MDAnfWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7ZG9uZSA/IDxDaGVja0NpcmNsZSBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+IDogc3RlcH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWdyYXktNDAwIGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNzAwIGZvbnQtbWVkaXVtXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PntsYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldENlcnRTdGVwKCdwYXNzJyl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJ0bi1wcmltYXJ5IHctZnVsbCBqdXN0aWZ5LWNlbnRlclwiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgIOyLoOuisOyduOymnSDsi6Dssq0g7Iuc7J6RXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICB7Y2VydFN0ZXAgPT09ICdwYXNzJyAmJiAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2FyZCBwLTVcIj5cbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZ3JheS05MDAgdGV4dC1zbSBtYi00IGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctNiBoLTYgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktMTAwIHRleHQtcHJpbWFyeS02MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC14cyBmb250LWJvbGRcIj4xPC9kaXY+XG4gICAgICAgICAgICAgICAgICDsnbjspp0g7IiY64uoIOyEoO2DnVxuICAgICAgICAgICAgICAgIDwvaDM+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTIuNVwiPlxuICAgICAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ3Bhc3MnLCBsYWJlbDogJ1BBU1Mg7J247Kad7IScJywgZGVzYzogJ+ydtOuPme2GteyLoOyCrCDqs7Xsnbgg7J247KadJywgaWNvbjogJ/Cfk7EnIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdrYWthb19jZXJ0JywgbGFiZWw6ICfsubTsubTsmKQg7J247Kad7IScJywgZGVzYzogJ+y5tOy5tOyYpO2GoSDsnbjspp3shJwg7Zmc7JqpJywgaWNvbjogJ/CfkqwnIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICduYXZlcl9jZXJ0JywgbGFiZWw6ICfrhKTsnbTrsoQg7J247Kad7IScJywgZGVzYzogJ+uEpOydtOuyhCDsnbjspp3shJwg7Zmc7JqpJywgaWNvbjogJ04nIH0sXG4gICAgICAgICAgICAgICAgICBdLm1hcCgob3B0KSA9PiAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBrZXk9e29wdC5pZH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRDZXJ0U3RlcCgnaWQnKX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC0zLjUgYmctZ3JheS01MCBob3ZlcjpiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItdHJhbnNwYXJlbnQgaG92ZXI6Ym9yZGVyLXByaW1hcnktMjAwIHJvdW5kZWQtMnhsIHRleHQtbGVmdCB0cmFuc2l0aW9uLWFsbFwiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ3LTkgaC05IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtbGcgcm91bmRlZC14bCBiZy13aGl0ZSBzaGFkb3ctc20gYm9yZGVyIGJvcmRlci1ncmF5LTEwMFwiPntvcHQuaWNvbn08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtZ3JheS04MDBcIj57b3B0LmxhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj57b3B0LmRlc2N9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPENoZXZyb25SaWdodCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtZ3JheS0zMDAgbWwtYXV0b1wiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAge2NlcnRTdGVwID09PSAnaWQnICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjYXJkIHAtNVwiPlxuICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1ncmF5LTkwMCB0ZXh0LXNtIG1iLTQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy02IGgtNiByb3VuZGVkLWZ1bGwgYmctcHJpbWFyeS0xMDAgdGV4dC1wcmltYXJ5LTYwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXhzIGZvbnQtYm9sZFwiPjI8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIOyLoOu2hOymnSDsoJzstpxcbiAgICAgICAgICAgICAgICA8L2gzPlxuICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJvcmRlci0yIGJvcmRlci1kYXNoZWQgYm9yZGVyLWdyYXktMjAwIHJvdW5kZWQtMnhsIHAtOCB0ZXh0LWNlbnRlciBob3Zlcjpib3JkZXItcHJpbWFyeS0zMDAgaG92ZXI6YmctcHJpbWFyeS01MC8zMCB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRDZXJ0U3RlcCgnZmFjZScpfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxVcGxvYWQgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHRleHQtZ3JheS0zMDAgbXgtYXV0byBtYi0zXCIgLz5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNjAwXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PuyjvOuvvOuTseuhneymnSDrmJDripQg7Jq07KCE66m07ZeI7KadPC9wPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNDAwIG10LTFcIj7tgbTrpq3tlZjsl6wg7YyM7J28IOyEoO2DnSDrmJDripQg7LSs7JiBPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMyBwLTMgYmctYmx1ZS01MCByb3VuZGVkLTJ4bFwiPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWJsdWUtNjAwXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICAgICAgICA8TG9jayBjbGFzc05hbWU9XCJ3LTMgaC0zIGlubGluZSBtci0xXCIgLz5cbiAgICAgICAgICAgICAgICAgICAg7KCc7Lac65CcIOyLoOu2hOymnSDsoJXrs7TripQg7JWU7Zi47ZmU65CY7Ja0IOyduOymnSDtm4Qg7KaJ7IucIOyCreygnOuQqeuLiOuLpFxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIHtjZXJ0U3RlcCA9PT0gJ2ZhY2UnICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjYXJkIHAtNVwiPlxuICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1ncmF5LTkwMCB0ZXh0LXNtIG1iLTQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy02IGgtNiByb3VuZGVkLWZ1bGwgYmctcHJpbWFyeS0xMDAgdGV4dC1wcmltYXJ5LTYwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXhzIGZvbnQtYm9sZFwiPjM8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIEFJIOuzuOyduCDrjIDsobAg7JiB7IOB7Ya17ZmUXG4gICAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWdyYXktOTAwIHJvdW5kZWQtMnhsIGFzcGVjdC12aWRlbyBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtYi00IHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLWIgZnJvbS1ibGFjay8yMCB0by1ibGFjay82MFwiIC8+XG4gICAgICAgICAgICAgICAgICA8VmlkZW8gY2xhc3NOYW1lPVwidy0xMiBoLTEyIHRleHQtd2hpdGUvNTAgcmVsYXRpdmUgei0xMCBtYi0yXCIgLz5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvNzAgdGV4dC1zbSByZWxhdGl2ZSB6LTEwXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19Puy5tOuplOudvOulvCDtmZzshLHtmZTtlZjsl6wg7Ja86rW07J2EIOyduOyLneyLnO2CpOyEuOyalDwvcD5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTMgbGVmdC0zIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgYmctcmVkLTUwMCBweC0yIHB5LTEgcm91bmRlZC1mdWxsIHJlbGF0aXZlIHotMTBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTIgaC0yIHJvdW5kZWQtZnVsbCBiZy13aGl0ZSBhbmltYXRlLXB1bHNlXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtYm9sZFwiPkxJVkU8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtNCBib3JkZXItMiBib3JkZXItd2hpdGUvMzAgcm91bmRlZC0yeGxcIlxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBib3hTaGFkb3c6ICdpbnNldCAwIDAgMCAycHggcmdiYSgyNTUsMjU1LDI1NSwwLjEpJyB9fVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRDZXJ0U3RlcCgncmV2aWV3Jyl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJidG4tcHJpbWFyeSB3LWZ1bGwganVzdGlmeS1jZW50ZXJcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxWaWRlbyBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgIEFJIOyWvOq1tCDsnbjsi50g7Iuc7J6RXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAge2NlcnRTdGVwID09PSAncmV2aWV3JyAmJiAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2FyZCBwLTYgdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTYgaC0xNiByb3VuZGVkLTJ4bCBiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgbXgtYXV0byBtYi00XCI+XG4gICAgICAgICAgICAgICAgICA8Q2xvY2sgY2xhc3NOYW1lPVwidy04IGgtOCB0ZXh0LXByaW1hcnktNTAwXCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZ3JheS05MDAgbWItMlwiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5BSSDqsoDthqAg7KeE7ZaJIOykkTwvaDM+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LWdyYXktNTAwIG1iLTVcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAgICDsoJzstpztlZjsi6Ag7KCV67O066W8IEFJ6rCAIOqygO2GoO2VmOqzoCDsnojsirXri4jri6QuPGJyIC8+XG4gICAgICAgICAgICAgICAgICDslb0gPHN0cm9uZz41fjEw7J28PC9zdHJvbmc+IOydtOuCtOyXkCDqsrDqs7zrpbwg7JWM66Ck65Oc66a964uI64ukLlxuICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBoLTMgYmctZ3JheS0xMDAgcm91bmRlZC1mdWxsIG92ZXJmbG93LWhpZGRlbiBtYi0yXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCBiZy1ncmFkaWVudC10by1yIGZyb20tcHJpbWFyeS00MDAgdG8tcHJpbWFyeS02MDAgcm91bmRlZC1mdWxsXCJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGg6IGAke3Jldmlld1Byb2dyZXNzfSVgLCB0cmFuc2l0aW9uOiAnd2lkdGggMXMgZWFzZScgfX1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXByaW1hcnktNTAwIGZvbnQtc2VtaWJvbGQgbWItNVwiPkFJIOqygO2GoCDri6jqs4Qge3Jldmlld1Byb2dyZXNzfSU8L3A+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTMgYmctZW1lcmFsZC01MCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtMTAwIHJvdW5kZWQtMnhsXCI+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZW1lcmFsZC03MDAgZm9udC1tZWRpdW1cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAgICAgIDxDaGVja0NpcmNsZSBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSBpbmxpbmUgbXItMVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIOqygO2GoCDspJHsl5Drj4Qg7J2867CYIO2ajOybkCDqtoztlZzsnLzroZwg66qo65OgIOyEnOu5hOyKpCDsoJXsg4Eg7J207JqpIOqwgOuKpVxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAge2FjdGl2ZVRhYiA9PT0gJ3NlY3VyaXR5JyAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTUgc3BhY2UteS00XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNhcmQgcC01XCI+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwIG1iLTQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8VHJlbmRpbmdVcCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtcHJpbWFyeS01MDBcIiAvPlxuICAgICAgICAgICAgICAgIOy1nOq3vCDrs7TslYgg7Zmc64+ZXG4gICAgICAgICAgICAgIDwvaDM+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zXCI+XG4gICAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICAgIHsgdGltZTogJ+yYpOuKmCAwOTozMicsIGFjdGlvbjogJ+uhnOq3uOyduCcsIGxvY2F0aW9uOiAn7ISc7Jq4IOqwleuCqOq1rCcsIHNhZmU6IHRydWUgfSxcbiAgICAgICAgICAgICAgICAgIHsgdGltZTogJ+yWtOygnCAxODoxNScsIGFjdGlvbjogJ+uqhe2VqCDsobDtmownLCBsb2NhdGlvbjogJ+q1reuvvOydgO2WiSDrjIDtkZzrsojtmLgnLCBzYWZlOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgICB7IHRpbWU6ICcz7J28IOyghCAxNDoyMicsIGFjdGlvbjogJ+qygOyDiScsIGxvY2F0aW9uOiAn7ZWc6rWt7Iug66Kw6riI7Jy1IOqygOymnScsIHNhZmU6IHRydWUgfSxcbiAgICAgICAgICAgICAgICAgIHsgdGltZTogJzXsnbwg7KCEIDExOjA0JywgYWN0aW9uOiAn66Gc6re47J24IOyLnOuPhCcsIGxvY2F0aW9uOiAn67aA7IKwICjssKjri6jrkKgpJywgc2FmZTogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICBdLm1hcCgobG9nLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC0zIGJnLWdyYXktNTAgcm91bmRlZC0yeGxcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2B3LTIgaC0yIHJvdW5kZWQtZnVsbCBmbGV4LXNocmluay0wICR7bG9nLnNhZmUgPyAnYmctZW1lcmFsZC00MDAnIDogJ2JnLXJlZC00MDAnfWB9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIG1pbi13LTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTgwMFwiPntsb2cuYWN0aW9ufTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHshbG9nLnNhZmUgJiYgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXJlZC01MDAgZm9udC1ib2xkXCI+W+ywqOuLqF08L3NwYW4+fVxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNDAwIHRydW5jYXRlXCI+e2xvZy5sb2NhdGlvbn08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTQwMCB3aGl0ZXNwYWNlLW5vd3JhcCBmbGV4LXNocmluay0wXCI+e2xvZy50aW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTNcIj5cbiAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAn7J2067KIIOuLrCDqsoDspp0nLCB2YWx1ZTogJzIz6rG0JywgaWNvbjogRXllLCBjb2xvcjogJ3RleHQtcHJpbWFyeS01MDAnLCBiZzogJ2JnLXByaW1hcnktNTAnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ+yCrOq4sCDssKjri6gnLCB2YWx1ZTogJzLqsbQnLCBpY29uOiBBbGVydFRyaWFuZ2xlLCBjb2xvcjogJ3RleHQtcmVkLTUwMCcsIGJnOiAnYmctcmVkLTUwJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICfsoIDsnqXrkJwg66qF7ZWoJywgdmFsdWU6ICc46rCcJywgaWNvbjogQm9va21hcmssIGNvbG9yOiAndGV4dC1hbWJlci01MDAnLCBiZzogJ2JnLWFtYmVyLTUwJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICfslYzrprwg7IiY7IugJywgdmFsdWU6ICcxNeqxtCcsIGljb246IEJlbGwsIGNvbG9yOiAndGV4dC1lbWVyYWxkLTYwMCcsIGJnOiAnYmctZW1lcmFsZC01MCcgfSxcbiAgICAgICAgICAgICAgXS5tYXAoKHsgbGFiZWwsIHZhbHVlLCBpY29uOiBJY29uLCBjb2xvciwgYmcgfSkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtsYWJlbH0gY2xhc3NOYW1lPXtgY2FyZCBwLTQgJHtiZ31gfT5cbiAgICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT17YHctNSBoLTUgJHtjb2xvcn0gbWItMmB9IC8+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ibGFjayB0ZXh0LWdyYXktOTAwXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAyZW0nIH19Pnt2YWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNTAwXCI+e2xhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNhcmQgcC01XCI+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwIG1iLTMgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICA8TWFwUGluIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1wcmltYXJ5LTUwMFwiIC8+XG4gICAgICAgICAgICAgICAg7JWI7IusIOq1rOyXrSDshKTsoJVcbiAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWdyYXktNTAwIG1iLTNcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAg7JyE7LmYIOq4sOuwmCDslYjsi6wg6rWs7Jet7J2EIOyEpOygle2VmOuptCDtlbTri7kg7KeA7JetIOyZuCDsoJHqt7wg7IucIOymieyLnCDslYzrprzsnYQg67Cb7Iq164uI64ukXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uTmF2aWdhdGUoJ3NhZmV6b25lJyl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYnRuLXNlY29uZGFyeSB3LWZ1bGwganVzdGlmeS1jZW50ZXIgdGV4dC14c1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8TWFwUGluIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgICAgICDslYjsi6wg6rWs7JetIOq0gOumrO2VmOq4sFxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIDxkaXYgc3R5bGU9e3sgaGVpZ2h0OiAnMTAwcHgnIH19IC8+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvcGFnZXMvTXlQYWdlLnRzeCJ9