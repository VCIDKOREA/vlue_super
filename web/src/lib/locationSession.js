const KEY = "vlue_location_session_v1";
const THEME_KEY = "vlue_map_theme_v1";

const listeners = new Set();

function readTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "auto") return value;
  } catch {
    /* ignore */
  }
  return "auto";
}

function blank() {
  return {
    open: false,
    minimized: false,
    mode: "family",
    roomId: "",
    departed: false,
    theme: readTheme(),
    flyTo: null
  };
}

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return blank();
    return { ...blank(), ...JSON.parse(raw), theme: readTheme(), open: false };
  } catch {
    return blank();
  }
}

let state = load();

function emit() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...state, flyTo: null }));
    localStorage.setItem(THEME_KEY, state.theme || "auto");
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn(state));
}

export function getLocationSession() {
  return state;
}

export function subscribeLocationSession(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function openLocation(mode = "family") {
  state = {
    ...state,
    open: true,
    minimized: false,
    mode: mode === "vmap" ? "vmap" : "family"
  };
  emit();
}

/** 가족 모드는 바로 종료. V-Map은 세션을 유지하고 미니맵만 남긴다. */
export function dismissLocation() {
  if (state.mode === "vmap" && state.roomId) {
    state = { ...state, open: false, minimized: true };
  } else {
    state = { ...state, open: false, minimized: false, mode: "family", roomId: "", departed: false };
  }
  emit();
}

export function restoreLocation() {
  state = { ...state, open: true, minimized: false };
  emit();
}

export function exitVmapRoom() {
  state = { ...state, open: false, minimized: false, mode: "family", roomId: "", departed: false, flyTo: null };
  emit();
}

export function patchLocationSession(partial) {
  state = { ...state, ...partial };
  emit();
}

export function setMapThemePreference(theme) {
  state = { ...state, theme: theme === "light" || theme === "dark" ? theme : "auto" };
  emit();
}
