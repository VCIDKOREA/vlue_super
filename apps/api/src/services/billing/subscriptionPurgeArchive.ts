import type { ContentRevisionEvent } from "../content/contentRevisionStore.js";

/** 유예 종료 크론이 쇼케이스를 지우기 전에 남기는 시스템 사유. 사용자 PUT의 rejected_empty 와 섞지 않는다. */
export const SUBSCRIPTION_EXPIRED_EVENT = "subscription_expired" satisfies ContentRevisionEvent;

export type SubscriptionPurgeSnapshot = {
  userId: string;
  businessCardId: string;
  isCertified: boolean;
  card: {
    dccSnapshotJson?: unknown;
    lineShowcaseStyleJson?: unknown;
    lineShowcaseLiveStyleJson?: unknown;
    lineShowcaseLiveSourceJson?: unknown;
    profileJson?: unknown;
  } | null;
  account: {
    showcaseStyleJson?: unknown;
    showcaseLiveStyleJson?: unknown;
  } | null;
};

export type SubscriptionPurgeArchive = {
  scope: string;
  recordKey: string;
  fieldName: string;
  event: typeof SUBSCRIPTION_EXPIRED_EVENT;
  snapshot: unknown;
};

function filled(value: unknown): boolean {
  return value != null;
}

/**
 * 크론이 실제로 비우기 직전에 남겨야 하는 행.
 * 내용이 없어도 purge_manifest 한 건은 항상 포함한다.
 */
export function planSubscriptionPurgeArchives(
  input: SubscriptionPurgeSnapshot
): SubscriptionPurgeArchive[] {
  const cardKey = input.businessCardId;
  const rows: SubscriptionPurgeArchive[] = [];
  const push = (scope: string, recordKey: string, fieldName: string, snapshot: unknown) => {
    if (!filled(snapshot)) return;
    rows.push({
      scope,
      recordKey,
      fieldName,
      event: SUBSCRIPTION_EXPIRED_EVENT,
      snapshot
    });
  };

  push("line_showcase", cardKey, "dcc", input.card?.dccSnapshotJson);
  push("line_showcase", cardKey, "editor", input.card?.lineShowcaseStyleJson);
  push("line_showcase", cardKey, "live", input.card?.lineShowcaseLiveStyleJson);
  push("line_showcase", cardKey, "live_source", input.card?.lineShowcaseLiveSourceJson);
  push("line_showcase", cardKey, "profile", input.card?.profileJson);
  if (input.isCertified) {
    push("account_showcase", input.userId, "editor", input.account?.showcaseStyleJson);
    push("account_showcase", input.userId, "live", input.account?.showcaseLiveStyleJson);
  }

  const clearedFields = rows.map((row) => `${row.scope}.${row.fieldName}`);
  rows.unshift({
    scope: "line_subscription",
    recordKey: cardKey,
    fieldName: "purge_manifest",
    event: SUBSCRIPTION_EXPIRED_EVENT,
    snapshot: {
      systemAction: true,
      reason: SUBSCRIPTION_EXPIRED_EVENT,
      expiredTermination: "expired_termination",
      source: "lapseExpiredGraceLines",
      userId: input.userId,
      businessCardId: input.businessCardId,
      certifiedAccountShowcase: input.isCertified,
      clearedFields
    }
  });
  return rows;
}
