import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/SecureMailPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/SecureMailPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { Mail, Shield, ChevronRight, Search, Star, Trash2, Archive, Send, Inbox, RefreshCw, Lock, CheckCircle, ArrowLeft, X, Reply, Forward } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const MOCK_MAILS = [
  {
    id: "m1",
    from: "명경채 요양병원",
    fromOrg: "VLUE-MED-2024-0031",
    subject: "[명경채 요양병원] 2024년 건강검진 안내",
    preview: "안녕하세요. 명경채 요양병원입니다. 2024년 연간 건강검진 일정을 안내드립니다...",
    body: "안녕하세요. 명경채 요양병원입니다.\n\n2024년 연간 건강검진 일정을 안내드립니다.\n\n검진 일정: 2024년 12월 1일 ~ 2025년 1월 31일\n검진 항목: 기본 혈액 검사, 흉부 X-ray, 복부 초음파\n\n예약 문의: 02-1234-5678\n\n본 메일은 VLUE 인증 기관에서 발송된 안전한 메일입니다.",
    time: "오전 10:24",
    date: "2024.12.15",
    read: false,
    starred: true,
    certified: true,
    tag: "의료",
    tagColor: "text-red-600 bg-red-50 border-red-100"
  },
  {
    id: "m2",
    from: "다다오피스",
    fromOrg: "VLUE-BIZ-2024-0087",
    subject: "[다다오피스] 12월 이용 요금 청구서",
    preview: "다다오피스를 이용해 주셔서 감사합니다. 12월 이용 요금 청구서를 첨부합니다...",
    body: "다다오피스를 이용해 주셔서 감사합니다.\n\n12월 이용 요금 청구서를 안내드립니다.\n\n청구 기간: 2024년 12월 1일 ~ 12월 31일\n청구 금액: 55,000원 (VAT 포함)\n납부 기한: 2025년 1월 10일\n\n자동이체 계좌로 출금 예정입니다.\n\n문의: 1588-0000",
    time: "어제",
    date: "2024.12.14",
    read: true,
    starred: false,
    certified: true,
    tag: "청구서",
    tagColor: "text-blue-600 bg-blue-50 border-blue-100"
  },
  {
    id: "m3",
    from: "한국신뢰금융",
    fromOrg: "VLUE-FIN-2024-0012",
    subject: "[한국신뢰금융] 대출 상환 일정 안내",
    preview: "안녕하세요, 고객님. 대출 상환 일정과 관련하여 안내 말씀 드립니다...",
    body: "안녕하세요, 고객님.\n\n대출 상환 일정과 관련하여 안내 말씀 드립니다.\n\n다음 달 상환 예정 금액: 350,000원\n상환 예정일: 2025년 1월 5일\n잔여 원금: 8,200,000원\n\n자세한 내용은 앱에서 확인 가능합니다.\n\n본 메일은 VLUE 인증 발신으로 안전한 공식 메일입니다.",
    time: "2일 전",
    date: "2024.12.13",
    read: true,
    starred: false,
    certified: true,
    tag: "금융",
    tagColor: "text-emerald-600 bg-emerald-50 border-emerald-100"
  },
  {
    id: "m4",
    from: "VLUE 플랫폼",
    fromOrg: "platform@vlue.kr",
    subject: "VLUE 보안 메일 서비스에 오신 것을 환영합니다!",
    preview: "VLUE 보안 메일 서비스를 이용해 주셔서 감사합니다. 인증 기관의 공식 메일만을...",
    body: "VLUE 보안 메일 서비스를 이용해 주셔서 감사합니다.\n\nVLUE 인증 기관의 공식 메일만을 안전하게 수신할 수 있습니다.\n\n주요 기능:\n• VLUE 인증 발신자 확인\n• 피싱 메일 자동 차단\n• 발신 기관 실시간 인증 조회\n• 메일 암호화 전송\n\n더 안전한 디지털 생활을 위해 VLUE와 함께하세요.",
    time: "1주 전",
    date: "2024.12.08",
    read: true,
    starred: true,
    certified: false,
    tag: "안내",
    tagColor: "text-gray-600 bg-gray-50 border-gray-200"
  }
];
const SIDEBAR_ITEMS = [
  { icon: Inbox, label: "받은 메일함", count: 1 },
  { icon: Send, label: "보낸 메일함", count: 0 },
  { icon: Star, label: "중요 메일", count: 2 },
  { icon: Archive, label: "보관함", count: 0 },
  { icon: Trash2, label: "휴지통", count: 0 }
];
export default function SecureMailPage({ onBack }) {
  _s();
  const [mails, setMails] = useState(MOCK_MAILS);
  const [selected, setSelected] = useState(null);
  const [activeFolder, setActiveFolder] = useState("받은 메일함");
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = mails.filter(
    (m) => m.subject.toLowerCase().includes(searchQuery.toLowerCase()) || m.from.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const unread = mails.filter((m) => !m.read).length;
  const handleSelect = (mail) => {
    setSelected(mail);
    setMails((prev) => prev.map((m) => m.id === mail.id ? { ...m, read: true } : m));
  };
  const toggleStar = (id, e) => {
    e.stopPropagation();
    setMails((prev) => prev.map((m) => m.id === id ? { ...m, starred: !m.starred } : m));
  };
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-16", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-gradient-to-r from-primary-600 to-primary-500", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Mail, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 125,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 124,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-xs font-medium mb-0.5", children: "내 보안 메일 주소" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 128,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-white font-bold text-base tracking-tight", style: { letterSpacing: "-0.02em" }, children: "user@vlue.kr" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 130,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 text-xs text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-full font-semibold", children: [
              /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3" }, void 0, false, {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 132,
                columnNumber: 19
              }, this),
              "보안 인증"
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 131,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 129,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 127,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 123,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 flex-shrink-0", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/15 border border-white/25", children: [
        /* @__PURE__ */ jsxDEV(Lock, { className: "w-3 h-3 text-white/80" }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 140,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-white/90 text-xs font-semibold", children: "1GB 무료 제공" }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 141,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 139,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 138,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SecureMailPage.tsx",
      lineNumber: 122,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SecureMailPage.tsx",
      lineNumber: 121,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white border-b border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onBack, className: "p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all", children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 150,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 149,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-7 h-7 rounded-xl bg-primary-500 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Lock, { className: "w-3.5 h-3.5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 154,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 153,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("h1", { className: "text-sm font-bold text-gray-900", style: { letterSpacing: "-0.02em" }, children: "보안 메일함" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 157,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "VLUE 인증 기관 공식 메일만 수신됩니다" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 158,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 156,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 152,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "ml-auto flex items-center gap-2", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-100", children: [
        /* @__PURE__ */ jsxDEV(Shield, { className: "w-3 h-3 text-primary-500" }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 163,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-primary-600 text-xs font-semibold", children: "보안 활성화" }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 164,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 162,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 161,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SecureMailPage.tsx",
      lineNumber: 148,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SecureMailPage.tsx",
      lineNumber: 147,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5", children: /* @__PURE__ */ jsxDEV("div", { className: "flex gap-5 h-[calc(100vh-160px)] min-h-[600px]", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "w-52 flex-shrink-0 hidden md:flex flex-col gap-2", children: [
        /* @__PURE__ */ jsxDEV("button", { className: "w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-2xl transition-colors shadow-soft mb-2", children: [
          /* @__PURE__ */ jsxDEV(Mail, { className: "w-4 h-4" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 174,
            columnNumber: 15
          }, this),
          "메일 쓰기"
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 173,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("nav", { className: "space-y-0.5", children: SIDEBAR_ITEMS.map(
          ({ icon: Icon, label, count }) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setActiveFolder(label),
              className: `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm transition-all ${activeFolder === label ? "bg-primary-50 text-primary-600 font-semibold" : "text-gray-600 hover:bg-gray-100 font-medium"}`,
              children: [
                /* @__PURE__ */ jsxDEV(Icon, { className: "w-4 h-4 flex-shrink-0" }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 188,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "flex-1 text-left", children: label }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 189,
                  columnNumber: 19
                }, this),
                label === "받은 메일함" && unread > 0 && /* @__PURE__ */ jsxDEV("span", { className: "w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center", children: unread }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 191,
                  columnNumber: 17
                }, this),
                count > 0 && label !== "받은 메일함" && /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 font-inter", children: count }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 196,
                  columnNumber: 17
                }, this)
              ]
            },
            label,
            true,
            {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 179,
              columnNumber: 15
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 177,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "mt-auto pt-4 border-t border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-50 border border-primary-100 rounded-2xl p-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-1.5", children: [
            /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3.5 h-3.5 text-primary-500" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 205,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-primary-700 text-xs font-semibold", children: "피싱 차단 중" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 206,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 204,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-primary-600 text-xs leading-relaxed", children: "인증되지 않은 발신자의 메일이 자동으로 차단됩니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 208,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 203,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 202,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 172,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: `flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden ${selected ? "hidden lg:flex" : "flex"}`, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative flex-1", children: [
            /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 216,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "text",
                placeholder: "메일 검색...",
                value: searchQuery,
                onChange: (e) => setSearchQuery(e.target.value),
                className: "w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-100",
                style: { letterSpacing: "-0.01em" }
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 217,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 215,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("button", { className: "p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors", children: /* @__PURE__ */ jsxDEV(RefreshCw, { className: "w-3.5 h-3.5" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 227,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 226,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 214,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto", children: filtered.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-full text-center py-16", children: [
          /* @__PURE__ */ jsxDEV(Mail, { className: "w-10 h-10 text-gray-200 mb-3" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 234,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-sm", children: "메일이 없습니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 235,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 233,
          columnNumber: 15
        }, this) : filtered.map(
          (mail) => /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => handleSelect(mail),
              className: `w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 group ${selected?.id === mail.id ? "bg-primary-50 border-b-primary-100" : ""}`,
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: `w-2 h-2 rounded-full mt-2 flex-shrink-0 ${mail.read ? "bg-transparent" : "bg-primary-500"}` }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 246,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-2 mb-1", children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 min-w-0", children: [
                      /* @__PURE__ */ jsxDEV("span", { className: `text-xs font-semibold truncate ${mail.read ? "text-gray-700" : "text-gray-900"}`, style: { letterSpacing: "-0.01em" }, children: mail.from }, void 0, false, {
                        fileName: "/home/project/src/pages/SecureMailPage.tsx",
                        lineNumber: 250,
                        columnNumber: 27
                      }, this),
                      mail.certified && /* @__PURE__ */ jsxDEV(Shield, { className: "w-3 h-3 text-primary-500 flex-shrink-0" }, void 0, false, {
                        fileName: "/home/project/src/pages/SecureMailPage.tsx",
                        lineNumber: 254,
                        columnNumber: 23
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/home/project/src/pages/SecureMailPage.tsx",
                      lineNumber: 249,
                      columnNumber: 25
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 flex-shrink-0", children: [
                      mail.tag && /* @__PURE__ */ jsxDEV("span", { className: `text-xs px-1.5 py-0.5 rounded-md font-medium border ${mail.tagColor}`, children: mail.tag }, void 0, false, {
                        fileName: "/home/project/src/pages/SecureMailPage.tsx",
                        lineNumber: 259,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 font-inter", children: mail.time }, void 0, false, {
                        fileName: "/home/project/src/pages/SecureMailPage.tsx",
                        lineNumber: 263,
                        columnNumber: 27
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/home/project/src/pages/SecureMailPage.tsx",
                      lineNumber: 257,
                      columnNumber: 25
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/SecureMailPage.tsx",
                    lineNumber: 248,
                    columnNumber: 23
                  }, this),
                  /* @__PURE__ */ jsxDEV("p", { className: `text-xs truncate mb-0.5 ${mail.read ? "text-gray-600" : "text-gray-800 font-semibold"}`, style: { letterSpacing: "-0.01em" }, children: mail.subject }, void 0, false, {
                    fileName: "/home/project/src/pages/SecureMailPage.tsx",
                    lineNumber: 266,
                    columnNumber: 23
                  }, this),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-400 truncate", children: mail.preview }, void 0, false, {
                    fileName: "/home/project/src/pages/SecureMailPage.tsx",
                    lineNumber: 269,
                    columnNumber: 23
                  }, this)
                ] }, void 0, true, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 247,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: (e) => toggleStar(mail.id, e),
                    className: "flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                    children: /* @__PURE__ */ jsxDEV(Star, { className: `w-4 h-4 ${mail.starred ? "text-amber-400 fill-amber-400 opacity-100" : "text-gray-300"}` }, void 0, false, {
                      fileName: "/home/project/src/pages/SecureMailPage.tsx",
                      lineNumber: 275,
                      columnNumber: 23
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "/home/project/src/pages/SecureMailPage.tsx",
                    lineNumber: 271,
                    columnNumber: 21
                  },
                  this
                )
              ]
            },
            mail.id,
            true,
            {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 239,
              columnNumber: 15
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 231,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 213,
        columnNumber: 11
      }, this),
      selected && /* @__PURE__ */ jsxDEV("div", { className: "flex-1 lg:flex-none lg:w-[55%] flex flex-col bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden animate-fade-in", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 flex-shrink-0", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setSelected(null),
              className: "p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors lg:hidden",
              children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 290,
                columnNumber: 19
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 286,
              columnNumber: 17
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-bold text-sm truncate", style: { letterSpacing: "-0.02em" }, children: selected.subject }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 293,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 292,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 flex-shrink-0", children: [
            /* @__PURE__ */ jsxDEV("button", { className: "p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors", children: /* @__PURE__ */ jsxDEV(Reply, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 297,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 296,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("button", { className: "p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors", children: /* @__PURE__ */ jsxDEV(Forward, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 300,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 299,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("button", { className: "p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors", children: /* @__PURE__ */ jsxDEV(Trash2, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 303,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 302,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setSelected(null),
                className: "hidden lg:flex p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors",
                children: /* @__PURE__ */ jsxDEV(X, { className: "w-3.5 h-3.5" }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 309,
                  columnNumber: 21
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 305,
                columnNumber: 19
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 295,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 285,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "px-5 py-4 border-b border-gray-100 flex-shrink-0", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: `w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${selected.certified ? "bg-primary-500" : "bg-gray-200"}`, children: selected.certified ? /* @__PURE__ */ jsxDEV(Shield, { className: "w-5 h-5 text-white" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 319,
              columnNumber: 21
            }, this) : /* @__PURE__ */ jsxDEV(Mail, { className: "w-5 h-5 text-gray-500" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 320,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 317,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-gray-900 font-bold text-sm", style: { letterSpacing: "-0.015em" }, children: selected.from }, void 0, false, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 325,
                  columnNumber: 25
                }, this),
                selected.certified && /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1 text-xs text-primary-600 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full font-semibold", children: [
                  /* @__PURE__ */ jsxDEV(CheckCircle, { className: "w-3 h-3" }, void 0, false, {
                    fileName: "/home/project/src/pages/SecureMailPage.tsx",
                    lineNumber: 328,
                    columnNumber: 29
                  }, this),
                  "VLUE 인증"
                ] }, void 0, true, {
                  fileName: "/home/project/src/pages/SecureMailPage.tsx",
                  lineNumber: 327,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 324,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs font-inter", children: selected.fromOrg }, void 0, false, {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 333,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 323,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 316,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-right flex-shrink-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-gray-500 text-xs font-inter", children: selected.date }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 337,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs font-inter", children: selected.time }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 338,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 336,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 315,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 314,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto px-5 py-5", children: [
          selected.certified && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 p-3 bg-primary-50 border border-primary-100 rounded-2xl mb-5", children: [
            /* @__PURE__ */ jsxDEV(Lock, { className: "w-4 h-4 text-primary-500 flex-shrink-0" }, void 0, false, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 346,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-primary-700 text-xs leading-relaxed", children: [
              "이 메일은 ",
              /* @__PURE__ */ jsxDEV("strong", { children: "VLUE 인증 기관" }, void 0, false, {
                fileName: "/home/project/src/pages/SecureMailPage.tsx",
                lineNumber: 348,
                columnNumber: 29
              }, this),
              "에서 발송된 공식 안전 메일입니다. 개인정보 피싱 위험이 없습니다."
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SecureMailPage.tsx",
              lineNumber: 347,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 345,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-gray-700 text-sm leading-loose whitespace-pre-line", style: { letterSpacing: "-0.01em" }, children: selected.body }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 352,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 343,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "px-5 py-3 border-t border-gray-100 flex-shrink-0", children: /* @__PURE__ */ jsxDEV("button", { className: "w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-gray-600 hover:text-primary-600 text-sm font-semibold rounded-2xl transition-all", children: [
          /* @__PURE__ */ jsxDEV(Reply, { className: "w-4 h-4" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 359,
            columnNumber: 19
          }, this),
          "답장하기",
          /* @__PURE__ */ jsxDEV(ChevronRight, { className: "w-3.5 h-3.5 ml-auto" }, void 0, false, {
            fileName: "/home/project/src/pages/SecureMailPage.tsx",
            lineNumber: 361,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 358,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SecureMailPage.tsx",
          lineNumber: 357,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SecureMailPage.tsx",
        lineNumber: 284,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SecureMailPage.tsx",
      lineNumber: 171,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SecureMailPage.tsx",
      lineNumber: 170,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/SecureMailPage.tsx",
    lineNumber: 119,
    columnNumber: 5
  }, this);
}
_s(SecureMailPage, "O9XYdbi7SP38UsMS+9PTYo2u2n8=");
_c = SecureMailPage;
var _c;
$RefreshReg$(_c, "SecureMailPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/SecureMailPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/SecureMailPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUFBLG1DQUFDLFFBQUssV0FBVSw0Q0FBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBd0Q7QUFBQSxZQUN4RCx1QkFBQyxPQUFFLFdBQVUsNENBQTBDO0FBQUE7QUFBQSxjQUMvQyx1QkFBQyxZQUFPLDBCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWtCO0FBQUEsY0FBUztBQUFBLGlCQURuQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUVBO0FBQUEsZUFKRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUtBO0FBQUEsVUFFRix1QkFBQyxTQUFJLFdBQVUsMkRBQTBELE9BQU8sRUFBRWlDLGVBQWUsVUFBVSxHQUN4R3BCLG1CQUFTbEIsUUFEWjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsYUFYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBWUE7QUFBQSxRQUVBLHVCQUFDLFNBQUksV0FBVSxvREFDYixpQ0FBQyxZQUFPLFdBQVUsa05BQ2hCO0FBQUEsaUNBQUMsU0FBTSxXQUFVLGFBQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTBCO0FBQUE7QUFBQSxVQUUxQix1QkFBQyxnQkFBYSxXQUFVLHlCQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2QztBQUFBLGFBSC9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFJQSxLQUxGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFNQTtBQUFBLFdBL0VGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFnRkE7QUFBQSxTQWpNSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBbU1BLEtBcE1GO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FxTUE7QUFBQSxPQXhQRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBeVBBO0FBRUo7QUFBQ2MsR0FuUnVCRixnQkFBYztBQUFBOEIsS0FBZDlCO0FBQWMsSUFBQThCO0FBQUFDLGFBQUFELElBQUEiLCJuYW1lcyI6WyJNYWlsIiwiU2hpZWxkIiwiQ2hldnJvblJpZ2h0IiwiU2VhcmNoIiwiU3RhciIsIlRyYXNoMiIsIkFyY2hpdmUiLCJTZW5kIiwiSW5ib3giLCJSZWZyZXNoQ3ciLCJMb2NrIiwiQ2hlY2tDaXJjbGUiLCJBcnJvd0xlZnQiLCJYIiwiUmVwbHkiLCJGb3J3YXJkIiwiTU9DS19NQUlMUyIsImlkIiwiZnJvbSIsImZyb21PcmciLCJzdWJqZWN0IiwicHJldmlldyIsImJvZHkiLCJ0aW1lIiwiZGF0ZSIsInJlYWQiLCJzdGFycmVkIiwiY2VydGlmaWVkIiwidGFnIiwidGFnQ29sb3IiLCJTSURFQkFSX0lURU1TIiwiaWNvbiIsImxhYmVsIiwiY291bnQiLCJTZWN1cmVNYWlsUGFnZSIsIm9uQmFjayIsIl9zIiwibWFpbHMiLCJzZXRNYWlscyIsInVzZVN0YXRlIiwic2VsZWN0ZWQiLCJzZXRTZWxlY3RlZCIsImFjdGl2ZUZvbGRlciIsInNldEFjdGl2ZUZvbGRlciIsInNlYXJjaFF1ZXJ5Iiwic2V0U2VhcmNoUXVlcnkiLCJmaWx0ZXJlZCIsImZpbHRlciIsIm0iLCJ0b0xvd2VyQ2FzZSIsImluY2x1ZGVzIiwidW5yZWFkIiwibGVuZ3RoIiwiaGFuZGxlU2VsZWN0IiwibWFpbCIsInByZXYiLCJtYXAiLCJ0b2dnbGVTdGFyIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsImxldHRlclNwYWNpbmciLCJJY29uIiwidGFyZ2V0IiwidmFsdWUiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJTZWN1cmVNYWlsUGFnZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBNYWlsLCBTaGllbGQsIENoZXZyb25SaWdodCwgU2VhcmNoLCBTdGFyLCBUcmFzaDIsIEFyY2hpdmUsIFNlbmQsIEluYm94LCBSZWZyZXNoQ3csIExvY2ssIENoZWNrQ2lyY2xlLCBBcnJvd0xlZnQsIFgsIFJlcGx5LCBGb3J3YXJkIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuaW50ZXJmYWNlIE1haWxJdGVtIHtcbiAgaWQ6IHN0cmluZztcbiAgZnJvbTogc3RyaW5nO1xuICBmcm9tT3JnOiBzdHJpbmc7XG4gIHN1YmplY3Q6IHN0cmluZztcbiAgcHJldmlldzogc3RyaW5nO1xuICBib2R5OiBzdHJpbmc7XG4gIHRpbWU6IHN0cmluZztcbiAgZGF0ZTogc3RyaW5nO1xuICByZWFkOiBib29sZWFuO1xuICBzdGFycmVkOiBib29sZWFuO1xuICBjZXJ0aWZpZWQ6IGJvb2xlYW47XG4gIHRhZz86IHN0cmluZztcbiAgdGFnQ29sb3I/OiBzdHJpbmc7XG59XG5cbmNvbnN0IE1PQ0tfTUFJTFM6IE1haWxJdGVtW10gPSBbXG4gIHtcbiAgICBpZDogJ20xJyxcbiAgICBmcm9tOiAn66qF6rK97LGEIOyalOyWkeuzkeybkCcsXG4gICAgZnJvbU9yZzogJ1ZMVUUtTUVELTIwMjQtMDAzMScsXG4gICAgc3ViamVjdDogJ1vrqoXqsr3ssYQg7JqU7JaR67OR7JuQXSAyMDI064WEIOqxtOqwleqygOynhCDslYjrgrQnLFxuICAgIHByZXZpZXc6ICfslYjrhZXtlZjshLjsmpQuIOuqheqyveyxhCDsmpTslpHrs5Hsm5DsnoXri4jri6QuIDIwMjTrhYQg7Jew6rCEIOqxtOqwleqygOynhCDsnbzsoJXsnYQg7JWI64K065Oc66a964uI64ukLi4uJyxcbiAgICBib2R5OiAn7JWI64WV7ZWY7IS47JqULiDrqoXqsr3ssYQg7JqU7JaR67OR7JuQ7J6F64uI64ukLlxcblxcbjIwMjTrhYQg7Jew6rCEIOqxtOqwleqygOynhCDsnbzsoJXsnYQg7JWI64K065Oc66a964uI64ukLlxcblxcbuqygOynhCDsnbzsoJU6IDIwMjTrhYQgMTLsm5QgMeydvCB+IDIwMjXrhYQgMeyblCAzMeydvFxcbuqygOynhCDtla3rqqk6IOq4sOuzuCDtmIjslaEg6rKA7IKsLCDtnYnrtoAgWC1yYXksIOuzteu2gCDstIjsnYztjIxcXG5cXG7smIjslb0g66y47J2YOiAwMi0xMjM0LTU2NzhcXG5cXG7rs7gg66mU7J287J2AIFZMVUUg7J247KadIOq4sOq0gOyXkOyEnCDrsJzshqHrkJwg7JWI7KCE7ZWcIOuplOydvOyeheuLiOuLpC4nLFxuICAgIHRpbWU6ICfsmKTsoIQgMTA6MjQnLFxuICAgIGRhdGU6ICcyMDI0LjEyLjE1JyxcbiAgICByZWFkOiBmYWxzZSxcbiAgICBzdGFycmVkOiB0cnVlLFxuICAgIGNlcnRpZmllZDogdHJ1ZSxcbiAgICB0YWc6ICfsnZjro4wnLFxuICAgIHRhZ0NvbG9yOiAndGV4dC1yZWQtNjAwIGJnLXJlZC01MCBib3JkZXItcmVkLTEwMCcsXG4gIH0sXG4gIHtcbiAgICBpZDogJ20yJyxcbiAgICBmcm9tOiAn64uk64uk7Jik7ZS87IqkJyxcbiAgICBmcm9tT3JnOiAnVkxVRS1CSVotMjAyNC0wMDg3JyxcbiAgICBzdWJqZWN0OiAnW+uLpOuLpOyYpO2UvOyKpF0gMTLsm5Qg7J207JqpIOyalOq4iCDssq3qtazshJwnLFxuICAgIHByZXZpZXc6ICfri6Tri6TsmKTtlLzsiqTrpbwg7J207Jqp7ZW0IOyjvOyFlOyEnCDqsJDsgqztlanri4jri6QuIDEy7JuUIOydtOyaqSDsmpTquIgg7LKt6rWs7ISc66W8IOyyqOu2gO2VqeuLiOuLpC4uLicsXG4gICAgYm9keTogJ+uLpOuLpOyYpO2UvOyKpOulvCDsnbTsmqntlbQg7KO87IWU7IScIOqwkOyCrO2VqeuLiOuLpC5cXG5cXG4xMuyblCDsnbTsmqkg7JqU6riIIOyyreq1rOyEnOulvCDslYjrgrTrk5zrpr3ri4jri6QuXFxuXFxu7LKt6rWsIOq4sOqwhDogMjAyNOuFhCAxMuyblCAx7J28IH4gMTLsm5QgMzHsnbxcXG7ssq3qtawg6riI7JWhOiA1NSwwMDDsm5AgKFZBVCDtj6ztlagpXFxu64Kp67aAIOq4sO2VnDogMjAyNeuFhCAx7JuUIDEw7J28XFxuXFxu7J6Q64+Z7J207LK0IOqzhOyijOuhnCDstpzquIgg7JiI7KCV7J6F64uI64ukLlxcblxcbuusuOydmDogMTU4OC0wMDAwJyxcbiAgICB0aW1lOiAn7Ja07KCcJyxcbiAgICBkYXRlOiAnMjAyNC4xMi4xNCcsXG4gICAgcmVhZDogdHJ1ZSxcbiAgICBzdGFycmVkOiBmYWxzZSxcbiAgICBjZXJ0aWZpZWQ6IHRydWUsXG4gICAgdGFnOiAn7LKt6rWs7IScJyxcbiAgICB0YWdDb2xvcjogJ3RleHQtYmx1ZS02MDAgYmctYmx1ZS01MCBib3JkZXItYmx1ZS0xMDAnLFxuICB9LFxuICB7XG4gICAgaWQ6ICdtMycsXG4gICAgZnJvbTogJ+2VnOq1reyLoOuisOq4iOyctScsXG4gICAgZnJvbU9yZzogJ1ZMVUUtRklOLTIwMjQtMDAxMicsXG4gICAgc3ViamVjdDogJ1vtlZzqta3si6DrorDquIjsnLVdIOuMgOy2nCDsg4HtmZgg7J287KCVIOyViOuCtCcsXG4gICAgcHJldmlldzogJ+yViOuFle2VmOyEuOyalCwg6rOg6rCd64uYLiDrjIDstpwg7IOB7ZmYIOydvOygleqzvCDqtIDroKjtlZjsl6wg7JWI64K0IOunkOyUgCDrk5zrpr3ri4jri6QuLi4nLFxuICAgIGJvZHk6ICfslYjrhZXtlZjshLjsmpQsIOqzoOqwneuLmC5cXG5cXG7rjIDstpwg7IOB7ZmYIOydvOygleqzvCDqtIDroKjtlZjsl6wg7JWI64K0IOunkOyUgCDrk5zrpr3ri4jri6QuXFxuXFxu64uk7J2MIOuLrCDsg4HtmZgg7JiI7KCVIOq4iOyVoTogMzUwLDAwMOybkFxcbuyDge2ZmCDsmIjsoJXsnbw6IDIwMjXrhYQgMeyblCA17J28XFxu7J6U7JesIOybkOq4iDogOCwyMDAsMDAw7JuQXFxuXFxu7J6Q7IS47ZWcIOuCtOyaqeydgCDslbHsl5DshJwg7ZmV7J24IOqwgOuKpe2VqeuLiOuLpC5cXG5cXG7rs7gg66mU7J287J2AIFZMVUUg7J247KadIOuwnOyLoOycvOuhnCDslYjsoITtlZwg6rO17IudIOuplOydvOyeheuLiOuLpC4nLFxuICAgIHRpbWU6ICcy7J28IOyghCcsXG4gICAgZGF0ZTogJzIwMjQuMTIuMTMnLFxuICAgIHJlYWQ6IHRydWUsXG4gICAgc3RhcnJlZDogZmFsc2UsXG4gICAgY2VydGlmaWVkOiB0cnVlLFxuICAgIHRhZzogJ+q4iOyctScsXG4gICAgdGFnQ29sb3I6ICd0ZXh0LWVtZXJhbGQtNjAwIGJnLWVtZXJhbGQtNTAgYm9yZGVyLWVtZXJhbGQtMTAwJyxcbiAgfSxcbiAge1xuICAgIGlkOiAnbTQnLFxuICAgIGZyb206ICdWTFVFIO2UjOueq+2PvCcsXG4gICAgZnJvbU9yZzogJ3BsYXRmb3JtQHZsdWUua3InLFxuICAgIHN1YmplY3Q6ICdWTFVFIOuztOyViCDrqZTsnbwg7ISc67mE7Iqk7JeQIOyYpOyLoCDqsoPsnYQg7ZmY7JiB7ZWp64uI64ukIScsXG4gICAgcHJldmlldzogJ1ZMVUUg67O07JWIIOuplOydvCDshJzruYTsiqTrpbwg7J207Jqp7ZW0IOyjvOyFlOyEnCDqsJDsgqztlanri4jri6QuIOyduOymnSDquLDqtIDsnZgg6rO17IudIOuplOydvOunjOydhC4uLicsXG4gICAgYm9keTogJ1ZMVUUg67O07JWIIOuplOydvCDshJzruYTsiqTrpbwg7J207Jqp7ZW0IOyjvOyFlOyEnCDqsJDsgqztlanri4jri6QuXFxuXFxuVkxVRSDsnbjspp0g6riw6rSA7J2YIOqzteyLnSDrqZTsnbzrp4zsnYQg7JWI7KCE7ZWY6rKMIOyImOyLoO2VoCDsiJgg7J6I7Iq164uI64ukLlxcblxcbuyjvOyalCDquLDriqU6XFxu4oCiIFZMVUUg7J247KadIOuwnOyLoOyekCDtmZXsnbhcXG7igKIg7ZS87IuxIOuplOydvCDsnpDrj5kg7LCo64uoXFxu4oCiIOuwnOyLoCDquLDqtIAg7Iuk7Iuc6rCEIOyduOymnSDsobDtmoxcXG7igKIg66mU7J28IOyVlO2YuO2ZlCDsoITshqFcXG5cXG7rjZQg7JWI7KCE7ZWcIOuUlOyngO2EuCDsg53tmZzsnYQg7JyE7ZW0IFZMVUXsmYAg7ZWo6ruY7ZWY7IS47JqULicsXG4gICAgdGltZTogJzHso7wg7KCEJyxcbiAgICBkYXRlOiAnMjAyNC4xMi4wOCcsXG4gICAgcmVhZDogdHJ1ZSxcbiAgICBzdGFycmVkOiB0cnVlLFxuICAgIGNlcnRpZmllZDogZmFsc2UsXG4gICAgdGFnOiAn7JWI64K0JyxcbiAgICB0YWdDb2xvcjogJ3RleHQtZ3JheS02MDAgYmctZ3JheS01MCBib3JkZXItZ3JheS0yMDAnLFxuICB9LFxuXTtcblxuY29uc3QgU0lERUJBUl9JVEVNUyA9IFtcbiAgeyBpY29uOiBJbmJveCwgbGFiZWw6ICfrsJvsnYAg66mU7J287ZWoJywgY291bnQ6IDEgfSxcbiAgeyBpY29uOiBTZW5kLCBsYWJlbDogJ+uztOuCuCDrqZTsnbztlagnLCBjb3VudDogMCB9LFxuICB7IGljb246IFN0YXIsIGxhYmVsOiAn7KSR7JqUIOuplOydvCcsIGNvdW50OiAyIH0sXG4gIHsgaWNvbjogQXJjaGl2ZSwgbGFiZWw6ICfrs7TqtIDtlagnLCBjb3VudDogMCB9LFxuICB7IGljb246IFRyYXNoMiwgbGFiZWw6ICftnLTsp4DthrUnLCBjb3VudDogMCB9LFxuXTtcblxuaW50ZXJmYWNlIFNlY3VyZU1haWxQYWdlUHJvcHMge1xuICBvbkJhY2s6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFNlY3VyZU1haWxQYWdlKHsgb25CYWNrIH06IFNlY3VyZU1haWxQYWdlUHJvcHMpIHtcbiAgY29uc3QgW21haWxzLCBzZXRNYWlsc10gPSB1c2VTdGF0ZTxNYWlsSXRlbVtdPihNT0NLX01BSUxTKTtcbiAgY29uc3QgW3NlbGVjdGVkLCBzZXRTZWxlY3RlZF0gPSB1c2VTdGF0ZTxNYWlsSXRlbSB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbYWN0aXZlRm9sZGVyLCBzZXRBY3RpdmVGb2xkZXJdID0gdXNlU3RhdGUoJ+uwm+ydgCDrqZTsnbztlagnKTtcbiAgY29uc3QgW3NlYXJjaFF1ZXJ5LCBzZXRTZWFyY2hRdWVyeV0gPSB1c2VTdGF0ZSgnJyk7XG5cbiAgY29uc3QgZmlsdGVyZWQgPSBtYWlscy5maWx0ZXIoKG0pID0+XG4gICAgbS5zdWJqZWN0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkgfHxcbiAgICBtLmZyb20udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2hRdWVyeS50b0xvd2VyQ2FzZSgpKVxuICApO1xuXG4gIGNvbnN0IHVucmVhZCA9IG1haWxzLmZpbHRlcigobSkgPT4gIW0ucmVhZCkubGVuZ3RoO1xuXG4gIGNvbnN0IGhhbmRsZVNlbGVjdCA9IChtYWlsOiBNYWlsSXRlbSkgPT4ge1xuICAgIHNldFNlbGVjdGVkKG1haWwpO1xuICAgIHNldE1haWxzKChwcmV2KSA9PiBwcmV2Lm1hcCgobSkgPT4gbS5pZCA9PT0gbWFpbC5pZCA/IHsgLi4ubSwgcmVhZDogdHJ1ZSB9IDogbSkpO1xuICB9O1xuXG4gIGNvbnN0IHRvZ2dsZVN0YXIgPSAoaWQ6IHN0cmluZywgZTogUmVhY3QuTW91c2VFdmVudCkgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2V0TWFpbHMoKHByZXYpID0+IHByZXYubWFwKChtKSA9PiBtLmlkID09PSBpZCA/IHsgLi4ubSwgc3RhcnJlZDogIW0uc3RhcnJlZCB9IDogbSkpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPG1haW4gY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLWJsdWUtdGludCBwdC0xNlwiPlxuICAgICAgey8qIOuCtCDrs7TslYgg66mU7J28IOyjvOyGjCDrsLDrhIggKi99XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWdyYWRpZW50LXRvLXIgZnJvbS1wcmltYXJ5LTYwMCB0by1wcmltYXJ5LTUwMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB5LTQgZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBzbTppdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIGZsZXgtMSBtaW4tdy0wXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLTJ4bCBiZy13aGl0ZS8yMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgIDxNYWlsIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLXctMFwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQteHMgZm9udC1tZWRpdW0gbWItMC41XCI+64K0IOuztOyViCDrqZTsnbwg7KO87IaMPC9wPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGZsZXgtd3JhcFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ib2xkIHRleHQtYmFzZSB0cmFja2luZy10aWdodFwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMmVtJyB9fT51c2VyQHZsdWUua3I8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHRleHQteHMgdGV4dC13aGl0ZSBiZy13aGl0ZS8yMCBib3JkZXIgYm9yZGVyLXdoaXRlLzMwIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbCBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgICAgICAgICAgICDrs7TslYgg7J247KadXG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMgcHktMS41IHJvdW5kZWQtMnhsIGJnLXdoaXRlLzE1IGJvcmRlciBib3JkZXItd2hpdGUvMjVcIj5cbiAgICAgICAgICAgICAgPExvY2sgY2xhc3NOYW1lPVwidy0zIGgtMyB0ZXh0LXdoaXRlLzgwXCIgLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS85MCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGRcIj4xR0Ig66y066OMIOygnOqztTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIGJvcmRlci1iIGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB5LTMgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uQmFja30gY2xhc3NOYW1lPVwicC0xLjUgdGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LXByaW1hcnktNTAwIGhvdmVyOmJnLXByaW1hcnktNTAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWFsbFwiPlxuICAgICAgICAgICAgPEFycm93TGVmdCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctNyBoLTcgcm91bmRlZC14bCBiZy1wcmltYXJ5LTUwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICA8TG9jayBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtZ3JheS05MDBcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDJlbScgfX0+67O07JWIIOuplOydvO2VqDwvaDE+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14c1wiPlZMVUUg7J247KadIOq4sOq0gCDqs7Xsi50g66mU7J2866eMIOyImOyLoOuQqeuLiOuLpDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWwtYXV0byBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTIuNSBweS0xIHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDBcIj5cbiAgICAgICAgICAgICAgPFNoaWVsZCBjbGFzc05hbWU9XCJ3LTMgaC0zIHRleHQtcHJpbWFyeS01MDBcIiAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgZm9udC1zZW1pYm9sZFwiPuuztOyViCDtmZzshLHtmZQ8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS01XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtNSBoLVtjYWxjKDEwMHZoLTE2MHB4KV0gbWluLWgtWzYwMHB4XVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy01MiBmbGV4LXNocmluay0wIGhpZGRlbiBtZDpmbGV4IGZsZXgtY29sIGdhcC0yXCI+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweS0yLjUgYmctcHJpbWFyeS01MDAgaG92ZXI6YmctcHJpbWFyeS02MDAgdGV4dC13aGl0ZSB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgcm91bmRlZC0yeGwgdHJhbnNpdGlvbi1jb2xvcnMgc2hhZG93LXNvZnQgbWItMlwiPlxuICAgICAgICAgICAgICA8TWFpbCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAg66mU7J28IOyTsOq4sFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8bmF2IGNsYXNzTmFtZT1cInNwYWNlLXktMC41XCI+XG4gICAgICAgICAgICAgIHtTSURFQkFSX0lURU1TLm1hcCgoeyBpY29uOiBJY29uLCBsYWJlbCwgY291bnQgfSkgPT4gKFxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGtleT17bGFiZWx9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVGb2xkZXIobGFiZWwpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgdy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjUgcHgtMyBweS0yLjUgcm91bmRlZC0yeGwgdGV4dC1zbSB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVGb2xkZXIgPT09IGxhYmVsXG4gICAgICAgICAgICAgICAgICAgICAgPyAnYmctcHJpbWFyeS01MCB0ZXh0LXByaW1hcnktNjAwIGZvbnQtc2VtaWJvbGQnXG4gICAgICAgICAgICAgICAgICAgICAgOiAndGV4dC1ncmF5LTYwMCBob3ZlcjpiZy1ncmF5LTEwMCBmb250LW1lZGl1bSdcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT1cInctNCBoLTQgZmxleC1zaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4LTEgdGV4dC1sZWZ0XCI+e2xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIHtsYWJlbCA9PT0gJ+uwm+ydgCDrqZTsnbztlagnICYmIHVucmVhZCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ3LTUgaC01IHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTUwMCB0ZXh0LXdoaXRlIHRleHQteHMgZm9udC1ib2xkIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAge3VucmVhZH1cbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIHtjb3VudCA+IDAgJiYgbGFiZWwgIT09ICfrsJvsnYAg66mU7J287ZWoJyAmJiAoXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1ncmF5LTQwMCBmb250LWludGVyXCI+e2NvdW50fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9uYXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtYXV0byBwdC00IGJvcmRlci10IGJvcmRlci1ncmF5LTEwMFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXByaW1hcnktNTAgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTEwMCByb3VuZGVkLTJ4bCBwLTNcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTEuNVwiPlxuICAgICAgICAgICAgICAgICAgPENoZWNrQ2lyY2xlIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtcHJpbWFyeS01MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5LTcwMCB0ZXh0LXhzIGZvbnQtc2VtaWJvbGRcIj7tlLzsi7Eg7LCo64uoIOykkTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgbGVhZGluZy1yZWxheGVkXCI+7J247Kad65CY7KeAIOyViuydgCDrsJzsi6DsnpDsnZgg66mU7J287J20IOyekOuPmeycvOuhnCDssKjri6jrkKnri4jri6QuPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BmbGV4LTEgZmxleCBmbGV4LWNvbCBiZy13aGl0ZSByb3VuZGVkLTN4bCBib3JkZXIgYm9yZGVyLWdyYXktMTAwIHNoYWRvdy1jYXJkIG92ZXJmbG93LWhpZGRlbiAke3NlbGVjdGVkID8gJ2hpZGRlbiBsZzpmbGV4JyA6ICdmbGV4J31gfT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcHgtNCBweS0zIGJvcmRlci1iIGJvcmRlci1ncmF5LTEwMCBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgZmxleC0xXCI+XG4gICAgICAgICAgICAgICAgPFNlYXJjaCBjbGFzc05hbWU9XCJhYnNvbHV0ZSBsZWZ0LTMgdG9wLTEvMiAtdHJhbnNsYXRlLXktMS8yIHctMy41IGgtMy41IHRleHQtZ3JheS00MDBcIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLrqZTsnbwg6rKA7IOJLi4uXCJcbiAgICAgICAgICAgICAgICAgIHZhbHVlPXtzZWFyY2hRdWVyeX1cbiAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0U2VhcmNoUXVlcnkoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHBsLTggcHItMyBweS0yIHRleHQteHMgYmctZ3JheS01MCBib3JkZXIgYm9yZGVyLWdyYXktMjAwIHJvdW5kZWQteGwgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1wcmltYXJ5LTMwMCBmb2N1czpyaW5nLTEgZm9jdXM6cmluZy1wcmltYXJ5LTEwMFwiXG4gICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDFlbScgfX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJwLTIgdGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LXByaW1hcnktNTAwIGhvdmVyOmJnLXByaW1hcnktNTAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICAgIDxSZWZyZXNoQ3cgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICAgICAgICAge2ZpbHRlcmVkLmxlbmd0aCA9PT0gMCA/IChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGgtZnVsbCB0ZXh0LWNlbnRlciBweS0xNlwiPlxuICAgICAgICAgICAgICAgICAgPE1haWwgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHRleHQtZ3JheS0yMDAgbWItM1wiIC8+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQtc21cIj7rqZTsnbzsnbQg7JeG7Iq164uI64ukLjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZC5tYXAoKG1haWwpID0+IChcbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAga2V5PXttYWlsLmlkfVxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVTZWxlY3QobWFpbCl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctZnVsbCB0ZXh0LWxlZnQgcHgtNCBweS0zLjUgYm9yZGVyLWIgYm9yZGVyLWdyYXktNTAgaG92ZXI6YmctZ3JheS01MCB0cmFuc2l0aW9uLWNvbG9ycyBmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0zIGdyb3VwICR7XG4gICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ/LmlkID09PSBtYWlsLmlkID8gJ2JnLXByaW1hcnktNTAgYm9yZGVyLWItcHJpbWFyeS0xMDAnIDogJydcbiAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy0yIGgtMiByb3VuZGVkLWZ1bGwgbXQtMiBmbGV4LXNocmluay0wICR7bWFpbC5yZWFkID8gJ2JnLXRyYW5zcGFyZW50JyA6ICdiZy1wcmltYXJ5LTUwMCd9YH0gLz5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIG1iLTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQteHMgZm9udC1zZW1pYm9sZCB0cnVuY2F0ZSAke21haWwucmVhZCA/ICd0ZXh0LWdyYXktNzAwJyA6ICd0ZXh0LWdyYXktOTAwJ31gfSBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDFlbScgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge21haWwuZnJvbX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFpbC5jZXJ0aWZpZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy0zIGgtMyB0ZXh0LXByaW1hcnktNTAwIGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFpbC50YWcgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQteHMgcHgtMS41IHB5LTAuNSByb3VuZGVkLW1kIGZvbnQtbWVkaXVtIGJvcmRlciAke21haWwudGFnQ29sb3J9YH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFpbC50YWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDAgZm9udC1pbnRlclwiPnttYWlsLnRpbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPXtgdGV4dC14cyB0cnVuY2F0ZSBtYi0wLjUgJHttYWlsLnJlYWQgPyAndGV4dC1ncmF5LTYwMCcgOiAndGV4dC1ncmF5LTgwMCBmb250LXNlbWlib2xkJ31gfSBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDFlbScgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICB7bWFpbC5zdWJqZWN0fVxuICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDAgdHJ1bmNhdGVcIj57bWFpbC5wcmV2aWV3fTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoZSkgPT4gdG9nZ2xlU3RhcihtYWlsLmlkLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LXNocmluay0wIG10LTAuNSBvcGFjaXR5LTAgZ3JvdXAtaG92ZXI6b3BhY2l0eS0xMDAgdHJhbnNpdGlvbi1vcGFjaXR5XCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxTdGFyIGNsYXNzTmFtZT17YHctNCBoLTQgJHttYWlsLnN0YXJyZWQgPyAndGV4dC1hbWJlci00MDAgZmlsbC1hbWJlci00MDAgb3BhY2l0eS0xMDAnIDogJ3RleHQtZ3JheS0zMDAnfWB9IC8+XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKSlcbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAge3NlbGVjdGVkICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGxnOmZsZXgtbm9uZSBsZzp3LVs1NSVdIGZsZXggZmxleC1jb2wgYmctd2hpdGUgcm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCBzaGFkb3ctY2FyZCBvdmVyZmxvdy1oaWRkZW4gYW5pbWF0ZS1mYWRlLWluXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtNSBweS0zLjUgYm9yZGVyLWIgYm9yZGVyLWdyYXktMTAwIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTZWxlY3RlZChudWxsKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMS41IHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1ncmF5LTYwMCBob3ZlcjpiZy1ncmF5LTEwMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzIGxnOmhpZGRlblwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPEFycm93TGVmdCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LWJvbGQgdGV4dC1zbSB0cnVuY2F0ZVwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMmVtJyB9fT57c2VsZWN0ZWQuc3ViamVjdH08L2gyPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJwLTEuNSB0ZXh0LWdyYXktNDAwIGhvdmVyOnRleHQtcHJpbWFyeS01MDAgaG92ZXI6YmctcHJpbWFyeS01MCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgICAgIDxSZXBseSBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicC0xLjUgdGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LXByaW1hcnktNTAwIGhvdmVyOmJnLXByaW1hcnktNTAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICAgICAgICA8Rm9yd2FyZCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicC0xLjUgdGV4dC1ncmF5LTQwMCBob3Zlcjp0ZXh0LXJlZC00MDAgaG92ZXI6YmctcmVkLTUwIHJvdW5kZWQteGwgdHJhbnNpdGlvbi1jb2xvcnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPFRyYXNoMiBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2VsZWN0ZWQobnVsbCl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImhpZGRlbiBsZzpmbGV4IHAtMS41IHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1ncmF5LTYwMCBob3ZlcjpiZy1ncmF5LTEwMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtNSBweS00IGJvcmRlci1iIGJvcmRlci1ncmF5LTEwMCBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtM1wiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMTAgaC0xMCByb3VuZGVkLTJ4bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wICR7c2VsZWN0ZWQuY2VydGlmaWVkID8gJ2JnLXByaW1hcnktNTAwJyA6ICdiZy1ncmF5LTIwMCd9YH0+XG4gICAgICAgICAgICAgICAgICAgICAge3NlbGVjdGVkLmNlcnRpZmllZFxuICAgICAgICAgICAgICAgICAgICAgICAgPyA8U2hpZWxkIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA6IDxNYWlsIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC1ncmF5LTUwMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtc21cIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDE1ZW0nIH19PntzZWxlY3RlZC5mcm9tfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtzZWxlY3RlZC5jZXJ0aWZpZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSB0ZXh0LXhzIHRleHQtcHJpbWFyeS02MDAgYmctcHJpbWFyeS01MCBib3JkZXIgYm9yZGVyLXByaW1hcnktMTAwIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbCBmb250LXNlbWlib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPENoZWNrQ2lyY2xlIGNsYXNzTmFtZT1cInctMyBoLTNcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZMVUUg7J247KadXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzIGZvbnQtaW50ZXJcIj57c2VsZWN0ZWQuZnJvbU9yZ308L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtcmlnaHQgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNTAwIHRleHQteHMgZm9udC1pbnRlclwiPntzZWxlY3RlZC5kYXRlfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzIGZvbnQtaW50ZXJcIj57c2VsZWN0ZWQudGltZX08L3A+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgb3ZlcmZsb3cteS1hdXRvIHB4LTUgcHktNVwiPlxuICAgICAgICAgICAgICAgIHtzZWxlY3RlZC5jZXJ0aWZpZWQgJiYgKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBwLTMgYmctcHJpbWFyeS01MCBib3JkZXIgYm9yZGVyLXByaW1hcnktMTAwIHJvdW5kZWQtMnhsIG1iLTVcIj5cbiAgICAgICAgICAgICAgICAgICAgPExvY2sgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNTAwIGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktNzAwIHRleHQteHMgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgICAgICAgICAg7J20IOuplOydvOydgCA8c3Ryb25nPlZMVUUg7J247KadIOq4sOq0gDwvc3Ryb25nPuyXkOyEnCDrsJzshqHrkJwg6rO17IudIOyViOyghCDrqZTsnbzsnoXri4jri6QuIOqwnOyduOygleuztCDtlLzsi7Eg7JyE7ZeY7J20IOyXhuyKteuLiOuLpC5cbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS03MDAgdGV4dC1zbSBsZWFkaW5nLWxvb3NlIHdoaXRlc3BhY2UtcHJlLWxpbmVcIiBzdHlsZT17eyBsZXR0ZXJTcGFjaW5nOiAnLTAuMDFlbScgfX0+XG4gICAgICAgICAgICAgICAgICB7c2VsZWN0ZWQuYm9keX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC01IHB5LTMgYm9yZGVyLXQgYm9yZGVyLWdyYXktMTAwIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweS0yLjUgYm9yZGVyIGJvcmRlci1ncmF5LTIwMCBob3Zlcjpib3JkZXItcHJpbWFyeS0yMDAgaG92ZXI6YmctcHJpbWFyeS01MCB0ZXh0LWdyYXktNjAwIGhvdmVyOnRleHQtcHJpbWFyeS02MDAgdGV4dC1zbSBmb250LXNlbWlib2xkIHJvdW5kZWQtMnhsIHRyYW5zaXRpb24tYWxsXCI+XG4gICAgICAgICAgICAgICAgICA8UmVwbHkgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgICDri7XsnqXtlZjquLBcbiAgICAgICAgICAgICAgICAgIDxDaGV2cm9uUmlnaHQgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgbWwtYXV0b1wiIC8+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L21haW4+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL3BhZ2VzL1NlY3VyZU1haWxQYWdlLnRzeCJ9