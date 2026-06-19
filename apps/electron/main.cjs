const { app, BrowserWindow, ipcMain, screen, session } = require("electron");
const path = require("path");

const isDev = !app.isPackaged || process.env.VLUE_ELECTRON_DEV === "1";
const DEV_URL = process.env.VLUE_ELECTRON_DEV_URL || "http://127.0.0.1:5173";
/** web/src/lib/vlueClientAccess.js VLUE_PC_APP_UA_TOKEN 과 동일 */
const VLUE_UA_SUFFIX = " VLUE-PC-App";

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {Map<string, BrowserWindow>} */
const roomWindows = new Map();

function baseAppUrl() {
  if (isDev) return `${DEV_URL}/app`;
  return `file://${path.join(__dirname, "../../web/dist/index.html")}#/app`;
}

function buildRoomUrl(params) {
  const q = new URLSearchParams({
    vlueElectronRoom: "1",
    roomType: params.roomType || "GENERAL",
    roomId: params.roomId || "",
    title: params.title || "",
    counterpartyEmail: params.counterpartyEmail || ""
  });
  const joiner = baseAppUrl().includes("?") ? "&" : "?";
  return `${baseAppUrl()}${joiner}${q.toString()}`;
}

function windowPreload() {
  return path.join(__dirname, "preload.cjs");
}

/** Vite dev·프로덕션 요청 User-Agent 에 VLUE-PC-App 식별자 부착 */
function applyVlueDesktopUserAgent() {
  const ses = session.defaultSession;
  const current = ses.getUserAgent();
  if (!current.includes("VLUE-PC-App")) {
    ses.setUserAgent(`${current}${VLUE_UA_SUFFIX}`);
  }

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    const key = Object.keys(headers).find((k) => k.toLowerCase() === "user-agent");
    const uaKey = key || "User-Agent";
    const ua = String(headers[uaKey] || current);
    if (!ua.includes("VLUE-PC-App")) {
      headers[uaKey] = `${ua}${VLUE_UA_SUFFIX}`;
    }
    callback({ requestHeaders: headers });
  });
}

function computeMagneticSide(win) {
  if (!win || win.isDestroyed()) return "left";
  const bounds = win.getBounds();
  const [x] = win.getPosition();
  const display = screen.getDisplayMatching(bounds);
  const mid = display.workArea.x + display.workArea.width / 2;
  const centerX = x + bounds.width / 2;
  return centerX < mid ? "left" : "right";
}

function emitMagneticSide(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("vlue:window-magnetic-side", { side: computeMagneticSide(win) });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 390,
    height: 850,
    minWidth: 390,
    minHeight: 600,
    resizable: true,
    autoHideMenuBar: true,
    title: "VLUE",
    webPreferences: {
      preload: windowPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadURL(baseAppUrl());

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * @param {{ roomId: string, roomType: 'GENERAL'|'MAIL_TALK', title?: string, counterpartyEmail?: string }} payload
 */
function openRoomWindow(payload) {
  const roomId = String(payload?.roomId || "").trim();
  if (!roomId) return;

  const existing = roomWindows.get(roomId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }

  const isMailTalk = payload.roomType === "MAIL_TALK";
  const width = isMailTalk ? 850 : 390;
  const height = 700;

  const win = new BrowserWindow({
    width,
    height,
    minWidth: isMailTalk ? 720 : 390,
    minHeight: 600,
    resizable: true,
    autoHideMenuBar: true,
    title: payload.title || (isMailTalk ? "VLUE 메일톡" : "VLUE 채팅"),
    webPreferences: {
      preload: windowPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.vlueRoomParams = payload;
  roomWindows.set(roomId, win);

  win.loadURL(buildRoomUrl(payload));

  if (isMailTalk) {
    win.on("moved", () => emitMagneticSide(win));
    win.on("resize", () => emitMagneticSide(win));
    win.webContents.on("did-finish-load", () => emitMagneticSide(win));
  }

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.on("closed", () => {
    roomWindows.delete(roomId);
  });
}

ipcMain.on("vlue:open-room-window", (_event, payload) => {
  openRoomWindow(payload || {});
});

ipcMain.handle("vlue:get-window-magnetic-side", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return { side: win ? computeMagneticSide(win) : "left" };
});

ipcMain.handle("vlue:get-room-window-params", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.vlueRoomParams) return win.vlueRoomParams;
  return null;
});

ipcMain.handle("vlue:is-room-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win === mainWindow) return false;
  return Boolean(win.vlueRoomParams);
});

app.whenReady().then(() => {
  applyVlueDesktopUserAgent();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
