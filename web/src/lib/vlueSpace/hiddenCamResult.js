import { PALETTE_LABEL } from "./spaceConfig.js";

/** 실제 카메라 프레임에서만 관찰 문장을 만든다. */
export function buildHiddenCamResult({ config, reading, cameraError, at = new Date().toISOString() }) {
  const observed = [];
  const review = [];
  const limits = [];
  if (!reading?.live) {
    limits.push(cameraError || "카메라 프레임을 받지 못했습니다. 측정값을 만들지 않았습니다.");
  } else {
    observed.push({
      label: "광학 프리뷰",
      value: `${PALETTE_LABEL[config?.palette] || "선택 필터"}를 받은 프레임에 적용했습니다. 열화상 장비의 측정값이 아닙니다.`
    });
    if (reading.rejected === "wide-reflection") {
      observed.push({ label: "넓은 반사", value: "넓은 고휘도 영역이 있어 국소 집중점으로 잡지 않았습니다." });
    } else if (reading.hotspot) {
      const x = Math.round(Number(reading.hotspot.nx) * 100);
      const y = Math.round(Number(reading.hotspot.ny) * 100);
      observed.push({
        label: "고휘도 집중점",
        value: `프레임 가로 ${x}%, 세로 ${y}% 부근입니다. 카메라 렌즈라고 단정하지 않습니다.`
      });
    } else {
      observed.push({ label: "고휘도 집중점", value: "기준을 넘는 국소 고휘도 점은 없었습니다." });
    }
    if (reading.needZoom) review.push("같은 지점이 이어졌습니다. 2배 또는 3배로 다시 보면 판단에 도움이 됩니다.");
  }
  return {
    moduleId: "hidden-cam",
    title: "HIDDEN CAM CHECK",
    at,
    observed,
    review,
    limits,
    actions: ["최종 확인은 사용자가 합니다.", "사람 얼굴이 포함되면 동의 없이 공유하지 않습니다."]
  };
}
