/** Android productFlavor `kids` (com.vlue.kids) WebView User-Agent */
export const VLUE_KIDS_UA_TOKEN = "VLUE-Kids-App";

/** 전체이용가 자녀 앱. 결제·명함 생성·슬롯 결제창을 열지 않는다. */
export function isVlueKidsApp() {
  if (typeof navigator === "undefined") return false;
  return String(navigator.userAgent || "").includes(VLUE_KIDS_UA_TOKEN);
}
