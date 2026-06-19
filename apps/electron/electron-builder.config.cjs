const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const iconsDir = path.join(__dirname, "build", "icons");
const iconIco = path.join(iconsDir, "icon.ico");
const iconIcns = path.join(iconsDir, "icon.icns");
const iconPng = path.join(iconsDir, "icon.png");

function pickIcon(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const winIcon = pickIcon([iconIco, iconPng]);
const macIcon = pickIcon([iconIcns, iconPng]);

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.vlue.app",
  productName: "VLUE",
  copyright: "Copyright © VCID KOREA",
  directories: {
    output: "dist",
    buildResources: "build"
  },
  files: ["main.cjs", "preload.cjs", "package.json"],
  extraResources: [
    {
      from: "../../web/dist",
      to: "web-dist",
      filter: ["**/*"]
    }
  ],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    // 코드 서명은 생략하되 exe·바로가기 아이콘(rcedit)은 적용 (signAndEditExecutable:false 는 아이콘까지 차단함)
    sign: false,
    ...(winIcon ? { icon: winIcon } : {})
  },
  mac: {
    target: [{ target: "dmg", arch: ["x64", "arm64"] }],
    category: "public.app-category.business",
    ...(macIcon ? { icon: macIcon } : {})
  },
  dmg: {
    title: "VLUE",
    artifactName: "VLUE-${version}-${arch}.dmg"
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "VLUE",
    uninstallDisplayName: "VLUE",
    artifactName: "VLUE-Setup-${version}.${ext}",
    deleteAppDataOnUninstall: false,
    ...(winIcon ? { installerIcon: winIcon, uninstallerIcon: winIcon } : {})
  },
  publish: null,
  electronVersion: "35.7.5"
};

if (!winIcon && !macIcon) {
  console.warn(
    "[electron-builder] build/icons/ 에 icon.png·icon.ico·icon.icns 없음 — Electron 기본 아이콘으로 패키징합니다."
  );
  console.warn("  가이드: apps/electron/build/icons/README.md");
}
