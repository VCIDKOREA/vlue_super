import assert from "node:assert/strict";
import {
  ROW_GESTURE,
  decideCallHistoryRowGesture,
  rowGestureSuppressesClick
} from "./callHistoryRowGesture.js";

function run() {
  // 제자리 탭 — 행 열기(openCall). 전화부 탭 먹통 회귀 방지의 핵심.
  assert.equal(decideCallHistoryRowGesture({ dx: 0, dy: 0, moved: false }), ROW_GESTURE.TAP);
  assert.equal(decideCallHistoryRowGesture({ dx: 3, dy: 4, moved: false }), ROW_GESTURE.TAP);

  // 우로 스와이프 → 전화
  assert.equal(
    decideCallHistoryRowGesture({ dx: 90, dy: 5, moved: true }),
    ROW_GESTURE.SWIPE_DIAL
  );
  // 좌로 스와이프 → 전달
  assert.equal(
    decideCallHistoryRowGesture({ dx: -90, dy: 5, moved: true }),
    ROW_GESTURE.SWIPE_SHARE
  );

  // 세로 우세 — 수평 스와이프 아님(스크롤) → 드래그
  assert.equal(
    decideCallHistoryRowGesture({ dx: 90, dy: 200, moved: true }),
    ROW_GESTURE.DRAG
  );
  // 임계 미달 수평 이동 + moved → 드래그 (탭으로 오인 금지)
  assert.equal(
    decideCallHistoryRowGesture({ dx: 40, dy: 2, moved: true }),
    ROW_GESTURE.DRAG
  );
  // 세로 스크롤 — 임계 초과 → 드래그
  assert.equal(
    decideCallHistoryRowGesture({ dx: 2, dy: 60, moved: false }),
    ROW_GESTURE.DRAG
  );

  // 경계값: 정확히 72px 는 스와이프 아님(> 임계만 인정) → 탭/드래그
  assert.notEqual(
    decideCallHistoryRowGesture({ dx: 72, dy: 0, moved: false }),
    ROW_GESTURE.SWIPE_DIAL
  );
  // 73px 수평 우세 → 스와이프
  assert.equal(
    decideCallHistoryRowGesture({ dx: 73, dy: 0, moved: true }),
    ROW_GESTURE.SWIPE_DIAL
  );

  // click 억제 규칙: 탭만 억제하지 않는다
  assert.equal(rowGestureSuppressesClick(ROW_GESTURE.TAP), false);
  assert.equal(rowGestureSuppressesClick(ROW_GESTURE.DRAG), true);
  assert.equal(rowGestureSuppressesClick(ROW_GESTURE.SWIPE_DIAL), true);
  assert.equal(rowGestureSuppressesClick(ROW_GESTURE.SWIPE_SHARE), true);

  // 방어: 빈 인자 → 탭
  assert.equal(decideCallHistoryRowGesture(), ROW_GESTURE.TAP);
  assert.equal(decideCallHistoryRowGesture({}), ROW_GESTURE.TAP);

  console.log("callHistoryRowGesture.test.js OK");
}

run();
