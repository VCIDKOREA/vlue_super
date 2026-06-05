import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/FamilySafety.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/FamilySafety.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
const FamilySafety = () => {
  _s();
  const [isLinked, setIsLinked] = useState(false);
  const seniorTitleStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#1e293b",
    letterSpacing: "-0.02em"
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl shadow-lg border-2 border-blue-100 overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-600 p-4 flex justify-between items-center text-white", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "font-bold flex items-center gap-2", children: "🛡️ VLUE AI 보안팀" }, void 0, false, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 18,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-xs bg-blue-500 px-2 py-1 rounded-full animate-pulse", children: "실시간 분석 중.." }, void 0, false, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 21,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/FamilySafety.tsx",
      lineNumber: 17,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxDEV("h2", { style: seniorTitleStyle, className: "mb-2", children: "부모님 안심 결합 (효 구독)" }, void 0, false, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 27,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-gray-600 mb-6 text-lg", children: "부모님 폰을 보이스피싱으로부터 안전하게 지켜드립니다." }, void 0, false, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 28,
        columnNumber: 9
      }, this),
      !isLinked ? /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-slate-600 text-center mb-4", children: '"아직 연결된 부모님 계정이 없습니다."' }, void 0, false, {
          fileName: "/home/project/src/components/FamilySafety.tsx",
          lineNumber: 33,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setIsLinked(true),
            className: "w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-md transition-all active:scale-95",
            children: [
              "🎁 가족인증 링크 보내기",
              /* @__PURE__ */ jsxDEV("span", { className: "block text-sm font-normal text-indigo-100 mt-1", children: "인증 즉시 부모님 1개월 무료 이용권 발급" }, void 0, false, {
                fileName: "/home/project/src/components/FamilySafety.tsx",
                lineNumber: 41,
                columnNumber: 17
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/components/FamilySafety.tsx",
            lineNumber: 36,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 32,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 31,
        columnNumber: 9
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "p-5 bg-green-50 rounded-2xl border border-green-200", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-green-700 font-bold mb-1", children: "안전 상태" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 50,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-2xl font-black text-green-800", children: "매우 안전함" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 51,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-green-600 mt-2", children: "최근 위협 감지 없음" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 52,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/FamilySafety.tsx",
            lineNumber: 49,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "p-5 bg-blue-50 rounded-2xl border border-blue-200", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-blue-700 font-bold mb-1", children: "대리 결제" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 56,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xl font-black text-blue-800", children: "결제 수단 공유 중" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 57,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-blue-600 mt-2", children: "현대카드 **** 1234" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 58,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/FamilySafety.tsx",
            lineNumber: 55,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/FamilySafety.tsx",
          lineNumber: 48,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "p-6 bg-orange-50 rounded-2xl text-center border border-orange-200 cursor-pointer hover:bg-orange-100", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-3xl block mb-2", children: "🏠" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 65,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "font-bold text-orange-800", children: [
              "우리 동네",
              /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
                fileName: "/home/project/src/components/FamilySafety.tsx",
                lineNumber: 66,
                columnNumber: 63
              }, this),
              "복지 혜택"
            ] }, void 0, true, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 66,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/FamilySafety.tsx",
            lineNumber: 64,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "p-6 bg-rose-50 rounded-2xl text-center border border-rose-200 cursor-pointer hover:bg-rose-100", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-3xl block mb-2", children: "🏥" }, void 0, false, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 69,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "font-bold text-rose-800", children: [
              "시니어",
              /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
                fileName: "/home/project/src/components/FamilySafety.tsx",
                lineNumber: 70,
                columnNumber: 59
              }, this),
              "건강 알림"
            ] }, void 0, true, {
              fileName: "/home/project/src/components/FamilySafety.tsx",
              lineNumber: 70,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/components/FamilySafety.tsx",
            lineNumber: 68,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/FamilySafety.tsx",
          lineNumber: 63,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/FamilySafety.tsx",
        lineNumber: 46,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/FamilySafety.tsx",
      lineNumber: 26,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/components/FamilySafety.tsx",
    lineNumber: 15,
    columnNumber: 5
  }, this);
};
_s(FamilySafety, "i65hTKQxmh6HO+BTuxBrxk1WsDg=");
_c = FamilySafety;
export default FamilySafety;
var _c;
$RefreshReg$(_c, "FamilySafety");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/FamilySafety.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/FamilySafety.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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LHVCQUFzQixrQkFBdEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBd0M7QUFBQSxZQUN4Qyx1QkFBQyxPQUFFLFdBQVUsNkJBQTRCO0FBQUE7QUFBQSxjQUFLLHVCQUFDLFVBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBRztBQUFBLGNBQUU7QUFBQSxpQkFBbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBd0Q7QUFBQSxlQUYxRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUdBO0FBQUEsVUFDQSx1QkFBQyxTQUFJLFdBQVUsa0dBQ2I7QUFBQSxtQ0FBQyxVQUFLLFdBQVUsdUJBQXNCLGtCQUF0QztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUF3QztBQUFBLFlBQ3hDLHVCQUFDLE9BQUUsV0FBVSwyQkFBMEI7QUFBQTtBQUFBLGNBQUcsdUJBQUMsVUFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFHO0FBQUEsY0FBRTtBQUFBLGlCQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFvRDtBQUFBLGVBRnREO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxhQVJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFTQTtBQUFBLFdBMUJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUEyQkE7QUFBQSxTQS9DSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBaURBO0FBQUEsT0E1REY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTZEQTtBQUVKO0FBQUVGLEdBM0VJRCxjQUFZO0FBQUFTLEtBQVpUO0FBNkVOLGVBQWVBO0FBQWEsSUFBQVM7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbInVzZVN0YXRlIiwiRmFtaWx5U2FmZXR5IiwiX3MiLCJpc0xpbmtlZCIsInNldElzTGlua2VkIiwic2VuaW9yVGl0bGVTdHlsZSIsImZvbnRTaXplIiwiZm9udFdlaWdodCIsImNvbG9yIiwibGV0dGVyU3BhY2luZyIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkZhbWlseVNhZmV0eS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuXG5jb25zdCBGYW1pbHlTYWZldHkgPSAoKSA9PiB7XG4gIGNvbnN0IFtpc0xpbmtlZCwgc2V0SXNMaW5rZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIC8vIOyLnOuLiOyWtCDtirntmZQg7Iqk7YOA7J28XG4gIGNvbnN0IHNlbmlvclRpdGxlU3R5bGUgPSB7XG4gICAgZm9udFNpemU6ICcxLjVyZW0nLFxuICAgIGZvbnRXZWlnaHQ6ICdib2xkJyxcbiAgICBjb2xvcjogJyMxZTI5M2InLFxuICAgIGxldHRlclNwYWNpbmc6ICctMC4wMmVtJ1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLTN4bCBzaGFkb3ctbGcgYm9yZGVyLTIgYm9yZGVyLWJsdWUtMTAwIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgey8qIOyDgeuLqCDsg4Htg5wg67CUICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ibHVlLTYwMCBwLTQgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHRleHQtd2hpdGVcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAg8J+boe+4jyBWTFVFIEFJIOuztOyViO2MgFxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgYmctYmx1ZS01MDAgcHgtMiBweS0xIHJvdW5kZWQtZnVsbCBhbmltYXRlLXB1bHNlXCI+XG4gICAgICAgICAg7Iuk7Iuc6rCEIOu2hOyEnSDspJEuLlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTZcIj5cbiAgICAgICAgPGgyIHN0eWxlPXtzZW5pb3JUaXRsZVN0eWxlfSBjbGFzc05hbWU9XCJtYi0yXCI+67aA66qo64uYIOyViOyLrCDqsrDtlakgKO2aqCDqtazrj4UpPC9oMj5cbiAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTYwMCBtYi02IHRleHQtbGdcIj7rtoDrqqjri5gg7Y+w7J2EIOuztOydtOyKpO2UvOyLseycvOuhnOu2gO2EsCDslYjsoITtlZjqsowg7KeA7Lyc65Oc66a964uI64ukLjwvcD5cblxuICAgICAgICB7IWlzTGlua2VkID8gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTUwIHAtNSByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWRhc2hlZCBib3JkZXItc2xhdGUtMzAwXCI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNjAwIHRleHQtY2VudGVyIG1iLTRcIj5cbiAgICAgICAgICAgICAgICBcIuyVhOyngSDsl7DqsrDrkJwg67aA66qo64uYIOqzhOygleydtCDsl4bsirXri4jri6QuXCJcbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldElzTGlua2VkKHRydWUpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBweS01IGJnLWluZGlnby02MDAgaG92ZXI6YmctaW5kaWdvLTcwMCB0ZXh0LXdoaXRlIHJvdW5kZWQtMnhsIGZvbnQtYmxhY2sgdGV4dC14bCBzaGFkb3ctbWQgdHJhbnNpdGlvbi1hbGwgYWN0aXZlOnNjYWxlLTk1XCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIPCfjoEg6rCA7KGx7J247KadIOunge2BrCDrs7TrgrTquLBcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJibG9jayB0ZXh0LXNtIGZvbnQtbm9ybWFsIHRleHQtaW5kaWdvLTEwMCBtdC0xXCI+7J247KadIOymieyLnCDrtoDrqqjri5ggMeqwnOyblCDrrLTro4wg7J207Jqp6raMIOuwnOq4iTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSA6IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNlwiPlxuICAgICAgICAgICAgey8qIOuztOyViCDrpqztj6ztirgg7Iuc6rCB7ZmUICovfVxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC01IGJnLWdyZWVuLTUwIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItZ3JlZW4tMjAwXCI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmVlbi03MDAgZm9udC1ib2xkIG1iLTFcIj7slYjsoIQg7IOB7YOcPC9wPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYmxhY2sgdGV4dC1ncmVlbi04MDBcIj7rp6TsmrAg7JWI7KCE7ZWoPC9wPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gdGV4dC1ncmVlbi02MDAgbXQtMlwiPuy1nOq3vCDsnITtmJEg6rCQ7KeAIOyXhuydjDwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNSBiZy1ibHVlLTUwIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItYmx1ZS0yMDBcIj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNzAwIGZvbnQtYm9sZCBtYi0xXCI+64yA66asIOqysOygnDwvcD5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdGV4dC1ibHVlLTgwMFwiPuqysOygnCDsiJjri6gg6rO17JygIOykkTwvcD5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtYmx1ZS02MDAgbXQtMlwiPu2YhOuMgOy5tOuTnCAqKioqIDEyMzQ8L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiDsi5zri4jslrQg7Yq57ZmUIOuwsOuEiCAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNiBiZy1vcmFuZ2UtNTAgcm91bmRlZC0yeGwgdGV4dC1jZW50ZXIgYm9yZGVyIGJvcmRlci1vcmFuZ2UtMjAwIGN1cnNvci1wb2ludGVyIGhvdmVyOmJnLW9yYW5nZS0xMDBcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBibG9jayBtYi0yXCI+8J+PoDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1vcmFuZ2UtODAwXCI+7Jqw66asIOuPmeuEpDxici8+67O17KeAIO2YnO2DnTwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02IGJnLXJvc2UtNTAgcm91bmRlZC0yeGwgdGV4dC1jZW50ZXIgYm9yZGVyIGJvcmRlci1yb3NlLTIwMCBjdXJzb3ItcG9pbnRlciBob3ZlcjpiZy1yb3NlLTEwMFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtM3hsIGJsb2NrIG1iLTJcIj7wn4+lPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LXJvc2UtODAwXCI+7Iuc64uI7Ja0PGJyLz7qsbTqsJUg7JWM66a8PC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBGYW1pbHlTYWZldHk7Il0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9jb21wb25lbnRzL0ZhbWlseVNhZmV0eS50c3gifQ==