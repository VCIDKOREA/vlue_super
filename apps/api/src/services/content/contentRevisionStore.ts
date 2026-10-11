import { prisma } from "../../db/client.js";

let ready = false;

/**
 * 사용자 저장: superseded(정상 교체 직전), rejected_empty(빈 덮어쓰기 거절).
 * 구독 스케줄러: subscription_expired(유예 종료 정리). expired_termination 은 같은 시스템 정리의 별칭으로 조회할 수 있게 스냅샷 reason 에 함께 남긴다.
 */
export type ContentRevisionEvent =
  | "superseded"
  | "rejected_empty"
  | "subscription_expired"
  | "expired_termination";

export async function ensureContentRevisionSchema() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_content_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      scope varchar(40) NOT NULL,
      record_key varchar(80) NOT NULL DEFAULT '',
      field_name varchar(40) NOT NULL,
      event varchar(32) NOT NULL,
      snapshot jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS user_content_revisions_user_created_idx
      ON user_content_revisions (user_id, created_at DESC);
  `);
  ready = true;
}

/** 저장에 성공하면 true. 스케줄러 삭제는 true 가 아니면 진행하지 않는다. */
export async function archiveContentRevision(input: {
  userId: string;
  scope: string;
  recordKey?: string;
  fieldName: string;
  event: ContentRevisionEvent;
  snapshot: unknown;
}): Promise<boolean> {
  if (!input.userId || input.snapshot == null) return false;
  try {
    await ensureContentRevisionSchema();
    await prisma.$executeRaw`
      INSERT INTO user_content_revisions
        (user_id, scope, record_key, field_name, event, snapshot)
      VALUES (
        ${input.userId}::uuid,
        ${input.scope},
        ${input.recordKey || ""},
        ${input.fieldName},
        ${input.event},
        ${JSON.stringify(input.snapshot)}::jsonb
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM user_content_revisions
      WHERE id IN (
        SELECT id FROM user_content_revisions
        WHERE user_id = ${input.userId}::uuid
          AND scope = ${input.scope}
          AND field_name = ${input.fieldName}
        ORDER BY created_at DESC
        OFFSET 20
      )
    `;
    if (input.event === "subscription_expired" || input.event === "expired_termination") {
      console.info(
        "[content-revision] system",
        input.event,
        input.userId,
        input.scope,
        input.fieldName
      );
    }
    return true;
  } catch (err) {
    console.error("[content-revision] archive failed", input.scope, input.fieldName, err);
    return false;
  }
}
