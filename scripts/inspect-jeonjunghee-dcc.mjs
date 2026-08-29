import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const rel of [".env", "packages/db/.env"]) {
  const f = resolve(root, rel);
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient();

function keysOf(obj, max = 40) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj).slice(0, max);
}

function bgmOf(style) {
  const bgm = style && typeof style === "object" ? style.bgm : null;
  if (!bgm || typeof bgm !== "object") return null;
  return {
    mode: bgm.mode,
    title: bgm.title,
    hasPlaylist: Array.isArray(bgm.playlist) && bgm.playlist.length > 0,
    playlistLen: Array.isArray(bgm.playlist) ? bgm.playlist.length : 0,
    customUrl: Boolean(bgm.customUrl),
    youtube: Boolean(bgm.youtube?.url || bgm.youtube?.id)
  };
}

function sizeHint(obj) {
  try {
    return JSON.stringify(obj || null).length;
  } catch {
    return 0;
  }
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { publicHandle: "jeonjunghee" },
    select: {
      id: true,
      legalName: true,
      phoneE164: true,
      showcaseStyleUpdatedAt: true,
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      digitalCard: {
        select: {
          id: true,
          displayName: true,
          photoUrl: true,
          logoUrl: true,
          organization: true,
          titleSnapshot: true,
          departmentSnapshot: true,
          exportSnapshotJson: true,
          updatedAt: true
        }
      }
    }
  });
  if (!user) throw new Error("user not found");
  const editor = user.showcaseStyleJson;
  const live = user.showcaseLiveStyleJson;
  const exportSnap = user.digitalCard?.exportSnapshotJson;
  const cards = await prisma.businessCard.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      kind: true,
      phoneE164: true,
      displayName: true,
      jobTitle: true,
      dccSnapshotJson: true,
      profileJson: true,
      lineShowcaseStyleJson: true,
      lineShowcaseLiveStyleJson: true,
      lineShowcaseUpdatedAt: true,
      activeDccAgentProfileId: true,
      updatedAt: true
    }
  });
  console.log(
    JSON.stringify(
      {
        user: {
          id: user.id,
          name: user.legalName,
          phone: user.phoneE164,
          showcaseUpdatedAt: user.showcaseStyleUpdatedAt,
          editorBytes: sizeHint(editor),
          liveBytes: sizeHint(live),
          editorKeys: keysOf(editor),
          liveKeys: keysOf(live),
          editorBgm: bgmOf(editor),
          liveBgm: bgmOf(live)
        },
        digitalCard: user.digitalCard
          ? {
              id: user.digitalCard.id,
              displayName: user.digitalCard.displayName,
              photoUrl: Boolean(user.digitalCard.photoUrl),
              logoUrl: Boolean(user.digitalCard.logoUrl),
              organization: user.digitalCard.organization,
              title: user.digitalCard.titleSnapshot,
              department: user.digitalCard.departmentSnapshot,
              exportBytes: sizeHint(exportSnap),
              exportKeys: keysOf(exportSnap),
              exportPhoto: Boolean(exportSnap && exportSnap.photoUrl),
              exportBgm: bgmOf(exportSnap),
              updatedAt: user.digitalCard.updatedAt
            }
          : null,
        cards: cards.map((c) => {
          const snap = c.dccSnapshotJson && typeof c.dccSnapshotJson === "object" ? c.dccSnapshotJson : {};
          const ed = c.lineShowcaseStyleJson;
          const lv = c.lineShowcaseLiveStyleJson;
          return {
            id: c.id,
            kind: c.kind,
            phoneE164: c.phoneE164,
            displayName: c.displayName,
            jobTitle: c.jobTitle,
            agentId: c.activeDccAgentProfileId,
            updatedAt: c.updatedAt,
            lineShowcaseUpdatedAt: c.lineShowcaseUpdatedAt,
            dccKeys: keysOf(snap),
            dccPhoto: Boolean(snap.photoUrl),
            dccName: snap.name || snap.displayName || null,
            profileKeys: keysOf(c.profileJson),
            editorBytes: sizeHint(ed),
            liveBytes: sizeHint(lv),
            editorBgm: bgmOf(ed),
            liveBgm: bgmOf(lv)
          };
        })
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
