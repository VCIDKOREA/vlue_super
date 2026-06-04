import { randomBytes } from "node:crypto";
import { prisma } from "../../db/client.js";
import { ensureFraudSchema } from "./fraudSchema.js";
import { generateDocumentHash, generateMessageHash } from "./fraudAnalyzeService.js";

function certId() {
  return `VLUE-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function generateFraudEvidence(input: {
  userId: string;
  roomId: string;
  fraudType?: string;
  from?: string;
  to?: string;
  passwordHint?: string;
}) {
  await ensureFraudSchema();
  const roomId = input.roomId;
  const from = input.from ? new Date(input.from) : new Date(Date.now() - 30 * 86400000);
  const to = input.to ? new Date(input.to) : new Date();

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId,
      createdAt: { gte: from, lte: to }
    },
    orderBy: { createdAt: "asc" },
    take: 500
  });

  const flags = await prisma.$queryRawUnsafe<
    Array<{ message_id: string | null; risk_level: string; pattern_type: string | null; reason: string | null }>
  >(
    `SELECT message_id, risk_level, pattern_type, reason FROM fraud_pattern_logs
     WHERE room_id = $1 AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz;`,
    roomId,
    from.toISOString(),
    to.toISOString()
  );
  const flagByMsg = new Map(flags.filter((f) => f.message_id).map((f) => [f.message_id!, f]));

  const items: Array<{
    messageId: string;
    hash: string;
    flagged: boolean;
    riskLevel?: string;
    patternType?: string;
  }> = [];

  const evidenceRows: Array<{
    msg: (typeof messages)[0];
    hash: string;
    f: (typeof flags)[0] | undefined;
  }> = [];

  for (const msg of messages) {
    const hash = generateMessageHash({
      id: msg.id,
      content: msg.content,
      sender_id: msg.senderId,
      created_at: msg.createdAt.toISOString(),
      room_id: msg.roomId
    });
    const f = flagByMsg.get(msg.id);
    items.push({
      messageId: msg.id,
      hash,
      flagged: Boolean(f),
      riskLevel: f?.risk_level,
      patternType: f?.pattern_type || undefined
    });
    evidenceRows.push({ msg, hash, f });
  }

  const blockchainHash = generateDocumentHash(items.map((i) => i.hash));
  const certificationId = certId();

  const summaryLines = messages
    .filter((m) => flagByMsg.has(m.id))
    .slice(0, 5)
    .map((m) => `- ${m.content.slice(0, 120)}`);

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<title>VLUE 증거 백서 ${certificationId}</title>
<style>
body{font-family:'Malgun Gothic',sans-serif;margin:40px;color:#111}
.cover{border:2px solid #1e40af;padding:32px;text-align:center;margin-bottom:32px}
.hash{font-family:monospace;font-size:12px;word-break:break-all}
.msg{border-bottom:1px solid #eee;padding:12px 0}
.flagged{background:#fffbeb}
.sha{font-size:10px;color:#666;font-family:monospace}
</style></head><body>
<div class="cover"><h1>VLUE 디지털 증거 백서</h1>
<p>문서번호: <strong>${certificationId}</strong></p>
<p class="hash">블록체인 마스터 해시: ${blockchainHash}</p>
<p>생성: ${new Date().toLocaleString("ko-KR")}</p></div>
<h2>요약</h2>
<p>유형: ${input.fraudType || "사기 의심"} · 기간: ${from.toLocaleDateString("ko-KR")} ~ ${to.toLocaleDateString("ko-KR")}</p>
<pre>${summaryLines.join("\n") || "의심 메시지 없음"}</pre>
<h2>대화 원문</h2>
${messages
  .map((m) => {
    const hash = items.find((i) => i.messageId === m.id)?.hash || "";
    const flagged = flagByMsg.has(m.id);
    return `<div class="msg ${flagged ? "flagged" : ""}"><div>${m.createdAt.toISOString()} · ${m.senderId || "system"}</div>
<div>${m.content.replace(/</g, "&lt;")}</div><div class="sha">SHA-256: ${hash}</div></div>`;
  })
  .join("")}
</body></html>`;

  const reportRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
    INSERT INTO fraud_reports (
      user_id, room_id, fraud_type, period_from, period_to,
      certification_id, blockchain_hash, evidence_html, pdf_password_hint, status
    ) VALUES ($1::uuid, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9, 'ready')
    RETURNING id;
    `,
    input.userId,
    roomId,
    input.fraudType || null,
    from.toISOString(),
    to.toISOString(),
    certificationId,
    blockchainHash,
    html,
    input.passwordHint || null
  );

  const reportId = reportRows[0]?.id;
  if (reportId) {
    for (const row of evidenceRows) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO fraud_evidence_items (
          report_id, message_id, sender_id, content_snapshot, sent_at, original_hash,
          is_flagged, risk_level, pattern_type
        ) VALUES ($1::uuid, $2, $3::uuid, $4, $5::timestamptz, $6, $7, $8, $9);
        `,
        reportId,
        row.msg.id,
        row.msg.senderId,
        row.msg.content,
        row.msg.createdAt.toISOString(),
        row.hash,
        Boolean(row.f),
        row.f?.risk_level || null,
        row.f?.pattern_type || null
      );
    }
  }

  return {
    reportId,
    certificationId,
    blockchainHash,
    messageCount: messages.length,
    html
  };
}

