import { prisma } from "../../db/client.js";

let initialized = false;

export type DigitalLetterRow = {
  id: string;
  title: string;
  body_text: string;
  bgm_url: string | null;
  bgm_volume: number | null;
  decor_json?: unknown;
  is_active: boolean;
  version: number;
  updated_at: Date;
  created_at: Date;
};

export type LetterDecor = {
  /** cream-lined | warm-lined | ivory | kraft | sky */
  paperTheme: string;
  /** auto | none | autumn | spring | summer | winter */
  seasonFx: string;
  /** 가로줄 표시 */
  showLines: boolean;
  /** 낙엽·꽃잎 농도 0.15–0.6 */
  fxOpacity: number;
  /** 서명 이미지 표시 */
  showSignature: boolean;
};

const DEFAULT_TITLE = "VLUÉ가 처음 만난 당신에게 💙 그동안 전하지 못한 편지";

const DEFAULT_BODY = `안녕하세요.
VLUÉ입니다.

아마 이런 생각을 하셨을지도 모르겠습니다.
“그런데… 내 개인정보를 왜 VLUÉ에 알려줘야 하지?”

솔직히 말하면
저희도 그 질문을 이해합니다.
처음 만난 사람을 믿는다는 건
생각보다 어려운 일이니까요.

그래서 억지로 믿어달라고 말씀드리고 싶지는 않습니다.
그저 저희가 왜 VLUÉ를 만들었는지
조금 이야기해보고 싶습니다.

우리는 참 많은 것을 스마트폰에 맡기고 살아갑니다.
사진도 저장하고,
친구와 이야기도 나누고,
좋아하는 음식도 찾아보고,
어디에 갔는지도 남깁니다.

누구를 좋아하는지,
무엇을 좋아하는지,
때로는 어떤 하루를 보냈는지까지
스마트폰은 우리의 일상을 알고 있습니다.

그런데 이상하게도
전화가 걸려오는 순간에는 모든 것이 달라집니다.

“누구지?”
“정말 그 사람이 맞나?”
“이 말을 믿어도 되는 걸까?”

사람과 사람을 가장 가깝게 이어주었던 전화가
언젠가부터 우리에게
의심부터 하라고 말하는 것 같았습니다.

그래서 생각했습니다.
우리가 조금 도와주면 어떨까?

전화를 받을 때마다
사람이 직접 검색하고,
번호를 찾아보고,
이리저리 비교하고,
계속 의심하지 않아도 되도록.

VLUÉ가 먼저 보여주면 어떨까.
“이 번호는 이런 사람입니다.”
“이곳에서 확인된 정보입니다.”
“한 번 더 확인해보세요.”

그리고 마지막 판단은
언제나 사람에게 맡기는 겁니다.

저희가 여러분 대신 세상을 판단하려는 것은 아닙니다.
그저 조금 더 잘 볼 수 있게 옆에서 빛을 비춰주는 것.
그게 VLUÉ가 하고 싶은 일입니다.

물론 VLUÉ 하나로
세상의 모든 보이스피싱과 사기를 막을 수는 없습니다.
범죄는 그렇게 단순하지 않으니까요.

하나의 문을 닫으면
또 다른 문을 찾아옵니다.
새로운 방법이 생기고,
또 새로운 수법이 생깁니다.

그래서 VLUÉ도 멈추지 않으려고 합니다.
열리면 닫고,
또 열리면 다시 닫겠습니다.

완벽한 세상을 만들겠다는 거창한 약속보다는
오늘보다 내일 조금 더 나은 소통을 만드는 것.
한 사람이라도
“이상한데?” 하고 한 번 더 생각할 수 있게 하는 것.

그 작은 차이가
누군가에게는 아주 큰 차이가 될 수도 있으니까요.

그리고 언젠가는
전화를 받으면서
“혹시 사기 아닐까?”부터 생각하는 세상이 아니라,
“아, 이 사람이라면 괜찮겠구나.”
하고 편안하게 전화를 받을 수 있는 세상이 되었으면 좋겠습니다.

VLUÉ는 그런 마음에서 시작했습니다.
거창하지 않습니다.
그저 우리가 매일 사용하는
‘전화’라는 아주 오래된 연결이
다시 조금 더 편안해졌으면 좋겠다는 마음.

그러니 처음부터 VLUÉ를 믿지 않으셔도 괜찮습니다.
천천히 보셔도 됩니다.
사용해보시고,
궁금한 것이 있으면 물어보시고,
마음에 들지 않는 것이 있다면 말씀해주세요.

저희도 계속 배우겠습니다.
그리고 계속 고치겠습니다.

당신의 전화를 대신 받지는 않겠습니다.
대신,
당신이 더 안심하고 받을 수 있도록
그 옆에 있겠습니다.

처음 만나 반갑습니다.
VLUÉ였습니다. 💙`;

const PAPER_THEMES = new Set(["cream-lined", "warm-lined", "ivory", "kraft", "sky"]);
const SEASON_FX = new Set(["auto", "none", "autumn", "spring", "summer", "winter"]);

/** 봄 3–5 · 여름 6–8 · 가을 9–11 · 겨울 12–2 */
export function defaultSeasonFx(date = new Date()): string {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export function resolveSeasonFx(raw: string, date = new Date()): string {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "none") return "none";
  if (s === "spring" || s === "summer" || s === "autumn" || s === "winter") return s;
  /* auto / 미지정 → 달력 계절 */
  return defaultSeasonFx(date);
}

