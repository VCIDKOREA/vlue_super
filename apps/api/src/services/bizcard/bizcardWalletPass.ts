import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { cardViewUrl, getVluePublicOrigin } from "./bizcardPublicUrls.js";

/** 최소 ZIP (STORE) — unsigned pkpass 스텁 */
function buildZip(files: { name: string; data: Buffer }[]) {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const data = f.data;
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt32LE(data.length, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(crc32(data), 22);
    local.writeUInt32LE(offset, 26);
    local.writeUInt16LE(nameBuf.length, 28);
    nameBuf.copy(local, 30);
    parts.push(local, data);

    const cen = Buffer.alloc(46 + nameBuf.length);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt32LE(data.length, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(crc32(data), 24);
    cen.writeUInt32LE(offset, 28);
    cen.writeUInt16LE(nameBuf.length, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt16LE(0, 38);
    cen.writeUInt16LE(0, 40);
    cen.writeUInt32LE(0, 42);
    nameBuf.copy(cen, 46);
    central.push(cen);

    offset += local.length + data.length;
  }

  const centralDir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, centralDir, end]);
}

function crc32(buf: Buffer) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/**
 * Apple Wallet .pkpass 스텁 — 서명·푸시 원격 폭파는 운영 인증서 연동 후 활성화.
 * webServiceURL / authenticationToken 으로 만료 시 pass 업데이트(회색 안내) 푸시 연동 예정.
 */
export function buildBizcardWalletPassStub(
  snapshot: BizcardClassicSnapshot,
  cardId: string,
  invalidated: boolean
) {
  const origin = getVluePublicOrigin();
  const view = cardViewUrl(origin, cardId);
  const serial = cardId.slice(0, 32);
  const name = snapshot.name || "VLUE";
  const org = snapshot.organization || "VLUE";

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: process.env.VLUE_WALLET_PASS_TYPE_ID || "pass.kr.vlue.bizcard.stub",
    serialNumber: serial,
    teamIdentifier: process.env.VLUE_WALLET_TEAM_ID || "VLUESTUB0",
    organizationName: "VLUE",
    description: invalidated ? "만료된 VLUE 인증명함" : "VLUE 라이브 홀로그램 명함",
    logoText: "VLUE",
    foregroundColor: invalidated ? "rgb(75,85,99)" : "rgb(255,255,255)",
    backgroundColor: invalidated ? "rgb(229,231,235)" : "rgb(30,64,175)",
    labelColor: invalidated ? "rgb(55,65,81)" : "rgb(191,219,254)",
    webServiceURL: `${origin}/api/v1/card/wallet-pass`,
    authenticationToken: `vlue-${serial}`,
    relevantDate: new Date().toISOString(),
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: view,
        messageEncoding: "iso-8859-1"
      }
    ],
    generic: {
      headerFields: [
        {
          key: "live",
          label: "LIVE",
          value: invalidated ? "만료" : "검증 중",
          changeMessage: invalidated ? "명함이 무효화되었습니다." : "실시간 검증"
        }
      ],
      primaryFields: [{ key: "name", label: "이름", value: name }],
      secondaryFields: [
        { key: "org", label: "회사", value: org },
        {
          key: "holo",
          label: "홀로그램",
          value: invalidated ? "정지됨" : "자이로 연동 라이브 광택 (스텁)"
        }
      ],
      backFields: [
        {
          key: "viewer",
          label: "라이브 뷰어",
          value: view
        },
        {
          key: "revoke",
          label: "원격 폭파",
          value:
            "구독 만료 시 Push(updatePass)로 회색 만료 안내장으로 갱신 — Apple Developer 서명 연동 후 활성화"
        }
      ]
    }
  };

  const passJson = Buffer.from(JSON.stringify(pass, null, 2), "utf8");
  const manifest = Buffer.from(
    JSON.stringify({ "pass.json": "stub-unsigned-sha1-placeholder" }, null, 2),
    "utf8"
  );

  return buildZip([
    { name: "pass.json", data: passJson },
    { name: "manifest.json", data: manifest }
  ]);
}
