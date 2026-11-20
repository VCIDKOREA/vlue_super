/** 기관 서버가 근거와 함께 확인한 항목만 통과시킨다. */

export const INSTITUTION_CHECKS = [
  { id: "identity", label: "사용자 본인 인증" },
  { id: "org", label: "기관 소속 및 권한 승인" },
  { id: "place", label: "지정 장소 일치" },
  { id: "time", label: "허용된 사용 시간" },
  { id: "quota", label: "사용 횟수 및 만료" }
];

function objectParticle(label) {
  const code = label.charCodeAt(label.length - 1);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return hasBatchim ? "을" : "를";
}

function unlinkedReason(label) {
  return `${label}${objectParticle(label)} 확인해 주는 기관 서버 응답이 없습니다. 검증 완료로 보지 않습니다.`;
}

export function evaluateInstitutionalGate(report) {
  const checks = INSTITUTION_CHECKS.map((item) => {
    const row = Array.isArray(report?.checks) ? report.checks.find((check) => check.id === item.id) : null;
    if (row?.state === "verified" && String(row.evidence || "").trim()) {
      return { id: item.id, label: item.label, state: "verified", reason: String(row.evidence).trim() };
    }
    if (row?.state === "unmet") {
      return { id: item.id, label: item.label, state: "unmet", reason: row.reason || `${item.label} 조건을 통과하지 못했습니다.` };
    }
    return { id: item.id, label: item.label, state: "unlinked", reason: row?.reason || unlinkedReason(item.label) };
  });
  return { allowed: checks.every((check) => check.state === "verified"), checks };
}

export function runInstitutionalScan(report, at = new Date().toISOString()) {
  const gate = evaluateInstitutionalGate(report);
  if (!gate.allowed) {
    return {
      blocked: true,
      result: {
        moduleId: "device-id",
        title: "DEVICE ID",
        item: "기관용 인증 탐색",
        mode: "institution",
        at,
        outcome: "locked",
        observed: [],
        review: [],
        limits: gate.checks.filter((check) => check.state !== "verified").map((check) => ({ label: check.label, value: check.reason })),
        actions: ["잠금 사유가 해소되고 기관 서버가 확인하기 전에는 기관용 탐색을 실행하지 않습니다."]
      }
    };
  }
  return {
    blocked: false,
    result: {
      moduleId: "device-id",
      title: "DEVICE ID",
      item: "기관용 인증 탐색",
      mode: "institution",
      at,
      outcome: "unmeasurable",
      observed: [],
      review: ["통과한 조건은 서버가 준 근거가 있는 항목입니다."],
      limits: ["기관 장치 목록 API가 연결되지 않아 기기를 나열하지 않습니다."],
      actions: ["장치 목록은 기관 서버가 응답한 뒤에만 표시합니다."]
    }
  };
}
