/**
 * Android/iOS 네이티브 통화앱 연동용 브릿지.
 * 부재중(MISSED) 통화 1건당 postMissedCall() 호출.
 *
 * Android (예시):
 *   window.VlueFamilyBridge?.onMissedCall?.()
 * iOS WKWebView:
 *   webkit.messageHandlers.vlueFamilyMissedCall.postMessage({})
 */
import { postFamilyAlertCall, postMissedCall } from "./familyProtectionApi.js";

export function registerFamilyCallBridge() {
  if (typeof window === "undefined") return;

  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    onMissedCall: () => {
      postMissedCall().catch(() => {});
    },
    /** 통화 종료: { phone, durationSec, direction: 'in'|'out', peerIsVlueMember?: boolean } */
    onCallEnded: (payload) => {
      postFamilyAlertCall(payload || {}).catch(() => {});
    }
  };
}
