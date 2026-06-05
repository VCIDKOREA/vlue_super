import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/LoginRequiredModal.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/LoginRequiredModal.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { Lock, X, LogIn } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
export default function LoginRequiredModal({ onClose, onLogin }) {
  const handleLogin = () => {
    onClose();
    onLogin();
  };
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      style: { background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" },
      onClick: onClose,
      children: /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center relative",
          onClick: (e) => e.stopPropagation(),
          style: { animation: "loginModalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)" },
          children: [
            /* @__PURE__ */ jsxDEV("style", { children: `
          @keyframes loginModalIn {
            from { opacity: 0; transform: scale(0.88) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        ` }, void 0, false, {
              fileName: "/home/project/src/components/LoginRequiredModal.tsx",
              lineNumber: 25,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: onClose,
                className: "absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all",
                "aria-label": "닫기",
                children: /* @__PURE__ */ jsxDEV(X, { className: "w-4 h-4" }, void 0, false, {
                  fileName: "/home/project/src/components/LoginRequiredModal.tsx",
                  lineNumber: 37,
                  columnNumber: 11
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/home/project/src/components/LoginRequiredModal.tsx",
                lineNumber: 32,
                columnNumber: 9
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-5", children: /* @__PURE__ */ jsxDEV(Lock, { className: "w-7 h-7 text-primary-500" }, void 0, false, {
              fileName: "/home/project/src/components/LoginRequiredModal.tsx",
              lineNumber: 41,
              columnNumber: 11
            }, this) }, void 0, false, {
              fileName: "/home/project/src/components/LoginRequiredModal.tsx",
              lineNumber: 40,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("h2", { className: "text-lg font-bold text-gray-900 mb-2", style: { wordBreak: "keep-all" }, children: "로그인이 필요한 서비스입니다" }, void 0, false, {
              fileName: "/home/project/src/components/LoginRequiredModal.tsx",
              lineNumber: 44,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-gray-500 mb-7 leading-relaxed", style: { wordBreak: "keep-all" }, children: [
              "VLUE 회원이라면 지금 바로 로그인하고",
              /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
                fileName: "/home/project/src/components/LoginRequiredModal.tsx",
                lineNumber: 49,
                columnNumber: 11
              }, this),
              "모든 서비스를 이용해보세요."
            ] }, void 0, true, {
              fileName: "/home/project/src/components/LoginRequiredModal.tsx",
              lineNumber: 47,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-3", children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: handleLogin,
                  className: "w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all duration-150 shadow-soft",
                  children: [
                    /* @__PURE__ */ jsxDEV(LogIn, { className: "w-4 h-4" }, void 0, false, {
                      fileName: "/home/project/src/components/LoginRequiredModal.tsx",
                      lineNumber: 58,
                      columnNumber: 13
                    }, this),
                    "로그인 / 회원가입"
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/home/project/src/components/LoginRequiredModal.tsx",
                  lineNumber: 54,
                  columnNumber: 11
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: onClose,
                  className: "w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-all duration-150",
                  children: "나중에 하기"
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/components/LoginRequiredModal.tsx",
                  lineNumber: 61,
                  columnNumber: 11
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/home/project/src/components/LoginRequiredModal.tsx",
              lineNumber: 53,
              columnNumber: 9
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/components/LoginRequiredModal.tsx",
          lineNumber: 20,
          columnNumber: 7
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/home/project/src/components/LoginRequiredModal.tsx",
      lineNumber: 15,
      columnNumber: 5
    },
    this
  );
}
_c = LoginRequiredModal;
var _c;
$RefreshReg$(_c, "LoginRequiredModal");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/LoginRequiredModal.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/LoginRequiredModal.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBd0JRO0FBeEJSLDJCQUF1QjtBQUFzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFPN0Msd0JBQXdCQSxtQkFBbUIsRUFBRUMsU0FBU0MsUUFBaUMsR0FBRztBQUN4RixRQUFNQyxjQUFjQSxNQUFNO0FBQ3hCRixZQUFRO0FBQ1JDLFlBQVE7QUFBQSxFQUNWO0FBRUEsU0FDRTtBQUFBLElBQUM7QUFBQTtBQUFBLE1BQ0MsV0FBVTtBQUFBLE1BQ1YsT0FBTyxFQUFFRSxZQUFZLG9CQUFvQkMsZ0JBQWdCLFlBQVk7QUFBQSxNQUNyRSxTQUFTSjtBQUFBQSxNQUVUO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxXQUFVO0FBQUEsVUFDVixTQUFTLENBQUNLLE1BQU1BLEVBQUVDLGdCQUFnQjtBQUFBLFVBQ2xDLE9BQU8sRUFBRUMsV0FBVyxvREFBb0Q7QUFBQSxVQUV4RTtBQUFBLG1DQUFDLFdBQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFLRTtBQUFBLFlBRUY7QUFBQSxjQUFDO0FBQUE7QUFBQSxnQkFDQyxTQUFTUDtBQUFBQSxnQkFDVCxXQUFVO0FBQUEsZ0JBQ1YsY0FBVztBQUFBLGdCQUVYLGlDQUFDLEtBQUUsV0FBVSxhQUFiO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQXNCO0FBQUE7QUFBQSxjQUx4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFNQTtBQUFBLFlBRUEsdUJBQUMsU0FBSSxXQUFVLCtHQUNiLGlDQUFDLFFBQUssV0FBVSw4QkFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMEMsS0FENUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLFlBRUEsdUJBQUMsUUFBRyxXQUFVLHdDQUF1QyxPQUFPLEVBQUVRLFdBQVcsV0FBVyxHQUFFLCtCQUF0RjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUVBO0FBQUEsWUFDQSx1QkFBQyxPQUFFLFdBQVUsOENBQTZDLE9BQU8sRUFBRUEsV0FBVyxXQUFXLEdBQUU7QUFBQTtBQUFBLGNBRXpGLHVCQUFDLFVBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBRztBQUFBO0FBQUEsaUJBRkw7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFJQTtBQUFBLFlBRUEsdUJBQUMsU0FBSSxXQUFVLHVCQUNiO0FBQUE7QUFBQSxnQkFBQztBQUFBO0FBQUEsa0JBQ0MsU0FBU047QUFBQUEsa0JBQ1QsV0FBVTtBQUFBLGtCQUVWO0FBQUEsMkNBQUMsU0FBTSxXQUFVLGFBQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsMkJBQTBCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZ0JBSjVCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxjQU1BO0FBQUEsY0FDQTtBQUFBLGdCQUFDO0FBQUE7QUFBQSxrQkFDQyxTQUFTRjtBQUFBQSxrQkFDVCxXQUFVO0FBQUEsa0JBQThIO0FBQUE7QUFBQSxnQkFGMUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGNBS0E7QUFBQSxpQkFiRjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQWNBO0FBQUE7QUFBQTtBQUFBLFFBL0NGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQWdEQTtBQUFBO0FBQUEsSUFyREY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBc0RBO0FBRUo7QUFBQ1MsS0EvRHVCVjtBQUFrQixJQUFBVTtBQUFBQyxhQUFBRCxJQUFBIiwibmFtZXMiOlsiTG9naW5SZXF1aXJlZE1vZGFsIiwib25DbG9zZSIsIm9uTG9naW4iLCJoYW5kbGVMb2dpbiIsImJhY2tncm91bmQiLCJiYWNrZHJvcEZpbHRlciIsImUiLCJzdG9wUHJvcGFnYXRpb24iLCJhbmltYXRpb24iLCJ3b3JkQnJlYWsiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJMb2dpblJlcXVpcmVkTW9kYWwudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvY2ssIFgsIExvZ0luIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuaW50ZXJmYWNlIExvZ2luUmVxdWlyZWRNb2RhbFByb3BzIHtcbiAgb25DbG9zZTogKCkgPT4gdm9pZDtcbiAgb25Mb2dpbjogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTG9naW5SZXF1aXJlZE1vZGFsKHsgb25DbG9zZSwgb25Mb2dpbiB9OiBMb2dpblJlcXVpcmVkTW9kYWxQcm9wcykge1xuICBjb25zdCBoYW5kbGVMb2dpbiA9ICgpID0+IHtcbiAgICBvbkNsb3NlKCk7XG4gICAgb25Mb2dpbigpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdlxuICAgICAgY2xhc3NOYW1lPVwiZml4ZWQgaW5zZXQtMCB6LTUwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHAtNFwiXG4gICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAncmdiYSgwLDAsMCwwLjQ1KScsIGJhY2tkcm9wRmlsdGVyOiAnYmx1cig0cHgpJyB9fVxuICAgICAgb25DbGljaz17b25DbG9zZX1cbiAgICA+XG4gICAgICA8ZGl2XG4gICAgICAgIGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtM3hsIHNoYWRvdy0yeGwgdy1mdWxsIG1heC13LXNtIHAtOCB0ZXh0LWNlbnRlciByZWxhdGl2ZVwiXG4gICAgICAgIG9uQ2xpY2s9eyhlKSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpfVxuICAgICAgICBzdHlsZT17eyBhbmltYXRpb246ICdsb2dpbk1vZGFsSW4gMC4yMnMgY3ViaWMtYmV6aWVyKDAuMzQsMS41NiwwLjY0LDEpJyB9fVxuICAgICAgPlxuICAgICAgICA8c3R5bGU+e2BcbiAgICAgICAgICBAa2V5ZnJhbWVzIGxvZ2luTW9kYWxJbiB7XG4gICAgICAgICAgICBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiBzY2FsZSgwLjg4KSB0cmFuc2xhdGVZKDEycHgpOyB9XG4gICAgICAgICAgICB0byAgIHsgb3BhY2l0eTogMTsgdHJhbnNmb3JtOiBzY2FsZSgxKSB0cmFuc2xhdGVZKDApOyB9XG4gICAgICAgICAgfVxuICAgICAgICBgfTwvc3R5bGU+XG5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9e29uQ2xvc2V9XG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTQgcmlnaHQtNCBwLTEuNSByb3VuZGVkLXhsIHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1ncmF5LTYwMCBob3ZlcjpiZy1ncmF5LTEwMCB0cmFuc2l0aW9uLWFsbFwiXG4gICAgICAgICAgYXJpYS1sYWJlbD1cIuuLq+q4sFwiXG4gICAgICAgID5cbiAgICAgICAgICA8WCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC0yeGwgYmctcHJpbWFyeS01MCBib3JkZXIgYm9yZGVyLXByaW1hcnktMTAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG14LWF1dG8gbWItNVwiPlxuICAgICAgICAgIDxMb2NrIGNsYXNzTmFtZT1cInctNyBoLTcgdGV4dC1wcmltYXJ5LTUwMFwiIC8+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwIG1iLTJcIiBzdHlsZT17eyB3b3JkQnJlYWs6ICdrZWVwLWFsbCcgfX0+XG4gICAgICAgICAg66Gc6re47J247J20IO2VhOyalO2VnCDshJzruYTsiqTsnoXri4jri6RcbiAgICAgICAgPC9oMj5cbiAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSB0ZXh0LWdyYXktNTAwIG1iLTcgbGVhZGluZy1yZWxheGVkXCIgc3R5bGU9e3sgd29yZEJyZWFrOiAna2VlcC1hbGwnIH19PlxuICAgICAgICAgIFZMVUUg7ZqM7JuQ7J20652866m0IOyngOq4iCDrsJTroZwg66Gc6re47J247ZWY6rOgXG4gICAgICAgICAgPGJyIC8+XG4gICAgICAgICAg66qo65OgIOyEnOu5hOyKpOulvCDsnbTsmqntlbTrs7TshLjsmpQuXG4gICAgICAgIDwvcD5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVMb2dpbn1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBweS0zIGJnLXByaW1hcnktNTAwIGhvdmVyOmJnLXByaW1hcnktNjAwIHRleHQtd2hpdGUgZm9udC1zZW1pYm9sZCByb3VuZGVkLTJ4bCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0xNTAgc2hhZG93LXNvZnRcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxMb2dJbiBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgIOuhnOq3uOyduCAvIO2ajOybkOqwgOyehVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9e29uQ2xvc2V9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcHktMi41IHRleHQtc20gdGV4dC1ncmF5LTUwMCBob3Zlcjp0ZXh0LWdyYXktNzAwIGZvbnQtbWVkaXVtIHJvdW5kZWQtMnhsIGhvdmVyOmJnLWdyYXktNTAgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICDrgpjspJHsl5Ag7ZWY6riwXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL2NvbXBvbmVudHMvTG9naW5SZXF1aXJlZE1vZGFsLnRzeCJ9