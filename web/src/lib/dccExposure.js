/** 클라이언트 — DCC 검색·팔로우 노출 지정 여부 */

export function isDccExposureComplete(choice) {
  return (
    typeof choice?.phoneSearch === "boolean" &&
    typeof choice?.addressSearch === "boolean" &&
    typeof choice?.phoneFollow === "boolean" &&
    typeof choice?.addressFollow === "boolean"
  );
}

export function isMaskedPhoneDisplay(raw) {
  return String(raw || "").includes("*");
}

export function emptyDccExposureChoice() {
  return {
    phoneSearch: null,
    addressSearch: null,
    phoneFollow: null,
    addressFollow: null
  };
}
