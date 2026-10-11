import { planSubscriptionPurgeArchives } from "../services/billing/subscriptionPurgeArchive.js";

function assert(cond: unknown, label: string) {
  if (!cond) throw new Error(label);
}

const userId = "13c75cbe-206b-4eed-82d2-a54c7bc80c9c";
const businessCardId = "card-1";
const showcase = { pages: [{ gallery: { photos: [{ url: "https://cdn.example/a.jpg" }] } }] };

const rows = planSubscriptionPurgeArchives({
  userId,
  businessCardId,
  isCertified: true,
  card: {
    dccSnapshotJson: { name: "이종근" },
    lineShowcaseStyleJson: showcase,
    lineShowcaseLiveStyleJson: null,
    lineShowcaseLiveSourceJson: { from: "editor" },
    profileJson: null
  },
  account: {
    showcaseStyleJson: showcase,
    showcaseLiveStyleJson: { pages: [] }
  }
});

const manifest = rows[0];
assert(manifest?.fieldName === "purge_manifest", "manifest first");
assert(manifest?.event === "subscription_expired", "system event is not rejected_empty");
const snap = manifest?.snapshot as {
  systemAction?: boolean;
  reason?: string;
  expiredTermination?: string;
  clearedFields?: string[];
};
assert(snap.systemAction === true, "system action");
assert(snap.reason === "subscription_expired", "reason");
assert(snap.expiredTermination === "expired_termination", "termination alias");
assert(rows.every((row) => row.event === "subscription_expired"), "every row is the system event");
assert(!rows.some((row) => String(row.event) === "rejected_empty"), "user empty-save event stays out");
assert(
  rows.some((row) => row.scope === "account_showcase" && row.fieldName === "editor"),
  "certified account editor archived"
);
assert(
  rows.some((row) => row.scope === "line_showcase" && row.fieldName === "dcc"),
  "line dcc archived"
);
assert(
  !rows.some((row) => row.fieldName === "live" && row.scope === "line_showcase"),
  "null line live is not a fake archive"
);
assert(snap.clearedFields?.includes("account_showcase.live"), "empty pages object is still archived");

const uncertified = planSubscriptionPurgeArchives({
  userId,
  businessCardId,
  isCertified: false,
  card: { lineShowcaseStyleJson: showcase },
  account: { showcaseStyleJson: showcase, showcaseLiveStyleJson: showcase }
});
assert(
  !uncertified.some((row) => row.scope === "account_showcase"),
  "uncertified lapse does not archive the account showcase it will not delete"
);

console.log("subscriptionPurgeArchive ok", rows.length);
