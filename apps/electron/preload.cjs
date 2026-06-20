const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vlueElectron", {
  isElectron: true,

  /** @param {{ roomId: string, roomType: 'GENERAL'|'MAIL_TALK', title?: string, counterpartyEmail?: string }} payload */
  openRoomWindow(payload) {
    ipcRenderer.send("vlue:open-room-window", payload);
  },

  /** @param {(data: { side: 'left'|'right' }) => void} callback */
  onMagneticSide(callback) {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vlue:window-magnetic-side", handler);
    return () => ipcRenderer.removeListener("vlue:window-magnetic-side", handler);
  },

  getMagneticSide() {
    return ipcRenderer.invoke("vlue:get-window-magnetic-side");
  },

  getRoomWindowParams() {
    return ipcRenderer.invoke("vlue:get-room-window-params");
  },

  isRoomWindow() {
    return ipcRenderer.invoke("vlue:is-room-window");
  },

  /** @param {string} url */
  openExternalUrl(url) {
    return ipcRenderer.invoke("vlue:open-external-url", url);
  }
});
