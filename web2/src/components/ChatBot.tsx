import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/ChatBot.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/ChatBot.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"]; const useRef = __vite__cjsImport3_react["useRef"]; const useEffect = __vite__cjsImport3_react["useEffect"];
import { MessageCircle, X, Send, Bot, User, Minimize2 } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const RESPONSES = [
  [/보이스피싱|사기|피해/, "보이스피싱 피해가 의심되시나요? 즉시 해당 전화를 끊고, 금융감독원(1332) 또는 경찰청(112)에 신고하세요. VLUE 검색창에서 해당 기관 번호를 확인하실 수 있습니다."],
  [/인증|vlue인증|vlue 인증/, "VLUE 인증은 기관의 보이스피싱 예방 체계를 검증하는 공식 인증입니다. 상단 메뉴 [인증절차안내]에서 신청 방법을 확인하세요. 베이직(무료), 스탠다드(월 29,000원), 프리미엄(월 89,000원) 세 가지 요금제가 있습니다."],
  [/검색|기관확인|조회/, "검색창에 기관명, 전화번호 또는 사업자번호를 입력하면 공공데이터와 VLUE 인증 데이터를 동시에 비교하여 결과를 보여드립니다."],
  [/요금|가격|비용|얼마/, "요금제는 베이직(무료), 스탠다드(월 29,000원), 프리미엄(월 89,000원)으로 구성되어 있습니다. 상세 비교는 [인증절차안내] 페이지에서 확인하세요."],
  [/쇼핑|블루쇼핑|구매/, "블루쇼핑은 VLUE 인증 업체만 입점 가능한 안전한 커머스 플랫폼입니다. 상단 메뉴 [블루쇼핑]에서 이용하실 수 있습니다."],
  [/자료|템플릿|서류/, "자료실에서 거래처 안전 확인서, 피해 신고서 등 다양한 템플릿을 무료로 이용하실 수 있습니다. 웹상에서 직접 편집 후 .vlue 보안 파일로 저장 가능합니다."],
  [/연락|전화|이메일/, "VLUE 고객센터: 1588-0000 (평일 09:00~18:00) / support@vlue.kr 로 문의하시면 됩니다."],
  [/안녕|반가워|안녕하세요/, "안녕하세요! VLUE AI 고객센터입니다. 보이스피싱 예방, 기관 인증, 서비스 이용에 관해 무엇이든 도와드릴게요."],
  [/감사|고마워|고맙습니다/, "도움이 되어 기쁩니다! 추가로 궁금한 사항이 있으시면 언제든지 질문해 주세요."]
];
function getBotResponse(input) {
  const lower = input.toLowerCase();
  for (const [pattern, response] of RESPONSES) {
    if (pattern.test(lower)) return response;
  }
  return "안녕하세요! VLUE AI 고객센터입니다. 보이스피싱 예방, 기관 인증 조회, 서비스 이용 방법 등 궁금하신 점을 말씀해 주세요. 더 자세한 상담은 고객센터(1588-0000)로 연락 주시기 바랍니다.";
}
const now = () => (/* @__PURE__ */ new Date()).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
const INITIAL = {
  id: "init",
  role: "bot",
  text: "안녕하세요! VLUE AI 고객센터입니다.\n보이스피싱 예방, 기관 인증 조회, 요금제 안내 등 무엇이든 도와드릴게요.",
  time: now()
};
export default function ChatBot() {
  _s();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);
  const send = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: "user", text: input.trim(), time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: getBotResponse(userMsg.text),
        time: now()
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3", children: [
    open && /* @__PURE__ */ jsxDEV("div", { className: "w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up", style: { height: "460px" }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between px-4 py-3 bg-primary-600", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-8 h-8 rounded-full bg-white/20 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Bot, { className: "w-4.5 h-4.5 text-white", style: { width: "18px", height: "18px" } }, void 0, false, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 81,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 80,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-white text-sm font-semibold", children: "VLUE AI 고객센터" }, void 0, false, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 84,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "w-1.5 h-1.5 bg-green-400 rounded-full" }, void 0, false, {
                fileName: "/home/project/src/components/ChatBot.tsx",
                lineNumber: 86,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/70 text-xs", children: "온라인" }, void 0, false, {
                fileName: "/home/project/src/components/ChatBot.tsx",
                lineNumber: 87,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 85,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 83,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 79,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: () => setOpen(false), className: "p-1 text-white/70 hover:text-white transition-colors", children: /* @__PURE__ */ jsxDEV(Minimize2, { className: "w-4 h-4" }, void 0, false, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 92,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 91,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/ChatBot.tsx",
        lineNumber: 78,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50", children: [
        messages.map(
          (msg) => /* @__PURE__ */ jsxDEV("div", { className: `flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`, children: [
            /* @__PURE__ */ jsxDEV("div", { className: `w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "bot" ? "bg-primary-100" : "bg-primary-600"}`, children: msg.role === "bot" ? /* @__PURE__ */ jsxDEV(Bot, { className: "w-3.5 h-3.5 text-primary-600" }, void 0, false, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 103,
              columnNumber: 15
            }, this) : /* @__PURE__ */ jsxDEV(User, { className: "w-3.5 h-3.5 text-white" }, void 0, false, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 104,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 99,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: `max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-0.5`, children: [
              /* @__PURE__ */ jsxDEV("div", { className: `px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${msg.role === "bot" ? "bg-white text-gray-800 border border-gray-100 rounded-tl-sm" : "bg-primary-600 text-white rounded-tr-sm"}`, children: msg.text }, void 0, false, {
                fileName: "/home/project/src/components/ChatBot.tsx",
                lineNumber: 108,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400", children: msg.time }, void 0, false, {
                fileName: "/home/project/src/components/ChatBot.tsx",
                lineNumber: 115,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 107,
              columnNumber: 17
            }, this)
          ] }, msg.id, true, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 98,
            columnNumber: 11
          }, this)
        ),
        isTyping && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(Bot, { className: "w-3.5 h-3.5 text-primary-600" }, void 0, false, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 122,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 121,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-3 py-2.5 flex gap-1", children: [0, 1, 2].map(
            (i) => /* @__PURE__ */ jsxDEV("span", { className: "w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce", style: { animationDelay: `${i * 0.15}s` } }, i, false, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 126,
              columnNumber: 15
            }, this)
          ) }, void 0, false, {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 124,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 120,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { ref: bottomRef }, void 0, false, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 131,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/ChatBot.tsx",
        lineNumber: 96,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "px-3 py-2.5 bg-white border-t border-gray-100 flex gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyDown: handleKey,
            placeholder: "메시지를 입력하세요...",
            className: "flex-1 px-3 py-1.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 135,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: send,
            disabled: !input.trim(),
            className: "w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
            children: /* @__PURE__ */ jsxDEV(Send, { className: "w-3.5 h-3.5 text-white", style: { color: input.trim() ? "white" : "#9CA3AF" } }, void 0, false, {
              fileName: "/home/project/src/components/ChatBot.tsx",
              lineNumber: 148,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/ChatBot.tsx",
            lineNumber: 143,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/components/ChatBot.tsx",
        lineNumber: 134,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/ChatBot.tsx",
      lineNumber: 77,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: () => setOpen(!open),
        className: `w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${open ? "bg-gray-600" : "bg-primary-600 hover:bg-primary-700"}`,
        style: { width: "52px", height: "52px" },
        children: open ? /* @__PURE__ */ jsxDEV(X, { className: "w-5 h-5 text-white" }, void 0, false, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 162,
          columnNumber: 9
        }, this) : /* @__PURE__ */ jsxDEV(MessageCircle, { className: "w-5.5 h-5.5 text-white", style: { width: "22px", height: "22px" } }, void 0, false, {
          fileName: "/home/project/src/components/ChatBot.tsx",
          lineNumber: 163,
          columnNumber: 9
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/home/project/src/components/ChatBot.tsx",
        lineNumber: 154,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/home/project/src/components/ChatBot.tsx",
    lineNumber: 75,
    columnNumber: 5
  }, this);
}
_s(ChatBot, "FjSPPmue3VO6NyAu1PXMxlHSifk=");
_c = ChatBot;
var _c;
$RefreshReg$(_c, "ChatBot");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/ChatBot.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/ChatBot.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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SUFBSTtBQUFBLFFBQzVCLFdBQVcsaUhBQ1RBLE9BQU8sZ0JBQWdCLHFDQUFxQztBQUFBLFFBRTlELE9BQU8sRUFBRTJCLE9BQU8sUUFBUUQsUUFBUSxPQUFPO0FBQUEsUUFFdEMxQixpQkFDRyx1QkFBQyxLQUFFLFdBQVUsd0JBQWI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFpQyxJQUNqQyx1QkFBQyxpQkFBYyxXQUFVLDBCQUF5QixPQUFPLEVBQUUyQixPQUFPLFFBQVFELFFBQVEsT0FBTyxLQUF6RjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTJGO0FBQUE7QUFBQSxNQVRqRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFXQTtBQUFBLE9BMUZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0EyRkE7QUFFSjtBQUFDM0IsR0FoSXVCRCxTQUFPO0FBQUFxQyxLQUFQckM7QUFBTyxJQUFBcUM7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbInVzZVJlZiIsInVzZUVmZmVjdCIsIk1lc3NhZ2VDaXJjbGUiLCJYIiwiU2VuZCIsIkJvdCIsIlVzZXIiLCJNaW5pbWl6ZTIiLCJSRVNQT05TRVMiLCJnZXRCb3RSZXNwb25zZSIsImlucHV0IiwibG93ZXIiLCJ0b0xvd2VyQ2FzZSIsInBhdHRlcm4iLCJyZXNwb25zZSIsInRlc3QiLCJub3ciLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsIklOSVRJQUwiLCJpZCIsInJvbGUiLCJ0ZXh0IiwidGltZSIsIkNoYXRCb3QiLCJfcyIsIm9wZW4iLCJzZXRPcGVuIiwidXNlU3RhdGUiLCJtZXNzYWdlcyIsInNldE1lc3NhZ2VzIiwic2V0SW5wdXQiLCJpc1R5cGluZyIsInNldElzVHlwaW5nIiwiYm90dG9tUmVmIiwiY3VycmVudCIsInNjcm9sbEludG9WaWV3IiwiYmVoYXZpb3IiLCJzZW5kIiwidHJpbSIsInVzZXJNc2ciLCJ0b1N0cmluZyIsInByZXYiLCJzZXRUaW1lb3V0IiwiYm90TXNnIiwiTWF0aCIsInJhbmRvbSIsImhhbmRsZUtleSIsImUiLCJrZXkiLCJzaGlmdEtleSIsInByZXZlbnREZWZhdWx0IiwiaGVpZ2h0Iiwid2lkdGgiLCJtYXAiLCJtc2ciLCJpIiwiYW5pbWF0aW9uRGVsYXkiLCJ0YXJnZXQiLCJ2YWx1ZSIsImNvbG9yIiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQ2hhdEJvdC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUsIHVzZVJlZiwgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgTWVzc2FnZUNpcmNsZSwgWCwgU2VuZCwgQm90LCBVc2VyLCBNaW5pbWl6ZTIgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuXG5pbnRlcmZhY2UgTWVzc2FnZSB7XG4gIGlkOiBzdHJpbmc7XG4gIHJvbGU6ICd1c2VyJyB8ICdib3QnO1xuICB0ZXh0OiBzdHJpbmc7XG4gIHRpbWU6IHN0cmluZztcbn1cblxuY29uc3QgUkVTUE9OU0VTOiBbUmVnRXhwLCBzdHJpbmddW10gPSBbXG4gIFsv67O07J207Iqk7ZS87IuxfOyCrOq4sHztlLztlbQvLCAn67O07J207Iqk7ZS87IuxIO2UvO2VtOqwgCDsnZjsi6zrkJjsi5zrgpjsmpQ/IOymieyLnCDtlbTri7kg7KCE7ZmU66W8IOuBiuqzoCwg6riI7Jy16rCQ64+F7JuQKDEzMzIpIOuYkOuKlCDqsr3ssLDssq0oMTEyKeyXkCDsi6Dqs6DtlZjshLjsmpQuIFZMVUUg6rKA7IOJ7LC97JeQ7IScIO2VtOuLuSDquLDqtIAg67KI7Zi466W8IO2ZleyduO2VmOyLpCDsiJgg7J6I7Iq164uI64ukLiddLFxuICBbL+yduOymnXx2bHVl7J247KadfHZsdWUg7J247KadLywgJ1ZMVUUg7J247Kad7J2AIOq4sOq0gOydmCDrs7TsnbTsiqTtlLzsi7Eg7JiI67CpIOyytOqzhOulvCDqsoDspp3tlZjripQg6rO17IudIOyduOymneyeheuLiOuLpC4g7IOB64uoIOuplOuJtCBb7J247Kad7KCI7LCo7JWI64K0XeyXkOyEnCDsi6Dssq0g67Cp67KV7J2EIO2ZleyduO2VmOyEuOyalC4g67Kg7J207KeBKOustOujjCksIOyKpO2DoOuLpOuTnCjsm5QgMjksMDAw7JuQKSwg7ZSE66as66+47JeEKOyblCA4OSwwMDDsm5ApIOyEuCDqsIDsp4Ag7JqU6riI7KCc6rCAIOyeiOyKteuLiOuLpC4nXSxcbiAgWy/qsoDsg4l86riw6rSA7ZmV7J24fOyhsO2ajC8sICfqsoDsg4nssL3sl5Ag6riw6rSA66qFLCDsoITtmZTrsojtmLgg65iQ64qUIOyCrOyXheyekOuyiO2YuOulvCDsnoXroKXtlZjrqbQg6rO16rO1642w7J207YSw7JmAIFZMVUUg7J247KadIOuNsOydtO2EsOulvCDrj5nsi5zsl5Ag67mE6rWQ7ZWY7JesIOqysOqzvOulvCDrs7Tsl6zrk5zrpr3ri4jri6QuJ10sXG4gIFsv7JqU6riIfOqwgOqyqXzruYTsmql87Ja866eILywgJ+yalOq4iOygnOuKlCDrsqDsnbTsp4Eo66y066OMKSwg7Iqk7YOg64uk65OcKOyblCAyOSwwMDDsm5ApLCDtlITrpqzrr7jsl4Qo7JuUIDg5LDAwMOybkCnsnLzroZwg6rWs7ISx65CY7Ja0IOyeiOyKteuLiOuLpC4g7IOB7IS4IOu5hOq1kOuKlCBb7J247Kad7KCI7LCo7JWI64K0XSDtjpjsnbTsp4Dsl5DshJwg7ZmV7J247ZWY7IS47JqULiddLFxuICBbL+yHvO2VkXzruJTro6jsh7ztlZF86rWs66ekLywgJ+u4lOujqOyHvO2VkeydgCBWTFVFIOyduOymnSDsl4XssrTrp4wg7J6F7KCQIOqwgOuKpe2VnCDslYjsoITtlZwg7Luk66i47IqkIO2UjOueq+2PvOyeheuLiOuLpC4g7IOB64uoIOuplOuJtCBb67iU66Oo7Ie87ZWRXeyXkOyEnCDsnbTsmqntlZjsi6Qg7IiYIOyeiOyKteuLiOuLpC4nXSxcbiAgWy/snpDro4x87YWc7ZSM66a/fOyEnOulmC8sICfsnpDro4zsi6Tsl5DshJwg6rGw656Y7LKYIOyViOyghCDtmZXsnbjshJwsIO2UvO2VtCDsi6Dqs6DshJwg65OxIOuLpOyWke2VnCDthZztlIzrpr/snYQg66y066OM66GcIOydtOyaqe2VmOyLpCDsiJgg7J6I7Iq164uI64ukLiDsm7nsg4Hsl5DshJwg7KeB7KCRIO2OuOynkSDtm4QgLnZsdWUg67O07JWIIO2MjOydvOuhnCDsoIDsnqUg6rCA64ql7ZWp64uI64ukLiddLFxuICBbL+yXsOudvXzsoITtmZR87J2066mU7J28LywgJ1ZMVUUg6rOg6rCd7IS87YSwOiAxNTg4LTAwMDAgKO2PieydvCAwOTowMH4xODowMCkgLyBzdXBwb3J0QHZsdWUua3Ig66GcIOusuOydmO2VmOyLnOuptCDrkKnri4jri6QuJ10sXG4gIFsv7JWI64WVfOuwmOqwgOybjHzslYjrhZXtlZjshLjsmpQvLCAn7JWI64WV7ZWY7IS47JqUISBWTFVFIEFJIOqzoOqwneyEvO2EsOyeheuLiOuLpC4g67O07J207Iqk7ZS87IuxIOyYiOuwqSwg6riw6rSAIOyduOymnSwg7ISc67mE7IqkIOydtOyaqeyXkCDqtIDtlbQg66y07JeH7J2065OgIOuPhOyZgOuTnOumtOqyjOyalC4nXSxcbiAgWy/qsJDsgqx86rOg66eI7JuMfOqzoOunmeyKteuLiOuLpC8sICfrj4Tsm4DsnbQg65CY7Ja0IOq4sOyBqeuLiOuLpCEg7LaU6rCA66GcIOq2geq4iO2VnCDsgqztla3snbQg7J6I7Jy87Iuc66m0IOyWuOygnOuToOyngCDsp4jrrLjtlbQg7KO87IS47JqULiddLFxuXTtcblxuZnVuY3Rpb24gZ2V0Qm90UmVzcG9uc2UoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxvd2VyID0gaW5wdXQudG9Mb3dlckNhc2UoKTtcbiAgZm9yIChjb25zdCBbcGF0dGVybiwgcmVzcG9uc2VdIG9mIFJFU1BPTlNFUykge1xuICAgIGlmIChwYXR0ZXJuLnRlc3QobG93ZXIpKSByZXR1cm4gcmVzcG9uc2U7XG4gIH1cbiAgcmV0dXJuICfslYjrhZXtlZjshLjsmpQhIFZMVUUgQUkg6rOg6rCd7IS87YSw7J6F64uI64ukLiDrs7TsnbTsiqTtlLzsi7Eg7JiI67CpLCDquLDqtIAg7J247KadIOyhsO2ajCwg7ISc67mE7IqkIOydtOyaqSDrsKnrspUg65OxIOq2geq4iO2VmOyLoCDsoJDsnYQg66eQ7JSA7ZW0IOyjvOyEuOyalC4g642UIOyekOyEuO2VnCDsg4Hri7TsnYAg6rOg6rCd7IS87YSwKDE1ODgtMDAwMCnroZwg7Jew6529IOyjvOyLnOq4sCDrsJTrno3ri4jri6QuJztcbn1cblxuY29uc3Qgbm93ID0gKCkgPT4gbmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoJ2tvLUtSJywgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnIH0pO1xuXG5jb25zdCBJTklUSUFMOiBNZXNzYWdlID0ge1xuICBpZDogJ2luaXQnLFxuICByb2xlOiAnYm90JyxcbiAgdGV4dDogJ+yViOuFle2VmOyEuOyalCEgVkxVRSBBSSDqs6DqsJ3shLzthLDsnoXri4jri6QuXFxu67O07J207Iqk7ZS87IuxIOyYiOuwqSwg6riw6rSAIOyduOymnSDsobDtmowsIOyalOq4iOygnCDslYjrgrQg65OxIOustOyXh+ydtOuToCDrj4TsmYDrk5zrprTqsozsmpQuJyxcbiAgdGltZTogbm93KCksXG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDaGF0Qm90KCkge1xuICBjb25zdCBbb3Blbiwgc2V0T3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFttZXNzYWdlcywgc2V0TWVzc2FnZXNdID0gdXNlU3RhdGU8TWVzc2FnZVtdPihbSU5JVElBTF0pO1xuICBjb25zdCBbaW5wdXQsIHNldElucHV0XSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgW2lzVHlwaW5nLCBzZXRJc1R5cGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IGJvdHRvbVJlZiA9IHVzZVJlZjxIVE1MRGl2RWxlbWVudD4obnVsbCk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAob3BlbikgYm90dG9tUmVmLmN1cnJlbnQ/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnIH0pO1xuICB9LCBbbWVzc2FnZXMsIG9wZW5dKTtcblxuICBjb25zdCBzZW5kID0gKCkgPT4ge1xuICAgIGlmICghaW5wdXQudHJpbSgpKSByZXR1cm47XG4gICAgY29uc3QgdXNlck1zZzogTWVzc2FnZSA9IHsgaWQ6IERhdGUubm93KCkudG9TdHJpbmcoKSwgcm9sZTogJ3VzZXInLCB0ZXh0OiBpbnB1dC50cmltKCksIHRpbWU6IG5vdygpIH07XG4gICAgc2V0TWVzc2FnZXMoKHByZXYpID0+IFsuLi5wcmV2LCB1c2VyTXNnXSk7XG4gICAgc2V0SW5wdXQoJycpO1xuICAgIHNldElzVHlwaW5nKHRydWUpO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjb25zdCBib3RNc2c6IE1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiAoRGF0ZS5ub3coKSArIDEpLnRvU3RyaW5nKCksXG4gICAgICAgIHJvbGU6ICdib3QnLFxuICAgICAgICB0ZXh0OiBnZXRCb3RSZXNwb25zZSh1c2VyTXNnLnRleHQpLFxuICAgICAgICB0aW1lOiBub3coKSxcbiAgICAgIH07XG4gICAgICBzZXRNZXNzYWdlcygocHJldikgPT4gWy4uLnByZXYsIGJvdE1zZ10pO1xuICAgICAgc2V0SXNUeXBpbmcoZmFsc2UpO1xuICAgIH0sIDgwMCArIE1hdGgucmFuZG9tKCkgKiA2MDApO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUtleSA9IChlOiBSZWFjdC5LZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmICFlLnNoaWZ0S2V5KSB7IGUucHJldmVudERlZmF1bHQoKTsgc2VuZCgpOyB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGJvdHRvbS02IHJpZ2h0LTYgei01MCBmbGV4IGZsZXgtY29sIGl0ZW1zLWVuZCBnYXAtM1wiPlxuICAgICAge29wZW4gJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctODAgc206dy05NiBiZy13aGl0ZSByb3VuZGVkLTJ4bCBzaGFkb3ctMnhsIGJvcmRlciBib3JkZXItZ3JheS0xMDAgZmxleCBmbGV4LWNvbCBvdmVyZmxvdy1oaWRkZW4gYW5pbWF0ZS1mYWRlLWluLXVwXCIgc3R5bGU9e3sgaGVpZ2h0OiAnNDYwcHgnIH19PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHB4LTQgcHktMyBiZy1wcmltYXJ5LTYwMFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLWZ1bGwgYmctd2hpdGUvMjAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8Qm90IGNsYXNzTmFtZT1cInctNC41IGgtNC41IHRleHQtd2hpdGVcIiBzdHlsZT17eyB3aWR0aDogJzE4cHgnLCBoZWlnaHQ6ICcxOHB4JyB9fSAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIHRleHQtc20gZm9udC1zZW1pYm9sZFwiPlZMVUUgQUkg6rOg6rCd7IS87YSwPC9wPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInctMS41IGgtMS41IGJnLWdyZWVuLTQwMCByb3VuZGVkLWZ1bGxcIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS83MCB0ZXh0LXhzXCI+7Jio65287J24PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuKGZhbHNlKX0gY2xhc3NOYW1lPVwicC0xIHRleHQtd2hpdGUvNzAgaG92ZXI6dGV4dC13aGl0ZSB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICA8TWluaW1pemUyIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy15LWF1dG8gcHgtMyBweS0zIHNwYWNlLXktMyBiZy1ncmF5LTUwXCI+XG4gICAgICAgICAgICB7bWVzc2FnZXMubWFwKChtc2cpID0+IChcbiAgICAgICAgICAgICAgPGRpdiBrZXk9e21zZy5pZH0gY2xhc3NOYW1lPXtgZmxleCBnYXAtMiAke21zZy5yb2xlID09PSAndXNlcicgPyAnZmxleC1yb3ctcmV2ZXJzZScgOiAnZmxleC1yb3cnfWB9PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy03IGgtNyByb3VuZGVkLWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZmxleC1zaHJpbmstMCAke1xuICAgICAgICAgICAgICAgICAgbXNnLnJvbGUgPT09ICdib3QnID8gJ2JnLXByaW1hcnktMTAwJyA6ICdiZy1wcmltYXJ5LTYwMCdcbiAgICAgICAgICAgICAgICB9YH0+XG4gICAgICAgICAgICAgICAgICB7bXNnLnJvbGUgPT09ICdib3QnXG4gICAgICAgICAgICAgICAgICAgID8gPEJvdCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LXByaW1hcnktNjAwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgOiA8VXNlciBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LXdoaXRlXCIgLz5cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YG1heC13LVs3NSVdICR7bXNnLnJvbGUgPT09ICd1c2VyJyA/ICdpdGVtcy1lbmQnIDogJ2l0ZW1zLXN0YXJ0J30gZmxleCBmbGV4LWNvbCBnYXAtMC41YH0+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHB4LTMgcHktMiByb3VuZGVkLTJ4bCB0ZXh0LXhzIGxlYWRpbmctcmVsYXhlZCB3aGl0ZXNwYWNlLXByZS1saW5lICR7XG4gICAgICAgICAgICAgICAgICAgIG1zZy5yb2xlID09PSAnYm90J1xuICAgICAgICAgICAgICAgICAgICAgID8gJ2JnLXdoaXRlIHRleHQtZ3JheS04MDAgYm9yZGVyIGJvcmRlci1ncmF5LTEwMCByb3VuZGVkLXRsLXNtJ1xuICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXByaW1hcnktNjAwIHRleHQtd2hpdGUgcm91bmRlZC10ci1zbSdcbiAgICAgICAgICAgICAgICAgIH1gfT5cbiAgICAgICAgICAgICAgICAgICAge21zZy50ZXh0fVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj57bXNnLnRpbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgICAge2lzVHlwaW5nICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTcgaC03IHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5LTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgPEJvdCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LXByaW1hcnktNjAwXCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIGJvcmRlciBib3JkZXItZ3JheS0xMDAgcm91bmRlZC0yeGwgcm91bmRlZC10bC1zbSBweC0zIHB5LTIuNSBmbGV4IGdhcC0xXCI+XG4gICAgICAgICAgICAgICAgICB7WzAsIDEsIDJdLm1hcCgoaSkgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBrZXk9e2l9IGNsYXNzTmFtZT1cInctMS41IGgtMS41IGJnLWdyYXktNDAwIHJvdW5kZWQtZnVsbCBhbmltYXRlLWJvdW5jZVwiIHN0eWxlPXt7IGFuaW1hdGlvbkRlbGF5OiBgJHtpICogMC4xNX1zYCB9fSAvPlxuICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDxkaXYgcmVmPXtib3R0b21SZWZ9IC8+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB4LTMgcHktMi41IGJnLXdoaXRlIGJvcmRlci10IGJvcmRlci1ncmF5LTEwMCBmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICB2YWx1ZT17aW5wdXR9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0SW5wdXQoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICBvbktleURvd249e2hhbmRsZUtleX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLrqZTsi5zsp4Drpbwg7J6F66Cl7ZWY7IS47JqULi4uXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIHB4LTMgcHktMS41IHRleHQtc20gdGV4dC1ncmF5LTkwMCBiZy1ncmF5LTUwIGJvcmRlciBib3JkZXItZ3JheS0yMDAgcm91bmRlZC14bCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLXByaW1hcnktNDAwIGZvY3VzOmJnLXdoaXRlIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e3NlbmR9XG4gICAgICAgICAgICAgIGRpc2FibGVkPXshaW5wdXQudHJpbSgpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTggaC04IGJnLXByaW1hcnktNjAwIGhvdmVyOmJnLXByaW1hcnktNzAwIGRpc2FibGVkOmJnLWdyYXktMjAwIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdHJhbnNpdGlvbi1jb2xvcnMgZmxleC1zaHJpbmstMFwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxTZW5kIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtd2hpdGVcIiBzdHlsZT17eyBjb2xvcjogaW5wdXQudHJpbSgpID8gJ3doaXRlJyA6ICcjOUNBM0FGJyB9fSAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKX1cblxuICAgICAgPGJ1dHRvblxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuKCFvcGVuKX1cbiAgICAgICAgY2xhc3NOYW1lPXtgdy0xMyBoLTEzIHJvdW5kZWQtZnVsbCBzaGFkb3ctbGcgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMjAwIGhvdmVyOnNjYWxlLTEwNSAke1xuICAgICAgICAgIG9wZW4gPyAnYmctZ3JheS02MDAnIDogJ2JnLXByaW1hcnktNjAwIGhvdmVyOmJnLXByaW1hcnktNzAwJ1xuICAgICAgICB9YH1cbiAgICAgICAgc3R5bGU9e3sgd2lkdGg6ICc1MnB4JywgaGVpZ2h0OiAnNTJweCcgfX1cbiAgICAgID5cbiAgICAgICAge29wZW5cbiAgICAgICAgICA/IDxYIGNsYXNzTmFtZT1cInctNSBoLTUgdGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgOiA8TWVzc2FnZUNpcmNsZSBjbGFzc05hbWU9XCJ3LTUuNSBoLTUuNSB0ZXh0LXdoaXRlXCIgc3R5bGU9e3sgd2lkdGg6ICcyMnB4JywgaGVpZ2h0OiAnMjJweCcgfX0gLz5cbiAgICAgICAgfVxuICAgICAgPC9idXR0b24+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL2NvbXBvbmVudHMvQ2hhdEJvdC50c3gifQ==