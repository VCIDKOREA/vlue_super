/**
 * DCC 담당자 프리셋 정규화 단위 테스트
 * 실행: npx tsx src/tests/dccAgentProfileService.test.ts
 */
import assert from "node:assert/strict";
import {
  defaultAgentLabel,
  normalizeDccAgentInput,
  normalizePhotoFocus
} from "../services/dcc/dccAgentProfileService.js";

function run() {
  assert.equal(normalizePhotoFocus("TOP"), "top");
  assert.equal(normalizePhotoFocus("middle"), "center");
  assert.equal(normalizePhotoFocus(""), "center");
  assert.equal(defaultAgentLabel("김민수", "과장"), "김민수 · 과장");
  assert.equal(defaultAgentLabel("이하나", ""), "이하나");

  const n = normalizeDccAgentInput({
    name: "  박도윤  ",
    title: "팀장",
    department: "고객지원",
    photoUrl: "https://cdn.example.com/a.jpg",
    photoFocus: "bottom"
  });
  assert.equal(n.displayName, "박도윤");
  assert.equal(n.label, "박도윤 · 팀장");
  assert.equal(n.photoFocus, "bottom");
  assert.equal(n.photoUrl, "https://cdn.example.com/a.jpg");

  assert.throws(
    () => normalizeDccAgentInput({ displayName: "홍길동", photoUrl: "data:image/png;base64,xx" }),
    /https URL/
  );

  console.log("dccAgentProfileService.test.ts: ok");
}

run();
