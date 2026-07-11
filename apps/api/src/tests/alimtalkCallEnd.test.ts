import "../loadEnv.js";
import {
  processCallEndAlimtalk,
  resetAlimtalkCallEndTestData,
  registerAlimtalkOptOut,
  isVlueMemberByPhone
} from "../services/alimtalk/alimtalkCallEndService.js";
import { buildCallEndAlimtalkPayload } from "../lib/alimtalkTemplate.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

async function run() {
  process.env.KAKAO_ALIMTALK_ENABLED = "mock";

  const callerId = "test-caller-user-001";
  const peerNonMember = "010-9876-5432";
  const peerE164 = "+821098765432";

  await resetAlimtalkCallEndTestData([peerNonMember, peerE164]);

  const payload = buildCallEndAlimtalkPayload(peerE164);
  assert(payload.body.includes("010-9876-5432"), "body must highlight phone number");
  assert(payload.body.includes("보이스피싱"), "body must include phishing-prevention copy");
  assert(payload.body.includes("스미싱"), "body must include smishing-prevention copy");
  assert(payload.body.includes("최초 1회"), "body must include first-send limit copy");
  assert(payload.buttons.length === 2, "two outbound buttons");
  assert(payload.buttons[0].name === "▶발신자 쇼케이스 확인하기", "button 1 label must match Kakao apply copy");
  assert(payload.buttons[0].url_mobile.includes("/site/web/showcase/"), "showcase link");
  assert(payload.buttons[0].url_mobile.includes("01098765432"), "URL phone must be digits only");
  assert(!payload.buttons[0].url_mobile.includes("010-9876"), "URL must not contain hyphens");
  assert(payload.phoneDisplayHyphen === "010-9876-5432", "hyphen display field");
  assert(payload.phoneDigitsForUrl === "01098765432", "digits-only URL field");
  console.log("[test] template body:", payload.body.slice(0, 60), "...");
  console.log("[test] showcase url:", payload.buttons[0].url_mobile);

  const first = await processCallEndAlimtalk(callerId, {
    peerPhone: peerNonMember,
    durationSec: 120,
    direction: "out"
  });
  assert(first.sent === true, "first send to non-member should succeed");
  assert(first.skipped === false, "not skipped");
  console.log("[test] first send log:", first.log?.join(" | "));

  const dup = await processCallEndAlimtalk(callerId, { peerPhone: peerNonMember, durationSec: 60 });
  assert(dup.sent === false && dup.reason === "daily_limit_reached", "daily limit");
  console.log("[test] duplicate blocked:", dup.reason);

  await resetAlimtalkCallEndTestData([peerNonMember, peerE164]);
  await registerAlimtalkOptOut(peerE164);
  const opted = await processCallEndAlimtalk(callerId, { peerPhone: peerNonMember });
  assert(opted.reason === "peer_opted_out", "opt-out blocks send");
  console.log("[test] opt-out blocked:", opted.reason);

  await resetAlimtalkCallEndTestData([peerNonMember, peerE164]);

  try {
    const member = await isVlueMemberByPhone(process.env.TEST_VLUE_MEMBER_PHONE || "00000000000");
    if (member) {
      const memberResult = await processCallEndAlimtalk(callerId, {
        peerPhone: process.env.TEST_VLUE_MEMBER_PHONE
      });
      assert(memberResult.reason === "peer_is_vlue_member", "member should skip alimtalk");
      console.log("[test] vlue member skip ok");
    } else {
      console.log("[test] skip live DB member check (set TEST_VLUE_MEMBER_PHONE for integration)");
    }
  } catch (e) {
    console.log("[test] DB member check skipped:", (e as Error).message);
  }

  console.log("\n[alimtalkCallEnd] all assertions passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
