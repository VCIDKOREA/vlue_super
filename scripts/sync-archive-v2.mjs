#!/usr/bin/env node
/**
 * V2 기능 소스를 archive-v2/ 로 복사 (원본 유지 — 백업만)
 * Usage: node scripts/sync-archive-v2.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = path.join(root, "archive-v2");

/** @type {[string, string][]} [srcRelative, destRelative] */
const COPY_DIRS = [
  ["web/src/components/shopping", "web-app/shopping"],
  ["web/src/components/auction", "web-marketing/auction"],
  ["web/src/components/mailTalk", "web-app/mail-talk"],
  ["web/src/components/vming", "web-app/vming"],
  ["web/src/components/chat", "web-app/chat"],
  ["web/src/components/office", "web-app/office"],
  ["web/src/site/bolt/pages/ShoppingPage.tsx", "web-marketing/store/ShoppingPage.tsx"],
  ["web/src/site/bolt/pages/AuctionPage.tsx", "web-marketing/auction/AuctionPage.tsx"],
  ["web/src/site/bolt/pages/JobsPage.tsx", "web-marketing/jobs/JobsPage.tsx"],
  ["web/src/site/bolt/pages/EventsPage.tsx", "web-marketing/events/EventsPage.tsx"],
  ["web/src/site/bolt/pages/ExcelEditorPage.tsx", "web-marketing/excel-editor/ExcelEditorPage.tsx"],
  ["web/src/site/bolt/pages/MarketingEmailSettingsPage.tsx", "web-marketing/email/MarketingEmailSettingsPage.tsx"],
  ["web/src/site/bolt/pages/SecureMailPage.tsx", "web-marketing/email/SecureMailPage.tsx"],
  ["web/src/site/bolt/components/MarketingMediaCommerceStore.tsx", "web-marketing/store/MarketingMediaCommerceStore.tsx"],
  ["web/src/site/bolt/components/OfficeExcelWorkshop.tsx", "web-marketing/excel-editor/OfficeExcelWorkshop.tsx"],
  ["web/src/components/BlueAIChat.jsx", "web-app/vming/BlueAIChat.jsx"],
  ["web/src/components/ChatList.jsx", "web-app/chat/ChatList.jsx"],
  ["web/src/components/ChatRoom.jsx", "web-app/chat/ChatRoom.jsx"],
  ["web/src/components/Subscription.jsx", "web-app/shopping-cart/Subscription.jsx"]
];

function copyPath(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("[skip] missing:", src);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true, force: true });
  } else {
    fs.copyFileSync(src, dest);
  }
  console.log("[copied]", path.relative(root, src), "→", path.relative(root, dest));
}

console.log("[archive-v2] sync start →", archive);
fs.mkdirSync(archive, { recursive: true });

for (const [relSrc, relDest] of COPY_DIRS) {
  copyPath(path.join(root, relSrc), path.join(archive, relDest));
}

console.log("[archive-v2] done — originals unchanged in web/src");
