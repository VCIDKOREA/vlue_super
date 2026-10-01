import { classifySender, judgeSenderSignals, type SmsLookupHit } from "../services/sms/smsSenderContext.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const miss: SmsLookupHit = { status: "miss", name: "", category: "", note: "" };
const reports = { total: 0, phishing: 0, reasons: [] as string[] };

function judge(phone: string, text: string, extra?: Partial<{ reports: typeof reports }>) {
  return judgeSenderSignals({
    rawPhone: phone,
    messageText: text,
    reports: extra?.reports || reports,
    directory: miss,
    kakao: miss,
    naver: miss,
    publicData: miss
  });
}

const intl = classifySender("006-1234-5678");
assert(intl.band === "international" && intl.bandLabel.includes("006"), "006 is international");
assert(classifySender("07012345678").band === "internet", "070 is internet");
assert(classifySender("050712345678").band === "virtual", "050 is virtual");
assert(classifySender("01080144666").band === "mobile", "010 is mobile");

const personal = judge("01099998888", "국민은행 계좌이체가 필요합니다. http://pay-check.example/a");
assert(personal.badge === "phishing" && personal.escalate === "DANGER" && personal.dangerFloor >= 98, "010 finance impersonation is highest");

const carrier = judge("006451234", "택배 배송조회가 필요합니다");
assert(carrier.badge === "phishing" && carrier.escalate === "DANGER", "006 delivery impersonation is danger");

const reported = judge("0212345678", "오전 회의 안내입니다", {
  reports: { total: 2, phishing: 2, reasons: ["스미싱"] }
});
assert(reported.badge === "phishing" && reported.reason.includes("신고"), "phishing reports raise the badge");

const plain = judge("01011112222", "오늘 저녁 같이 먹자");
assert(plain.badge === "safe" && plain.escalate === "SAFE", "plain 010 chat stays safe");

console.log("sms sender context ok");
