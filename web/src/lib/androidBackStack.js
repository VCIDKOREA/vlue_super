/**
 * Android 기기 뒤로가기용 레이어 스택 (LIFO).
 * 펼친 미리보기·사이드바 하위 화면 등이 먼저 소비한다.
 */

/** @type {Array<() => boolean>} */
const stack = [];

/** @param {() => boolean} handler 처리하면 true */
export function pushAndroidBackHandler(handler) {
  if (typeof handler !== "function") return () => {};
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** @returns {boolean} */
export function runAndroidBackHandlers() {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    try {
      if (stack[i]()) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
