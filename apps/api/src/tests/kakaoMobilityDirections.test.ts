import { parseKakaoDirections, thinPoints } from "../integrations/kakao/kakaoMobilityDirections.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const parsed = parseKakaoDirections({
  routes: [
    {
      result_code: 0,
      summary: { distance: 842, duration: 126 },
      sections: [
        {
          roads: [
            { vertexes: [127.01, 37.5, 127.02, 37.51, 127.02, 37.51, 127.03, 37.52] },
            { vertexes: [127.03, 37.52, 127.04, 37.53] }
          ],
          guides: [
            { guidance: "출발지", type: 100, distance: 0 },
            { guidance: "좌회전", type: 1, distance: 320 },
            { guidance: "U턴", type: 3, distance: 400 },
            { type: 2, distance: 80 },
            { guidance: "도착지", type: 101, distance: 42 }
          ]
        }
      ]
    }
  ]
});

assert(parsed != null, "route parses");
assert(parsed!.points.length === 4, "vertexes pair into lng,lat and drop duplicates");
assert(parsed!.points[0][0] === 127.01 && parsed!.points[0][1] === 37.5, "first point is lng,lat");
assert(parsed!.distanceM === 842 && parsed!.durationSec === 126, "summary distance and duration");
assert(parsed!.steps[0].instruction === "안내를 시작합니다", "start guide");
assert(parsed!.steps[1].instruction === "좌회전" && parsed!.steps[1].distanceM === 320, "left turn");
assert(parsed!.steps[2].instruction === "U턴", "u-turn text");
assert(parsed!.steps[3].instruction === "우회전", "type 2 is right");
assert(parsed!.steps[4].instruction === "목적지 도착", "arrival guide");
assert(parseKakaoDirections({ routes: [{ result_code: 1, sections: [] }] }) == null, "failed route is empty");
assert(thinPoints([[0, 0], [1, 1], [2, 2], [3, 3]], 2).length >= 2, "thin keeps an end");

console.log("kakao mobility directions ok");
