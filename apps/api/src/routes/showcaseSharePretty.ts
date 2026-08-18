import { Hono } from "hono";
import { respondShowcaseOgCover, respondShowcaseOgView } from "./showcasePublic.js";

/**
 * m.vlue.kr 공개 경로 — API 서비스에 붙인 모바일 공유 도메인.
 * `/showcase/010…` · `/s/010…` 가 OG HTML을 바로 내려준다.
 */
export const showcaseSharePrettyRoutes = new Hono();

for (const path of ["/showcase/:phone/cover.jpg", "/showcase/:phone/cover.jpeg"]) {
  showcaseSharePrettyRoutes.on(["GET", "HEAD"], path, (c) => respondShowcaseOgCover(c));
}

for (const path of ["/showcase/:phone", "/showcase/:phone/", "/s/:phone", "/s/:phone/"]) {
  showcaseSharePrettyRoutes.on(["GET", "HEAD"], path, (c) => respondShowcaseOgView(c));
}
