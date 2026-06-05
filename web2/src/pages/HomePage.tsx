import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/HomePage.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/pages/HomePage.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import HeroSection from "/src/sections/HeroSection.tsx";
import PhishingSection from "/src/sections/PhishingSection.tsx";
import NewsSection from "/src/sections/NewsSection.tsx";
import EventsSection from "/src/sections/EventsSection.tsx";
import DownloadSection from "/src/sections/DownloadSection.tsx";
export default function HomePage({ onSearch, onNavigate }) {
  return /* @__PURE__ */ jsxDEV("main", { children: [
    /* @__PURE__ */ jsxDEV(HeroSection, { onSearch, onNavigate }, void 0, false, {
      fileName: "/home/project/src/pages/HomePage.tsx",
      lineNumber: 16,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(PhishingSection, {}, void 0, false, {
      fileName: "/home/project/src/pages/HomePage.tsx",
      lineNumber: 17,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NewsSection, {}, void 0, false, {
      fileName: "/home/project/src/pages/HomePage.tsx",
      lineNumber: 18,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(EventsSection, {}, void 0, false, {
      fileName: "/home/project/src/pages/HomePage.tsx",
      lineNumber: 19,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(DownloadSection, {}, void 0, false, {
      fileName: "/home/project/src/pages/HomePage.tsx",
      lineNumber: 20,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/project/src/pages/HomePage.tsx",
    lineNumber: 15,
    columnNumber: 5
  }, this);
}
_c = HomePage;
var _c;
$RefreshReg$(_c, "HomePage");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/pages/HomePage.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/pages/HomePage.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZU07QUFmTiwyQkFBcUI7QUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQy9CLE9BQU9BLGlCQUFpQjtBQUN4QixPQUFPQyxxQkFBcUI7QUFDNUIsT0FBT0MsaUJBQWlCO0FBQ3hCLE9BQU9DLG1CQUFtQjtBQUMxQixPQUFPQyxxQkFBcUI7QUFPNUIsd0JBQXdCQyxTQUFTLEVBQUVDLFVBQVVDLFdBQTBCLEdBQUc7QUFDeEUsU0FDRSx1QkFBQyxVQUNDO0FBQUEsMkJBQUMsZUFBWSxVQUFvQixjQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXdEO0FBQUEsSUFDeEQsdUJBQUMscUJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFnQjtBQUFBLElBQ2hCLHVCQUFDLGlCQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBWTtBQUFBLElBQ1osdUJBQUMsbUJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFjO0FBQUEsSUFDZCx1QkFBQyxxQkFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWdCO0FBQUEsT0FMbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQU1BO0FBRUo7QUFBQ0MsS0FWdUJIO0FBQVEsSUFBQUc7QUFBQUMsYUFBQUQsSUFBQSIsIm5hbWVzIjpbIkhlcm9TZWN0aW9uIiwiUGhpc2hpbmdTZWN0aW9uIiwiTmV3c1NlY3Rpb24iLCJFdmVudHNTZWN0aW9uIiwiRG93bmxvYWRTZWN0aW9uIiwiSG9tZVBhZ2UiLCJvblNlYXJjaCIsIm9uTmF2aWdhdGUiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJIb21lUGFnZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVmlldyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCBIZXJvU2VjdGlvbiBmcm9tICcuLi9zZWN0aW9ucy9IZXJvU2VjdGlvbic7XG5pbXBvcnQgUGhpc2hpbmdTZWN0aW9uIGZyb20gJy4uL3NlY3Rpb25zL1BoaXNoaW5nU2VjdGlvbic7XG5pbXBvcnQgTmV3c1NlY3Rpb24gZnJvbSAnLi4vc2VjdGlvbnMvTmV3c1NlY3Rpb24nO1xuaW1wb3J0IEV2ZW50c1NlY3Rpb24gZnJvbSAnLi4vc2VjdGlvbnMvRXZlbnRzU2VjdGlvbic7XG5pbXBvcnQgRG93bmxvYWRTZWN0aW9uIGZyb20gJy4uL3NlY3Rpb25zL0Rvd25sb2FkU2VjdGlvbic7XG5cbmludGVyZmFjZSBIb21lUGFnZVByb3BzIHtcbiAgb25TZWFyY2g6IChxdWVyeTogc3RyaW5nKSA9PiB2b2lkO1xuICBvbk5hdmlnYXRlOiAodmlldzogVmlldykgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gSG9tZVBhZ2UoeyBvblNlYXJjaCwgb25OYXZpZ2F0ZSB9OiBIb21lUGFnZVByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPG1haW4+XG4gICAgICA8SGVyb1NlY3Rpb24gb25TZWFyY2g9e29uU2VhcmNofSBvbk5hdmlnYXRlPXtvbk5hdmlnYXRlfSAvPlxuICAgICAgPFBoaXNoaW5nU2VjdGlvbiAvPlxuICAgICAgPE5ld3NTZWN0aW9uIC8+XG4gICAgICA8RXZlbnRzU2VjdGlvbiAvPlxuICAgICAgPERvd25sb2FkU2VjdGlvbiAvPlxuICAgIDwvbWFpbj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvcGFnZXMvSG9tZVBhZ2UudHN4In0=