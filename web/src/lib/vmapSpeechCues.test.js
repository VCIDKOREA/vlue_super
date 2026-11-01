import assert from "node:assert/strict";
import { listLiveSpeeches, phraseForTurn, turnBand } from "./vmapSpeechCues.js";

assert.equal(turnBand(500), "");
assert.equal(turnBand(300), "300");
assert.equal(turnBand(100), "100");
assert.equal(phraseForTurn("직진", 300), "");
assert.equal(phraseForTurn("약간 우회전", 300), "");
assert.equal(phraseForTurn("안내를 종료합니다", 100), "");
assert.equal(phraseForTurn("우회전", 300), "300미터 앞, 우회전입니다.");
assert.equal(phraseForTurn("좌회전", 90), "100미터 앞, 좌회전입니다.");

const rows = listLiveSpeeches({
  steps: [{ instruction: "직진", distanceM: 80 }],
  remainM: 2000
});
assert.equal(rows.some((row) => /직진/.test(row.text)), false);

const turns = listLiveSpeeches({
  steps: [{ instruction: "우회전", distanceM: 280 }],
  remainM: 2000
});
assert.equal(turns[0]?.text, "300미터 앞, 우회전입니다.");

const near = listLiveSpeeches({
  steps: [{ instruction: "좌회전", distanceM: 95 }],
  remainM: 800
});
assert.equal(near[0]?.text, "100미터 앞, 좌회전입니다.");

console.log("vmapSpeechCues tts ok");
