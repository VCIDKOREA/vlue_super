import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { buildBizcardLiveViewerPage } from "./bizcardLiveViewerPage.js";

/** @deprecated — SVG 단독 배포 대신 라이브 뷰어 사용 */
export function buildHostedCardViewPage(opts: {
  cardId: string;
  card: BizcardClassicSnapshot;
  apiBase: string;
}) {
  return buildBizcardLiveViewerPage(opts);
}

export function buildHostedCardViewSvg(opts: {
  cardId: string;
  card: BizcardClassicSnapshot;
  apiBase: string;
}) {
  return buildBizcardLiveViewerPage(opts);
}