export function normalizeLetterDecor(raw: unknown): LetterDecor {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const paperTheme = String(o.paperTheme || "cream-lined").trim();
  const seasonFx = String(o.seasonFx || "").trim();
  const fxOpacityRaw = typeof o.fxOpacity === "number" ? o.fxOpacity : Number(o.fxOpacity);
  return {
    paperTheme: PAPER_THEMES.has(paperTheme) ? paperTheme : "cream-lined",
    seasonFx: SEASON_FX.has(seasonFx) ? seasonFx : "auto",
    showLines: o.showLines === false ? false : true,
    fxOpacity: Number.isFinite(fxOpacityRaw)
      ? Math.min(0.65, Math.max(0.12, fxOpacityRaw))
      : 0.32,
    showSignature: o.showSignature === false ? false : true
  };
}

async function ensureTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS vlue_digital_letters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(240) NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      bgm_url TEXT,
      bgm_volume REAL NOT NULL DEFAULT 0.45,
      is_active BOOLEAN NOT NULL DEFAULT true,
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE vlue_digital_letters ADD COLUMN IF NOT EXISTS bgm_volume REAL NOT NULL DEFAULT 0.45;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE vlue_digital_letters ADD COLUMN IF NOT EXISTS decor_json JSONB;`
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_vlue_digital_letters_active ON vlue_digital_letters(is_active, updated_at DESC);"
  );
  initialized = true;

  const countRows = await prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>(
    `SELECT COUNT(*)::int AS c FROM vlue_digital_letters;`
  );
  const count = Number(countRows[0]?.c || 0);
  if (count === 0) {
    const decor = JSON.stringify(normalizeLetterDecor({ seasonFx: "auto" }));
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO vlue_digital_letters (title, body_text, bgm_url, bgm_volume, decor_json, is_active, version)
        VALUES ($1, $2, NULL, 0.45, $3::jsonb, true, 1);
      `,
      DEFAULT_TITLE,
      DEFAULT_BODY,
      decor
    );
  }
}

function clampVolume(v: unknown, fallback = 0.45) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function mapRow(row: DigitalLetterRow, opts: { resolveSeason?: boolean } = {}) {
  const decor = normalizeLetterDecor(row.decor_json);
  return {
    id: row.id,
    title: row.title,
    body: row.body_text,
    bgmUrl: row.bgm_url || "",
    bgmVolume: clampVolume(row.bgm_volume, 0.45),
    decor: opts.resolveSeason
      ? { ...decor, seasonFx: resolveSeasonFx(decor.seasonFx) }
      : decor,
    isActive: row.is_active,
    version: Number(row.version) || 1,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || "")
  };
}

export async function getActiveDigitalLetter() {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<DigitalLetterRow[]>(
    `
      SELECT *
      FROM vlue_digital_letters
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT 1;
    `
  );
  /* 공개 편지: none 제외하고 달력 계절 애니메이션 적용 */
  return rows[0] ? mapRow(rows[0], { resolveSeason: true }) : null;
}

export async function listDigitalLetters(limit = 20) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<DigitalLetterRow[]>(
    `
      SELECT *
      FROM vlue_digital_letters
      ORDER BY updated_at DESC
      LIMIT $1;
    `,
    Math.min(50, Math.max(1, limit))
  );
  return rows.map((row) => mapRow(row));
}

export async function upsertDigitalLetter(input: {
  id?: string;
  title: string;
  body: string;
  bgmUrl?: string;
  bgmVolume?: number;
  decor?: unknown;
  isActive?: boolean;
}) {
  await ensureTable();
  const title = String(input.title || "").trim().slice(0, 240) || DEFAULT_TITLE;
  const body = String(input.body || "").trim();
  if (!body) throw new Error("편지 본문을 입력해 주세요.");
  const bgmUrl = String(input.bgmUrl || "").trim().slice(0, 2000) || null;
  const bgmVolume = clampVolume(input.bgmVolume, 0.45);
  const decor = normalizeLetterDecor(input.decor);
  const decorJson = JSON.stringify(decor);
  const isActive = input.isActive !== false;
  const id = String(input.id || "").trim();

  if (id) {
    if (isActive) {
      await prisma.$executeRawUnsafe(
        `UPDATE vlue_digital_letters SET is_active = false WHERE is_active = true AND id <> $1::uuid;`,
        id
      );
    }
    const rows = await prisma.$queryRawUnsafe<DigitalLetterRow[]>(
      `
        UPDATE vlue_digital_letters
        SET title = $2,
            body_text = $3,
            bgm_url = $4,
            bgm_volume = $5,
            decor_json = $6::jsonb,
            is_active = $7,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING *;
      `,
      id,
      title,
      body,
      bgmUrl,
      bgmVolume,
      decorJson,
      isActive
    );
    if (!rows[0]) throw new Error("편지를 찾을 수 없습니다.");
    return mapRow(rows[0]);
  }

  if (isActive) {
    await prisma.$executeRawUnsafe(`UPDATE vlue_digital_letters SET is_active = false WHERE is_active = true;`);
  }

  const rows = await prisma.$queryRawUnsafe<DigitalLetterRow[]>(
    `
      INSERT INTO vlue_digital_letters (title, body_text, bgm_url, bgm_volume, decor_json, is_active, version)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, 1)
      RETURNING *;
    `,
    title,
    body,
    bgmUrl,
    bgmVolume,
    decorJson,
    isActive
  );
  return mapRow(rows[0]);
}

export async function setDigitalLetterActive(id: string, isActive: boolean) {
  await ensureTable();
  if (isActive) {
    await prisma.$executeRawUnsafe(`UPDATE vlue_digital_letters SET is_active = false WHERE is_active = true;`);
  }
  const rows = await prisma.$queryRawUnsafe<DigitalLetterRow[]>(
    `
      UPDATE vlue_digital_letters
      SET is_active = $2, updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *;
    `,
    id,
    isActive
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export { DEFAULT_TITLE, DEFAULT_BODY };
