import { PALETTE_LABEL } from "./spaceConfig.js";

const BOUNDARY_LABEL = {
  compact: "덩어리형",
  elongated: "긴 형태",
  irregular: "불규칙"
};

function percent(value) {
  return Math.round(Number(value) * 100);
}

const FLASH_STATUS_LABEL = {
  increased: "밝기 증가",
  decreased: "밝기 감소",
  unchanged: "의미 있는 변화 없음",
  unstable: "변화가 일정하지 않음",
  unmatched: "동일 후보로 대응하지 못함",
  uncertain: "대응이 불확실함",
  unsupported: "조명 비교 불가",
  failed: "측정 실패"
};

function appendFlashObservations(flash, observed, review, limits) {
  if (!flash || typeof flash !== "object") return;
  if (flash.status === "unsupported" || flash.status === "failed") {
    limits.push(flash.reason || "조명 비교 불가");
    return;
  }
  observed.push({
    label: "조명 반응 관찰",
    value: "가시광 토치의 OFF와 ON에서 화면 좌표 후보를 비교했습니다. 적외선 반응이 아니고 렌즈의 증거가 아닙니다."
  });
  const offCount = flash.off?.candidates?.length ?? 0;
  const onCount = flash.on?.candidates?.length ?? 0;
  observed.push({
    label: "조명 OFF 측정",
    value: `${flash.off?.at || "시각 없음"}, 후보 ${offCount}곳, 샘플 ${flash.off?.sampleCount ?? 0}장.`
  });
  observed.push({
    label: "조명 ON 측정",
    value: `${flash.on?.at || "시각 없음"}, 후보 ${onCount}곳, 샘플 ${flash.on?.sampleCount ?? 0}장.`
  });
  (flash.pairs || []).forEach((pair, index) => {
    const status = FLASH_STATUS_LABEL[pair.status] || pair.status || "기록 없음";
    const luma = Number.isFinite(pair.deltaMaxLuma) ? `최대 휘도 변화 ${pair.deltaMaxLuma}` : "최대 휘도 변화 없음";
    const area = Number.isFinite(pair.deltaArea) ? `면적 변화 ${pair.deltaArea}px` : "면적 변화 없음";
    observed.push({
      label: "광학 반사 후보 변화",
      value: `${index + 1}번 상태 ${status}. ${luma}, ${area}. 화면 좌표 비교입니다.`
    });
  });
  review.push("추가 확인이 필요한 후보입니다. 가시광 조명 반응만으로 렌즈 여부를 판단하지 않습니다.");
}

/** 실제 카메라 프레임에서만 관찰 문장을 만든다. 후보 표시는 렌즈 판정이 아니다. */
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
    const candidates = Array.isArray(reading.candidates) ? reading.candidates : [];
    if (reading.hotspot) {
      const x = percent(reading.hotspot.nx);
      const y = percent(reading.hotspot.ny);
      observed.push({
        label: "고휘도 집중점",
        value: `프레임 가로 ${x}%, 세로 ${y}% 부근입니다. 카메라 렌즈라고 단정하지 않습니다.`
      });
    } else if (reading.rejected === "wide-reflection") {
      observed.push({ label: "넓은 반사", value: "넓은 고휘도 영역이 있어 국소 집중점으로 잡지 않았습니다." });
    } else {
      observed.push({ label: "고휘도 집중점", value: "기준을 넘는 국소 고휘도 점은 없었습니다." });
    }
    if (reading.rejectedWide > 0 && reading.hotspot) {
      observed.push({
        label: "넓은 반사",
        value: "넓은 밝은 영역은 후보에서 빼고, 남은 작은 영역만 광학 반사 후보로 표시합니다."
      });
    }
    if (candidates.length) {
      observed.push({
        label: "광학 반사 후보",
        value: `${candidates.length}곳을 픽셀 연결 영역으로 표시했습니다. 렌즈로 판단하지 않습니다.${reading.limited ? " 상위 8곳만 유지했습니다." : ""}`
      });
      candidates.slice(0, 8).forEach((cand, index) => {
        const boundary = BOUNDARY_LABEL[cand.boundary] || "기록 없음";
        observed.push({
          label: `반사 후보 ${index + 1}`,
          value: `화면 ${percent(cand.nx)}%, ${percent(cand.ny)}%. 크기 ${cand.width}×${cand.height}px, 면적 ${cand.pixelArea}px, 종횡비 ${cand.aspect}, 원형에 가까운 정도 ${cand.circularity}, 경계 ${boundary}, 중심과 주변 밝기 차 ${cand.centerContrast}. 화면 좌표이며 렌즈로 판단하지 않습니다.`
        });
      });
    }
    const sustained = (Array.isArray(reading.tracks) ? reading.tracks : []).filter((track) => track?.status === "sustained");
    if (sustained.length) {
      const longest = sustained.reduce((max, track) => Math.max(max, Number(track.durationMs) || 0), 0);
      observed.push({
        label: "지속 관찰",
        value: `화면 좌표에서 약 ${Math.round(longest)}ms 이어진 반사 후보 ${sustained.length}곳입니다. 공간 위치를 추적한 값은 아닙니다.`
      });
    }
    review.push("형태와 밝기만으로 렌즈 여부를 판별할 수 없습니다.");
    if (reading.needZoom) review.push("같은 지점이 이어졌습니다. 2배 또는 3배로 다시 보면 판단에 도움이 됩니다.");
    appendFlashObservations(reading.flash, observed, review, limits);
  }
  const result = {
    moduleId: "hidden-cam",
    title: "HIDDEN CAM CHECK",
    at,
    observed,
    review,
    limits,
    actions: ["최종 확인은 사용자가 합니다.", "사람 얼굴이 포함되면 동의 없이 공유하지 않습니다."]
  };
  if (reading?.live && reading.flash) result.flash = reading.flash;
  return result;
}
