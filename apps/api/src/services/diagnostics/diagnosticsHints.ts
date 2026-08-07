/** Big Push fail step → 수정 후보 함수 (하드코딩 힌트) */
const BIG_PUSH_FIX_HINTS: Record<number, { file: string; functionName: string; note: string }> = {
  1: {
    file: "LetteringCallReceiver.kt / VlueInCallService.kt",
    functionName: "onReceive / onCallAdded",
    note: "수신 감지 자체 실패 — PHONE_STATE 또는 InCall 바인딩 확인"
  },
  2: {
    file: "LetteringCallMonitorService.kt",
    functionName: "handleState",
    note: "모니터 서비스 미기동 또는 lettering_enabled=false"
  },
  3: {
    file: "LetteringCallCoordinator.kt",
    functionName: "startOverlayService / onRinging",
    note: "오버레이 권한·debounce·lettering 플래그 확인"
  },
  4: {
    file: "CallOverlayService.kt",
    functionName: "onCreate",
    note: "Foreground Service 기동 실패"
  },
  5: {
    file: "CallOverlayService.kt",
    functionName: "onStartCommand",
    note: "서비스 시작 후 showOverlay 미호출"
  },
  6: {
    file: "CallOverlayService.kt",
    functionName: "showOverlay",
    note: "showOverlay 진입 전 조기 return"
  },
  7: {
    file: "CallOverlayService.kt",
    functionName: "showOverlay",
    note: "addView CALL까지 도달했으나 SUCCESS 전 중단"
  },
  8: {
    file: "CallOverlayService.kt",
    functionName: "showOverlay (WindowManager.addView)",
    note: "addView FAIL — BadTokenException / 권한 / token"
  },
  9: {
    file: "LetteringOverlayHost.jsx",
    functionName: "mount / LetteringJavascriptBridge",
    note: "WebView React 루트 미마운트"
  },
  10: {
    file: "LetteringOverlayHost.jsx",
    functionName: "Showcase visible effect",
    note: "React 마운트됐으나 Showcase Visible 미도달"
  },
  11: {
    file: "LetteringCallCoordinator.kt",
    functionName: "onCallEnded",
    note: "통화 종료 이벤트만 기록 — 표시 실패와 무관할 수 있음"
  }
};

export function suggestedFixHint(feature: string, failStep: number | null | undefined) {
  if (!failStep || failStep < 1) return null;
  if (feature === "BIG_PUSH") {
    return BIG_PUSH_FIX_HINTS[failStep] || null;
  }
  return {
    file: "(unmapped feature)",
    functionName: `feature=${feature} step=${failStep}`,
    note: "해당 feature용 힌트 맵 미등록"
  };
}

export { BIG_PUSH_FIX_HINTS };
