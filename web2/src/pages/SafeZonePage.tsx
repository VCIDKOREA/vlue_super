import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/SafeZonePage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/SafeZonePage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useState = __vite__cjsImport3_react["useState"];
import { MapPin, Plus, Trash2, Home, Briefcase, Heart, BookOpen, Settings, ArrowLeft, Info } from "/node_modules/lucide-react/dist/esm/lucide-react.js?v=4b28e2bb";
const ZONE_TYPES = [
  { type: "home", label: "집", icon: Home, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { type: "work", label: "직장", icon: Briefcase, color: "text-primary-600", bg: "bg-primary-50", border: "border-primary-200" },
  { type: "hospital", label: "병원", icon: Heart, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  { type: "school", label: "학교", icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { type: "custom", label: "사용자 지정", icon: Settings, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" }
];
const INITIAL_ZONES = [
  { id: "sz-1", label: "우리집", x: 35, y: 40, radius: 12, type: "home" },
  { id: "sz-2", label: "직장", x: 65, y: 30, radius: 10, type: "work" }
];
export default function SafeZonePage({ onBack }) {
  _s();
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [addMode, setAddMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("home");
  const handleMapClick = (e) => {
    if (!addMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    const defaultLabel = ZONE_TYPES.find((t) => t.type === newType)?.label ?? "안심영역";
    const newZone = {
      id: `sz-${Date.now()}`,
      label: newLabel || defaultLabel,
      x,
      y,
      radius: 10,
      type: newType
    };
    setZones((prev) => [...prev, newZone]);
    setAddMode(false);
    setNewLabel("");
  };
  const removeZone = (id) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selected === id) setSelected(null);
  };
  return /* @__PURE__ */ jsxDEV("main", { className: "min-h-screen bg-gray-50 pt-16", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white border-b border-gray-100", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onBack, className: "p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all", children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "w-4 h-4" }, void 0, false, {
        fileName: "/home/project/src/pages/SafeZonePage.tsx",
        lineNumber: 58,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SafeZonePage.tsx",
        lineNumber: 57,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("h1", { className: "text-lg font-bold text-gray-900", children: "위치기반 안심영역 설정" }, void 0, false, {
          fileName: "/home/project/src/pages/SafeZonePage.tsx",
          lineNumber: 61,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: "자주 방문하는 안심 장소를 등록하여 맞춤 보이스피싱 경보를 받으세요." }, void 0, false, {
          fileName: "/home/project/src/pages/SafeZonePage.tsx",
          lineNumber: 62,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SafeZonePage.tsx",
        lineNumber: 60,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SafeZonePage.tsx",
      lineNumber: 56,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SafeZonePage.tsx",
      lineNumber: 55,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6", children: /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between px-4 py-3 border-b border-gray-100", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-semibold text-gray-700", children: "지도 미리보기" }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 72,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setAddMode(!addMode),
              className: `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${addMode ? "bg-primary-600 text-white" : "btn-secondary py-1.5 px-3 text-xs"}`,
              children: [
                /* @__PURE__ */ jsxDEV(Plus, { className: "w-3.5 h-3.5" }, void 0, false, {
                  fileName: "/home/project/src/pages/SafeZonePage.tsx",
                  lineNumber: 79,
                  columnNumber: 19
                }, this),
                addMode ? "지도 클릭으로 추가" : "영역 추가"
              ]
            },
            void 0,
            true,
            {
              fileName: "/home/project/src/pages/SafeZonePage.tsx",
              lineNumber: 73,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SafeZonePage.tsx",
          lineNumber: 71,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: `relative bg-blue-light overflow-hidden ${addMode ? "cursor-crosshair" : "cursor-default"}`,
            style: { height: "400px" },
            onClick: handleMapClick,
            children: [
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  className: "absolute inset-0 opacity-20",
                  style: {
                    backgroundImage: `linear-gradient(rgba(0,71,171,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,71,171,0.15) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px"
                  }
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/pages/SafeZonePage.tsx",
                  lineNumber: 89,
                  columnNumber: 17
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ jsxDEV("div", { className: "w-32 h-32 rounded-full bg-primary-100/40 border border-primary-200/30 flex items-center justify-center", children: /* @__PURE__ */ jsxDEV(MapPin, { className: "w-8 h-8 text-primary-300" }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 98,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 97,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 96,
                columnNumber: 17
              }, this),
              zones.map((zone) => {
                const cfg = ZONE_TYPES.find((t) => t.type === zone.type);
                const Icon = cfg ? cfg.icon : MapPin;
                return /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "absolute",
                    style: { left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" },
                    onClick: (e) => {
                      e.stopPropagation();
                      setSelected(zone.id);
                    },
                    children: [
                      /* @__PURE__ */ jsxDEV(
                        "div",
                        {
                          className: `relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-110 ${selected === zone.id ? "ring-2 ring-primary-500 ring-offset-1" : ""} ${cfg ? cfg.bg : "bg-gray-50"} border ${cfg ? cfg.border : "border-gray-200"}`,
                          children: /* @__PURE__ */ jsxDEV(Icon, { className: `w-4 h-4 ${cfg ? cfg.color : "text-gray-600"}` }, void 0, false, {
                            fileName: "/home/project/src/pages/SafeZonePage.tsx",
                            lineNumber: 117,
                            columnNumber: 25
                          }, this)
                        },
                        void 0,
                        false,
                        {
                          fileName: "/home/project/src/pages/SafeZonePage.tsx",
                          lineNumber: 112,
                          columnNumber: 23
                        },
                        this
                      ),
                      /* @__PURE__ */ jsxDEV("div", { className: "absolute top-10 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-700 whitespace-nowrap shadow-sm", children: zone.label }, void 0, false, {
                        fileName: "/home/project/src/pages/SafeZonePage.tsx",
                        lineNumber: 119,
                        columnNumber: 23
                      }, this)
                    ]
                  },
                  zone.id,
                  true,
                  {
                    fileName: "/home/project/src/pages/SafeZonePage.tsx",
                    lineNumber: 106,
                    columnNumber: 21
                  },
                  this
                );
              }),
              addMode && /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg", children: "지도를 클릭하여 안심영역 추가" }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 128,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 127,
                columnNumber: 17
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 84,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SafeZonePage.tsx",
        lineNumber: 70,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/home/project/src/pages/SafeZonePage.tsx",
        lineNumber: 69,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
        addMode && /* @__PURE__ */ jsxDEV("div", { className: "bg-primary-50 border border-primary-200 rounded-2xl p-4", children: [
          /* @__PURE__ */ jsxDEV("h3", { className: "text-primary-800 font-semibold text-sm mb-3", children: "새 안심영역 설정" }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 140,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("label", { className: "text-xs font-semibold text-gray-600 block mb-1", children: "영역 이름" }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 143,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "text",
                  value: newLabel,
                  onChange: (e) => setNewLabel(e.target.value),
                  placeholder: "예: 우리 동네",
                  className: "input-field text-sm"
                },
                void 0,
                false,
                {
                  fileName: "/home/project/src/pages/SafeZonePage.tsx",
                  lineNumber: 144,
                  columnNumber: 21
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SafeZonePage.tsx",
              lineNumber: 142,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("label", { className: "text-xs font-semibold text-gray-600 block mb-1.5", children: "영역 유형" }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 153,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-1.5", children: ZONE_TYPES.map(
                ({ type, label, icon: ZIcon, color, bg, border }) => /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setNewType(type),
                    className: `flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${newType === type ? `${bg} ${border} ${color}` : "bg-white border-gray-200 text-gray-500"}`,
                    children: [
                      /* @__PURE__ */ jsxDEV(ZIcon, { className: "w-4 h-4" }, void 0, false, {
                        fileName: "/home/project/src/pages/SafeZonePage.tsx",
                        lineNumber: 163,
                        columnNumber: 27
                      }, this),
                      label
                    ]
                  },
                  type,
                  true,
                  {
                    fileName: "/home/project/src/pages/SafeZonePage.tsx",
                    lineNumber: 156,
                    columnNumber: 21
                  },
                  this
                )
              ) }, void 0, false, {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 154,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/home/project/src/pages/SafeZonePage.tsx",
              lineNumber: 152,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 141,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SafeZonePage.tsx",
          lineNumber: 139,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-2xl border border-gray-200 p-4 shadow-card", children: [
          /* @__PURE__ */ jsxDEV("h3", { className: "text-gray-900 font-semibold text-sm mb-3", children: "등록된 안심영역" }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 174,
            columnNumber: 15
          }, this),
          zones.length === 0 ? /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs text-center py-4", children: "등록된 안심영역이 없습니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 176,
            columnNumber: 15
          }, this) : /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: zones.map((zone) => {
            const cfg = ZONE_TYPES.find((t) => t.type === zone.type);
            const Icon = cfg ? cfg.icon : MapPin;
            return /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: `flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${selected === zone.id ? "border-primary-300 bg-primary-50" : "border-gray-100 hover:border-gray-200"}`,
                onClick: () => setSelected(zone.id === selected ? null : zone.id),
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: `w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg ? cfg.bg : "bg-gray-50"} border ${cfg ? cfg.border : "border-gray-200"}`, children: /* @__PURE__ */ jsxDEV(Icon, { className: `w-3.5 h-3.5 ${cfg ? cfg.color : "text-gray-600"}` }, void 0, false, {
                    fileName: "/home/project/src/pages/SafeZonePage.tsx",
                    lineNumber: 191,
                    columnNumber: 27
                  }, this) }, void 0, false, {
                    fileName: "/home/project/src/pages/SafeZonePage.tsx",
                    lineNumber: 190,
                    columnNumber: 25
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxDEV("p", { className: "text-gray-900 text-sm font-medium truncate", children: zone.label }, void 0, false, {
                      fileName: "/home/project/src/pages/SafeZonePage.tsx",
                      lineNumber: 194,
                      columnNumber: 27
                    }, this),
                    /* @__PURE__ */ jsxDEV("p", { className: "text-gray-400 text-xs", children: cfg ? cfg.label : "사용자 지정" }, void 0, false, {
                      fileName: "/home/project/src/pages/SafeZonePage.tsx",
                      lineNumber: 195,
                      columnNumber: 27
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/home/project/src/pages/SafeZonePage.tsx",
                    lineNumber: 193,
                    columnNumber: 25
                  }, this),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        removeZone(zone.id);
                      },
                      className: "p-1 text-gray-300 hover:text-red-400 transition-colors",
                      children: /* @__PURE__ */ jsxDEV(Trash2, { className: "w-3.5 h-3.5" }, void 0, false, {
                        fileName: "/home/project/src/pages/SafeZonePage.tsx",
                        lineNumber: 201,
                        columnNumber: 27
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/home/project/src/pages/SafeZonePage.tsx",
                      lineNumber: 197,
                      columnNumber: 25
                    },
                    this
                  )
                ]
              },
              zone.id,
              true,
              {
                fileName: "/home/project/src/pages/SafeZonePage.tsx",
                lineNumber: 183,
                columnNumber: 21
              },
              this
            );
          }) }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 178,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SafeZonePage.tsx",
          lineNumber: 173,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-light border border-primary-100 rounded-2xl p-4 flex gap-2", children: [
          /* @__PURE__ */ jsxDEV(Info, { className: "w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 211,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-primary-700 text-xs leading-relaxed", children: "안심영역 등록 시 해당 지역에서 의심 전화가 올 때 우선 경보를 받을 수 있습니다. 프리미엄 요금제에서는 무제한으로 등록 가능합니다." }, void 0, false, {
            fileName: "/home/project/src/pages/SafeZonePage.tsx",
            lineNumber: 212,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/home/project/src/pages/SafeZonePage.tsx",
          lineNumber: 210,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/home/project/src/pages/SafeZonePage.tsx",
        lineNumber: 137,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/project/src/pages/SafeZonePage.tsx",
      lineNumber: 68,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/project/src/pages/SafeZonePage.tsx",
      lineNumber: 67,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/SafeZonePage.tsx",
    lineNumber: 54,
    columnNumber: 5
  }, this);
}
_s(SafeZonePage, "XIuuk8sur3kulLyaNKU8FmR8zkU=");
_c = SafeZonePage;
var _c;
$RefreshReg$(_c, "SafeZonePage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/SafeZonePage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/SafeZonePage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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Ik1hcFBpbiIsIlBsdXMiLCJUcmFzaDIiLCJIb21lIiwiQnJpZWZjYXNlIiwiSGVhcnQiLCJCb29rT3BlbiIsIlNldHRpbmdzIiwiQXJyb3dMZWZ0IiwiSW5mbyIsIlpPTkVfVFlQRVMiLCJ0eXBlIiwibGFiZWwiLCJpY29uIiwiY29sb3IiLCJiZyIsImJvcmRlciIsIklOSVRJQUxfWk9ORVMiLCJpZCIsIngiLCJ5IiwicmFkaXVzIiwiU2FmZVpvbmVQYWdlIiwib25CYWNrIiwiX3MiLCJ6b25lcyIsInNldFpvbmVzIiwidXNlU3RhdGUiLCJhZGRNb2RlIiwic2V0QWRkTW9kZSIsInNlbGVjdGVkIiwic2V0U2VsZWN0ZWQiLCJuZXdMYWJlbCIsInNldE5ld0xhYmVsIiwibmV3VHlwZSIsInNldE5ld1R5cGUiLCJoYW5kbGVNYXBDbGljayIsImUiLCJyZWN0IiwiY3VycmVudFRhcmdldCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImNsaWVudFgiLCJsZWZ0Iiwid2lkdGgiLCJjbGllbnRZIiwidG9wIiwiaGVpZ2h0IiwiZGVmYXVsdExhYmVsIiwiZmluZCIsInQiLCJuZXdab25lIiwiRGF0ZSIsIm5vdyIsInByZXYiLCJyZW1vdmVab25lIiwiZmlsdGVyIiwieiIsImJhY2tncm91bmRJbWFnZSIsImJhY2tncm91bmRTaXplIiwibWFwIiwiem9uZSIsImNmZyIsIkljb24iLCJ0cmFuc2Zvcm0iLCJzdG9wUHJvcGFnYXRpb24iLCJ0YXJnZXQiLCJ2YWx1ZSIsIlpJY29uIiwibGVuZ3RoIiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiU2FmZVpvbmVQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IE1hcFBpbiwgUGx1cywgVHJhc2gyLCBIb21lLCBCcmllZmNhc2UsIEhlYXJ0LCBCb29rT3BlbiwgU2V0dGluZ3MsIEFycm93TGVmdCwgSW5mbyB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyBTYWZlWm9uZSB9IGZyb20gJy4uL3R5cGVzJztcblxuaW50ZXJmYWNlIFNhZmVab25lUGFnZVByb3BzIHtcbiAgb25CYWNrOiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBaT05FX1RZUEVTID0gW1xuICB7IHR5cGU6ICdob21lJyBhcyBjb25zdCwgbGFiZWw6ICfsp5EnLCBpY29uOiBIb21lLCBjb2xvcjogJ3RleHQtZW1lcmFsZC02MDAnLCBiZzogJ2JnLWVtZXJhbGQtNTAnLCBib3JkZXI6ICdib3JkZXItZW1lcmFsZC0yMDAnIH0sXG4gIHsgdHlwZTogJ3dvcmsnIGFzIGNvbnN0LCBsYWJlbDogJ+yngeyepScsIGljb246IEJyaWVmY2FzZSwgY29sb3I6ICd0ZXh0LXByaW1hcnktNjAwJywgYmc6ICdiZy1wcmltYXJ5LTUwJywgYm9yZGVyOiAnYm9yZGVyLXByaW1hcnktMjAwJyB9LFxuICB7IHR5cGU6ICdob3NwaXRhbCcgYXMgY29uc3QsIGxhYmVsOiAn67OR7JuQJywgaWNvbjogSGVhcnQsIGNvbG9yOiAndGV4dC1yZWQtNTAwJywgYmc6ICdiZy1yZWQtNTAnLCBib3JkZXI6ICdib3JkZXItcmVkLTIwMCcgfSxcbiAgeyB0eXBlOiAnc2Nob29sJyBhcyBjb25zdCwgbGFiZWw6ICftlZnqtZAnLCBpY29uOiBCb29rT3BlbiwgY29sb3I6ICd0ZXh0LWFtYmVyLTYwMCcsIGJnOiAnYmctYW1iZXItNTAnLCBib3JkZXI6ICdib3JkZXItYW1iZXItMjAwJyB9LFxuICB7IHR5cGU6ICdjdXN0b20nIGFzIGNvbnN0LCBsYWJlbDogJ+yCrOyaqeyekCDsp4DsoJUnLCBpY29uOiBTZXR0aW5ncywgY29sb3I6ICd0ZXh0LWdyYXktNjAwJywgYmc6ICdiZy1ncmF5LTUwJywgYm9yZGVyOiAnYm9yZGVyLWdyYXktMjAwJyB9LFxuXTtcblxuY29uc3QgSU5JVElBTF9aT05FUzogU2FmZVpvbmVbXSA9IFtcbiAgeyBpZDogJ3N6LTEnLCBsYWJlbDogJ+yasOumrOynkScsIHg6IDM1LCB5OiA0MCwgcmFkaXVzOiAxMiwgdHlwZTogJ2hvbWUnIH0sXG4gIHsgaWQ6ICdzei0yJywgbGFiZWw6ICfsp4HsnqUnLCB4OiA2NSwgeTogMzAsIHJhZGl1czogMTAsIHR5cGU6ICd3b3JrJyB9LFxuXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gU2FmZVpvbmVQYWdlKHsgb25CYWNrIH06IFNhZmVab25lUGFnZVByb3BzKSB7XG4gIGNvbnN0IFt6b25lcywgc2V0Wm9uZXNdID0gdXNlU3RhdGU8U2FmZVpvbmVbXT4oSU5JVElBTF9aT05FUyk7XG4gIGNvbnN0IFthZGRNb2RlLCBzZXRBZGRNb2RlXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3NlbGVjdGVkLCBzZXRTZWxlY3RlZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW25ld0xhYmVsLCBzZXROZXdMYWJlbF0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtuZXdUeXBlLCBzZXROZXdUeXBlXSA9IHVzZVN0YXRlPFNhZmVab25lWyd0eXBlJ10+KCdob21lJyk7XG5cbiAgY29uc3QgaGFuZGxlTWFwQ2xpY2sgPSAoZTogUmVhY3QuTW91c2VFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHtcbiAgICBpZiAoIWFkZE1vZGUpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gZS5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHggPSAoKGUuY2xpZW50WCAtIHJlY3QubGVmdCkgLyByZWN0LndpZHRoKSAqIDEwMDtcbiAgICBjb25zdCB5ID0gKChlLmNsaWVudFkgLSByZWN0LnRvcCkgLyByZWN0LmhlaWdodCkgKiAxMDA7XG4gICAgY29uc3QgZGVmYXVsdExhYmVsID0gWk9ORV9UWVBFUy5maW5kKCh0KSA9PiB0LnR5cGUgPT09IG5ld1R5cGUpPy5sYWJlbCA/PyAn7JWI7Ius7JiB7JetJztcbiAgICBjb25zdCBuZXdab25lOiBTYWZlWm9uZSA9IHtcbiAgICAgIGlkOiBgc3otJHtEYXRlLm5vdygpfWAsXG4gICAgICBsYWJlbDogbmV3TGFiZWwgfHwgZGVmYXVsdExhYmVsLFxuICAgICAgeCxcbiAgICAgIHksXG4gICAgICByYWRpdXM6IDEwLFxuICAgICAgdHlwZTogbmV3VHlwZSxcbiAgICB9O1xuICAgIHNldFpvbmVzKChwcmV2KSA9PiBbLi4ucHJldiwgbmV3Wm9uZV0pO1xuICAgIHNldEFkZE1vZGUoZmFsc2UpO1xuICAgIHNldE5ld0xhYmVsKCcnKTtcbiAgfTtcblxuICBjb25zdCByZW1vdmVab25lID0gKGlkOiBzdHJpbmcpID0+IHtcbiAgICBzZXRab25lcygocHJldikgPT4gcHJldi5maWx0ZXIoKHopID0+IHouaWQgIT09IGlkKSk7XG4gICAgaWYgKHNlbGVjdGVkID09PSBpZCkgc2V0U2VsZWN0ZWQobnVsbCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8bWFpbiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctZ3JheS01MCBwdC0xNlwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSBib3JkZXItYiBib3JkZXItZ3JheS0xMDBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOCBweS00IGZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbkJhY2t9IGNsYXNzTmFtZT1cInAtMS41IHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC1wcmltYXJ5LTYwMCBob3ZlcjpiZy1wcmltYXJ5LTUwIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGxcIj5cbiAgICAgICAgICAgIDxBcnJvd0xlZnQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtYm9sZCB0ZXh0LWdyYXktOTAwXCI+7JyE7LmY6riw67CYIOyViOyLrOyYgeyXrSDshKTsoJU8L2gxPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzXCI+7J6Q7KO8IOuwqeusuO2VmOuKlCDslYjsi6wg7J6l7IaM66W8IOuTseuhne2VmOyXrCDrp57stqQg67O07J207Iqk7ZS87IuxIOqyveuztOulvCDrsJvsnLzshLjsmpQuPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtNiBsZzpweC04IHB5LTZcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIGxnOmdyaWQtY29scy0zIGdhcC02XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsZzpjb2wtc3Bhbi0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItZ3JheS0yMDAgb3ZlcmZsb3ctaGlkZGVuIHNoYWRvdy1jYXJkXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHB4LTQgcHktMyBib3JkZXItYiBib3JkZXItZ3JheS0xMDBcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTcwMFwiPuyngOuPhCDrr7jrpqzrs7TquLA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWRkTW9kZSghYWRkTW9kZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMgcHktMS41IHRleHQteHMgZm9udC1zZW1pYm9sZCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsICR7XG4gICAgICAgICAgICAgICAgICAgIGFkZE1vZGUgPyAnYmctcHJpbWFyeS02MDAgdGV4dC13aGl0ZScgOiAnYnRuLXNlY29uZGFyeSBweS0xLjUgcHgtMyB0ZXh0LXhzJ1xuICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPFBsdXMgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAge2FkZE1vZGUgPyAn7KeA64+EIO2BtOumreycvOuhnCDstpTqsIAnIDogJ+yYgeyXrSDstpTqsIAnfVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcmVsYXRpdmUgYmctYmx1ZS1saWdodCBvdmVyZmxvdy1oaWRkZW4gJHthZGRNb2RlID8gJ2N1cnNvci1jcm9zc2hhaXInIDogJ2N1cnNvci1kZWZhdWx0J31gfVxuICAgICAgICAgICAgICAgIHN0eWxlPXt7IGhlaWdodDogJzQwMHB4JyB9fVxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZU1hcENsaWNrfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBvcGFjaXR5LTIwXCJcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRJbWFnZTogYGxpbmVhci1ncmFkaWVudChyZ2JhKDAsNzEsMTcxLDAuMTUpIDFweCwgdHJhbnNwYXJlbnQgMXB4KSwgbGluZWFyLWdyYWRpZW50KDkwZGVnLCByZ2JhKDAsNzEsMTcxLDAuMTUpIDFweCwgdHJhbnNwYXJlbnQgMXB4KWAsXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRTaXplOiAnNDBweCA0MHB4JyxcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcG9pbnRlci1ldmVudHMtbm9uZVwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTMyIGgtMzIgcm91bmRlZC1mdWxsIGJnLXByaW1hcnktMTAwLzQwIGJvcmRlciBib3JkZXItcHJpbWFyeS0yMDAvMzAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPE1hcFBpbiBjbGFzc05hbWU9XCJ3LTggaC04IHRleHQtcHJpbWFyeS0zMDBcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICB7em9uZXMubWFwKCh6b25lKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBjZmcgPSBaT05FX1RZUEVTLmZpbmQoKHQpID0+IHQudHlwZSA9PT0gem9uZS50eXBlKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IEljb24gPSBjZmcgPyBjZmcuaWNvbiA6IE1hcFBpbjtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICBrZXk9e3pvbmUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGVcIlxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke3pvbmUueH0lYCwgdG9wOiBgJHt6b25lLnl9JWAsIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZSgtNTAlLCAtNTAlKScgfX1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBzZXRTZWxlY3RlZCh6b25lLmlkKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHJlbGF0aXZlIHctOSBoLTkgcm91bmRlZC1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGN1cnNvci1wb2ludGVyIHNoYWRvdy1tZCB0cmFuc2l0aW9uLXRyYW5zZm9ybSBob3ZlcjpzY2FsZS0xMTAgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPT09IHpvbmUuaWQgPyAncmluZy0yIHJpbmctcHJpbWFyeS01MDAgcmluZy1vZmZzZXQtMScgOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSAke2NmZyA/IGNmZy5iZyA6ICdiZy1ncmF5LTUwJ30gYm9yZGVyICR7Y2ZnID8gY2ZnLmJvcmRlciA6ICdib3JkZXItZ3JheS0yMDAnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPXtgdy00IGgtNCAke2NmZyA/IGNmZy5jb2xvciA6ICd0ZXh0LWdyYXktNjAwJ31gfSAvPlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTEwIGxlZnQtMS8yIC10cmFuc2xhdGUteC0xLzIgYmctd2hpdGUgYm9yZGVyIGJvcmRlci1ncmF5LTIwMCByb3VuZGVkLWxnIHB4LTIgcHktMC41IHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWdyYXktNzAwIHdoaXRlc3BhY2Utbm93cmFwIHNoYWRvdy1zbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge3pvbmUubGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KX1cblxuICAgICAgICAgICAgICAgIHthZGRNb2RlICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwb2ludGVyLWV2ZW50cy1ub25lXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctcHJpbWFyeS02MDAgdGV4dC13aGl0ZSBweC0zIHB5LTEuNSByb3VuZGVkLXhsIHRleHQteHMgZm9udC1zZW1pYm9sZCBzaGFkb3ctbGdcIj5cbiAgICAgICAgICAgICAgICAgICAgICDsp4Drj4Trpbwg7YG066at7ZWY7JesIOyViOyLrOyYgeyXrSDstpTqsIBcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgIHthZGRNb2RlICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1wcmltYXJ5LTUwIGJvcmRlciBib3JkZXItcHJpbWFyeS0yMDAgcm91bmRlZC0yeGwgcC00XCI+XG4gICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeS04MDAgZm9udC1zZW1pYm9sZCB0ZXh0LXNtIG1iLTNcIj7sg4gg7JWI7Ius7JiB7JetIOyEpOyglTwvaDM+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTNcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1ncmF5LTYwMCBibG9jayBtYi0xXCI+7JiB7JetIOydtOumhDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17bmV3TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXROZXdMYWJlbChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLsmIg6IOyasOumrCDrj5nrhKRcIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImlucHV0LWZpZWxkIHRleHQtc21cIlxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LXNlbWlib2xkIHRleHQtZ3JheS02MDAgYmxvY2sgbWItMS41XCI+7JiB7JetIOycoO2YlTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMyBnYXAtMS41XCI+XG4gICAgICAgICAgICAgICAgICAgICAge1pPTkVfVFlQRVMubWFwKCh7IHR5cGUsIGxhYmVsLCBpY29uOiBaSWNvbiwgY29sb3IsIGJnLCBib3JkZXIgfSkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3R5cGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE5ld1R5cGUodHlwZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xIHB5LTIgcm91bmRlZC14bCBib3JkZXIgdGV4dC14cyBmb250LW1lZGl1bSB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R5cGUgPT09IHR5cGUgPyBgJHtiZ30gJHtib3JkZXJ9ICR7Y29sb3J9YCA6ICdiZy13aGl0ZSBib3JkZXItZ3JheS0yMDAgdGV4dC1ncmF5LTUwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxaSWNvbiBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWdyYXktMjAwIHAtNCBzaGFkb3ctY2FyZFwiPlxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1ncmF5LTkwMCBmb250LXNlbWlib2xkIHRleHQtc20gbWItM1wiPuuTseuhneuQnCDslYjsi6zsmIHsl608L2gzPlxuICAgICAgICAgICAgICB7em9uZXMubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14cyB0ZXh0LWNlbnRlciBweS00XCI+65Ox66Gd65CcIOyViOyLrOyYgeyXreydtCDsl4bsirXri4jri6QuPC9wPlxuICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgICAgICB7em9uZXMubWFwKCh6b25lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNmZyA9IFpPTkVfVFlQRVMuZmluZCgodCkgPT4gdC50eXBlID09PSB6b25lLnR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBJY29uID0gY2ZnID8gY2ZnLmljb24gOiBNYXBQaW47XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICAgICAga2V5PXt6b25lLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcC0yLjUgcm91bmRlZC14bCBib3JkZXIgY3Vyc29yLXBvaW50ZXIgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPT09IHpvbmUuaWQgPyAnYm9yZGVyLXByaW1hcnktMzAwIGJnLXByaW1hcnktNTAnIDogJ2JvcmRlci1ncmF5LTEwMCBob3Zlcjpib3JkZXItZ3JheS0yMDAnXG4gICAgICAgICAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkKHpvbmUuaWQgPT09IHNlbGVjdGVkID8gbnVsbCA6IHpvbmUuaWQpfVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy04IGgtOCByb3VuZGVkLXhsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTAgJHtjZmcgPyBjZmcuYmcgOiAnYmctZ3JheS01MCd9IGJvcmRlciAke2NmZyA/IGNmZy5ib3JkZXIgOiAnYm9yZGVyLWdyYXktMjAwJ31gfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPXtgdy0zLjUgaC0zLjUgJHtjZmcgPyBjZmcuY29sb3IgOiAndGV4dC1ncmF5LTYwMCd9YH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWdyYXktOTAwIHRleHQtc20gZm9udC1tZWRpdW0gdHJ1bmNhdGVcIj57em9uZS5sYWJlbH08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDAgdGV4dC14c1wiPntjZmcgPyBjZmcubGFiZWwgOiAn7IKs7Jqp7J6QIOyngOyglSd9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eyhlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHJlbW92ZVpvbmUoem9uZS5pZCk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMSB0ZXh0LWdyYXktMzAwIGhvdmVyOnRleHQtcmVkLTQwMCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxUcmFzaDIgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWJsdWUtbGlnaHQgYm9yZGVyIGJvcmRlci1wcmltYXJ5LTEwMCByb3VuZGVkLTJ4bCBwLTQgZmxleCBnYXAtMlwiPlxuICAgICAgICAgICAgICA8SW5mbyBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtcHJpbWFyeS01MDAgZmxleC1zaHJpbmstMCBtdC0wLjVcIiAvPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnktNzAwIHRleHQteHMgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgICAg7JWI7Ius7JiB7JetIOuTseuhnSDsi5wg7ZW064u5IOyngOyXreyXkOyEnCDsnZjsi6wg7KCE7ZmU6rCAIOyYrCDrlYwg7Jqw7ISgIOqyveuztOulvCDrsJvsnYQg7IiYIOyeiOyKteuLiOuLpC4g7ZSE66as66+47JeEIOyalOq4iOygnOyXkOyEnOuKlCDrrLTsoJztlZzsnLzroZwg65Ox66GdIOqwgOuKpe2VqeuLiOuLpC5cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvaG9tZS9wcm9qZWN0L3NyYy9wYWdlcy9TYWZlWm9uZVBhZ2UudHN4In0=