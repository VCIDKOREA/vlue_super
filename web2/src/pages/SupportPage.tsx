import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/SupportPage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/SupportPage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { HelpCircle, MessageCircle, ChevronDown, Send, ArrowLeft, Shield } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const FAQS = [
  {
    q: "VLUE V1 멤버십은 어떻게 가입하나요?",
    a: "상단 [인증신청]에서 무료·유료(월 9,900원)·B2B 요금제를 비교한 뒤, VLUE 앱에서 가입·결제합니다."
  },
  {
    q: "보이스피싱 의심 번호를 확인·신고하려면 어떻게 해야 하나요?",
    a: "홈 화면 검색창에 의심 번호 또는 기관명을 입력하면 즉시 조회됩니다. 조회 결과에서 위험도를 확인할 수 있습니다."
  },
  {
    q: "디지털 인증명함·블루 쇼케이스는 어떻게 이용하나요?",
    a: "V1 유료·B2B 멤버십에서 디지털 인증명함을, 무료 회원은 블루 쇼케이스를 이용할 수 있습니다. 앱 설치 후 [인증신청]을 확인하세요."
  },
  {
    q: "가족보호는 어떻게 시작하나요?",
    a: "웹 또는 앱에서 가족보호를 신청한 뒤, 보호 대상 번호를 등록하면 위험 통화·링크 알림을 받을 수 있습니다."
  },
  {
    q: "개인케이스는 로그인이 필요한가요?",
    a: "네. 개인케이스(명함저장·저장된케이스·내문서)는 웹·앱 동일 구성이며, 로그인 후 이용할 수 있습니다."
  }
];
export default function SupportPage({ user, onLoginClick, onBack }) {
  _s();
  const [openFaq, setOpenFaq] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user && onLoginClick) {
      onLoginClick();
      return;
    }
    setSubmitted(true);
  };
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-blue-tint pt-[60px]", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 py-10", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: onBack,
          className: "inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors",
          children: [
            /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 55,
              columnNumber: 13
            }, this),
            "홈으로"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 51,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 mb-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(HelpCircle, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 60,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 59,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-white/80 text-sm font-semibold", children: "VLUE 고객지원" }, void 0, false, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 62,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SupportPage.tsx",
        lineNumber: 58,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-3xl font-black text-white mb-1", children: "고객지원" }, void 0, false, {
        fileName: "/home/project/src/pages/SupportPage.tsx",
        lineNumber: 64,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-white/70 text-sm", children: "자주 묻는 질문과 1:1 문의를 통해 도움을 받으세요." }, void 0, false, {
        fileName: "/home/project/src/pages/SupportPage.tsx",
        lineNumber: 65,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SupportPage.tsx",
      lineNumber: 50,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SupportPage.tsx",
      lineNumber: 49,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10", children: [
      /* @__PURE__ */ jsxDEV("section", { className: "mb-12", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5 mb-6", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(HelpCircle, { className: "w-4 h-4 text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 74,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 73,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-black text-lg", style: { letterSpacing: "-0.03em" }, children: "자주 묻는 질문 (FAQ)" }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 76,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full font-semibold border border-primary-100", children: [
            FAQS.length,
            "건"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 77,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 72,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: FAQS.map(
          (faq, i) => /* @__PURE__ */ jsxDEV("div", { className: "card overflow-hidden", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setOpenFaq(openFaq === i ? null : i),
                className: "w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-black flex items-center justify-center mt-0.5", children: "Q" }, void 0, false, {
                      fileName: "/home/project/src/pages/SupportPage.tsx",
                      lineNumber: 87,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-gray-900 font-semibold text-sm", style: { wordBreak: "keep-all" }, children: faq.q }, void 0, false, {
                      fileName: "/home/project/src/pages/SupportPage.tsx",
                      lineNumber: 90,
                      columnNumber: 21
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 86,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV(ChevronDown, { className: `w-4 h-4 text-gray-400 flex-shrink-0 transition-transform mt-0.5 ${openFaq === i ? "rotate-180" : ""}` }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 92,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 82,
                columnNumber: 17
              },
              this
            ),
            openFaq === i && /* @__PURE__ */ jsxDEV("div", { className: "px-5 pb-5 pt-1 border-t border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-3", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center mt-0.5", children: "A" }, void 0, false, {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 97,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-gray-600 text-sm leading-relaxed", style: { wordBreak: "keep-all" }, children: faq.a }, void 0, false, {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 100,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 96,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 95,
              columnNumber: 15
            }, this)
          ] }, i, true, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 81,
            columnNumber: 13
          }, this)
        ) }, void 0, false, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 79,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SupportPage.tsx",
        lineNumber: 71,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5 mb-6", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(MessageCircle, { className: "w-4 h-4 text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 112,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 111,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-black text-lg", style: { letterSpacing: "-0.03em" }, children: "1:1 문의" }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 114,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 110,
          columnNumber: 11
        }, this),
        submitted ? /* @__PURE__ */ jsxDEV("div", { className: "card p-10 flex flex-col items-center text-center", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxDEV(Shield, { className: "w-8 h-8 text-emerald-500" }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 120,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 119,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-bold text-base mb-2", children: "문의가 접수되었습니다" }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 122,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-sm max-w-sm", style: { wordBreak: "keep-all" }, children: "영업일 기준 1~2일 이내에 이메일로 답변드립니다. 감사합니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 123,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 118,
          columnNumber: 11
        }, this) : /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSubmit, className: "card p-6 space-y-4", children: [
          !user && /* @__PURE__ */ jsxDEV("div", { className: "bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-sm font-medium", style: { wordBreak: "keep-all" }, children: "로그인이 필요한 서비스입니다. 문의 제출 시 로그인 화면으로 이동합니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 130,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "이름" }, void 0, false, {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 136,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "text",
                  value: name,
                  onChange: (e) => setName(e.target.value),
                  placeholder: "이름을 입력해 주세요",
                  className: "input-field",
                  required: true
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/pages/SupportPage.tsx",
                  lineNumber: 137,
                  columnNumber: 19
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 135,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "이메일" }, void 0, false, {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 147,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "email",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  placeholder: "답변받을 이메일",
                  className: "input-field",
                  required: true
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/pages/SupportPage.tsx",
                  lineNumber: 148,
                  columnNumber: 19
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 146,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 134,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "문의 유형" }, void 0, false, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 159,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV(
              "select",
              {
                value: subject,
                onChange: (e) => setSubject(e.target.value),
                className: "input-field",
                required: true,
                children: [
                  /* @__PURE__ */ jsxDEV("option", { value: "", children: "선택해 주세요" }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 166,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("option", { children: "인증 신청 관련" }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 167,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("option", { children: "블루쇼핑 / 블루페이" }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 168,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("option", { children: "디지털 명함" }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 169,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("option", { children: "구인구직" }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 170,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("option", { children: "기타 문의" }, void 0, false, {
                    fileName: "/home/project/src/pages/SupportPage.tsx",
                    lineNumber: 171,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 160,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 158,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: "문의 내용" }, void 0, false, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 175,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV(
              "textarea",
              {
                value: message,
                onChange: (e) => setMessage(e.target.value),
                placeholder: "문의하실 내용을 자세히 입력해 주세요.",
                rows: 5,
                className: "input-field resize-none",
                required: true,
                style: { wordBreak: "keep-all" }
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/pages/SupportPage.tsx",
                lineNumber: 176,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 174,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("button", { type: "submit", className: "btn-primary w-full justify-center", children: [
            /* @__PURE__ */ jsxDEV(Send, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/pages/SupportPage.tsx",
              lineNumber: 187,
              columnNumber: 17
            }, this),
            "문의 제출하기"
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SupportPage.tsx",
            lineNumber: 186,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SupportPage.tsx",
          lineNumber: 128,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SupportPage.tsx",
        lineNumber: 109,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SupportPage.tsx",
      lineNumber: 69,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/SupportPage.tsx",
    lineNumber: 48,
    columnNumber: 5
  }, this);
}
_s(SupportPage, "EdQVFWdcmlVrC6wyKF5NP5CqXCk=");
_c = SupportPage;
var _c;
$RefreshReg$(_c, "SupportPage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/SupportPage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/SupportPage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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O0FBQUEsZ0JBQzFDLGFBQVk7QUFBQSxnQkFDWixNQUFNO0FBQUEsZ0JBQ04sV0FBVTtBQUFBLGdCQUNWO0FBQUEsZ0JBQ0EsT0FBTyxFQUFFRixXQUFXLFdBQVc7QUFBQTtBQUFBLGNBUGpDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQU9tQztBQUFBLGVBVHJDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBV0E7QUFBQSxVQUNBLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUscUNBQzlCO0FBQUEsbUNBQUMsUUFBSyxXQUFVLGFBQWhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXlCO0FBQUE7QUFBQSxlQUQzQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUdBO0FBQUEsYUE3REY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQThEQTtBQUFBLFdBakZKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFtRkE7QUFBQSxTQTNIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBNEhBO0FBQUEsT0FqSkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWtKQTtBQUVKO0FBQUN0QixHQW5LdUJKLGFBQVc7QUFBQTZCLEtBQVg3QjtBQUFXLElBQUE2QjtBQUFBQyxhQUFBRCxJQUFBIiwibmFtZXMiOlsiSGVscENpcmNsZSIsIk1lc3NhZ2VDaXJjbGUiLCJDaGV2cm9uRG93biIsIlNlbmQiLCJBcnJvd0xlZnQiLCJTaGllbGQiLCJGQVFTIiwicSIsImEiLCJTdXBwb3J0UGFnZSIsInVzZXIiLCJvbkxvZ2luQ2xpY2siLCJvbkJhY2siLCJfcyIsIm9wZW5GYXEiLCJzZXRPcGVuRmFxIiwidXNlU3RhdGUiLCJuYW1lIiwic2V0TmFtZSIsImVtYWlsIiwic2V0RW1haWwiLCJzdWJqZWN0Iiwic2V0U3ViamVjdCIsIm1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwic3VibWl0dGVkIiwic2V0U3VibWl0dGVkIiwiaGFuZGxlU3VibWl0IiwiZSIsInByZXZlbnREZWZhdWx0IiwibGV0dGVyU3BhY2luZyIsImxlbmd0aCIsIm1hcCIsImZhcSIsImkiLCJ3b3JkQnJlYWsiLCJ0YXJnZXQiLCJ2YWx1ZSIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlN1cHBvcnRQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEhlbHBDaXJjbGUsIE1lc3NhZ2VDaXJjbGUsIENoZXZyb25Eb3duLCBTZW5kLCBBcnJvd0xlZnQsIFNoaWVsZCB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5cbmludGVyZmFjZSBTdXBwb3J0UGFnZVByb3BzIHtcbiAgdXNlcj86IHsgZW1haWw6IHN0cmluZyB9IHwgbnVsbDtcbiAgb25Mb2dpbkNsaWNrPzogKCkgPT4gdm9pZDtcbiAgb25CYWNrOiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBGQVFTID0gW1xuICB7XG4gICAgcTogJ1ZMVUUg7J247Kad7J2AIOyWtOuWpCDsoIjssKjroZwg7KeE7ZaJ65CY64KY7JqUPycsXG4gICAgYTogJ+yLoOyyreyEnCDsoJzstpwg4oaSIOyEnOulmCDqsoDthqAgKDN+NeydvCkg4oaSIO2YhOyepSDrmJDripQg67mE64yA66m0IOyLrOyCrCDihpIg7J247KadIOuniO2BrCDrsJzquIkg7Iic7Jy866GcIOynhO2WieuQqeuLiOuLpC4g7KCE7LK0IOq4sOqwhOydgCDsmIHsl4Xsnbwg6riw7KSAIDV+MTDsnbwg7J2064K07J6F64uI64ukLicsXG4gIH0sXG4gIHtcbiAgICBxOiAn67O07J207Iqk7ZS87IuxIOydmOyLrCDrsojtmLjrpbwg7Iug6rOg7ZWY66Ck66m0IOyWtOuWu+qyjCDtlbTslbwg7ZWY64KY7JqUPycsXG4gICAgYTogJ+2ZiCDtmZTrqbQg6rKA7IOJ7LC97JeQIOydmOyLrCDrsojtmLgg65iQ64qUIOq4sOq0gOuqheydhCDsnoXroKXtlZjsi5zrqbQg7KaJ7IucIOyhsO2ajOuQqeuLiOuLpC4g7KGw7ZqMIOqysOqzvCDtlZjri6jsnZggXCLsi6Dqs6DtlZjquLBcIiDrsoTtirzsnYQg7Ya17ZW0IFZMVUUg642w7J207YSw67Kg7J207Iqk7JeQIOyngeygkSDsi6Dqs6DtlZjsi6Qg7IiYIOyeiOyKteuLiOuLpC4nLFxuICB9LFxuICB7XG4gICAgcTogJ+uUlOyngO2EuCDrqoXtlajsnYAg7Ja065a76rKMIOuwnOq4ieuwm+uCmOyalD8nLFxuICAgIGE6ICftmozsm5DqsIDsnoUg7ZuEIOuyoOydtOyngSDsnbTsg4HsnZgg7JqU6riI7KCc66W8IOyEoO2Dne2VmOyLnOuptCDsnpDrj5nsnLzroZwg67Cc6riJ65Cp64uI64ukLiDsiqTtg6Dri6Trk5zCt+2UhOumrOuvuOyXhCDrk7HquInsnYAg6rCB6rCBIOqzqOuTnCDslaDri4jrqZTsnbTshZjCt+2ZgOuhnOq3uOueqCDrlJTsnpDsnbjsnbQg7KCB7Jqp65CcIOuqhe2VqOydtCDrsJzquInrkKnri4jri6QuJyxcbiAgfSxcbiAge1xuICAgIHE6ICfruJTro6jsh7ztlZEg7J6F7KCQ7J2AIOyWtOuWu+qyjCDsi6Dssq3tlZjrgpjsmpQ/JyxcbiAgICBhOiAn7Iqk7YOg64uk65OcIOydtOyDgeydmCDsmpTquIjsoJwg6rCA7J6FIO2bhCDruJTro6jsh7ztlZEg7J6F7KCQIOyLoOyyrSDtj7zsnYQg7Ya17ZW0IOyLoOyyre2VmOyLpCDsiJgg7J6I7Iq164uI64ukLiDsi6zsgqwg7ZuEIOy1nOuMgCAz7JiB7JeF7J28IOydtOuCtOyXkCDsnoXsoJDsnbQg7JmE66OM65Cp64uI64ukLicsXG4gIH0sXG4gIHtcbiAgICBxOiAn67iU66Oo7Y6Y7J20IOyViOyLrOqysOygnCDrtoTsn4HsnYAg7Ja065a76rKMIOyymOumrOuQmOuCmOyalD8nLFxuICAgIGE6ICfqtazrp6TsnpDqsIAg7IiY66C5IO2ZleyduCDsoIQg67aE7J+B7J2EIOyLoOyyre2VmOuptCBWTFVFIOykkeyerO2MgOydtCA3MuyLnOqwhCDsnbTrgrQg6rCc7J6F7ZWY7JesIOyymOumrO2VqeuLiOuLpC4g7YyQ66ek7J6Q7J2YIOq3gOyxheycvOuhnCDtmZXsnbjrkKAg6rK97JqwIOyghOyVoSDtmZjrtojsnbQg67O07J6l65Cp64uI64ukLicsXG4gIH0sXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTdXBwb3J0UGFnZSh7IHVzZXIsIG9uTG9naW5DbGljaywgb25CYWNrIH06IFN1cHBvcnRQYWdlUHJvcHMpIHtcbiAgY29uc3QgW29wZW5GYXEsIHNldE9wZW5GYXFdID0gdXNlU3RhdGU8bnVtYmVyIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtuYW1lLCBzZXROYW1lXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2VtYWlsLCBzZXRFbWFpbF0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtzdWJqZWN0LCBzZXRTdWJqZWN0XSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW21lc3NhZ2UsIHNldE1lc3NhZ2VdID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbc3VibWl0dGVkLCBzZXRTdWJtaXR0ZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIGNvbnN0IGhhbmRsZVN1Ym1pdCA9IChlOiBSZWFjdC5Gb3JtRXZlbnQpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYgKCF1c2VyICYmIG9uTG9naW5DbGljaykgeyBvbkxvZ2luQ2xpY2soKTsgcmV0dXJuOyB9XG4gICAgc2V0U3VibWl0dGVkKHRydWUpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPG1haW4gY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLWJsdWUtdGludCBwdC1bNjBweF1cIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctcHJpbWFyeS02MDAgcHktMTBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9e29uQmFja31cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQtd2hpdGUvNzAgaG92ZXI6dGV4dC13aGl0ZSB0ZXh0LXNtIG1iLTQgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxBcnJvd0xlZnQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICDtmYjsnLzroZxcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIG1iLTJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy05IGgtOSByb3VuZGVkLXhsIGJnLXdoaXRlLzIwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxIZWxwQ2lyY2xlIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtd2hpdGUvODAgdGV4dC1zbSBmb250LXNlbWlib2xkXCI+VkxVRSDqs6DqsJ3sp4Dsm5A8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBtYi0xXCI+6rOg6rCd7KeA7JuQPC9oMT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlLzcwIHRleHQtc21cIj7snpDso7wg66y764qUIOyniOusuOqzvCAxOjEg66y47J2Y66W8IO2Gte2VtCDrj4Tsm4DsnYQg67Cb7Jy87IS47JqULjwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy00eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS0xMFwiPlxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cIm1iLTEyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41IG1iLTZcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLXhsIGJnLXByaW1hcnktNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPEhlbHBDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNjAwXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ibGFjayB0ZXh0LWxnXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PuyekOyjvCDrrLvripQg7KeI66y4IChGQVEpPC9oMj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgcHgtMiBweS0wLjUgYmctcHJpbWFyeS01MCB0ZXh0LXByaW1hcnktNjAwIHJvdW5kZWQtZnVsbCBmb250LXNlbWlib2xkIGJvcmRlciBib3JkZXItcHJpbWFyeS0xMDBcIj57RkFRUy5sZW5ndGh96rG0PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zXCI+XG4gICAgICAgICAgICB7RkFRUy5tYXAoKGZhcSwgaSkgPT4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwiY2FyZCBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuRmFxKG9wZW5GYXEgPT09IGkgPyBudWxsIDogaSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMgcHgtNSBweS00IHRleHQtbGVmdCBob3ZlcjpiZy1ncmF5LTUwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZmxleC1zaHJpbmstMCB3LTUgaC01IHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTEwMCB0ZXh0LXByaW1hcnktNjAwIHRleHQteHMgZm9udC1ibGFjayBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtdC0wLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICBRXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LXNlbWlib2xkIHRleHQtc21cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+e2ZhcS5xfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPENoZXZyb25Eb3duIGNsYXNzTmFtZT17YHctNCBoLTQgdGV4dC1ncmF5LTQwMCBmbGV4LXNocmluay0wIHRyYW5zaXRpb24tdHJhbnNmb3JtIG10LTAuNSAke29wZW5GYXEgPT09IGkgPyAncm90YXRlLTE4MCcgOiAnJ31gfSAvPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIHtvcGVuRmFxID09PSBpICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtNSBwYi01IHB0LTEgYm9yZGVyLXQgYm9yZGVyLWdyYXktMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZsZXgtc2hyaW5rLTAgdy01IGgtNSByb3VuZGVkLWZ1bGwgYmctZW1lcmFsZC0xMDAgdGV4dC1lbWVyYWxkLTcwMCB0ZXh0LXhzIGZvbnQtYmxhY2sgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgbXQtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICBBXG4gICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS02MDAgdGV4dC1zbSBsZWFkaW5nLXJlbGF4ZWRcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+e2ZhcS5hfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgPHNlY3Rpb24+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41IG1iLTZcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLXhsIGJnLXByaW1hcnktNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPE1lc3NhZ2VDaXJjbGUgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXByaW1hcnktNjAwXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ibGFjayB0ZXh0LWxnXCIgc3R5bGU9e3sgbGV0dGVyU3BhY2luZzogJy0wLjAzZW0nIH19PjE6MSDrrLjsnZg8L2gyPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAge3N1Ym1pdHRlZCA/IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2FyZCBwLTEwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNiBoLTE2IHJvdW5kZWQtM3hsIGJnLWVtZXJhbGQtNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgbWItNFwiPlxuICAgICAgICAgICAgICAgIDxTaGllbGQgY2xhc3NOYW1lPVwidy04IGgtOCB0ZXh0LWVtZXJhbGQtNTAwXCIgLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIGZvbnQtYm9sZCB0ZXh0LWJhc2UgbWItMlwiPuusuOydmOqwgCDsoJHsiJjrkJjsl4jsirXri4jri6Q8L2gzPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktNDAwIHRleHQtc20gbWF4LXctc21cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAg7JiB7JeF7J28IOq4sOykgCAxfjLsnbwg7J2064K07JeQIOydtOuplOydvOuhnCDri7Xrs4Drk5zrpr3ri4jri6QuIOqwkOyCrO2VqeuLiOuLpC5cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSA6IChcbiAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXtoYW5kbGVTdWJtaXR9IGNsYXNzTmFtZT1cImNhcmQgcC02IHNwYWNlLXktNFwiPlxuICAgICAgICAgICAgICB7IXVzZXIgJiYgKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctYW1iZXItNTAgYm9yZGVyIGJvcmRlci1hbWJlci0yMDAgcm91bmRlZC0yeGwgcHgtNCBweS0zIHRleHQtYW1iZXItODAwIHRleHQtc20gZm9udC1tZWRpdW1cIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAgICAgICAgICDroZzqt7jsnbjsnbQg7ZWE7JqU7ZWcIOyEnOu5hOyKpOyeheuLiOuLpC4g66y47J2YIOygnOy2nCDsi5wg66Gc6re47J24IO2ZlOuptOycvOuhnCDsnbTrj5ntlanri4jri6QuXG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBzbTpncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtZ3JheS03MDAgbWItMS41XCI+7J2066aEPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlPXtuYW1lfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE5hbWUoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIuydtOumhOydhCDsnoXroKXtlbQg7KO87IS47JqUXCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5wdXQtZmllbGRcIlxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNzAwIG1iLTEuNVwiPuydtOuplOydvDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImVtYWlsXCJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2VtYWlsfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEVtYWlsKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLri7Xrs4DrsJvsnYQg7J2066mU7J28XCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5wdXQtZmllbGRcIlxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNzAwIG1iLTEuNVwiPuusuOydmCDsnKDtmJU8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDxzZWxlY3RcbiAgICAgICAgICAgICAgICAgIHZhbHVlPXtzdWJqZWN0fVxuICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRTdWJqZWN0KGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImlucHV0LWZpZWxkXCJcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIlwiPuyEoO2Dne2VtCDso7zshLjsmpQ8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgIDxvcHRpb24+7J247KadIOyLoOyyrSDqtIDroKg8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgIDxvcHRpb24+67iU66Oo7Ie87ZWRIC8g67iU66Oo7Y6Y7J20PC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICA8b3B0aW9uPuuUlOyngO2EuCDrqoXtlag8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgIDxvcHRpb24+6rWs7J246rWs7KeBPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICA8b3B0aW9uPuq4sO2DgCDrrLjsnZg8L29wdGlvbj5cbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNzAwIG1iLTEuNVwiPuusuOydmCDrgrTsmqk8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDx0ZXh0YXJlYVxuICAgICAgICAgICAgICAgICAgdmFsdWU9e21lc3NhZ2V9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE1lc3NhZ2UoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLrrLjsnZjtlZjsi6Qg64K07Jqp7J2EIOyekOyEuO2eiCDsnoXroKXtlbQg7KO87IS47JqULlwiXG4gICAgICAgICAgICAgICAgICByb3dzPXs1fVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaW5wdXQtZmllbGQgcmVzaXplLW5vbmVcIlxuICAgICAgICAgICAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdvcmRCcmVhazogJ2tlZXAtYWxsJyB9fVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJzdWJtaXRcIiBjbGFzc05hbWU9XCJidG4tcHJpbWFyeSB3LWZ1bGwganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8U2VuZCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICDrrLjsnZgg7KCc7Lac7ZWY6riwXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICl9XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvbWFpbj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvcGFnZXMvU3VwcG9ydFBhZ2UudHN4In0=