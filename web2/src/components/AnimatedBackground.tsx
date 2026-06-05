import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/AnimatedBackground.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=4b28e2bb"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
    RefreshRuntime.register(type, "/home/project/src/components/AnimatedBackground.tsx " + id);
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=4b28e2bb"; const useEffect = __vite__cjsImport3_react["useEffect"]; const useRef = __vite__cjsImport3_react["useRef"];
export default function AnimatedBackground() {
  _s();
  const canvasRef = useRef(null);
  const blobsRef = useRef([]);
  const animRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    blobsRef.current = Array.from({ length: 9 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.09,
      vy: (Math.random() - 0.5) * 0.09,
      radius: Math.random() * 260 + 180,
      hue: i % 3 === 0 ? 200 : i % 3 === 1 ? 210 : 190,
      phase: Math.random() * Math.PI * 2
    }));
    const DAMPING = 0.9995;
    const MAX_SPEED = 0.14;
    let t = 0;
    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 3e-3;
      for (const blob of blobsRef.current) {
        blob.vx += Math.sin(t + blob.phase) * 4e-4;
        blob.vy += Math.cos(t + blob.phase * 1.3) * 4e-4;
        blob.vx *= DAMPING;
        blob.vy *= DAMPING;
        const speed = Math.sqrt(blob.vx ** 2 + blob.vy ** 2);
        if (speed > MAX_SPEED) {
          blob.vx = blob.vx / speed * MAX_SPEED;
          blob.vy = blob.vy / speed * MAX_SPEED;
        }
        blob.x += blob.vx;
        blob.y += blob.vy;
        const r = blob.radius;
        if (blob.x < -r) blob.x = canvas.width + r;
        if (blob.x > canvas.width + r) blob.x = -r;
        if (blob.y < -r) blob.y = canvas.height + r;
        if (blob.y > canvas.height + r) blob.y = -r;
      }
      for (const blob of blobsRef.current) {
        const grad = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        );
        grad.addColorStop(0, `hsla(${blob.hue}, 70%, 88%, 0.042)`);
        grad.addColorStop(0.4, `hsla(${blob.hue}, 60%, 93%, 0.024)`);
        grad.addColorStop(0.75, `hsla(${blob.hue}, 50%, 97%, 0.010)`);
        grad.addColorStop(1, `hsla(${blob.hue}, 40%, 99%, 0)`);
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);
  return /* @__PURE__ */ jsxDEV(
    "canvas",
    {
      ref: canvasRef,
      className: "fixed inset-0 pointer-events-none select-none",
      style: { zIndex: 0 },
      "aria-hidden": "true"
    },
    void 0,
    false,
    {
      fileName: "/home/project/src/components/AnimatedBackground.tsx",
      lineNumber: 101,
      columnNumber: 5
    },
    this
  );
}
_s(AnimatedBackground, "nKasufs3XtvvQkcqoBCQECYsaBs=");
_c = AnimatedBackground;
var _c;
$RefreshReg$(_c, "AnimatedBackground");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/home/project/src/components/AnimatedBackground.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/home/project/src/components/AnimatedBackground.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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YmxvYnNSZWYiLCJhbmltUmVmIiwidXNlRWZmZWN0IiwiY2FudmFzIiwiY3VycmVudCIsImN0eCIsImdldENvbnRleHQiLCJyZXNpemUiLCJ3aWR0aCIsIndpbmRvdyIsImlubmVyV2lkdGgiLCJoZWlnaHQiLCJpbm5lckhlaWdodCIsImFkZEV2ZW50TGlzdGVuZXIiLCJBcnJheSIsImZyb20iLCJsZW5ndGgiLCJfIiwiaSIsIngiLCJNYXRoIiwicmFuZG9tIiwieSIsInZ4IiwidnkiLCJyYWRpdXMiLCJodWUiLCJwaGFzZSIsIlBJIiwiREFNUElORyIsIk1BWF9TUEVFRCIsInQiLCJkcmF3IiwiY2xlYXJSZWN0IiwiYmxvYiIsInNpbiIsImNvcyIsInNwZWVkIiwic3FydCIsInIiLCJncmFkIiwiY3JlYXRlUmFkaWFsR3JhZGllbnQiLCJhZGRDb2xvclN0b3AiLCJiZWdpblBhdGgiLCJhcmMiLCJmaWxsU3R5bGUiLCJmaWxsIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwiekluZGV4IiwiX2MiLCIkUmVmcmVzaFJlZyQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQW5pbWF0ZWRCYWNrZ3JvdW5kLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiB9IGZyb20gJ3JlYWN0JztcblxuaW50ZXJmYWNlIENsb3VkQmxvYiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xuICB2eDogbnVtYmVyO1xuICB2eTogbnVtYmVyO1xuICByYWRpdXM6IG51bWJlcjtcbiAgaHVlOiBudW1iZXI7XG4gIHBoYXNlOiBudW1iZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFuaW1hdGVkQmFja2dyb3VuZCgpIHtcbiAgY29uc3QgY2FudmFzUmVmID0gdXNlUmVmPEhUTUxDYW52YXNFbGVtZW50PihudWxsKTtcbiAgY29uc3QgYmxvYnNSZWYgPSB1c2VSZWY8Q2xvdWRCbG9iW10+KFtdKTtcbiAgY29uc3QgYW5pbVJlZiA9IHVzZVJlZjxudW1iZXI+KDApO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgY2FudmFzID0gY2FudmFzUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFjYW52YXMpIHJldHVybjtcbiAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBpZiAoIWN0eCkgcmV0dXJuO1xuXG4gICAgY29uc3QgcmVzaXplID0gKCkgPT4ge1xuICAgICAgY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgICBjYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgIH07XG4gICAgcmVzaXplKCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZSk7XG5cbiAgICBibG9ic1JlZi5jdXJyZW50ID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogOSB9LCAoXywgaSkgPT4gKHtcbiAgICAgIHg6IE1hdGgucmFuZG9tKCkgKiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgIHk6IE1hdGgucmFuZG9tKCkgKiB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICB2eDogKE1hdGgucmFuZG9tKCkgLSAwLjUpICogMC4wOSxcbiAgICAgIHZ5OiAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAwLjA5LFxuICAgICAgcmFkaXVzOiBNYXRoLnJhbmRvbSgpICogMjYwICsgMTgwLFxuICAgICAgaHVlOiBpICUgMyA9PT0gMCA/IDIwMCA6IGkgJSAzID09PSAxID8gMjEwIDogMTkwLFxuICAgICAgcGhhc2U6IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMixcbiAgICB9KSk7XG5cbiAgICBjb25zdCBEQU1QSU5HID0gMC45OTk1O1xuICAgIGNvbnN0IE1BWF9TUEVFRCA9IDAuMTQ7XG4gICAgbGV0IHQgPSAwO1xuXG4gICAgY29uc3QgZHJhdyA9ICgpID0+IHtcbiAgICAgIGlmICghY2FudmFzIHx8ICFjdHgpIHJldHVybjtcbiAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgIHQgKz0gMC4wMDM7XG5cbiAgICAgIGZvciAoY29uc3QgYmxvYiBvZiBibG9ic1JlZi5jdXJyZW50KSB7XG4gICAgICAgIGJsb2IudnggKz0gTWF0aC5zaW4odCArIGJsb2IucGhhc2UpICogMC4wMDA0O1xuICAgICAgICBibG9iLnZ5ICs9IE1hdGguY29zKHQgKyBibG9iLnBoYXNlICogMS4zKSAqIDAuMDAwNDtcblxuICAgICAgICBibG9iLnZ4ICo9IERBTVBJTkc7XG4gICAgICAgIGJsb2IudnkgKj0gREFNUElORztcblxuICAgICAgICBjb25zdCBzcGVlZCA9IE1hdGguc3FydChibG9iLnZ4ICoqIDIgKyBibG9iLnZ5ICoqIDIpO1xuICAgICAgICBpZiAoc3BlZWQgPiBNQVhfU1BFRUQpIHtcbiAgICAgICAgICBibG9iLnZ4ID0gKGJsb2IudnggLyBzcGVlZCkgKiBNQVhfU1BFRUQ7XG4gICAgICAgICAgYmxvYi52eSA9IChibG9iLnZ5IC8gc3BlZWQpICogTUFYX1NQRUVEO1xuICAgICAgICB9XG5cbiAgICAgICAgYmxvYi54ICs9IGJsb2Iudng7XG4gICAgICAgIGJsb2IueSArPSBibG9iLnZ5O1xuXG4gICAgICAgIGNvbnN0IHIgPSBibG9iLnJhZGl1cztcbiAgICAgICAgaWYgKGJsb2IueCA8IC1yKSBibG9iLnggPSBjYW52YXMud2lkdGggKyByO1xuICAgICAgICBpZiAoYmxvYi54ID4gY2FudmFzLndpZHRoICsgcikgYmxvYi54ID0gLXI7XG4gICAgICAgIGlmIChibG9iLnkgPCAtcikgYmxvYi55ID0gY2FudmFzLmhlaWdodCArIHI7XG4gICAgICAgIGlmIChibG9iLnkgPiBjYW52YXMuaGVpZ2h0ICsgcikgYmxvYi55ID0gLXI7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgYmxvYiBvZiBibG9ic1JlZi5jdXJyZW50KSB7XG4gICAgICAgIGNvbnN0IGdyYWQgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXG4gICAgICAgICAgYmxvYi54LCBibG9iLnksIDAsXG4gICAgICAgICAgYmxvYi54LCBibG9iLnksIGJsb2IucmFkaXVzXG4gICAgICAgICk7XG4gICAgICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAsIGBoc2xhKCR7YmxvYi5odWV9LCA3MCUsIDg4JSwgMC4wNDIpYCk7XG4gICAgICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAuNCwgYGhzbGEoJHtibG9iLmh1ZX0sIDYwJSwgOTMlLCAwLjAyNClgKTtcbiAgICAgICAgZ3JhZC5hZGRDb2xvclN0b3AoMC43NSwgYGhzbGEoJHtibG9iLmh1ZX0sIDUwJSwgOTclLCAwLjAxMClgKTtcbiAgICAgICAgZ3JhZC5hZGRDb2xvclN0b3AoMSwgYGhzbGEoJHtibG9iLmh1ZX0sIDQwJSwgOTklLCAwKWApO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYyhibG9iLngsIGJsb2IueSwgYmxvYi5yYWRpdXMsIDAsIE1hdGguUEkgKiAyKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWQ7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICB9XG5cbiAgICAgIGFuaW1SZWYuY3VycmVudCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KTtcbiAgICB9O1xuXG4gICAgZHJhdygpO1xuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemUpO1xuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbVJlZi5jdXJyZW50KTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIChcbiAgICA8Y2FudmFzXG4gICAgICByZWY9e2NhbnZhc1JlZn1cbiAgICAgIGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgcG9pbnRlci1ldmVudHMtbm9uZSBzZWxlY3Qtbm9uZVwiXG4gICAgICBzdHlsZT17eyB6SW5kZXg6IDAgfX1cbiAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgLz5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL2hvbWUvcHJvamVjdC9zcmMvY29tcG9uZW50cy9BbmltYXRlZEJhY2tncm91bmQudHN4In0=