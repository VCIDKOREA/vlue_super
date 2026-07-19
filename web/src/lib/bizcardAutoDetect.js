import { detectDocumentLiteFromVideo } from "./csScannerOpenCv.js";

/** 가이드 프레임과 감지된 명함 영역의 겹침·안정성 판정 */

const STABLE_FRAMES = 3;
const STABLE_MOVE_PCT = 3.5;
const MIN_OVERLAP = 0.55;
const MIN_COVER = 0.42;
const MIN_ASPECT = 1.2;
const MAX_ASPECT = 2.4;

/**
 * object-cover 기준 스테이지 위 프레임 → 비디오 픽셀 비율(%) 사각형
 * @returns {{ x: number, y: number, w: number, h: number } | null} 0–100
 */
export function guideFrameToVideoPercent(video, frameEl, stageEl) {
  const vw = video?.videoWidth || 0;
  const vh = video?.videoHeight || 0;
  if (!vw || !vh || !frameEl || !stageEl) return null;

  const stage = stageEl.getBoundingClientRect();
  const frame = frameEl.getBoundingClientRect();
  if (stage.width < 1 || stage.height < 1) return null;

  const scale = Math.max(stage.width / vw, stage.height / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const offsetX = (stage.width - dispW) / 2;
  const offsetY = (stage.height - dispH) / 2;

  const left = (frame.left - stage.left - offsetX) / scale;
  const top = (frame.top - stage.top - offsetY) / scale;
  const right = (frame.right - stage.left - offsetX) / scale;
  const bottom = (frame.bottom - stage.top - offsetY) / scale;

  const x = (Math.max(0, left) / vw) * 100;
  const y = (Math.max(0, top) / vh) * 100;
  const w = (Math.min(vw, right) - Math.max(0, left)) / vw * 100;
  const h = (Math.min(vh, bottom) - Math.max(0, top)) / vh * 100;
  if (w < 2 || h < 2) return null;
  return { x, y, w, h };
}

function cornersToRect(corners) {
  if (!corners?.tl || !corners?.tr || !corners?.br || !corners?.bl) return null;
  const xs = [corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x];
  const ys = [corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y];
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  if (w < 2 || h < 2) return null;
  return { x, y, w, h };
}

function rectOverlapRatio(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const iw = Math.max(0, x2 - x1);
  const ih = Math.max(0, y2 - y1);
  const inter = iw * ih;
  if (inter <= 0) return { overlapInDetected: 0, coverOfGuide: 0 };
  const detArea = a.w * a.h;
  const guideArea = b.w * b.h;
  return {
    overlapInDetected: detArea > 0 ? inter / detArea : 0,
    coverOfGuide: guideArea > 0 ? inter / guideArea : 0
  };
}

function rectCenter(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLElement | null} frameEl
 * @param {HTMLElement | null} stageEl
 * @param {{ x:number,y:number,w:number,h:number }[]} history mutable recent rects
 * @returns {{ aligned: boolean, ready: boolean, rect: object | null }}
 */
export function sampleBizcardAlignment(video, frameEl, stageEl, history) {
  const guide = guideFrameToVideoPercent(video, frameEl, stageEl);
  if (!guide) return { aligned: false, ready: false, rect: null };

  const corners = detectDocumentLiteFromVideo(video, 240);
  const rect = cornersToRect(corners);
  if (!rect) {
    history.length = 0;
    return { aligned: false, ready: false, rect: null };
  }

  const aspect = rect.w / Math.max(0.01, rect.h);
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
    history.length = 0;
    return { aligned: false, ready: false, rect };
  }

  const { overlapInDetected, coverOfGuide } = rectOverlapRatio(rect, guide);
  const aligned = overlapInDetected >= MIN_OVERLAP && coverOfGuide >= MIN_COVER;

  if (!aligned) {
    history.length = 0;
    return { aligned: false, ready: false, rect };
  }

  history.push(rect);
  if (history.length > STABLE_FRAMES) history.shift();

  let ready = history.length >= STABLE_FRAMES;
  if (ready) {
    const c0 = rectCenter(history[0]);
    for (let i = 1; i < history.length; i += 1) {
      if (dist(c0, rectCenter(history[i])) > STABLE_MOVE_PCT) {
        ready = false;
        break;
      }
    }
    const sizeDrift =
      Math.abs(history[0].w - history[history.length - 1].w) +
      Math.abs(history[0].h - history[history.length - 1].h);
    if (sizeDrift > STABLE_MOVE_PCT * 1.5) ready = false;
  }

  return { aligned, ready, rect };
}
