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
import { postCallEndAlimtalk } from "./alimtalkCallEndApi.js";
import { appendCallShowcaseHistory } from "./callShowcaseHistory.js";
import { readShowcaseStyle } from "./showcase/showcaseStyleStorage.js";

export function registerFamilyCallBridge() {
  if (typeof window === "undefined") return;

  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    onMissedCall: (payload) => {
      const p = payload || {};
      postMissedCall().catch(() => {});
      if (p.phone) {
        appendCallShowcaseHistory({
          phone: p.phone,
          name: p.name || p.peerName,
          direction: p.direction === "out" ? "out" : "in",
          durationSec: 0,
          callState: "missed",
          showcaseSnapshot: readShowcaseStyle()
        });
      }
    },
    /** 통화 종료: { phone, durationSec, direction: 'in'|'out', peerIsVlueMember?: boolean } */
    onCallEnded: (payload) => {
      const p = payload || {};
      postFamilyAlertCall(p).catch(() => {});
      postCallEndAlimtalk({
        peerPhone: p.phone,
        durationSec: p.durationSec,
        direction: p.direction
      }).catch(() => {});
      appendCallShowcaseHistory({
        phone: p.phone,
        name: p.name || p.peerName,
        direction: p.direction,
        durationSec: p.durationSec,
        callState: Number(p.durationSec) > 0 ? "ended" : "missed",
        showcaseSnapshot: p.showcaseSnapshot || readShowcaseStyle(),
        cardSnapshot: p.cardSnapshot || null,
        membershipTier: p.membershipTier || "free",
        verified: p.peerIsVlueMember !== false
      });
    }
  };
}
