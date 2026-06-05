import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/AboutPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/AboutPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useEffect = __vite__cjsImport3_react["useEffect"]; const useRef = __vite__cjsImport3_react["useRef"]; const useState = __vite__cjsImport3_react["useState"];
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Building2,
  ArrowRight,
  Phone,
  Lock,
  Database,
  Globe,
  Users,
  Award,
  Zap,
  Eye,
  FileCheck
} from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const PROBLEM_STATS = [
  { value: "7,500억+", label: "2023년 피싱 피해액", sub: "전년 대비 32% 증가" },
  { value: "18만건", label: "연간 피해 신고", sub: "하루 평균 500건 이상" },
  { value: "96%", label: "사전 예방 가능", sub: "정보 확인만으로도 차단" }
];
const SOLUTION_STEPS = [
  {
    icon: Phone,
    title: "1단계 — 의심 전화 수신",
    desc: "기관·개인 사칭, 대출·투자 권유, 공공기관 위장 전화를 수신합니다.",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-100"
  },
  {
    icon: Database,
    title: "2단계 — 이중 교차 검증",
    desc: "공공데이터(행정안전부·금융위) + VLUE 자체 인증 DB를 동시에 조회합니다.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100"
  },
  {
    icon: Eye,
    title: "3단계 — AI 위험도 분석",
    desc: "패턴 분석 AI가 신고 이력·연관 번호·사업자 정보를 종합해 위험도를 산출합니다.",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-100"
  },
  {
    icon: CheckCircle,
    title: "4단계 — 즉시 판별 결과",
    desc: "안전/주의/위험 3단계 판정을 실시간으로 제공하여 피해를 사전 차단합니다.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100"
  }
];
const TRUST_ITEMS = [
  { icon: Building2, label: "행정안전부 연계", desc: "공공기관 사업자 DB 실시간 연동" },
  { icon: Shield, label: "금융위원회 협력", desc: "금융사기 신고 이력 공유 체계" },
  { icon: Award, label: "ISO 27001 인증", desc: "국제 정보보안 관리체계 인증" },
  { icon: FileCheck, label: "ISMS-P 인증", desc: "개인정보보호 관리체계 인증" },
  { icon: Users, label: "경찰청 MOU", desc: "사이버범죄수사대 데이터 공유" },
  { icon: Globe, label: "인터폴 등재", desc: "국제 사기 DB 교차 연동" }
];
const VISION_CARDS = [
  {
    icon: Lock,
    title: "보안 통합 포털",
    desc: "보이스피싱·스미싱·파밍을 아우르는 국내 유일의 종합 사기 예방 포털로 확장합니다.",
    tag: "2024 로드맵"
  },
  {
    icon: Zap,
    title: "실시간 알림 앱",
    desc: "전화 수신 시 즉시 위험 여부를 팝업으로 알려주는 네이티브 모바일 앱을 출시합니다.",
    tag: "2024 Q3"
  },
  {
    icon: TrendingUp,
    title: "기업 보안 B2B",
    desc: "금융사·통신사·플랫폼 기업 대상 API 기반 실시간 사기 검증 서비스를 제공합니다.",
    tag: "2025 확장"
  }
];
const CHART_DATA = [
  { year: "2019", value: 3209, label: "3,209억" },
  { year: "2020", value: 4023, label: "4,023억" },
  { year: "2021", value: 4876, label: "4,876억" },
  { year: "2022", value: 5694, label: "5,694억" },
  { year: "2023", value: 7500, label: "7,500억+" }
];
const MAX_VALUE = 8e3;
const CHART_H = 220;
const CHART_W = 560;
const PAD_L = 58;
const PAD_R = 24;
const PAD_T = 36;
const PAD_B = 48;
const INNER_W = CHART_W - PAD_L - PAD_R;
const INNER_H = CHART_H - PAD_T - PAD_B;
const Y_TICKS = [0, 2e3, 4e3, 6e3, 8e3];
function yPos(v) {
  return PAD_T + INNER_H - v / MAX_VALUE * INNER_H;
}
function xPos(i) {
  const step = INNER_W / (CHART_DATA.length - 1);
  return PAD_L + i * step;
}
function PhishingChart() {
  _s();
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const linePath = CHART_DATA.map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${animated ? yPos(d.value) : PAD_T + INNER_H}`).join(" ");
  const areaPath = `${linePath} L ${xPos(CHART_DATA.length - 1)} ${PAD_T + INNER_H} L ${xPos(0)} ${PAD_T + INNER_H} Z`;
  return /* @__PURE__ */ jsxDEV("div", { ref, className: "card overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "px-7 pt-7 pb-2 flex items-start justify-between", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-base mb-0.5", children: "연도별 보이스피싱 피해액 추이" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 129,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "단위: 억원 · 출처: 경찰청 사이버수사국" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 130,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 128,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 text-xs text-red-500 font-semibold bg-red-50 border border-red-100 px-2.5 py-1 rounded-full", children: [
        /* @__PURE__ */ jsxDEV(TrendingUp, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 133,
          columnNumber: 11
        }, this),
        "매년 급증"
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 132,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 127,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "px-4 pb-6 overflow-x-auto", children: /* @__PURE__ */ jsxDEV(
      "svg",
      {
        viewBox: `0 0 ${CHART_W} ${CHART_H}`,
        className: "w-full",
        style: { minWidth: "320px", maxHeight: "260px" },
        children: [
          /* @__PURE__ */ jsxDEV("defs", { children: [
            /* @__PURE__ */ jsxDEV("linearGradient", { id: "areaGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
              /* @__PURE__ */ jsxDEV("stop", { offset: "0%", stopColor: "#3182F6", stopOpacity: "0.18" }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 146,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("stop", { offset: "100%", stopColor: "#3182F6", stopOpacity: "0" }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 147,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 145,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("linearGradient", { id: "lineGrad", x1: "0", y1: "0", x2: "1", y2: "0", children: [
              /* @__PURE__ */ jsxDEV("stop", { offset: "0%", stopColor: "#60A5FA" }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 150,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("stop", { offset: "100%", stopColor: "#EF4444" }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 151,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 149,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("filter", { id: "glow", children: [
              /* @__PURE__ */ jsxDEV("feGaussianBlur", { stdDeviation: "2.5", result: "blur" }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 154,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("feMerge", { children: [
                /* @__PURE__ */ jsxDEV("feMergeNode", { in: "blur" }, void 0, false, {
                  fileName: "/home/project/src/pages/AboutPage.tsx",
                  lineNumber: 155,
                  columnNumber: 24
                }, this),
                /* @__PURE__ */ jsxDEV("feMergeNode", { in: "SourceGraphic" }, void 0, false, {
                  fileName: "/home/project/src/pages/AboutPage.tsx",
                  lineNumber: 155,
                  columnNumber: 49
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 155,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 153,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 144,
            columnNumber: 11
          }, this),
          Y_TICKS.map(
            (tick) => /* @__PURE__ */ jsxDEV("g", { children: [
              /* @__PURE__ */ jsxDEV(
                "line",
                {
                  x1: PAD_L,
                  y1: yPos(tick),
                  x2: CHART_W - PAD_R,
                  y2: yPos(tick),
                  stroke: "#F1F5F9",
                  strokeWidth: "1.5"
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/pages/AboutPage.tsx",
                  lineNumber: 161,
                  columnNumber: 15
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("text", { x: PAD_L - 8, y: yPos(tick) + 4, textAnchor: "end", fontSize: "10", fill: "#94A3B8", fontFamily: "sans-serif", children: tick === 0 ? "0" : `${tick / 1e3}천` }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 165,
                columnNumber: 15
              }, this)
            ] }, tick, true, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 160,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV(
            "path",
            {
              d: areaPath,
              fill: "url(#areaGrad)",
              style: { transition: animated ? "d 1s ease-out" : "none" }
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 171,
              columnNumber: 11
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "path",
            {
              d: linePath,
              fill: "none",
              stroke: "url(#lineGrad)",
              strokeWidth: "3",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              filter: "url(#glow)",
              style: { transition: animated ? "d 1s ease-out" : "none" }
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 177,
              columnNumber: 11
            },
            this
          ),
          CHART_DATA.map((d, i) => {
            const cx = xPos(i);
            const cy = animated ? yPos(d.value) : PAD_T + INNER_H;
            const isLast = i === CHART_DATA.length - 1;
            return /* @__PURE__ */ jsxDEV("g", { style: { transition: animated ? `all 1s ease-out ${i * 0.1}s` : "none" }, children: [
              /* @__PURE__ */ jsxDEV("circle", { cx, cy, r: isLast ? 7 : 5, fill: "white", stroke: isLast ? "#EF4444" : "#3182F6", strokeWidth: isLast ? 2.5 : 2 }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 194,
                columnNumber: 17
              }, this),
              isLast && /* @__PURE__ */ jsxDEV("circle", { cx, cy, r: 12, fill: "#EF444420" }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 195,
                columnNumber: 28
              }, this),
              /* @__PURE__ */ jsxDEV(
                "text",
                {
                  x: cx,
                  y: cy - (isLast ? 18 : 14),
                  textAnchor: "middle",
                  fontSize: isLast ? "11" : "10",
                  fontWeight: isLast ? "800" : "600",
                  fill: isLast ? "#EF4444" : "#3182F6",
                  fontFamily: "sans-serif",
                  children: d.label
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/pages/AboutPage.tsx",
                  lineNumber: 196,
                  columnNumber: 17
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("text", { x: cx, y: PAD_T + INNER_H + 16, textAnchor: "middle", fontSize: "11", fill: "#64748B", fontWeight: "600", fontFamily: "sans-serif", children: d.year }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 207,
                columnNumber: 17
              }, this)
            ] }, d.year, true, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 193,
              columnNumber: 15
            }, this);
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 139,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 138,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "mx-7 mb-7 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-4 h-4 text-red-500" }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 218,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 217,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-red-700 text-xs leading-relaxed font-medium", children: [
        "2019년 대비 ",
        /* @__PURE__ */ jsxDEV("strong", { children: "2.3배" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 221,
          columnNumber: 20
        }, this),
        " 증가 · 2023년 피해액 ",
        /* @__PURE__ */ jsxDEV("strong", { children: "7,500억원+" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 221,
          columnNumber: 57
        }, this),
        " 돌파 · 전년 대비 ",
        /* @__PURE__ */ jsxDEV("strong", { children: "32% 급증" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 221,
          columnNumber: 94
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 220,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 216,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/AboutPage.tsx",
    lineNumber: 126,
    columnNumber: 5
  }, this);
}
_s(PhishingChart, "KIAlEinPbd/zIBu4cFRezGsG7Uo=");
_c = PhishingChart;
function SectionBadge({ children }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-xs font-semibold", children }, void 0, false, {
    fileName: "/home/project/src/pages/AboutPage.tsx",
    lineNumber: 230,
    columnNumber: 5
  }, this);
}
_c2 = SectionBadge;
export default function AboutPage() {
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-16", children: [
    /* @__PURE__ */ jsxDEV("section", { className: "relative py-20 px-4 text-center overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-gradient-to-b from-primary-50/60 to-transparent pointer-events-none" }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 242,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "relative z-10 max-w-3xl mx-auto", children: [
        /* @__PURE__ */ jsxDEV(SectionBadge, { children: [
          /* @__PURE__ */ jsxDEV(Shield, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 245,
            columnNumber: 13
          }, this),
          "VLUE 사업 소개서"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 244,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("h1", { className: "text-4xl sm:text-5xl font-black text-gray-900 mb-5", style: { letterSpacing: "-0.035em", lineHeight: 1.2 }, children: [
          "대한민국 보이스피싱,",
          /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 249,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-primary-500", children: "VLUE가 끊어냅니다" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 250,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 248,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-lg leading-relaxed max-w-xl mx-auto", style: { wordBreak: "keep-all" }, children: "공공데이터와 자체 인증 DB의 이중 교차 검증으로 사기 여부를 실시간 판별하는 국내 유일의 보이스피싱 예방 통합 플랫폼입니다." }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 252,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 243,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 241,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-16 px-4", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsxDEV(SectionBadge, { children: [
          /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 264,
            columnNumber: 15
          }, this),
          "Problem"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 263,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-black text-gray-900 mb-3", style: { letterSpacing: "-0.03em" }, children: "보이스피싱은 지금도 진화 중입니다" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 267,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-base max-w-lg mx-auto", style: { wordBreak: "keep-all" }, children: "AI 딥페이크·스미싱·기관 사칭 수법이 고도화되며 피해 규모는 매년 급증하고 있습니다." }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 270,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 262,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10", children: PROBLEM_STATS.map(
        ({ value, label, sub }) => /* @__PURE__ */ jsxDEV("div", { className: "card p-7 text-center", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-4xl font-black text-primary-500 mb-2", style: { letterSpacing: "-0.03em" }, children: value }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 278,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-gray-900 font-bold text-sm mb-1", children: label }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 279,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-gray-400 text-xs", children: sub }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 280,
            columnNumber: 17
          }, this)
        ] }, label, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 277,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 275,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(PhishingChart, {}, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 285,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 261,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 260,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-16 px-4 bg-white/60", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsxDEV(SectionBadge, { children: [
          /* @__PURE__ */ jsxDEV(Zap, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 294,
            columnNumber: 15
          }, this),
          "Solution"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 293,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-black text-gray-900 mb-3", style: { letterSpacing: "-0.03em" }, children: "이중 검증 시스템으로 즉시 차단" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 297,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-base max-w-lg mx-auto", style: { wordBreak: "keep-all" }, children: "단순 신고 DB 조회를 넘어, 공공데이터와 AI 분석을 결합한 4단계 검증 파이프라인을 제공합니다." }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 300,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 292,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10", children: SOLUTION_STEPS.map(
        ({ icon: Icon, title, desc, color, bg, border }) => /* @__PURE__ */ jsxDEV("div", { className: `card p-6 border ${border}`, children: [
          /* @__PURE__ */ jsxDEV("div", { className: `w-11 h-11 rounded-2xl ${bg} flex items-center justify-center mb-4`, children: /* @__PURE__ */ jsxDEV(Icon, { className: `w-5 h-5 ${color}` }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 309,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 308,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm mb-2", children: title }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 311,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs leading-relaxed", children: desc }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 312,
            columnNumber: 17
          }, this)
        ] }, title, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 307,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 305,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "card p-8", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm mb-6 text-center", children: "VLUE 이중 검증 아키텍처" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 318,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 flex-wrap", children: [
          { label: "사용자 쿼리", sub: "번호·기관명", bg: "bg-gray-100", text: "text-gray-700" },
          null,
          { label: "공공 DB", sub: "행안부·금융위", bg: "bg-blue-50", text: "text-blue-700" },
          null,
          { label: "VLUE DB", sub: "인증·신고이력", bg: "bg-primary-50", text: "text-primary-700" },
          null,
          { label: "AI 분석", sub: "패턴·위험도", bg: "bg-amber-50", text: "text-amber-700" },
          null,
          { label: "판별 결과", sub: "안전/주의/위험", bg: "bg-emerald-50", text: "text-emerald-700" }
        ].map(
          (item, i) => item === null ? /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4 text-gray-300 rotate-90 sm:rotate-0 flex-shrink-0 mx-1" }, i, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 332,
            columnNumber: 15
          }, this) : /* @__PURE__ */ jsxDEV("div", { className: `${item.bg} rounded-2xl px-4 py-3 text-center flex-shrink-0`, children: [
            /* @__PURE__ */ jsxDEV("div", { className: `text-xs font-bold ${item.text}`, children: item.label }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 335,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-gray-400 text-xs mt-0.5", children: item.sub }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 336,
              columnNumber: 21
            }, this)
          ] }, item.label, true, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 334,
            columnNumber: 15
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 319,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 317,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 291,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 290,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-16 px-4", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsxDEV(SectionBadge, { children: [
          /* @__PURE__ */ jsxDEV(Award, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 350,
            columnNumber: 15
          }, this),
          "Trust"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 349,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-black text-gray-900 mb-3", style: { letterSpacing: "-0.03em" }, children: "신뢰할 수 있는 기관과 함께합니다" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 353,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-base max-w-lg mx-auto", style: { wordBreak: "keep-all" }, children: "정부 기관 MOU 체결 및 국제 인증을 통해 검증된 데이터 신뢰성을 보장합니다." }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 356,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 348,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4", children: TRUST_ITEMS.map(
        ({ icon: Icon, label, desc }) => /* @__PURE__ */ jsxDEV("div", { className: "card p-5 flex items-start gap-3.5 hover:border-primary-200 group", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-2xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors", children: /* @__PURE__ */ jsxDEV(Icon, { className: "w-5 h-5 text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 365,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 364,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-gray-900 font-bold text-sm mb-0.5", children: label }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 368,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-gray-400 text-xs leading-relaxed", children: desc }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 369,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 367,
            columnNumber: 17
          }, this)
        ] }, label, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 363,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 361,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 347,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 346,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-16 px-4 bg-white/60", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsxDEV(SectionBadge, { children: [
          /* @__PURE__ */ jsxDEV(TrendingUp, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 382,
            columnNumber: 15
          }, this),
          "Vision"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 381,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "text-3xl font-black text-gray-900 mb-3", style: { letterSpacing: "-0.03em" }, children: "대한민국 No.1 보안 포털을 향해" }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 385,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-base max-w-lg mx-auto", style: { wordBreak: "keep-all" }, children: "보이스피싱 예방을 시작으로, 디지털 사기 전반을 아우르는 종합 보안 플랫폼으로 성장합니다." }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 388,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 380,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10", children: VISION_CARDS.map(
        ({ icon: Icon, title, desc, tag }) => /* @__PURE__ */ jsxDEV("div", { className: "card p-6 relative overflow-hidden group hover:border-primary-200", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "absolute top-4 right-4 text-xs font-semibold text-primary-500 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full", children: tag }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 396,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "w-11 h-11 rounded-2xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center mb-4 transition-colors", children: /* @__PURE__ */ jsxDEV(Icon, { className: "w-5 h-5 text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 400,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 399,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-sm mb-2", children: title }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 402,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs leading-relaxed", children: desc }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 403,
            columnNumber: 17
          }, this)
        ] }, title, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 395,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 393,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "card p-8 bg-gradient-to-br from-primary-50/60 to-white", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row items-center gap-8", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 text-center sm:text-left", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs font-semibold text-primary-600 mb-2", children: "국내 사이버보안 시장 규모" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 411,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-5xl font-black text-gray-900 mb-2", style: { letterSpacing: "-0.04em" }, children: [
            "12.4",
            /* @__PURE__ */ jsxDEV("span", { className: "text-2xl text-primary-500", children: "조원" }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 413,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 412,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-gray-400 text-sm", children: "2027년 예상 규모 · CAGR 14.2%" }, void 0, false, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 415,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 410,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 space-y-3 w-full", children: [
          { label: "보이스피싱 예방 솔루션", pct: 68, color: "bg-primary-500" },
          { label: "기업 보안 B2B API", pct: 45, color: "bg-blue-400" },
          { label: "모바일 보안 앱", pct: 30, color: "bg-sky-300" }
        ].map(
          ({ label, pct, color }) => /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-xs mb-1", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "text-gray-600 font-medium", children: label }, void 0, false, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 425,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-gray-400", children: [
                pct,
                "%"
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/AboutPage.tsx",
                lineNumber: 426,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 424,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "h-2.5 bg-gray-100 rounded-full overflow-hidden", children: /* @__PURE__ */ jsxDEV("div", { className: `h-full ${color} rounded-full`, style: { width: `${pct}%` } }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 429,
              columnNumber: 23
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 428,
              columnNumber: 21
            }, this)
          ] }, label, true, {
            fileName: "/home/project/src/pages/AboutPage.tsx",
            lineNumber: 423,
            columnNumber: 17
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 417,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 409,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 408,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 379,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 378,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-20 px-4", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-2xl mx-auto text-center", children: /* @__PURE__ */ jsxDEV("div", { className: "card p-10 bg-gradient-to-br from-primary-500 to-primary-600 border-0 shadow-card-hover", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-5", children: /* @__PURE__ */ jsxDEV(Users, { className: "w-7 h-7 text-white" }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 444,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 443,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-black text-white mb-3", style: { letterSpacing: "-0.03em" }, children: "함께 안전한 대한민국을 만들어가요" }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 446,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-primary-100 text-sm leading-relaxed mb-7", style: { wordBreak: "keep-all" }, children: "금융기관, 통신사, 공공기관, 스타트업 등 다양한 파트너와의 제휴 및 협력을 환영합니다. VLUE와 함께 보이스피싱 Zero를 실현해 주세요." }, void 0, false, {
        fileName: "/home/project/src/pages/AboutPage.tsx",
        lineNumber: 449,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(
        "a",
        {
          href: "mailto:partner@vlue.kr",
          className: "inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary-600 font-bold text-sm rounded-2xl hover:bg-primary-50 transition-all duration-150 shadow-soft",
          children: [
            /* @__PURE__ */ jsxDEV(Users, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 457,
              columnNumber: 15
            }, this),
            "제휴 및 협력 제안",
            /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/AboutPage.tsx",
              lineNumber: 459,
              columnNumber: 15
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/AboutPage.tsx",
          lineNumber: 453,
          columnNumber: 13
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 442,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 441,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/AboutPage.tsx",
      lineNumber: 440,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/AboutPage.tsx",
    lineNumber: 238,
    columnNumber: 5
  }, this);
}
_c3 = AboutPage;
var _c, _c2, _c3;
$RefreshReg$(_c, "PhishingChart");
$RefreshReg$(_c2, "SectionBadge");
$RefreshReg$(_c3, "AboutPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/AboutPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/AboutPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0lVOzJCQWhJVjtBQUFvQkEsTUFBTSxjQUFVLE9BQVEsc0JBQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFDbkQ7QUFBQSxFQUNFQztBQUFBQSxFQUFRQztBQUFBQSxFQUFlQztBQUFBQSxFQUFhQztBQUFBQSxFQUFZQztBQUFBQSxFQUNoREM7QUFBQUEsRUFBWUM7QUFBQUEsRUFBT0M7QUFBQUEsRUFBTUM7QUFBQUEsRUFBVUM7QUFBQUEsRUFBT0M7QUFBQUEsRUFBT0M7QUFBQUEsRUFDakRDO0FBQUFBLEVBQUtDO0FBQUFBLEVBQUtDO0FBQUFBLE9BQ0w7QUFFUCxNQUFNQyxnQkFBZ0I7QUFBQSxFQUNwQixFQUFFQyxPQUFPLFdBQVdDLE9BQU8sZ0JBQWdCQyxLQUFLLGVBQWU7QUFBQSxFQUMvRCxFQUFFRixPQUFPLFFBQVFDLE9BQU8sWUFBWUMsS0FBSyxnQkFBZ0I7QUFBQSxFQUN6RCxFQUFFRixPQUFPLE9BQU9DLE9BQU8sWUFBWUMsS0FBSyxlQUFlO0FBQUM7QUFHMUQsTUFBTUMsaUJBQWlCO0FBQUEsRUFDckI7QUFBQSxJQUNFQyxNQUFNZDtBQUFBQSxJQUNOZSxPQUFPO0FBQUEsSUFDUEMsTUFBTTtBQUFBLElBQ05DLE9BQU87QUFBQSxJQUNQQyxJQUFJO0FBQUEsSUFDSkMsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBO0FBQUEsSUFDRUwsTUFBTVo7QUFBQUEsSUFDTmEsT0FBTztBQUFBLElBQ1BDLE1BQU07QUFBQSxJQUNOQyxPQUFPO0FBQUEsSUFDUEMsSUFBSTtBQUFBLElBQ0pDLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQTtBQUFBLElBQ0VMLE1BQU1QO0FBQUFBLElBQ05RLE9BQU87QUFBQSxJQUNQQyxNQUFNO0FBQUEsSUFDTkMsT0FBTztBQUFBLElBQ1BDLElBQUk7QUFBQSxJQUNKQyxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0E7QUFBQSxJQUNFTCxNQUFNbEI7QUFBQUEsSUFDTm1CLE9BQU87QUFBQSxJQUNQQyxNQUFNO0FBQUEsSUFDTkMsT0FBTztBQUFBLElBQ1BDLElBQUk7QUFBQSxJQUNKQyxRQUFRO0FBQUEsRUFDVjtBQUFDO0FBR0gsTUFBTUMsY0FBYztBQUFBLEVBQ2xCLEVBQUVOLE1BQU1oQixXQUFXYSxPQUFPLFlBQVlLLE1BQU0scUJBQXFCO0FBQUEsRUFDakUsRUFBRUYsTUFBTXBCLFFBQVFpQixPQUFPLFlBQVlLLE1BQU0sbUJBQW1CO0FBQUEsRUFDNUQsRUFBRUYsTUFBTVQsT0FBT00sT0FBTyxnQkFBZ0JLLE1BQU0sa0JBQWtCO0FBQUEsRUFDOUQsRUFBRUYsTUFBTU4sV0FBV0csT0FBTyxhQUFhSyxNQUFNLGlCQUFpQjtBQUFBLEVBQzlELEVBQUVGLE1BQU1WLE9BQU9PLE9BQU8sV0FBV0ssTUFBTSxrQkFBa0I7QUFBQSxFQUN6RCxFQUFFRixNQUFNWCxPQUFPUSxPQUFPLFVBQVVLLE1BQU0saUJBQWlCO0FBQUM7QUFHMUQsTUFBTUssZUFBZTtBQUFBLEVBQ25CO0FBQUEsSUFDRVAsTUFBTWI7QUFBQUEsSUFDTmMsT0FBTztBQUFBLElBQ1BDLE1BQU07QUFBQSxJQUNOTSxLQUFLO0FBQUEsRUFDUDtBQUFBLEVBQ0E7QUFBQSxJQUNFUixNQUFNUjtBQUFBQSxJQUNOUyxPQUFPO0FBQUEsSUFDUEMsTUFBTTtBQUFBLElBQ05NLEtBQUs7QUFBQSxFQUNQO0FBQUEsRUFDQTtBQUFBLElBQ0VSLE1BQU1qQjtBQUFBQSxJQUNOa0IsT0FBTztBQUFBLElBQ1BDLE1BQU07QUFBQSxJQUNOTSxLQUFLO0FBQUEsRUFDUDtBQUFDO0FBR0gsTUFBTUMsYUFBYTtBQUFBLEVBQ2pCLEVBQUVDLE1BQU0sUUFBUWQsT0FBTyxNQUFNQyxPQUFPLFNBQVM7QUFBQSxFQUM3QyxFQUFFYSxNQUFNLFFBQVFkLE9BQU8sTUFBTUMsT0FBTyxTQUFTO0FBQUEsRUFDN0MsRUFBRWEsTUFBTSxRQUFRZCxPQUFPLE1BQU1DLE9BQU8sU0FBUztBQUFBLEVBQzdDLEVBQUVhLE1BQU0sUUFBUWQsT0FBTyxNQUFNQyxPQUFPLFNBQVM7QUFBQSxFQUM3QyxFQUFFYSxNQUFNLFFBQVFkLE9BQU8sTUFBTUMsT0FBTyxVQUFVO0FBQUM7QUFHakQsTUFBTWMsWUFBWTtBQUNsQixNQUFNQyxVQUFVO0FBQ2hCLE1BQU1DLFVBQVU7QUFDaEIsTUFBTUMsUUFBUTtBQUNkLE1BQU1DLFFBQVE7QUFDZCxNQUFNQyxRQUFRO0FBQ2QsTUFBTUMsUUFBUTtBQUNkLE1BQU1DLFVBQVVMLFVBQVVDLFFBQVFDO0FBQ2xDLE1BQU1JLFVBQVVQLFVBQVVJLFFBQVFDO0FBQ2xDLE1BQU1HLFVBQVUsQ0FBQyxHQUFHLEtBQU0sS0FBTSxLQUFNLEdBQUk7QUFFMUMsU0FBU0MsS0FBS0MsR0FBVztBQUN2QixTQUFPTixRQUFRRyxVQUFXRyxJQUFJWCxZQUFhUTtBQUM3QztBQUVBLFNBQVNJLEtBQUtDLEdBQVc7QUFDdkIsUUFBTUMsT0FBT1AsV0FBV1QsV0FBV2lCLFNBQVM7QUFDNUMsU0FBT1osUUFBUVUsSUFBSUM7QUFDckI7QUFFQSxTQUFTRSxnQkFBZ0I7QUFBQUMsS0FBQTtBQUN2QixRQUFNLENBQUNDLFVBQVVDLFdBQVcsSUFBSUMsU0FBUyxLQUFLO0FBQzlDLFFBQU1DLE1BQU1yRCxPQUF1QixJQUFJO0FBRXZDc0QsWUFBVSxNQUFNO0FBQ2QsVUFBTUMsS0FBS0YsSUFBSUc7QUFDZixRQUFJLENBQUNELEdBQUk7QUFDVCxVQUFNRSxNQUFNLElBQUlDO0FBQUFBLE1BQ2QsQ0FBQyxDQUFDQyxLQUFLLE1BQU07QUFBRSxZQUFJQSxNQUFNQyxnQkFBZ0I7QUFBRVQsc0JBQVksSUFBSTtBQUFHTSxjQUFJSSxXQUFXO0FBQUEsUUFBRztBQUFBLE1BQUU7QUFBQSxNQUNsRixFQUFFQyxXQUFXLElBQUk7QUFBQSxJQUNuQjtBQUNBTCxRQUFJTSxRQUFRUixFQUFFO0FBQ2QsV0FBTyxNQUFNRSxJQUFJSSxXQUFXO0FBQUEsRUFDOUIsR0FBRyxFQUFFO0FBRUwsUUFBTUcsV0FBV2xDLFdBQVdtQyxJQUFJLENBQUNDLEdBQUdyQixNQUFNLEdBQUdBLE1BQU0sSUFBSSxNQUFNLEdBQUcsSUFBSUQsS0FBS0MsQ0FBQyxDQUFDLElBQUlLLFdBQVdSLEtBQUt3QixFQUFFakQsS0FBSyxJQUFJb0IsUUFBUUcsT0FBTyxFQUFFLEVBQUUyQixLQUFLLEdBQUc7QUFDckksUUFBTUMsV0FBVyxHQUFHSixRQUFRLE1BQU1wQixLQUFLZCxXQUFXaUIsU0FBUyxDQUFDLENBQUMsSUFBSVYsUUFBUUcsT0FBTyxNQUFNSSxLQUFLLENBQUMsQ0FBQyxJQUFJUCxRQUFRRyxPQUFPO0FBRWhILFNBQ0UsdUJBQUMsU0FBSSxLQUFVLFdBQVUsd0JBQ3ZCO0FBQUEsMkJBQUMsU0FBSSxXQUFVLG1EQUNiO0FBQUEsNkJBQUMsU0FDQztBQUFBLCtCQUFDLFFBQUcsV0FBVSw0Q0FBMkMsZ0NBQXpEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBeUU7QUFBQSxRQUN6RSx1QkFBQyxPQUFFLFdBQVUseUJBQXdCLHVDQUFyQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTREO0FBQUEsV0FGOUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUdBO0FBQUEsTUFDQSx1QkFBQyxTQUFJLFdBQVUseUhBQ2I7QUFBQSwrQkFBQyxjQUFXLFdBQVUsaUJBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBbUM7QUFBQTtBQUFBLFdBRHJDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFHQTtBQUFBLFNBUkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQVNBO0FBQUEsSUFFQSx1QkFBQyxTQUFJLFdBQVUsNkJBQ2I7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLFNBQVMsT0FBT04sT0FBTyxJQUFJRCxPQUFPO0FBQUEsUUFDbEMsV0FBVTtBQUFBLFFBQ1YsT0FBTyxFQUFFb0MsVUFBVSxTQUFTQyxXQUFXLFFBQVE7QUFBQSxRQUUvQztBQUFBLGlDQUFDLFVBQ0M7QUFBQSxtQ0FBQyxvQkFBZSxJQUFHLFlBQVcsSUFBRyxLQUFJLElBQUcsS0FBSSxJQUFHLEtBQUksSUFBRyxLQUNwRDtBQUFBLHFDQUFDLFVBQUssUUFBTyxNQUFLLFdBQVUsV0FBVSxhQUFZLFVBQWxEO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXdEO0FBQUEsY0FDeEQsdUJBQUMsVUFBSyxRQUFPLFFBQU8sV0FBVSxXQUFVLGFBQVksT0FBcEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBdUQ7QUFBQSxpQkFGekQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFHQTtBQUFBLFlBQ0EsdUJBQUMsb0JBQWUsSUFBRyxZQUFXLElBQUcsS0FBSSxJQUFHLEtBQUksSUFBRyxLQUFJLElBQUcsS0FDcEQ7QUFBQSxxQ0FBQyxVQUFLLFFBQU8sTUFBSyxXQUFVLGFBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXFDO0FBQUEsY0FDckMsdUJBQUMsVUFBSyxRQUFPLFFBQU8sV0FBVSxhQUE5QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF1QztBQUFBLGlCQUZ6QztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUdBO0FBQUEsWUFDQSx1QkFBQyxZQUFPLElBQUcsUUFDVDtBQUFBLHFDQUFDLG9CQUFlLGNBQWEsT0FBTSxRQUFPLFVBQTFDO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWdEO0FBQUEsY0FDaEQsdUJBQUMsYUFBUTtBQUFBLHVDQUFDLGlCQUFZLElBQUcsVUFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBc0I7QUFBQSxnQkFBRyx1QkFBQyxpQkFBWSxJQUFHLG1CQUFoQjtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUErQjtBQUFBLG1CQUFqRTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFvRTtBQUFBLGlCQUZ0RTtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUdBO0FBQUEsZUFaRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQWFBO0FBQUEsVUFFQzdCLFFBQVF3QjtBQUFBQSxZQUFJLENBQUNNLFNBQ1osdUJBQUMsT0FDQztBQUFBO0FBQUEsZ0JBQUM7QUFBQTtBQUFBLGtCQUNDLElBQUlwQztBQUFBQSxrQkFBTyxJQUFJTyxLQUFLNkIsSUFBSTtBQUFBLGtCQUFHLElBQUlyQyxVQUFVRTtBQUFBQSxrQkFBTyxJQUFJTSxLQUFLNkIsSUFBSTtBQUFBLGtCQUM3RCxRQUFPO0FBQUEsa0JBQVUsYUFBWTtBQUFBO0FBQUEsZ0JBRi9CO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxjQUVvQztBQUFBLGNBRXBDLHVCQUFDLFVBQUssR0FBR3BDLFFBQVEsR0FBRyxHQUFHTyxLQUFLNkIsSUFBSSxJQUFJLEdBQUcsWUFBVyxPQUFNLFVBQVMsTUFBSyxNQUFLLFdBQVUsWUFBVyxjQUM3RkEsbUJBQVMsSUFBSSxNQUFNLEdBQUdBLE9BQU8sR0FBSSxPQURwQztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUVBO0FBQUEsaUJBUE1BLE1BQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFRQTtBQUFBLFVBQ0Q7QUFBQSxVQUVEO0FBQUEsWUFBQztBQUFBO0FBQUEsY0FDQyxHQUFHSDtBQUFBQSxjQUNILE1BQUs7QUFBQSxjQUNMLE9BQU8sRUFBRUksWUFBWXRCLFdBQVcsa0JBQWtCLE9BQU87QUFBQTtBQUFBLFlBSDNEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQUc2RDtBQUFBLFVBRzdEO0FBQUEsWUFBQztBQUFBO0FBQUEsY0FDQyxHQUFHYztBQUFBQSxjQUNILE1BQUs7QUFBQSxjQUNMLFFBQU87QUFBQSxjQUNQLGFBQVk7QUFBQSxjQUNaLGVBQWM7QUFBQSxjQUNkLGdCQUFlO0FBQUEsY0FDZixRQUFPO0FBQUEsY0FDUCxPQUFPLEVBQUVRLFlBQVl0QixXQUFXLGtCQUFrQixPQUFPO0FBQUE7QUFBQSxZQVIzRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFRNkQ7QUFBQSxVQUc1RHBCLFdBQVdtQyxJQUFJLENBQUNDLEdBQUdyQixNQUFNO0FBQ3hCLGtCQUFNNEIsS0FBSzdCLEtBQUtDLENBQUM7QUFDakIsa0JBQU02QixLQUFLeEIsV0FBV1IsS0FBS3dCLEVBQUVqRCxLQUFLLElBQUlvQixRQUFRRztBQUM5QyxrQkFBTW1DLFNBQVM5QixNQUFNZixXQUFXaUIsU0FBUztBQUN6QyxtQkFDRSx1QkFBQyxPQUFlLE9BQU8sRUFBRXlCLFlBQVl0QixXQUFXLG1CQUFtQkwsSUFBSSxHQUFHLE1BQU0sT0FBTyxHQUNyRjtBQUFBLHFDQUFDLFlBQU8sSUFBUSxJQUFRLEdBQUc4QixTQUFTLElBQUksR0FBRyxNQUFLLFNBQVEsUUFBUUEsU0FBUyxZQUFZLFdBQVcsYUFBYUEsU0FBUyxNQUFNLEtBQTVIO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQThIO0FBQUEsY0FDN0hBLFVBQVUsdUJBQUMsWUFBTyxJQUFRLElBQVEsR0FBRyxJQUFJLE1BQUssZUFBcEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBK0M7QUFBQSxjQUMxRDtBQUFBLGdCQUFDO0FBQUE7QUFBQSxrQkFDQyxHQUFHRjtBQUFBQSxrQkFDSCxHQUFHQyxNQUFNQyxTQUFTLEtBQUs7QUFBQSxrQkFDdkIsWUFBVztBQUFBLGtCQUNYLFVBQVVBLFNBQVMsT0FBTztBQUFBLGtCQUMxQixZQUFZQSxTQUFTLFFBQVE7QUFBQSxrQkFDN0IsTUFBTUEsU0FBUyxZQUFZO0FBQUEsa0JBQzNCLFlBQVc7QUFBQSxrQkFFVlQsWUFBRWhEO0FBQUFBO0FBQUFBLGdCQVRMO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxjQVVBO0FBQUEsY0FDQSx1QkFBQyxVQUFLLEdBQUd1RCxJQUFJLEdBQUdwQyxRQUFRRyxVQUFVLElBQUksWUFBVyxVQUFTLFVBQVMsTUFBSyxNQUFLLFdBQVUsWUFBVyxPQUFNLFlBQVcsY0FDaEgwQixZQUFFbkMsUUFETDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUVBO0FBQUEsaUJBaEJNbUMsRUFBRW5DLE1BQVY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFpQkE7QUFBQSxVQUVKLENBQUM7QUFBQTtBQUFBO0FBQUEsTUF6RUg7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBMEVBLEtBM0VGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0E0RUE7QUFBQSxJQUVBLHVCQUFDLFNBQUksV0FBVSxxRkFDYjtBQUFBLDZCQUFDLFNBQUksV0FBVSxnRkFDYixpQ0FBQyxpQkFBYyxXQUFVLDBCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQStDLEtBRGpEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFFQTtBQUFBLE1BQ0EsdUJBQUMsT0FBRSxXQUFVLG9EQUFrRDtBQUFBO0FBQUEsUUFDcEQsdUJBQUMsWUFBTyxvQkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQVk7QUFBQSxRQUFTO0FBQUEsUUFBZ0IsdUJBQUMsWUFBTyx3QkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWdCO0FBQUEsUUFBUztBQUFBLFFBQVksdUJBQUMsWUFBTyxzQkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWM7QUFBQSxXQURuRztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxTQU5GO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FPQTtBQUFBLE9BakdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FrR0E7QUFFSjtBQUFDa0IsR0F2SFFELGVBQWE7QUFBQTRCLEtBQWI1QjtBQXlIVCxTQUFTNkIsYUFBYSxFQUFFQyxTQUF3QyxHQUFHO0FBQ2pFLFNBQ0UsdUJBQUMsU0FBSSxXQUFVLCtJQUNaQSxZQURIO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FFQTtBQUVKO0FBQUNDLE1BTlFGO0FBUVQsd0JBQXdCRyxZQUFZO0FBQ2xDLFNBQ0UsdUJBQUMsVUFBSyxXQUFVLG1DQUdkO0FBQUEsMkJBQUMsYUFBUSxXQUFVLG1EQUNqQjtBQUFBLDZCQUFDLFNBQUksV0FBVSw2RkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXdHO0FBQUEsTUFDeEcsdUJBQUMsU0FBSSxXQUFVLG1DQUNiO0FBQUEsK0JBQUMsZ0JBQ0M7QUFBQSxpQ0FBQyxVQUFPLFdBQVUsaUJBQWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStCO0FBQUE7QUFBQSxhQURqQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBR0E7QUFBQSxRQUNBLHVCQUFDLFFBQUcsV0FBVSxzREFBcUQsT0FBTyxFQUFFQyxlQUFlLFlBQVlDLFlBQVksSUFBSSxHQUFFO0FBQUE7QUFBQSxVQUM1Ryx1QkFBQyxVQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQUc7QUFBQSxVQUNkLHVCQUFDLFVBQUssV0FBVSxvQkFBbUIsMkJBQW5DO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQThDO0FBQUEsYUFGaEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUdBO0FBQUEsUUFDQSx1QkFBQyxPQUFFLFdBQVUsMERBQXlELE9BQU8sRUFBRUMsV0FBVyxXQUFXLEdBQUUsc0ZBQXZHO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFHQTtBQUFBLFdBWkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWFBO0FBQUEsU0FmRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBZ0JBO0FBQUEsSUFHQSx1QkFBQyxhQUFRLFdBQVUsY0FDakIsaUNBQUMsU0FBSSxXQUFVLHFCQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHFCQUNiO0FBQUEsK0JBQUMsZ0JBQ0M7QUFBQSxpQ0FBQyxpQkFBYyxXQUFVLGlCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFzQztBQUFBO0FBQUEsYUFEeEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUdBO0FBQUEsUUFDQSx1QkFBQyxRQUFHLFdBQVUsMENBQXlDLE9BQU8sRUFBRUYsZUFBZSxVQUFVLEdBQUUsa0NBQTNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFFBQ0EsdUJBQUMsT0FBRSxXQUFVLDRDQUEyQyxPQUFPLEVBQUVFLFdBQVcsV0FBVyxHQUFFLGdFQUF6RjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQVZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFXQTtBQUFBLE1BRUEsdUJBQUMsU0FBSSxXQUFVLCtDQUNabkUsd0JBQWNpRDtBQUFBQSxRQUFJLENBQUMsRUFBRWhELE9BQU9DLE9BQU9DLElBQUksTUFDdEMsdUJBQUMsU0FBZ0IsV0FBVSx3QkFDekI7QUFBQSxpQ0FBQyxTQUFJLFdBQVUsNkNBQTRDLE9BQU8sRUFBRThELGVBQWUsVUFBVSxHQUFJaEUsbUJBQWpHO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXVHO0FBQUEsVUFDdkcsdUJBQUMsU0FBSSxXQUFVLHdDQUF3Q0MsbUJBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTZEO0FBQUEsVUFDN0QsdUJBQUMsU0FBSSxXQUFVLHlCQUF5QkMsaUJBQXhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRDO0FBQUEsYUFIcENELE9BQVY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUlBO0FBQUEsTUFDRCxLQVBIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFRQTtBQUFBLE1BRUEsdUJBQUMsbUJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFjO0FBQUEsU0F4QmhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0F5QkEsS0ExQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQTJCQTtBQUFBLElBR0EsdUJBQUMsYUFBUSxXQUFVLDBCQUNqQixpQ0FBQyxTQUFJLFdBQVUscUJBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUscUJBQ2I7QUFBQSwrQkFBQyxnQkFDQztBQUFBLGlDQUFDLE9BQUksV0FBVSxpQkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE0QjtBQUFBO0FBQUEsYUFEOUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUdBO0FBQUEsUUFDQSx1QkFBQyxRQUFHLFdBQVUsMENBQXlDLE9BQU8sRUFBRStELGVBQWUsVUFBVSxHQUFFLGlDQUEzRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxRQUNBLHVCQUFDLE9BQUUsV0FBVSw0Q0FBMkMsT0FBTyxFQUFFRSxXQUFXLFdBQVcsR0FBRSx1RUFBekY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsV0FWRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBV0E7QUFBQSxNQUVBLHVCQUFDLFNBQUksV0FBVSwrQ0FDWi9ELHlCQUFlNkM7QUFBQUEsUUFBSSxDQUFDLEVBQUU1QyxNQUFNK0QsTUFBTTlELE9BQU9DLE1BQU1DLE9BQU9DLElBQUlDLE9BQU8sTUFDaEUsdUJBQUMsU0FBZ0IsV0FBVyxtQkFBbUJBLE1BQU0sSUFDbkQ7QUFBQSxpQ0FBQyxTQUFJLFdBQVcseUJBQXlCRCxFQUFFLDBDQUN6QyxpQ0FBQyxRQUFLLFdBQVcsV0FBV0QsS0FBSyxNQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvQyxLQUR0QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsVUFDQSx1QkFBQyxRQUFHLFdBQVUsd0NBQXdDRixtQkFBdEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNEQ7QUFBQSxVQUM1RCx1QkFBQyxPQUFFLFdBQVUseUNBQXlDQyxrQkFBdEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkQ7QUFBQSxhQUxuREQsT0FBVjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBTUE7QUFBQSxNQUNELEtBVEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVVBO0FBQUEsTUFFQSx1QkFBQyxTQUFJLFdBQVUsWUFDYjtBQUFBLCtCQUFDLFFBQUcsV0FBVSxvREFBbUQsK0JBQWpFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZ0Y7QUFBQSxRQUNoRix1QkFBQyxTQUFJLFdBQVUsa0ZBQ1o7QUFBQSxVQUNDLEVBQUVKLE9BQU8sVUFBVUMsS0FBSyxVQUFVTSxJQUFJLGVBQWU0RCxNQUFNLGdCQUFnQjtBQUFBLFVBQzNFO0FBQUEsVUFDQSxFQUFFbkUsT0FBTyxTQUFTQyxLQUFLLFdBQVdNLElBQUksY0FBYzRELE1BQU0sZ0JBQWdCO0FBQUEsVUFDMUU7QUFBQSxVQUNBLEVBQUVuRSxPQUFPLFdBQVdDLEtBQUssV0FBV00sSUFBSSxpQkFBaUI0RCxNQUFNLG1CQUFtQjtBQUFBLFVBQ2xGO0FBQUEsVUFDQSxFQUFFbkUsT0FBTyxTQUFTQyxLQUFLLFVBQVVNLElBQUksZUFBZTRELE1BQU0saUJBQWlCO0FBQUEsVUFDM0U7QUFBQSxVQUNBLEVBQUVuRSxPQUFPLFNBQVNDLEtBQUssWUFBWU0sSUFBSSxpQkFBaUI0RCxNQUFNLG1CQUFtQjtBQUFBLFFBQUMsRUFDbEZwQjtBQUFBQSxVQUFJLENBQUNxQixNQUFNekMsTUFDWHlDLFNBQVMsT0FDUCx1QkFBQyxjQUFtQixXQUFVLG9FQUFiekMsR0FBakI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBOEYsSUFFOUYsdUJBQUMsU0FBcUIsV0FBVyxHQUFHeUMsS0FBSzdELEVBQUUsb0RBQ3pDO0FBQUEsbUNBQUMsU0FBSSxXQUFXLHFCQUFxQjZELEtBQUtELElBQUksSUFBS0MsZUFBS3BFLFNBQXhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQThEO0FBQUEsWUFDOUQsdUJBQUMsU0FBSSxXQUFVLGdDQUFnQ29FLGVBQUtuRSxPQUFwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUF3RDtBQUFBLGVBRmhEbUUsS0FBS3BFLE9BQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFHQTtBQUFBLFFBRUosS0FwQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQXFCQTtBQUFBLFdBdkJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUF3QkE7QUFBQSxTQWxERjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBbURBLEtBcERGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FxREE7QUFBQSxJQUdBLHVCQUFDLGFBQVEsV0FBVSxjQUNqQixpQ0FBQyxTQUFJLFdBQVUscUJBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUscUJBQ2I7QUFBQSwrQkFBQyxnQkFDQztBQUFBLGlDQUFDLFNBQU0sV0FBVSxpQkFBakI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBOEI7QUFBQTtBQUFBLGFBRGhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFHQTtBQUFBLFFBQ0EsdUJBQUMsUUFBRyxXQUFVLDBDQUF5QyxPQUFPLEVBQUUrRCxlQUFlLFVBQVUsR0FBRSxrQ0FBM0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFDQSx1QkFBQyxPQUFFLFdBQVUsNENBQTJDLE9BQU8sRUFBRUUsV0FBVyxXQUFXLEdBQUUsNERBQXpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFdBVkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVdBO0FBQUEsTUFFQSx1QkFBQyxTQUFJLFdBQVUseUNBQ1p4RCxzQkFBWXNDO0FBQUFBLFFBQUksQ0FBQyxFQUFFNUMsTUFBTStELE1BQU1sRSxPQUFPSyxLQUFLLE1BQzFDLHVCQUFDLFNBQWdCLFdBQVUsb0VBQ3pCO0FBQUEsaUNBQUMsU0FBSSxXQUFVLG1JQUNiLGlDQUFDLFFBQUssV0FBVSw4QkFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMEMsS0FENUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsU0FDQztBQUFBLG1DQUFDLFNBQUksV0FBVSwwQ0FBMENMLG1CQUF6RDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErRDtBQUFBLFlBQy9ELHVCQUFDLFNBQUksV0FBVSx5Q0FBeUNLLGtCQUF4RDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE2RDtBQUFBLGVBRi9EO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxhQVBRTCxPQUFWO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFRQTtBQUFBLE1BQ0QsS0FYSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBWUE7QUFBQSxTQTFCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBMkJBLEtBNUJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0E2QkE7QUFBQSxJQUdBLHVCQUFDLGFBQVEsV0FBVSwwQkFDakIsaUNBQUMsU0FBSSxXQUFVLHFCQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHFCQUNiO0FBQUEsK0JBQUMsZ0JBQ0M7QUFBQSxpQ0FBQyxjQUFXLFdBQVUsaUJBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQW1DO0FBQUE7QUFBQSxhQURyQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBR0E7QUFBQSxRQUNBLHVCQUFDLFFBQUcsV0FBVSwwQ0FBeUMsT0FBTyxFQUFFK0QsZUFBZSxVQUFVLEdBQUUsbUNBQTNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFFBQ0EsdUJBQUMsT0FBRSxXQUFVLDRDQUEyQyxPQUFPLEVBQUVFLFdBQVcsV0FBVyxHQUFFLGtFQUF6RjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQVZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFXQTtBQUFBLE1BRUEsdUJBQUMsU0FBSSxXQUFVLCtDQUNadkQsdUJBQWFxQztBQUFBQSxRQUFJLENBQUMsRUFBRTVDLE1BQU0rRCxNQUFNOUQsT0FBT0MsTUFBTU0sSUFBSSxNQUNoRCx1QkFBQyxTQUFnQixXQUFVLG9FQUN6QjtBQUFBLGlDQUFDLFVBQUssV0FBVSxrSUFDYkEsaUJBREg7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLDBIQUNiLGlDQUFDLFFBQUssV0FBVSw4QkFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMEMsS0FENUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsUUFBRyxXQUFVLHdDQUF3Q1AsbUJBQXREO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTREO0FBQUEsVUFDNUQsdUJBQUMsT0FBRSxXQUFVLHlDQUF5Q0Msa0JBQXREO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTJEO0FBQUEsYUFSbkRELE9BQVY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVNBO0FBQUEsTUFDRCxLQVpIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFhQTtBQUFBLE1BRUEsdUJBQUMsU0FBSSxXQUFVLDBEQUNiLGlDQUFDLFNBQUksV0FBVSxnREFDYjtBQUFBLCtCQUFDLFNBQUksV0FBVSxtQ0FDYjtBQUFBLGlDQUFDLFNBQUksV0FBVSwrQ0FBOEMsOEJBQTdEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTJFO0FBQUEsVUFDM0UsdUJBQUMsU0FBSSxXQUFVLDBDQUF5QyxPQUFPLEVBQUUyRCxlQUFlLFVBQVUsR0FBRTtBQUFBO0FBQUEsWUFDdEYsdUJBQUMsVUFBSyxXQUFVLDZCQUE0QixrQkFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBOEM7QUFBQSxlQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsVUFDQSx1QkFBQyxTQUFJLFdBQVUseUJBQXdCLHdDQUF2QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUErRDtBQUFBLGFBTGpFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFNQTtBQUFBLFFBQ0EsdUJBQUMsU0FBSSxXQUFVLDJCQUNaO0FBQUEsVUFDQyxFQUFFL0QsT0FBTyxnQkFBZ0JxRSxLQUFLLElBQUkvRCxPQUFPLGlCQUFpQjtBQUFBLFVBQzFELEVBQUVOLE9BQU8saUJBQWlCcUUsS0FBSyxJQUFJL0QsT0FBTyxjQUFjO0FBQUEsVUFDeEQsRUFBRU4sT0FBTyxZQUFZcUUsS0FBSyxJQUFJL0QsT0FBTyxhQUFhO0FBQUEsUUFBQyxFQUNuRHlDO0FBQUFBLFVBQUksQ0FBQyxFQUFFL0MsT0FBT3FFLEtBQUsvRCxNQUFNLE1BQ3pCLHVCQUFDLFNBQ0M7QUFBQSxtQ0FBQyxTQUFJLFdBQVUscUNBQ2I7QUFBQSxxQ0FBQyxVQUFLLFdBQVUsNkJBQTZCTixtQkFBN0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBbUQ7QUFBQSxjQUNuRCx1QkFBQyxVQUFLLFdBQVUsaUJBQWlCcUU7QUFBQUE7QUFBQUEsZ0JBQUk7QUFBQSxtQkFBckM7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBc0M7QUFBQSxpQkFGeEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFHQTtBQUFBLFlBQ0EsdUJBQUMsU0FBSSxXQUFVLGtEQUNiLGlDQUFDLFNBQUksV0FBVyxVQUFVL0QsS0FBSyxpQkFBaUIsT0FBTyxFQUFFZ0UsT0FBTyxHQUFHRCxHQUFHLElBQUksS0FBMUU7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBNEUsS0FEOUU7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLGVBUFFyRSxPQUFWO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBUUE7QUFBQSxRQUNELEtBZkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWdCQTtBQUFBLFdBeEJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUF5QkEsS0ExQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQTJCQTtBQUFBLFNBeERGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0F5REEsS0ExREY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQTJEQTtBQUFBLElBR0EsdUJBQUMsYUFBUSxXQUFVLGNBQ2pCLGlDQUFDLFNBQUksV0FBVSxpQ0FDYixpQ0FBQyxTQUFJLFdBQVUsMEZBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUsbUZBQ2IsaUNBQUMsU0FBTSxXQUFVLHdCQUFqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFDLEtBRHZDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFFQTtBQUFBLE1BQ0EsdUJBQUMsUUFBRyxXQUFVLHVDQUFzQyxPQUFPLEVBQUUrRCxlQUFlLFVBQVUsR0FBRSxrQ0FBeEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsTUFDQSx1QkFBQyxPQUFFLFdBQVUsaURBQWdELE9BQU8sRUFBRUUsV0FBVyxXQUFXLEdBQUUsK0ZBQTlGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFHQTtBQUFBLE1BQ0E7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE1BQUs7QUFBQSxVQUNMLFdBQVU7QUFBQSxVQUVWO0FBQUEsbUNBQUMsU0FBTSxXQUFVLGFBQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTBCO0FBQUE7QUFBQSxZQUUxQix1QkFBQyxjQUFXLFdBQVUsYUFBdEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBK0I7QUFBQTtBQUFBO0FBQUEsUUFOakM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BT0E7QUFBQSxTQWxCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBbUJBLEtBcEJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FxQkEsS0F0QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXVCQTtBQUFBLE9Bak9GO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FtT0E7QUFFSjtBQUFDTSxNQXZPdUJUO0FBQVMsSUFBQUosSUFBQUcsS0FBQVU7QUFBQUMsYUFBQWQsSUFBQTtBQUFBYyxhQUFBWCxLQUFBO0FBQUFXLGFBQUFELEtBQUEiLCJuYW1lcyI6WyJ1c2VSZWYiLCJTaGllbGQiLCJBbGVydFRyaWFuZ2xlIiwiQ2hlY2tDaXJjbGUiLCJUcmVuZGluZ1VwIiwiQnVpbGRpbmcyIiwiQXJyb3dSaWdodCIsIlBob25lIiwiTG9jayIsIkRhdGFiYXNlIiwiR2xvYmUiLCJVc2VycyIsIkF3YXJkIiwiWmFwIiwiRXllIiwiRmlsZUNoZWNrIiwiUFJPQkxFTV9TVEFUUyIsInZhbHVlIiwibGFiZWwiLCJzdWIiLCJTT0xVVElPTl9TVEVQUyIsImljb24iLCJ0aXRsZSIsImRlc2MiLCJjb2xvciIsImJnIiwiYm9yZGVyIiwiVFJVU1RfSVRFTVMiLCJWSVNJT05fQ0FSRFMiLCJ0YWciLCJDSEFSVF9EQVRBIiwieWVhciIsIk1BWF9WQUxVRSIsIkNIQVJUX0giLCJDSEFSVF9XIiwiUEFEX0wiLCJQQURfUiIsIlBBRF9UIiwiUEFEX0IiLCJJTk5FUl9XIiwiSU5ORVJfSCIsIllfVElDS1MiLCJ5UG9zIiwidiIsInhQb3MiLCJpIiwic3RlcCIsImxlbmd0aCIsIlBoaXNoaW5nQ2hhcnQiLCJfcyIsImFuaW1hdGVkIiwic2V0QW5pbWF0ZWQiLCJ1c2VTdGF0ZSIsInJlZiIsInVzZUVmZmVjdCIsImVsIiwiY3VycmVudCIsIm9icyIsIkludGVyc2VjdGlvbk9ic2VydmVyIiwiZW50cnkiLCJpc0ludGVyc2VjdGluZyIsImRpc2Nvbm5lY3QiLCJ0aHJlc2hvbGQiLCJvYnNlcnZlIiwibGluZVBhdGgiLCJtYXAiLCJkIiwiam9pbiIsImFyZWFQYXRoIiwibWluV2lkdGgiLCJtYXhIZWlnaHQiLCJ0aWNrIiwidHJhbnNpdGlvbiIsImN4IiwiY3kiLCJpc0xhc3QiLCJfYyIsIlNlY3Rpb25CYWRnZSIsImNoaWxkcmVuIiwiX2MyIiwiQWJvdXRQYWdlIiwibGV0dGVyU3BhY2luZyIsImxpbmVIZWlnaHQiLCJ3b3JkQnJlYWsiLCJJY29uIiwidGV4dCIsIml0ZW0iLCJwY3QiLCJ3aWR0aCIsIl9jMyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBYm91dFBhZ2UudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7XG4gIFNoaWVsZCwgQWxlcnRUcmlhbmdsZSwgQ2hlY2tDaXJjbGUsIFRyZW5kaW5nVXAsIEJ1aWxkaW5nMixcbiAgQXJyb3dSaWdodCwgUGhvbmUsIExvY2ssIERhdGFiYXNlLCBHbG9iZSwgVXNlcnMsIEF3YXJkLFxuICBaYXAsIEV5ZSwgRmlsZUNoZWNrXG59IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5cbmNvbnN0IFBST0JMRU1fU1RBVFMgPSBbXG4gIHsgdmFsdWU6ICc3LDUwMOyWtSsnLCBsYWJlbDogJzIwMjPrhYQg7ZS87IuxIO2UvO2VtOyVoScsIHN1YjogJ+yghOuFhCDrjIDruYQgMzIlIOymneqwgCcgfSxcbiAgeyB2YWx1ZTogJzE466eM6rG0JywgbGFiZWw6ICfsl7DqsIQg7ZS87ZW0IOyLoOqzoCcsIHN1YjogJ+2VmOujqCDtj4nqt6AgNTAw6rG0IOydtOyDgScgfSxcbiAgeyB2YWx1ZTogJzk2JScsIGxhYmVsOiAn7IKs7KCEIOyYiOuwqSDqsIDriqUnLCBzdWI6ICfsoJXrs7Qg7ZmV7J2466eM7Jy866Gc64+EIOywqOuLqCcgfSxcbl07XG5cbmNvbnN0IFNPTFVUSU9OX1NURVBTID0gW1xuICB7XG4gICAgaWNvbjogUGhvbmUsXG4gICAgdGl0bGU6ICcx64uo6rOEIOKAlCDsnZjsi6wg7KCE7ZmUIOyImOyLoCcsXG4gICAgZGVzYzogJ+q4sOq0gMK36rCc7J24IOyCrOy5rSwg64yA7LacwrftiKzsnpAg6raM7JygLCDqs7Xqs7XquLDqtIAg7JyE7J6lIOyghO2ZlOulvCDsiJjsi6Dtlanri4jri6QuJyxcbiAgICBjb2xvcjogJ3RleHQtcmVkLTUwMCcsXG4gICAgYmc6ICdiZy1yZWQtNTAnLFxuICAgIGJvcmRlcjogJ2JvcmRlci1yZWQtMTAwJyxcbiAgfSxcbiAge1xuICAgIGljb246IERhdGFiYXNlLFxuICAgIHRpdGxlOiAnMuuLqOqzhCDigJQg7J207KSRIOq1kOywqCDqsoDspp0nLFxuICAgIGRlc2M6ICfqs7Xqs7XrjbDsnbTthLAo7ZaJ7KCV7JWI7KCE67aAwrfquIjsnLXsnIQpICsgVkxVRSDsnpDssrQg7J247KadIERC66W8IOuPmeyLnOyXkCDsobDtmoztlanri4jri6QuJyxcbiAgICBjb2xvcjogJ3RleHQtYW1iZXItNTAwJyxcbiAgICBiZzogJ2JnLWFtYmVyLTUwJyxcbiAgICBib3JkZXI6ICdib3JkZXItYW1iZXItMTAwJyxcbiAgfSxcbiAge1xuICAgIGljb246IEV5ZSxcbiAgICB0aXRsZTogJzPri6jqs4Qg4oCUIEFJIOychO2XmOuPhCDrtoTshJ0nLFxuICAgIGRlc2M6ICftjKjthLQg67aE7ISdIEFJ6rCAIOyLoOqzoCDsnbTroKXCt+yXsOq0gCDrsojtmLjCt+yCrOyXheyekCDsoJXrs7Trpbwg7KKF7ZWp7ZW0IOychO2XmOuPhOulvCDsgrDstpztlanri4jri6QuJyxcbiAgICBjb2xvcjogJ3RleHQtYmx1ZS01MDAnLFxuICAgIGJnOiAnYmctYmx1ZS01MCcsXG4gICAgYm9yZGVyOiAnYm9yZGVyLWJsdWUtMTAwJyxcbiAgfSxcbiAge1xuICAgIGljb246IENoZWNrQ2lyY2xlLFxuICAgIHRpdGxlOiAnNOuLqOqzhCDigJQg7KaJ7IucIO2MkOuzhCDqsrDqs7wnLFxuICAgIGRlc2M6ICfslYjsoIQv7KO87J2YL+ychO2XmCAz64uo6rOEIO2MkOygleydhCDsi6Tsi5zqsITsnLzroZwg7KCc6rO17ZWY7JesIO2UvO2VtOulvCDsgqzsoIQg7LCo64uo7ZWp64uI64ukLicsXG4gICAgY29sb3I6ICd0ZXh0LWVtZXJhbGQtNTAwJyxcbiAgICBiZzogJ2JnLWVtZXJhbGQtNTAnLFxuICAgIGJvcmRlcjogJ2JvcmRlci1lbWVyYWxkLTEwMCcsXG4gIH0sXG5dO1xuXG5jb25zdCBUUlVTVF9JVEVNUyA9IFtcbiAgeyBpY29uOiBCdWlsZGluZzIsIGxhYmVsOiAn7ZaJ7KCV7JWI7KCE67aAIOyXsOqzhCcsIGRlc2M6ICfqs7Xqs7XquLDqtIAg7IKs7JeF7J6QIERCIOyLpOyLnOqwhCDsl7Drj5knIH0sXG4gIHsgaWNvbjogU2hpZWxkLCBsYWJlbDogJ+q4iOycteychOybkO2ajCDtmJHroKUnLCBkZXNjOiAn6riI7Jy17IKs6riwIOyLoOqzoCDsnbTroKUg6rO17JygIOyytOqzhCcgfSxcbiAgeyBpY29uOiBBd2FyZCwgbGFiZWw6ICdJU08gMjcwMDEg7J247KadJywgZGVzYzogJ+q1reygnCDsoJXrs7Trs7TslYgg6rSA66as7LK06rOEIOyduOymnScgfSxcbiAgeyBpY29uOiBGaWxlQ2hlY2ssIGxhYmVsOiAnSVNNUy1QIOyduOymnScsIGRlc2M6ICfqsJzsnbjsoJXrs7Trs7TtmLgg6rSA66as7LK06rOEIOyduOymnScgfSxcbiAgeyBpY29uOiBVc2VycywgbGFiZWw6ICfqsr3ssLDssq0gTU9VJywgZGVzYzogJ+yCrOydtOuyhOuylOyjhOyImOyCrOuMgCDrjbDsnbTthLAg6rO17JygJyB9LFxuICB7IGljb246IEdsb2JlLCBsYWJlbDogJ+yduO2EsO2PtCDrk7HsnqwnLCBkZXNjOiAn6rWt7KCcIOyCrOq4sCBEQiDqtZDssKgg7Jew64+ZJyB9LFxuXTtcblxuY29uc3QgVklTSU9OX0NBUkRTID0gW1xuICB7XG4gICAgaWNvbjogTG9jayxcbiAgICB0aXRsZTogJ+uztOyViCDthrXtlakg7Y+s7YS4JyxcbiAgICBkZXNjOiAn67O07J207Iqk7ZS87IuxwrfsiqTrr7jsi7HCt+2MjOuwjeydhCDslYTsmrDrpbTripQg6rWt64K0IOycoOydvOydmCDsooXtlakg7IKs6riwIOyYiOuwqSDtj6zthLjroZwg7ZmV7J6l7ZWp64uI64ukLicsXG4gICAgdGFnOiAnMjAyNCDroZzrk5zrp7UnLFxuICB9LFxuICB7XG4gICAgaWNvbjogWmFwLFxuICAgIHRpdGxlOiAn7Iuk7Iuc6rCEIOyVjOumvCDslbEnLFxuICAgIGRlc2M6ICfsoITtmZQg7IiY7IugIOyLnCDsponsi5wg7JyE7ZeYIOyXrOu2gOulvCDtjJ3sl4XsnLzroZwg7JWM66Ck7KO864qUIOuEpOydtO2LsOu4jCDrqqjrsJTsnbwg7JWx7J2EIOy2nOyLnO2VqeuLiOuLpC4nLFxuICAgIHRhZzogJzIwMjQgUTMnLFxuICB9LFxuICB7XG4gICAgaWNvbjogVHJlbmRpbmdVcCxcbiAgICB0aXRsZTogJ+q4sOyXhSDrs7TslYggQjJCJyxcbiAgICBkZXNjOiAn6riI7Jy17IKswrfthrXsi6DsgqzCt+2UjOueq+2PvCDquLDsl4Ug64yA7IOBIEFQSSDquLDrsJgg7Iuk7Iuc6rCEIOyCrOq4sCDqsoDspp0g7ISc67mE7Iqk66W8IOygnOqzte2VqeuLiOuLpC4nLFxuICAgIHRhZzogJzIwMjUg7ZmV7J6lJyxcbiAgfSxcbl07XG5cbmNvbnN0IENIQVJUX0RBVEEgPSBbXG4gIHsgeWVhcjogJzIwMTknLCB2YWx1ZTogMzIwOSwgbGFiZWw6ICczLDIwOeyWtScgfSxcbiAgeyB5ZWFyOiAnMjAyMCcsIHZhbHVlOiA0MDIzLCBsYWJlbDogJzQsMDIz7Ja1JyB9LFxuICB7IHllYXI6ICcyMDIxJywgdmFsdWU6IDQ4NzYsIGxhYmVsOiAnNCw4NzbslrUnIH0sXG4gIHsgeWVhcjogJzIwMjInLCB2YWx1ZTogNTY5NCwgbGFiZWw6ICc1LDY5NOyWtScgfSxcbiAgeyB5ZWFyOiAnMjAyMycsIHZhbHVlOiA3NTAwLCBsYWJlbDogJzcsNTAw7Ja1KycgfSxcbl07XG5cbmNvbnN0IE1BWF9WQUxVRSA9IDgwMDA7XG5jb25zdCBDSEFSVF9IID0gMjIwO1xuY29uc3QgQ0hBUlRfVyA9IDU2MDtcbmNvbnN0IFBBRF9MID0gNTg7XG5jb25zdCBQQURfUiA9IDI0O1xuY29uc3QgUEFEX1QgPSAzNjtcbmNvbnN0IFBBRF9CID0gNDg7XG5jb25zdCBJTk5FUl9XID0gQ0hBUlRfVyAtIFBBRF9MIC0gUEFEX1I7XG5jb25zdCBJTk5FUl9IID0gQ0hBUlRfSCAtIFBBRF9UIC0gUEFEX0I7XG5jb25zdCBZX1RJQ0tTID0gWzAsIDIwMDAsIDQwMDAsIDYwMDAsIDgwMDBdO1xuXG5mdW5jdGlvbiB5UG9zKHY6IG51bWJlcikge1xuICByZXR1cm4gUEFEX1QgKyBJTk5FUl9IIC0gKHYgLyBNQVhfVkFMVUUpICogSU5ORVJfSDtcbn1cblxuZnVuY3Rpb24geFBvcyhpOiBudW1iZXIpIHtcbiAgY29uc3Qgc3RlcCA9IElOTkVSX1cgLyAoQ0hBUlRfREFUQS5sZW5ndGggLSAxKTtcbiAgcmV0dXJuIFBBRF9MICsgaSAqIHN0ZXA7XG59XG5cbmZ1bmN0aW9uIFBoaXNoaW5nQ2hhcnQoKSB7XG4gIGNvbnN0IFthbmltYXRlZCwgc2V0QW5pbWF0ZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCByZWYgPSB1c2VSZWY8SFRNTERpdkVsZW1lbnQ+KG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgZWwgPSByZWYuY3VycmVudDtcbiAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgY29uc3Qgb2JzID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgICAgKFtlbnRyeV0pID0+IHsgaWYgKGVudHJ5LmlzSW50ZXJzZWN0aW5nKSB7IHNldEFuaW1hdGVkKHRydWUpOyBvYnMuZGlzY29ubmVjdCgpOyB9IH0sXG4gICAgICB7IHRocmVzaG9sZDogMC4zIH1cbiAgICApO1xuICAgIG9icy5vYnNlcnZlKGVsKTtcbiAgICByZXR1cm4gKCkgPT4gb2JzLmRpc2Nvbm5lY3QoKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGxpbmVQYXRoID0gQ0hBUlRfREFUQS5tYXAoKGQsIGkpID0+IGAke2kgPT09IDAgPyAnTScgOiAnTCd9ICR7eFBvcyhpKX0gJHthbmltYXRlZCA/IHlQb3MoZC52YWx1ZSkgOiBQQURfVCArIElOTkVSX0h9YCkuam9pbignICcpO1xuICBjb25zdCBhcmVhUGF0aCA9IGAke2xpbmVQYXRofSBMICR7eFBvcyhDSEFSVF9EQVRBLmxlbmd0aCAtIDEpfSAke1BBRF9UICsgSU5ORVJfSH0gTCAke3hQb3MoMCl9ICR7UEFEX1QgKyBJTk5FUl9IfSBaYDtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgcmVmPXtyZWZ9IGNsYXNzTmFtZT1cImNhcmQgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTcgcHQtNyBwYi0yIGZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtYmFzZSBtYi0wLjVcIj7sl7Drj4Trs4Qg67O07J207Iqk7ZS87IuxIO2UvO2VtOyVoSDstpTsnbQ8L2gzPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14c1wiPuuLqOychDog7Ja17JuQIMK3IOy2nOyymDog6rK97LCw7LKtIOyCrOydtOuyhOyImOyCrOq1rTwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSB0ZXh0LXhzIHRleHQtcmVkLTUwMCBmb250LXNlbWlib2xkIGJnLXJlZC01MCBib3JkZXIgYm9yZGVyLXJlZC0xMDAgcHgtMi41IHB5LTEgcm91bmRlZC1mdWxsXCI+XG4gICAgICAgICAgPFRyZW5kaW5nVXAgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgIOunpOuFhCDquInspp1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC00IHBiLTYgb3ZlcmZsb3cteC1hdXRvXCI+XG4gICAgICAgIDxzdmdcbiAgICAgICAgICB2aWV3Qm94PXtgMCAwICR7Q0hBUlRfV30gJHtDSEFSVF9IfWB9XG4gICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsXCJcbiAgICAgICAgICBzdHlsZT17eyBtaW5XaWR0aDogJzMyMHB4JywgbWF4SGVpZ2h0OiAnMjYwcHgnIH19XG4gICAgICAgID5cbiAgICAgICAgICA8ZGVmcz5cbiAgICAgICAgICAgIDxsaW5lYXJHcmFkaWVudCBpZD1cImFyZWFHcmFkXCIgeDE9XCIwXCIgeTE9XCIwXCIgeDI9XCIwXCIgeTI9XCIxXCI+XG4gICAgICAgICAgICAgIDxzdG9wIG9mZnNldD1cIjAlXCIgc3RvcENvbG9yPVwiIzMxODJGNlwiIHN0b3BPcGFjaXR5PVwiMC4xOFwiIC8+XG4gICAgICAgICAgICAgIDxzdG9wIG9mZnNldD1cIjEwMCVcIiBzdG9wQ29sb3I9XCIjMzE4MkY2XCIgc3RvcE9wYWNpdHk9XCIwXCIgLz5cbiAgICAgICAgICAgIDwvbGluZWFyR3JhZGllbnQ+XG4gICAgICAgICAgICA8bGluZWFyR3JhZGllbnQgaWQ9XCJsaW5lR3JhZFwiIHgxPVwiMFwiIHkxPVwiMFwiIHgyPVwiMVwiIHkyPVwiMFwiPlxuICAgICAgICAgICAgICA8c3RvcCBvZmZzZXQ9XCIwJVwiIHN0b3BDb2xvcj1cIiM2MEE1RkFcIiAvPlxuICAgICAgICAgICAgICA8c3RvcCBvZmZzZXQ9XCIxMDAlXCIgc3RvcENvbG9yPVwiI0VGNDQ0NFwiIC8+XG4gICAgICAgICAgICA8L2xpbmVhckdyYWRpZW50PlxuICAgICAgICAgICAgPGZpbHRlciBpZD1cImdsb3dcIj5cbiAgICAgICAgICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj1cIjIuNVwiIHJlc3VsdD1cImJsdXJcIiAvPlxuICAgICAgICAgICAgICA8ZmVNZXJnZT48ZmVNZXJnZU5vZGUgaW49XCJibHVyXCIgLz48ZmVNZXJnZU5vZGUgaW49XCJTb3VyY2VHcmFwaGljXCIgLz48L2ZlTWVyZ2U+XG4gICAgICAgICAgICA8L2ZpbHRlcj5cbiAgICAgICAgICA8L2RlZnM+XG5cbiAgICAgICAgICB7WV9USUNLUy5tYXAoKHRpY2spID0+IChcbiAgICAgICAgICAgIDxnIGtleT17dGlja30+XG4gICAgICAgICAgICAgIDxsaW5lXG4gICAgICAgICAgICAgICAgeDE9e1BBRF9MfSB5MT17eVBvcyh0aWNrKX0geDI9e0NIQVJUX1cgLSBQQURfUn0geTI9e3lQb3ModGljayl9XG4gICAgICAgICAgICAgICAgc3Ryb2tlPVwiI0YxRjVGOVwiIHN0cm9rZVdpZHRoPVwiMS41XCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPHRleHQgeD17UEFEX0wgLSA4fSB5PXt5UG9zKHRpY2spICsgNH0gdGV4dEFuY2hvcj1cImVuZFwiIGZvbnRTaXplPVwiMTBcIiBmaWxsPVwiIzk0QTNCOFwiIGZvbnRGYW1pbHk9XCJzYW5zLXNlcmlmXCI+XG4gICAgICAgICAgICAgICAge3RpY2sgPT09IDAgPyAnMCcgOiBgJHt0aWNrIC8gMTAwMH3sspxgfVxuICAgICAgICAgICAgICA8L3RleHQ+XG4gICAgICAgICAgICA8L2c+XG4gICAgICAgICAgKSl9XG5cbiAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgZD17YXJlYVBhdGh9XG4gICAgICAgICAgICBmaWxsPVwidXJsKCNhcmVhR3JhZClcIlxuICAgICAgICAgICAgc3R5bGU9e3sgdHJhbnNpdGlvbjogYW5pbWF0ZWQgPyAnZCAxcyBlYXNlLW91dCcgOiAnbm9uZScgfX1cbiAgICAgICAgICAvPlxuXG4gICAgICAgICAgPHBhdGhcbiAgICAgICAgICAgIGQ9e2xpbmVQYXRofVxuICAgICAgICAgICAgZmlsbD1cIm5vbmVcIlxuICAgICAgICAgICAgc3Ryb2tlPVwidXJsKCNsaW5lR3JhZClcIlxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg9XCIzXCJcbiAgICAgICAgICAgIHN0cm9rZUxpbmVjYXA9XCJyb3VuZFwiXG4gICAgICAgICAgICBzdHJva2VMaW5lam9pbj1cInJvdW5kXCJcbiAgICAgICAgICAgIGZpbHRlcj1cInVybCgjZ2xvdylcIlxuICAgICAgICAgICAgc3R5bGU9e3sgdHJhbnNpdGlvbjogYW5pbWF0ZWQgPyAnZCAxcyBlYXNlLW91dCcgOiAnbm9uZScgfX1cbiAgICAgICAgICAvPlxuXG4gICAgICAgICAge0NIQVJUX0RBVEEubWFwKChkLCBpKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjeCA9IHhQb3MoaSk7XG4gICAgICAgICAgICBjb25zdCBjeSA9IGFuaW1hdGVkID8geVBvcyhkLnZhbHVlKSA6IFBBRF9UICsgSU5ORVJfSDtcbiAgICAgICAgICAgIGNvbnN0IGlzTGFzdCA9IGkgPT09IENIQVJUX0RBVEEubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxnIGtleT17ZC55ZWFyfSBzdHlsZT17eyB0cmFuc2l0aW9uOiBhbmltYXRlZCA/IGBhbGwgMXMgZWFzZS1vdXQgJHtpICogMC4xfXNgIDogJ25vbmUnIH19PlxuICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9e2N4fSBjeT17Y3l9IHI9e2lzTGFzdCA/IDcgOiA1fSBmaWxsPVwid2hpdGVcIiBzdHJva2U9e2lzTGFzdCA/ICcjRUY0NDQ0JyA6ICcjMzE4MkY2J30gc3Ryb2tlV2lkdGg9e2lzTGFzdCA/IDIuNSA6IDJ9IC8+XG4gICAgICAgICAgICAgICAge2lzTGFzdCAmJiA8Y2lyY2xlIGN4PXtjeH0gY3k9e2N5fSByPXsxMn0gZmlsbD1cIiNFRjQ0NDQyMFwiIC8+fVxuICAgICAgICAgICAgICAgIDx0ZXh0XG4gICAgICAgICAgICAgICAgICB4PXtjeH1cbiAgICAgICAgICAgICAgICAgIHk9e2N5IC0gKGlzTGFzdCA/IDE4IDogMTQpfVxuICAgICAgICAgICAgICAgICAgdGV4dEFuY2hvcj1cIm1pZGRsZVwiXG4gICAgICAgICAgICAgICAgICBmb250U2l6ZT17aXNMYXN0ID8gJzExJyA6ICcxMCd9XG4gICAgICAgICAgICAgICAgICBmb250V2VpZ2h0PXtpc0xhc3QgPyAnODAwJyA6ICc2MDAnfVxuICAgICAgICAgICAgICAgICAgZmlsbD17aXNMYXN0ID8gJyNFRjQ0NDQnIDogJyMzMTgyRjYnfVxuICAgICAgICAgICAgICAgICAgZm9udEZhbWlseT1cInNhbnMtc2VyaWZcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtkLmxhYmVsfVxuICAgICAgICAgICAgICAgIDwvdGV4dD5cbiAgICAgICAgICAgICAgICA8dGV4dCB4PXtjeH0geT17UEFEX1QgKyBJTk5FUl9IICsgMTZ9IHRleHRBbmNob3I9XCJtaWRkbGVcIiBmb250U2l6ZT1cIjExXCIgZmlsbD1cIiM2NDc0OEJcIiBmb250V2VpZ2h0PVwiNjAwXCIgZm9udEZhbWlseT1cInNhbnMtc2VyaWZcIj5cbiAgICAgICAgICAgICAgICAgIHtkLnllYXJ9XG4gICAgICAgICAgICAgICAgPC90ZXh0PlxuICAgICAgICAgICAgICA8L2c+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L3N2Zz5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LTcgbWItNyBwLTQgYmctcmVkLTUwIGJvcmRlciBib3JkZXItcmVkLTEwMCByb3VuZGVkLTJ4bCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctOCBoLTggcm91bmRlZC14bCBiZy1yZWQtMTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtcmVkLTUwMFwiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXJlZC03MDAgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWQgZm9udC1tZWRpdW1cIj5cbiAgICAgICAgICAyMDE564WEIOuMgOu5hCA8c3Ryb25nPjIuM+uwsDwvc3Ryb25nPiDspp3qsIAgwrcgMjAyM+uFhCDtlLztlbTslaEgPHN0cm9uZz43LDUwMOyWteybkCs8L3N0cm9uZz4g64+M7YyMIMK3IOyghOuFhCDrjIDruYQgPHN0cm9uZz4zMiUg6riJ7KadPC9zdHJvbmc+XG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTZWN0aW9uQmFkZ2UoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdC5SZWFjdE5vZGUgfSkge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMS41IG1iLTQgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTIwMCB0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPlxuICAgICAge2NoaWxkcmVufVxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBYm91dFBhZ2UoKSB7XG4gIHJldHVybiAoXG4gICAgPG1haW4gY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLWJsdWUtdGludCBwdC0xNlwiPlxuXG4gICAgICB7LyogSGVybyAqL31cbiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInJlbGF0aXZlIHB5LTIwIHB4LTQgdGV4dC1jZW50ZXIgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1ncmFkaWVudC10by1iIGZyb20tcHJpbWFyeS01MC82MCB0by10cmFuc3BhcmVudCBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSB6LTEwIG1heC13LTN4bCBteC1hdXRvXCI+XG4gICAgICAgICAgPFNlY3Rpb25CYWRnZT5cbiAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgVkxVRSDsgqzsl4Ug7IaM6rCc7IScXG4gICAgICAgICAgPC9TZWN0aW9uQmFkZ2U+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtNHhsIHNtOnRleHQtNXhsIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBtYi01XCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzNWVtJywgbGluZUhlaWdodDogMS4yIH19PlxuICAgICAgICAgICAg64yA7ZWc66+86rWtIOuztOydtOyKpO2UvOyLsSw8YnIgLz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS01MDBcIj5WTFVF6rCAIOuBiuyWtOuDheuLiOuLpDwvc3Bhbj5cbiAgICAgICAgICA8L2gxPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1sZyBsZWFkaW5nLXJlbGF4ZWQgbWF4LXcteGwgbXgtYXV0b1wiIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fT5cbiAgICAgICAgICAgIOqzteqzteuNsOydtO2EsOyZgCDsnpDssrQg7J247KadIERC7J2YIOydtOykkSDqtZDssKgg6rKA7Kad7Jy866GcIOyCrOq4sCDsl6zrtoDrpbwg7Iuk7Iuc6rCEIO2MkOuzhO2VmOuKlFxuICAgICAgICAgICAg6rWt64K0IOycoOydvOydmCDrs7TsnbTsiqTtlLzsi7Eg7JiI67CpIO2Gte2VqSDtlIzrnqvtj7zsnoXri4jri6QuXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgey8qIFByb2JsZW0gKi99XG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJweS0xNiBweC00XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctNXhsIG14LWF1dG9cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtY2VudGVyIG1iLTEyXCI+XG4gICAgICAgICAgICA8U2VjdGlvbkJhZGdlPlxuICAgICAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgIFByb2JsZW1cbiAgICAgICAgICAgIDwvU2VjdGlvbkJhZGdlPlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBtYi0zXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PlxuICAgICAgICAgICAgICDrs7TsnbTsiqTtlLzsi7HsnYAg7KeA6riI64+EIOynhO2ZlCDspJHsnoXri4jri6RcbiAgICAgICAgICAgIDwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIHRleHQtYmFzZSBtYXgtdy1sZyBteC1hdXRvXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgICAgICBBSSDrlKXtjpjsnbTtgazCt+yKpOuvuOyLscK36riw6rSAIOyCrOy5rSDsiJjrspXsnbQg6rOg64+E7ZmU65CY66mwIO2UvO2VtCDqt5zrqqjripQg66ek64WEIOq4ieymne2VmOqzoCDsnojsirXri4jri6QuXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTMgZ2FwLTUgbWItMTBcIj5cbiAgICAgICAgICAgIHtQUk9CTEVNX1NUQVRTLm1hcCgoeyB2YWx1ZSwgbGFiZWwsIHN1YiB9KSA9PiAoXG4gICAgICAgICAgICAgIDxkaXYga2V5PXtsYWJlbH0gY2xhc3NOYW1lPVwiY2FyZCBwLTcgdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtYmxhY2sgdGV4dC1wcmltYXJ5LTUwMCBtYi0yXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19Pnt2YWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc20gbWItMVwiPntsYWJlbH08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14c1wiPntzdWJ9PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8UGhpc2hpbmdDaGFydCAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgey8qIFNvbHV0aW9uICovfVxuICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicHktMTYgcHgtNCBiZy13aGl0ZS82MFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTV4bCBteC1hdXRvXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciBtYi0xMlwiPlxuICAgICAgICAgICAgPFNlY3Rpb25CYWRnZT5cbiAgICAgICAgICAgICAgPFphcCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgIFNvbHV0aW9uXG4gICAgICAgICAgICA8L1NlY3Rpb25CYWRnZT5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJsYWNrIHRleHQtZ3JheS05MDAgbWItM1wiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wM2VtJyB9fT5cbiAgICAgICAgICAgICAg7J207KSRIOqygOymnSDsi5zsiqTthZzsnLzroZwg7KaJ7IucIOywqOuLqFxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1iYXNlIG1heC13LWxnIG14LWF1dG9cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgIOuLqOyInCDsi6Dqs6AgREIg7KGw7ZqM66W8IOuEmOyWtCwg6rO16rO1642w7J207YSw7JmAIEFJIOu2hOyEneydhCDqsrDtlantlZwgNOuLqOqzhCDqsoDspp0g7YyM7J207ZSE65287J247J2EIOygnOqzte2VqeuLiOuLpC5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBzbTpncmlkLWNvbHMtMiBnYXAtNSBtYi0xMFwiPlxuICAgICAgICAgICAge1NPTFVUSU9OX1NURVBTLm1hcCgoeyBpY29uOiBJY29uLCB0aXRsZSwgZGVzYywgY29sb3IsIGJnLCBib3JkZXIgfSkgPT4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17dGl0bGV9IGNsYXNzTmFtZT17YGNhcmQgcC02IGJvcmRlciAke2JvcmRlcn1gfT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMTEgaC0xMSByb3VuZGVkLTJ4bCAke2JnfSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtYi00YH0+XG4gICAgICAgICAgICAgICAgICA8SWNvbiBjbGFzc05hbWU9e2B3LTUgaC01ICR7Y29sb3J9YH0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LWJvbGQgdGV4dC1zbSBtYi0yXCI+e3RpdGxlfTwvaDM+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTUwMCB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZFwiPntkZXNjfTwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2FyZCBwLThcIj5cbiAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtYm9sZCB0ZXh0LXNtIG1iLTYgdGV4dC1jZW50ZXJcIj5WTFVFIOydtOykkSDqsoDspp0g7JWE7YKk7YWN7LKYPC9oMz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgc206Z2FwLTAgZmxleC13cmFwXCI+XG4gICAgICAgICAgICAgIHtbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ+yCrOyaqeyekCDsv7zrpqwnLCBzdWI6ICfrsojtmLjCt+q4sOq0gOuqhScsIGJnOiAnYmctZ3JheS0xMDAnLCB0ZXh0OiAndGV4dC1ncmF5LTcwMCcgfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICfqs7Xqs7UgREInLCBzdWI6ICftlonslYjrtoDCt+q4iOycteychCcsIGJnOiAnYmctYmx1ZS01MCcsIHRleHQ6ICd0ZXh0LWJsdWUtNzAwJyB9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1ZMVUUgREInLCBzdWI6ICfsnbjspp3Ct+yLoOqzoOydtOugpScsIGJnOiAnYmctcHJpbWFyeS01MCcsIHRleHQ6ICd0ZXh0LXByaW1hcnktNzAwJyB9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0FJIOu2hOyEnScsIHN1YjogJ+2MqO2EtMK37JyE7ZeY64+EJywgYmc6ICdiZy1hbWJlci01MCcsIHRleHQ6ICd0ZXh0LWFtYmVyLTcwMCcgfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICftjJDrs4Qg6rKw6rO8Jywgc3ViOiAn7JWI7KCEL+yjvOydmC/snITtl5gnLCBiZzogJ2JnLWVtZXJhbGQtNTAnLCB0ZXh0OiAndGV4dC1lbWVyYWxkLTcwMCcgfSxcbiAgICAgICAgICAgICAgXS5tYXAoKGl0ZW0sIGkpID0+XG4gICAgICAgICAgICAgICAgaXRlbSA9PT0gbnVsbCA/IChcbiAgICAgICAgICAgICAgICAgIDxBcnJvd1JpZ2h0IGtleT17aX0gY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWdyYXktMzAwIHJvdGF0ZS05MCBzbTpyb3RhdGUtMCBmbGV4LXNocmluay0wIG14LTFcIiAvPlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aXRlbS5sYWJlbH0gY2xhc3NOYW1lPXtgJHtpdGVtLmJnfSByb3VuZGVkLTJ4bCBweC00IHB5LTMgdGV4dC1jZW50ZXIgZmxleC1zaHJpbmstMGB9PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHRleHQteHMgZm9udC1ib2xkICR7aXRlbS50ZXh0fWB9PntpdGVtLmxhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14cyBtdC0wLjVcIj57aXRlbS5zdWJ9PC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L3NlY3Rpb24+XG5cbiAgICAgIHsvKiBUcnVzdCAqL31cbiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInB5LTE2IHB4LTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy01eGwgbXgtYXV0b1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXIgbWItMTJcIj5cbiAgICAgICAgICAgIDxTZWN0aW9uQmFkZ2U+XG4gICAgICAgICAgICAgIDxBd2FyZCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgIFRydXN0XG4gICAgICAgICAgICA8L1NlY3Rpb25CYWRnZT5cbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJsYWNrIHRleHQtZ3JheS05MDAgbWItM1wiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wM2VtJyB9fT5cbiAgICAgICAgICAgICAg7Iug66Kw7ZWgIOyImCDsnojripQg6riw6rSA6rO8IO2VqOq7mO2VqeuLiOuLpFxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1iYXNlIG1heC13LWxnIG14LWF1dG9cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgIOygleu2gCDquLDqtIAgTU9VIOyytOqysCDrsI8g6rWt7KCcIOyduOymneydhCDthrXtlbQg6rKA7Kad65CcIOuNsOydtO2EsCDsi6DrorDshLHsnYQg67O07J6l7ZWp64uI64ukLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIHNtOmdyaWQtY29scy0zIGdhcC00XCI+XG4gICAgICAgICAgICB7VFJVU1RfSVRFTVMubWFwKCh7IGljb246IEljb24sIGxhYmVsLCBkZXNjIH0pID0+IChcbiAgICAgICAgICAgICAgPGRpdiBrZXk9e2xhYmVsfSBjbGFzc05hbWU9XCJjYXJkIHAtNSBmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0zLjUgaG92ZXI6Ym9yZGVyLXByaW1hcnktMjAwIGdyb3VwXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgcm91bmRlZC0yeGwgYmctcHJpbWFyeS01MCBncm91cC1ob3ZlcjpiZy1wcmltYXJ5LTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgICA8SWNvbiBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtcHJpbWFyeS02MDBcIiAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc20gbWItMC41XCI+e2xhYmVsfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQteHMgbGVhZGluZy1yZWxheGVkXCI+e2Rlc2N9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICB7LyogVmlzaW9uICovfVxuICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicHktMTYgcHgtNCBiZy13aGl0ZS82MFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTV4bCBteC1hdXRvXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciBtYi0xMlwiPlxuICAgICAgICAgICAgPFNlY3Rpb25CYWRnZT5cbiAgICAgICAgICAgICAgPFRyZW5kaW5nVXAgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICBWaXNpb25cbiAgICAgICAgICAgIDwvU2VjdGlvbkJhZGdlPlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBtYi0zXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PlxuICAgICAgICAgICAgICDrjIDtlZzrr7zqta0gTm8uMSDrs7TslYgg7Y+s7YS47J2EIO2Wpe2VtFxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC1iYXNlIG1heC13LWxnIG14LWF1dG9cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgIOuztOydtOyKpO2UvOyLsSDsmIjrsKnsnYQg7Iuc7J6R7Jy866GcLCDrlJTsp4DthLgg7IKs6riwIOyghOuwmOydhCDslYTsmrDrpbTripQg7KKF7ZWpIOuztOyViCDtlIzrnqvtj7zsnLzroZwg7ISx7J6l7ZWp64uI64ukLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIHNtOmdyaWQtY29scy0zIGdhcC01IG1iLTEwXCI+XG4gICAgICAgICAgICB7VklTSU9OX0NBUkRTLm1hcCgoeyBpY29uOiBJY29uLCB0aXRsZSwgZGVzYywgdGFnIH0pID0+IChcbiAgICAgICAgICAgICAgPGRpdiBrZXk9e3RpdGxlfSBjbGFzc05hbWU9XCJjYXJkIHAtNiByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gZ3JvdXAgaG92ZXI6Ym9yZGVyLXByaW1hcnktMjAwXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTQgcmlnaHQtNCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1wcmltYXJ5LTUwMCBiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDAgcHgtMiBweS0wLjUgcm91bmRlZC1mdWxsXCI+XG4gICAgICAgICAgICAgICAgICB7dGFnfVxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTEgaC0xMSByb3VuZGVkLTJ4bCBiZy1wcmltYXJ5LTUwIGdyb3VwLWhvdmVyOmJnLXByaW1hcnktMTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG1iLTQgdHJhbnNpdGlvbi1jb2xvcnNcIj5cbiAgICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1wcmltYXJ5LTYwMFwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc20gbWItMlwiPnt0aXRsZX08L2gzPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS01MDAgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWRcIj57ZGVzY308L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNhcmQgcC04IGJnLWdyYWRpZW50LXRvLWJyIGZyb20tcHJpbWFyeS01MC82MCB0by13aGl0ZVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIHNtOmZsZXgtcm93IGl0ZW1zLWNlbnRlciBnYXAtOFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSB0ZXh0LWNlbnRlciBzbTp0ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LXByaW1hcnktNjAwIG1iLTJcIj7qta3rgrQg7IKs7J2067KE67O07JWIIOyLnOyepSDqt5zrqqg8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtNXhsIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTkwMCBtYi0yXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjA0ZW0nIH19PlxuICAgICAgICAgICAgICAgICAgMTIuNDxzcGFuIGNsYXNzTmFtZT1cInRleHQtMnhsIHRleHQtcHJpbWFyeS01MDBcIj7sobDsm5A8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQtc21cIj4yMDI364WEIOyYiOyDgSDqt5zrqqggwrcgQ0FHUiAxNC4yJTwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgc3BhY2UteS0zIHctZnVsbFwiPlxuICAgICAgICAgICAgICAgIHtbXG4gICAgICAgICAgICAgICAgICB7IGxhYmVsOiAn67O07J207Iqk7ZS87IuxIOyYiOuwqSDshpTro6jshZgnLCBwY3Q6IDY4LCBjb2xvcjogJ2JnLXByaW1hcnktNTAwJyB9LFxuICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ+q4sOyXhSDrs7TslYggQjJCIEFQSScsIHBjdDogNDUsIGNvbG9yOiAnYmctYmx1ZS00MDAnIH0sXG4gICAgICAgICAgICAgICAgICB7IGxhYmVsOiAn66qo67CU7J28IOuztOyViCDslbEnLCBwY3Q6IDMwLCBjb2xvcjogJ2JnLXNreS0zMDAnIH0sXG4gICAgICAgICAgICAgICAgXS5tYXAoKHsgbGFiZWwsIHBjdCwgY29sb3IgfSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2xhYmVsfT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LXhzIG1iLTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNjAwIGZvbnQtbWVkaXVtXCI+e2xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwXCI+e3BjdH0lPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTIuNSBiZy1ncmF5LTEwMCByb3VuZGVkLWZ1bGwgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BoLWZ1bGwgJHtjb2xvcn0gcm91bmRlZC1mdWxsYH0gc3R5bGU9e3sgd2lkdGg6IGAke3BjdH0lYCB9fSAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgey8qIENUQSAqL31cbiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInB5LTIwIHB4LTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy0yeGwgbXgtYXV0byB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2FyZCBwLTEwIGJnLWdyYWRpZW50LXRvLWJyIGZyb20tcHJpbWFyeS01MDAgdG8tcHJpbWFyeS02MDAgYm9yZGVyLTAgc2hhZG93LWNhcmQtaG92ZXJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNCBoLTE0IHJvdW5kZWQtM3hsIGJnLXdoaXRlLzIwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG14LWF1dG8gbWItNVwiPlxuICAgICAgICAgICAgICA8VXNlcnMgY2xhc3NOYW1lPVwidy03IGgtNyB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBtYi0zXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PlxuICAgICAgICAgICAgICDtlajqu5gg7JWI7KCE7ZWcIOuMgO2VnOuvvOq1reydhCDrp4zrk6TslrTqsIDsmpRcbiAgICAgICAgICAgIDwvaDI+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktMTAwIHRleHQtc20gbGVhZGluZy1yZWxheGVkIG1iLTdcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgIOq4iOycteq4sOq0gCwg7Ya17Iug7IKsLCDqs7Xqs7XquLDqtIAsIOyKpO2DgO2KuOyXhSDrk7Eg64uk7JaR7ZWcIO2MjO2KuOuEiOyZgOydmCDsoJztnLQg67CPIO2YkeugpeydhCDtmZjsmIHtlanri4jri6QuXG4gICAgICAgICAgICAgIFZMVUXsmYAg7ZWo6ruYIOuztOydtOyKpO2UvOyLsSBaZXJv66W8IOyLpO2YhO2VtCDso7zshLjsmpQuXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8YVxuICAgICAgICAgICAgICBocmVmPVwibWFpbHRvOnBhcnRuZXJAdmx1ZS5rclwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC03IHB5LTMuNSBiZy13aGl0ZSB0ZXh0LXByaW1hcnktNjAwIGZvbnQtYm9sZCB0ZXh0LXNtIHJvdW5kZWQtMnhsIGhvdmVyOmJnLXByaW1hcnktNTAgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwIHNoYWRvdy1zb2Z0XCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPFVzZXJzIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICDsoJztnLQg67CPIO2YkeugpSDsoJzslYhcbiAgICAgICAgICAgICAgPEFycm93UmlnaHQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICA8L2E+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9BYm91dFBhZ2UudHN4In0=