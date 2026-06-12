import { guessAspectRatioFromUrl } from "./embedVideo.js";

/** video 요소 loadedmetadata로 실제 가로/세로 비율 판별 */
export function probeVideoAspectRatio(videoUrl) {
  return new Promise((resolve) => {
    const hint = guessAspectRatioFromUrl(videoUrl);
    if (typeof document === "undefined") {
      resolve(hint);
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(hint);
    }, 4000);

    video.addEventListener(
      "loadedmetadata",
      () => {
        window.clearTimeout(timer);
        const w = video.videoWidth || 16;
        const h = video.videoHeight || 9;
        const ratio = w / h;
        cleanup();
        resolve(ratio < 0.85 ? "9:16" : "16:9");
      },
      { once: true }
    );

    video.addEventListener(
      "error",
      () => {
        window.clearTimeout(timer);
        cleanup();
        resolve(hint);
      },
      { once: true }
    );

    video.src = videoUrl;
  });
}
