import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/DocumentEditor.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/DocumentEditor.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"]; const useRef = __vite__cjsImport3_react["useRef"];
import { X, Printer, Save, ChevronDown, AlertCircle } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
export default function DocumentEditor({ title, category, fields, userName, onClose }) {
  _s();
  const initialValues = {};
  fields.forEach((f) => {
    if (f.autoFill === "name" && userName) {
      initialValues[f.key] = userName;
    } else {
      initialValues[f.key] = "";
    }
  });
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState(false);
  const printRef = useRef(null);
  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2e3);
  };
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const fieldsHtml = fields.map((f) => {
      const val = values[f.key] || "";
      return `
        <tr>
          <td style="width:30%;padding:8px 12px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#374151;vertical-align:top;">${f.label}${f.required ? " *" : ""}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#111827;white-space:pre-wrap;min-height:32px;">${val || "&nbsp;"}</td>
        </tr>
      `;
    }).join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #111; margin: 0; padding: 0; }
          .doc-header { text-align: center; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #1e40af; }
          .doc-category { font-size: 12px; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.05em; }
          .doc-title { font-size: 22px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .doc-footer { margin-top: 36px; text-align: center; font-size: 11px; color: #9ca3af; }
          .signed-area { margin-top: 40px; display: flex; justify-content: flex-end; gap: 48px; }
          .sign-box { text-align: center; font-size: 13px; }
          .sign-line { width: 120px; height: 60px; border: 1px solid #e5e7eb; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <div class="doc-category">${category}</div>
          <div class="doc-title">${title}</div>
        </div>
        <table>${fieldsHtml}</table>
        <div class="signed-area">
          <div class="sign-box">작성자<div class="sign-line"></div></div>
          <div class="sign-box">검토자<div class="sign-line"></div></div>
          <div class="sign-box">결재자<div class="sign-line"></div></div>
        </div>
        <div class="doc-footer">본 문서는 VLUE 자료실에서 작성되었습니다.</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between px-7 py-5 border-b border-gray-100 flex-shrink-0", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-gray-400 font-medium", children: category }, void 0, false, {
          fileName: "/home/project/src/components/DocumentEditor.tsx",
          lineNumber: 107,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { className: "text-gray-900 font-bold text-lg leading-tight", style: { letterSpacing: "-0.02em" }, children: title }, void 0, false, {
          fileName: "/home/project/src/components/DocumentEditor.tsx",
          lineNumber: 108,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/components/DocumentEditor.tsx",
        lineNumber: 106,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: handleSave,
            className: `flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`,
            children: [
              /* @__PURE__ */ jsxDEV(Save, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/components/DocumentEditor.tsx",
                lineNumber: 117,
                columnNumber: 15
              }, this),
              saved ? "저장됨" : "저장"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 111,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: handlePrint,
            className: "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-all",
            children: [
              /* @__PURE__ */ jsxDEV(Printer, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/home/project/src/components/DocumentEditor.tsx",
                lineNumber: 124,
                columnNumber: 15
              }, this),
              "인쇄"
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 120,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: onClose,
            className: "p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all",
            children: /* @__PURE__ */ jsxDEV(X, { className: "w-5 h-5" }, void 0, false, {
              fileName: "/home/project/src/components/DocumentEditor.tsx",
              lineNumber: 131,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 127,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/components/DocumentEditor.tsx",
        lineNumber: 110,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/DocumentEditor.tsx",
      lineNumber: 105,
      columnNumber: 9
    }, this),
    userName && /* @__PURE__ */ jsxDEV("div", { className: "px-7 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-shrink-0", children: [
      /* @__PURE__ */ jsxDEV(AlertCircle, { className: "w-4 h-4 text-primary-500 flex-shrink-0" }, void 0, false, {
        fileName: "/home/project/src/components/DocumentEditor.tsx",
        lineNumber: 138,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-primary-700 text-xs font-medium", children: [
        "회원 이름 ",
        /* @__PURE__ */ jsxDEV("strong", { children: userName }, void 0, false, {
          fileName: "/home/project/src/components/DocumentEditor.tsx",
          lineNumber: 140,
          columnNumber: 21
        }, this),
        "이(가) 자동으로 입력되었습니다. 필요 시 수정하세요."
      ] }, void 0, true, {
        fileName: "/home/project/src/components/DocumentEditor.tsx",
        lineNumber: 139,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/components/DocumentEditor.tsx",
      lineNumber: 137,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: printRef, className: "overflow-y-auto flex-1 px-7 py-6", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 gap-4", children: fields.map(
      (f) => /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5", children: [
          f.label,
          f.required && /* @__PURE__ */ jsxDEV("span", { className: "text-red-500 ml-0.5", children: "*" }, void 0, false, {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 151,
            columnNumber: 34
          }, this),
          f.autoFill === "name" && userName && /* @__PURE__ */ jsxDEV("span", { className: "ml-2 text-primary-500 font-medium text-xs", children: "(자동입력)" }, void 0, false, {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 153,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/DocumentEditor.tsx",
          lineNumber: 149,
          columnNumber: 17
        }, this),
        f.type === "textarea" ? /* @__PURE__ */ jsxDEV(
          "textarea",
          {
            value: values[f.key],
            onChange: (e) => handleChange(f.key, e.target.value),
            placeholder: f.placeholder,
            rows: 3,
            className: "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 157,
            columnNumber: 15
          },
          this
        ) : f.type === "select" ? /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
          /* @__PURE__ */ jsxDEV(
            "select",
            {
              value: values[f.key],
              onChange: (e) => handleChange(f.key, e.target.value),
              className: "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all appearance-none bg-white pr-9",
              children: [
                /* @__PURE__ */ jsxDEV("option", { value: "", children: "선택하세요" }, void 0, false, {
                  fileName: "/home/project/src/components/DocumentEditor.tsx",
                  lineNumber: 171,
                  columnNumber: 23
                }, this),
                f.options?.map(
                  (opt) => /* @__PURE__ */ jsxDEV("option", { value: opt, children: opt }, opt, false, {
                    fileName: "/home/project/src/components/DocumentEditor.tsx",
                    lineNumber: 173,
                    columnNumber: 19
                  }, this)
                )
              ]
            },
            void 0,
            true,
            {
              fileName: "/home/project/src/components/DocumentEditor.tsx",
              lineNumber: 166,
              columnNumber: 21
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(ChevronDown, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" }, void 0, false, {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 176,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/components/DocumentEditor.tsx",
          lineNumber: 165,
          columnNumber: 15
        }, this) : /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: f.type,
            value: values[f.key],
            onChange: (e) => handleChange(f.key, e.target.value),
            placeholder: f.placeholder,
            className: "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
          },
          void 0,
          false,
          {
            fileName: "/home/project/src/components/DocumentEditor.tsx",
            lineNumber: 179,
            columnNumber: 15
          },
          this
        )
      ] }, f.key, true, {
        fileName: "/home/project/src/components/DocumentEditor.tsx",
        lineNumber: 148,
        columnNumber: 13
      }, this)
    ) }, void 0, false, {
      fileName: "/home/project/src/components/DocumentEditor.tsx",
      lineNumber: 146,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/home/project/src/components/DocumentEditor.tsx",
      lineNumber: 145,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "px-7 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-gray-400", children: "* 표시는 필수 항목입니다." }, void 0, false, {
        fileName: "/home/project/src/components/DocumentEditor.tsx",
        lineNumber: 193,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handlePrint,
          className: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-sm",
          children: [
            /* @__PURE__ */ jsxDEV(Printer, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/home/project/src/components/DocumentEditor.tsx",
              lineNumber: 198,
              columnNumber: 13
            }, this),
            "인쇄하기"
          ]
        },
        void 0,
        true,
        {
          fileName: "/home/project/src/components/DocumentEditor.tsx",
          lineNumber: 194,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/project/src/components/DocumentEditor.tsx",
      lineNumber: 192,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/components/DocumentEditor.tsx",
    lineNumber: 104,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/project/src/components/DocumentEditor.tsx",
    lineNumber: 103,
    columnNumber: 5
  }, this);
}
_s(DocumentEditor, "3sH254whLPhSmHLXrucNGRGEwN0=");
_c = DocumentEditor;
var _c;
$RefreshReg$(_c, "DocumentEditor");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/DocumentEditor.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/DocumentEditor.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QUE7QUFBQTtBQUFBO0FBQUEsUUFKOUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BTUE7QUFBQSxTQVJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FTQTtBQUFBLE9BakdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FrR0EsS0FuR0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQW9HQTtBQUVKO0FBQUNqQixHQXZMdUJOLGdCQUFjO0FBQUErQyxLQUFkL0M7QUFBYyxJQUFBK0M7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbInVzZVJlZiIsIlgiLCJQcmludGVyIiwiU2F2ZSIsIkNoZXZyb25Eb3duIiwiQWxlcnRDaXJjbGUiLCJEb2N1bWVudEVkaXRvciIsInRpdGxlIiwiY2F0ZWdvcnkiLCJmaWVsZHMiLCJ1c2VyTmFtZSIsIm9uQ2xvc2UiLCJfcyIsImluaXRpYWxWYWx1ZXMiLCJmb3JFYWNoIiwiZiIsImF1dG9GaWxsIiwia2V5IiwidmFsdWVzIiwic2V0VmFsdWVzIiwidXNlU3RhdGUiLCJzYXZlZCIsInNldFNhdmVkIiwicHJpbnRSZWYiLCJoYW5kbGVDaGFuZ2UiLCJ2YWx1ZSIsInByZXYiLCJoYW5kbGVTYXZlIiwic2V0VGltZW91dCIsImhhbmRsZVByaW50IiwicHJpbnRDb250ZW50IiwiY3VycmVudCIsInByaW50V2luZG93Iiwid2luZG93Iiwib3BlbiIsImZpZWxkc0h0bWwiLCJtYXAiLCJ2YWwiLCJsYWJlbCIsInJlcXVpcmVkIiwiam9pbiIsImRvY3VtZW50Iiwid3JpdGUiLCJjbG9zZSIsImZvY3VzIiwicHJpbnQiLCJsZXR0ZXJTcGFjaW5nIiwidHlwZSIsImUiLCJ0YXJnZXQiLCJwbGFjZWhvbGRlciIsIm9wdGlvbnMiLCJvcHQiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJEb2N1bWVudEVkaXRvci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlU3RhdGUsIHVzZVJlZiB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IFgsIFByaW50ZXIsIFNhdmUsIENoZXZyb25Eb3duLCBBbGVydENpcmNsZSB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5cbmludGVyZmFjZSBUZW1wbGF0ZUZpZWxkIHtcbiAga2V5OiBzdHJpbmc7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIHR5cGU6ICd0ZXh0JyB8ICdkYXRlJyB8ICd0ZXh0YXJlYScgfCAnc2VsZWN0JztcbiAgcGxhY2Vob2xkZXI/OiBzdHJpbmc7XG4gIG9wdGlvbnM/OiBzdHJpbmdbXTtcbiAgcmVxdWlyZWQ6IGJvb2xlYW47XG4gIGF1dG9GaWxsPzogJ25hbWUnO1xufVxuXG5pbnRlcmZhY2UgRG9jdW1lbnRFZGl0b3JQcm9wcyB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGNhdGVnb3J5OiBzdHJpbmc7XG4gIGZpZWxkczogVGVtcGxhdGVGaWVsZFtdO1xuICB1c2VyTmFtZT86IHN0cmluZztcbiAgb25DbG9zZTogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRG9jdW1lbnRFZGl0b3IoeyB0aXRsZSwgY2F0ZWdvcnksIGZpZWxkcywgdXNlck5hbWUsIG9uQ2xvc2UgfTogRG9jdW1lbnRFZGl0b3JQcm9wcykge1xuICBjb25zdCBpbml0aWFsVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGZpZWxkcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgaWYgKGYuYXV0b0ZpbGwgPT09ICduYW1lJyAmJiB1c2VyTmFtZSkge1xuICAgICAgaW5pdGlhbFZhbHVlc1tmLmtleV0gPSB1c2VyTmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5pdGlhbFZhbHVlc1tmLmtleV0gPSAnJztcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IFt2YWx1ZXMsIHNldFZhbHVlc10gPSB1c2VTdGF0ZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+Pihpbml0aWFsVmFsdWVzKTtcbiAgY29uc3QgW3NhdmVkLCBzZXRTYXZlZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IHByaW50UmVmID0gdXNlUmVmPEhUTUxEaXZFbGVtZW50PihudWxsKTtcblxuICBjb25zdCBoYW5kbGVDaGFuZ2UgPSAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICBzZXRWYWx1ZXMoKHByZXYpID0+ICh7IC4uLnByZXYsIFtrZXldOiB2YWx1ZSB9KSk7XG4gICAgc2V0U2F2ZWQoZmFsc2UpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVNhdmUgPSAoKSA9PiB7XG4gICAgc2V0U2F2ZWQodHJ1ZSk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXRTYXZlZChmYWxzZSksIDIwMDApO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVByaW50ID0gKCkgPT4ge1xuICAgIGNvbnN0IHByaW50Q29udGVudCA9IHByaW50UmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFwcmludENvbnRlbnQpIHJldHVybjtcbiAgICBjb25zdCBwcmludFdpbmRvdyA9IHdpbmRvdy5vcGVuKCcnLCAnX2JsYW5rJyk7XG4gICAgaWYgKCFwcmludFdpbmRvdykgcmV0dXJuO1xuXG4gICAgY29uc3QgZmllbGRzSHRtbCA9IGZpZWxkcy5tYXAoKGYpID0+IHtcbiAgICAgIGNvbnN0IHZhbCA9IHZhbHVlc1tmLmtleV0gfHwgJyc7XG4gICAgICByZXR1cm4gYFxuICAgICAgICA8dHI+XG4gICAgICAgICAgPHRkIHN0eWxlPVwid2lkdGg6MzAlO3BhZGRpbmc6OHB4IDEycHg7Zm9udC13ZWlnaHQ6NjAwO2JhY2tncm91bmQ6I2Y4ZmFmYztib3JkZXI6MXB4IHNvbGlkICNlMmU4ZjA7Zm9udC1zaXplOjEzcHg7Y29sb3I6IzM3NDE1MTt2ZXJ0aWNhbC1hbGlnbjp0b3A7XCI+JHtmLmxhYmVsfSR7Zi5yZXF1aXJlZCA/ICcgKicgOiAnJ308L3RkPlxuICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6OHB4IDEycHg7Ym9yZGVyOjFweCBzb2xpZCAjZTJlOGYwO2ZvbnQtc2l6ZToxM3B4O2NvbG9yOiMxMTE4Mjc7d2hpdGUtc3BhY2U6cHJlLXdyYXA7bWluLWhlaWdodDozMnB4O1wiPiR7dmFsIHx8ICcmbmJzcDsnfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICBgO1xuICAgIH0pLmpvaW4oJycpO1xuXG4gICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQud3JpdGUoYFxuICAgICAgPCFET0NUWVBFIGh0bWw+XG4gICAgICA8aHRtbCBsYW5nPVwia29cIj5cbiAgICAgIDxoZWFkPlxuICAgICAgICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIiAvPlxuICAgICAgICA8dGl0bGU+JHt0aXRsZX08L3RpdGxlPlxuICAgICAgICA8c3R5bGU+XG4gICAgICAgICAgQHBhZ2UgeyBzaXplOiBBNDsgbWFyZ2luOiAyMG1tOyB9XG4gICAgICAgICAgKiB7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH1cbiAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6ICdNYWxndW4gR290aGljJywgJ0FwcGxlIFNEIEdvdGhpYyBOZW8nLCBzYW5zLXNlcmlmOyBjb2xvcjogIzExMTsgbWFyZ2luOiAwOyBwYWRkaW5nOiAwOyB9XG4gICAgICAgICAgLmRvYy1oZWFkZXIgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IG1hcmdpbi1ib3R0b206IDI4cHg7IHBhZGRpbmctYm90dG9tOiAxNnB4OyBib3JkZXItYm90dG9tOiAycHggc29saWQgIzFlNDBhZjsgfVxuICAgICAgICAgIC5kb2MtY2F0ZWdvcnkgeyBmb250LXNpemU6IDEycHg7IGNvbG9yOiAjNmI3MjgwOyBtYXJnaW4tYm90dG9tOiA2cHg7IGxldHRlci1zcGFjaW5nOiAwLjA1ZW07IH1cbiAgICAgICAgICAuZG9jLXRpdGxlIHsgZm9udC1zaXplOiAyMnB4OyBmb250LXdlaWdodDogODAwOyBjb2xvcjogIzExMTgyNzsgfVxuICAgICAgICAgIHRhYmxlIHsgd2lkdGg6IDEwMCU7IGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IG1hcmdpbi10b3A6IDhweDsgfVxuICAgICAgICAgIC5kb2MtZm9vdGVyIHsgbWFyZ2luLXRvcDogMzZweDsgdGV4dC1hbGlnbjogY2VudGVyOyBmb250LXNpemU6IDExcHg7IGNvbG9yOiAjOWNhM2FmOyB9XG4gICAgICAgICAgLnNpZ25lZC1hcmVhIHsgbWFyZ2luLXRvcDogNDBweDsgZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsgZ2FwOiA0OHB4OyB9XG4gICAgICAgICAgLnNpZ24tYm94IHsgdGV4dC1hbGlnbjogY2VudGVyOyBmb250LXNpemU6IDEzcHg7IH1cbiAgICAgICAgICAuc2lnbi1saW5lIHsgd2lkdGg6IDEyMHB4OyBoZWlnaHQ6IDYwcHg7IGJvcmRlcjogMXB4IHNvbGlkICNlNWU3ZWI7IG1hcmdpbi10b3A6IDhweDsgfVxuICAgICAgICA8L3N0eWxlPlxuICAgICAgPC9oZWFkPlxuICAgICAgPGJvZHk+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJkb2MtaGVhZGVyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImRvYy1jYXRlZ29yeVwiPiR7Y2F0ZWdvcnl9PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImRvYy10aXRsZVwiPiR7dGl0bGV9PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8dGFibGU+JHtmaWVsZHNIdG1sfTwvdGFibGU+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzaWduZWQtYXJlYVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzaWduLWJveFwiPuyekeyEseyekDxkaXYgY2xhc3M9XCJzaWduLWxpbmVcIj48L2Rpdj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic2lnbi1ib3hcIj7qsoDthqDsnpA8ZGl2IGNsYXNzPVwic2lnbi1saW5lXCI+PC9kaXY+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNpZ24tYm94XCI+6rKw7J6s7J6QPGRpdiBjbGFzcz1cInNpZ24tbGluZVwiPjwvZGl2PjwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImRvYy1mb290ZXJcIj7rs7gg66y47ISc64qUIFZMVUUg7J6Q66OM7Iuk7JeQ7IScIOyekeyEseuQmOyXiOyKteuLiOuLpC48L2Rpdj5cbiAgICAgIDwvYm9keT5cbiAgICAgIDwvaHRtbD5cbiAgICBgKTtcbiAgICBwcmludFdpbmRvdy5kb2N1bWVudC5jbG9zZSgpO1xuICAgIHByaW50V2luZG93LmZvY3VzKCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7IHByaW50V2luZG93LnByaW50KCk7IH0sIDMwMCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgei01MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwLTQgYmctYmxhY2svNTAgYmFja2Ryb3AtYmx1ci1zbVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLTN4bCBzaGFkb3ctMnhsIHctZnVsbCBtYXgtdy0yeGwgbWF4LWgtWzkwdmhdIGZsZXggZmxleC1jb2wgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHB4LTcgcHktNSBib3JkZXItYiBib3JkZXItZ3JheS0xMDAgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDAgZm9udC1tZWRpdW1cIj57Y2F0ZWdvcnl9PC9zcGFuPlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtZ3JheS05MDAgZm9udC1ib2xkIHRleHQtbGcgbGVhZGluZy10aWdodFwiIHN0eWxlPXt7IGxldHRlclNwYWNpbmc6ICctMC4wMmVtJyB9fT57dGl0bGV9PC9oMj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNhdmV9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtNCBweS0yIHJvdW5kZWQteGwgdGV4dC1zbSBmb250LXNlbWlib2xkIHRyYW5zaXRpb24tYWxsICR7XG4gICAgICAgICAgICAgICAgc2F2ZWQgPyAnYmctZW1lcmFsZC01MDAgdGV4dC13aGl0ZScgOiAnYmctZ3JheS0xMDAgdGV4dC1ncmF5LTcwMCBob3ZlcjpiZy1ncmF5LTIwMCdcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxTYXZlIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICB7c2F2ZWQgPyAn7KCA7J6l65CoJyA6ICfsoIDsnqUnfVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVByaW50fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTQgcHktMiByb3VuZGVkLXhsIHRleHQtc20gZm9udC1zZW1pYm9sZCBiZy1wcmltYXJ5LTYwMCB0ZXh0LXdoaXRlIGhvdmVyOmJnLXByaW1hcnktNzAwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPFByaW50ZXIgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgIOyduOyHhFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9e29uQ2xvc2V9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiB0ZXh0LWdyYXktNDAwIGhvdmVyOnRleHQtZ3JheS03MDAgaG92ZXI6YmctZ3JheS0xMDAgcm91bmRlZC14bCB0cmFuc2l0aW9uLWFsbFwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxYIGNsYXNzTmFtZT1cInctNSBoLTVcIiAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHt1c2VyTmFtZSAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC03IHB5LTMgYmctYmx1ZS01MCBib3JkZXItYiBib3JkZXItYmx1ZS0xMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgPEFsZXJ0Q2lyY2xlIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1wcmltYXJ5LTUwMCBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS03MDAgdGV4dC14cyBmb250LW1lZGl1bVwiPlxuICAgICAgICAgICAgICDtmozsm5Ag7J2066aEIDxzdHJvbmc+e3VzZXJOYW1lfTwvc3Ryb25nPuydtCjqsIApIOyekOuPmeycvOuhnCDsnoXroKXrkJjsl4jsirXri4jri6QuIO2VhOyalCDsi5wg7IiY7KCV7ZWY7IS47JqULlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIDxkaXYgcmVmPXtwcmludFJlZn0gY2xhc3NOYW1lPVwib3ZlcmZsb3cteS1hdXRvIGZsZXgtMSBweC03IHB5LTZcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgZ2FwLTRcIj5cbiAgICAgICAgICAgIHtmaWVsZHMubWFwKChmKSA9PiAoXG4gICAgICAgICAgICAgIDxkaXYga2V5PXtmLmtleX0+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cImJsb2NrIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNzAwIG1iLTEuNVwiPlxuICAgICAgICAgICAgICAgICAge2YubGFiZWx9XG4gICAgICAgICAgICAgICAgICB7Zi5yZXF1aXJlZCAmJiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXJlZC01MDAgbWwtMC41XCI+Kjwvc3Bhbj59XG4gICAgICAgICAgICAgICAgICB7Zi5hdXRvRmlsbCA9PT0gJ25hbWUnICYmIHVzZXJOYW1lICYmIChcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibWwtMiB0ZXh0LXByaW1hcnktNTAwIGZvbnQtbWVkaXVtIHRleHQteHNcIj4o7J6Q64+Z7J6F66ClKTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICB7Zi50eXBlID09PSAndGV4dGFyZWEnID8gKFxuICAgICAgICAgICAgICAgICAgPHRleHRhcmVhXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlPXt2YWx1ZXNbZi5rZXldfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IGhhbmRsZUNoYW5nZShmLmtleSwgZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj17Zi5wbGFjZWhvbGRlcn1cbiAgICAgICAgICAgICAgICAgICAgcm93cz17M31cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHB4LTMgcHktMi41IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1ncmF5LTIwMCB0ZXh0LXNtIHRleHQtZ3JheS05MDAgcGxhY2Vob2xkZXItZ3JheS0zMDAgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1wcmltYXJ5LTQwMCBmb2N1czpyaW5nLTIgZm9jdXM6cmluZy1wcmltYXJ5LTEwMCB0cmFuc2l0aW9uLWFsbCByZXNpemUtbm9uZVwiXG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICkgOiBmLnR5cGUgPT09ICdzZWxlY3QnID8gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZVwiPlxuICAgICAgICAgICAgICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3ZhbHVlc1tmLmtleV19XG4gICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBoYW5kbGVDaGFuZ2UoZi5rZXksIGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcHgtMyBweS0yLjUgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLWdyYXktMjAwIHRleHQtc20gdGV4dC1ncmF5LTkwMCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLXByaW1hcnktNDAwIGZvY3VzOnJpbmctMiBmb2N1czpyaW5nLXByaW1hcnktMTAwIHRyYW5zaXRpb24tYWxsIGFwcGVhcmFuY2Utbm9uZSBiZy13aGl0ZSBwci05XCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj7shKDtg53tlZjshLjsmpQ8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICB7Zi5vcHRpb25zPy5tYXAoKG9wdCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiBrZXk9e29wdH0gdmFsdWU9e29wdH0+e29wdH08L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICAgIDxDaGV2cm9uRG93biBjbGFzc05hbWU9XCJhYnNvbHV0ZSByaWdodC0zIHRvcC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB3LTQgaC00IHRleHQtZ3JheS00MDAgcG9pbnRlci1ldmVudHMtbm9uZVwiIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9e2YudHlwZX1cbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3ZhbHVlc1tmLmtleV19XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gaGFuZGxlQ2hhbmdlKGYua2V5LCBlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPXtmLnBsYWNlaG9sZGVyfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcHgtMyBweS0yLjUgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLWdyYXktMjAwIHRleHQtc20gdGV4dC1ncmF5LTkwMCBwbGFjZWhvbGRlci1ncmF5LTMwMCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLXByaW1hcnktNDAwIGZvY3VzOnJpbmctMiBmb2N1czpyaW5nLXByaW1hcnktMTAwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweC03IHB5LTQgYm9yZGVyLXQgYm9yZGVyLWdyYXktMTAwIGJnLWdyYXktNTAgZmxleC1zaHJpbmstMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcIj4qIO2RnOyLnOuKlCDtlYTsiJgg7ZWt66qp7J6F64uI64ukLjwvcD5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVQcmludH1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTUgcHktMi41IHJvdW5kZWQteGwgdGV4dC1zbSBmb250LWJvbGQgYmctcHJpbWFyeS02MDAgdGV4dC13aGl0ZSBob3ZlcjpiZy1wcmltYXJ5LTcwMCB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctc21cIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxQcmludGVyIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAg7J247IeE7ZWY6riwXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9ob21lL3Byb2plY3Qvc3JjL2NvbXBvbmVudHMvRG9jdW1lbnRFZGl0b3IudHN4In0=