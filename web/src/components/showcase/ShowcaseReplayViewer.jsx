import { useEffect } from "react";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { readShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
import { scrapShowcaseToVault } from "../../lib/showcase/scrapShowcaseToVault.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseStylePreview from "./ShowcaseStylePreview.jsx";
import ShowcaseBgmMuteButton from "./ShowcaseBgmMuteButton.jsx";
import "./showcase-style-settings.css";

/**
 * 통화 종료 후 앱 내 기록에서 쇼케이스 재생 (릴스/쇼츠 BGM)
 */
export default function ShowcaseReplayViewer({
  phone,
  membershipTier = "free",
  styleConfig: styleConfigProp,
  card: cardProp,
  onSaved,
  className = ""
}) {
  const styleConfig = styleConfigProp || readShowcaseStyle();
  const card = cardProp || resolveVlueShowcaseCard({ membershipTier });
  const { setPlaybackPhase } = useShowcaseBgm();

  useEffect(() => {
    setPlaybackPhase("replay");
    if (typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
      window.__vlueUnlockShowcaseBgm();
    }
    return () => setPlaybackPhase("idle");
  }, [setPlaybackPhase]);

  const onSaveToVault = () => {
    const r = scrapShowcaseToVault({ card, showcaseStyle: styleConfig, phone: phone || card.phone });
    onSaved?.(r);
  };

  return (
    <div className={`showcase-replay ${className}`.trim()}>
      <div className="showcase-replay__header">
        <p className="showcase-replay__title">통화 쇼케이스 기록</p>
        <ShowcaseBgmMuteButton />
      </div>
      <ShowcaseStylePreview
        styleConfig={styleConfig}
        card={{ ...card, phone: phone || card.phone }}
        membershipTier={membershipTier}
        phase="replay"
      />
      <button type="button" className="showcase-replay__save-btn" onClick={onSaveToVault}>
        업체 저장하기 (BGM 포함)
      </button>
    </div>
  );
}