export async function listFraudEvidenceForUser(userId: string) {
  await ensureFraudSchema();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      room_id: string;
      fraud_type: string | null;
      certification_id: string;
      blockchain_hash: string;
      status: string;
      created_at: Date;
      period_from: Date | null;
      period_to: Date | null;
    }>
  >(
    `
    SELECT id, room_id, fraud_type, certification_id, blockchain_hash, status, created_at, period_from, period_to
    FROM fraud_reports
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC
    LIMIT 100;
    `,
    userId
  );
  return rows.map((r) => ({
    reportId: r.id,
    roomId: r.room_id,
    fraudType: r.fraud_type,
    certificationId: r.certification_id,
    blockchainHash: r.blockchain_hash,
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    periodFrom: r.period_from instanceof Date ? r.period_from.toISOString() : null,
    periodTo: r.period_to instanceof Date ? r.period_to.toISOString() : null
  }));
}

export async function verifyFraudHash(input: {
  certificationId?: string;
  blockchainHash?: string;
  userId?: string;
  reportId?: string;
}) {
  await ensureFraudSchema();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      certification_id: string;
      blockchain_hash: string;
      evidence_html: string | null;
    }>
  >(
    `
    SELECT id, user_id, certification_id, blockchain_hash, evidence_html FROM fraud_reports
    WHERE ($1::text IS NOT NULL AND certification_id = $1)
       OR ($2::text IS NOT NULL AND blockchain_hash = $2)
       OR ($3::uuid IS NOT NULL AND id = $3::uuid)
    LIMIT 1;
    `,
    input.certificationId || null,
    input.blockchainHash || null,
    input.reportId || null
  );
  const row = rows[0];
  if (!row) {
    return { valid: false, message: "일치하는 원본 문서를 찾을 수 없습니다." };
  }
  if (input.userId && String(row.user_id) !== String(input.userId)) {
    return { valid: false, message: "본인 소유 증거 패키지만 검증할 수 있습니다." };
  }
  return {
    valid: true,
    message: "본 문서는 변조되지 않은 신뢰 원본입니다.",
    reportId: row.id,
    certificationId: row.certification_id,
    blockchainHash: row.blockchain_hash,
    evidenceHtml: row.evidence_html
  };
}

export async function downloadFraudEvidenceAfterVerify(input: {
  userId: string;
  reportId: string;
  certificationId: string;
  blockchainHash: string;
}) {
  const verified = await verifyFraudHash({
    userId: input.userId,
    reportId: input.reportId,
    certificationId: input.certificationId,
    blockchainHash: input.blockchainHash
  });
  if (!verified.valid) {
    return { ok: false as const, error: verified.message };
  }
  if (!verified.evidenceHtml) {
    return { ok: false as const, error: "증거 원본 데이터가 없습니다." };
  }
  return {
    ok: true as const,
    reportId: verified.reportId,
    certificationId: verified.certificationId,
    blockchainHash: verified.blockchainHash,
    fileName: `VLUE_증거_${verified.certificationId}.html`,
    html: verified.evidenceHtml
  };
}

export async function submitFraudReport(input: {
  userId: string;
  reportId: string;
  agency: "police" | "fss" | "kisa" | "carrier";
  meta?: Record<string, unknown>;
}) {
  await ensureFraudSchema();
  const links: Record<string, string> = {
    police: "https://ecrm.police.go.kr",
    fss: "https://www.fss.or.kr",
    kisa: "https://www.kisa.or.kr",
    carrier: "tel:114"
  };
  const submitted = {
    agency: input.agency,
    url: links[input.agency],
    submittedAt: new Date().toISOString(),
    ...(input.meta || {})
  };
  await prisma.$executeRawUnsafe(
    `
    UPDATE fraud_reports SET
      submitted_to = COALESCE(submitted_to, '{}'::jsonb) || $2::jsonb,
      status = 'submitted',
      updated_at = NOW()
    WHERE id = $1::uuid AND user_id = $3::uuid;
    `,
    input.reportId,
    JSON.stringify({ [input.agency]: submitted }),
    input.userId
  );
  return { ok: true, submitted, portalUrl: links[input.agency] };
}
