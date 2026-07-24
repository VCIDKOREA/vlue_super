import { useMemo, useState } from "react";
import { isVlueBrandAssetUrl } from "../lib/vlueAvatar.js";
import KakaoBlankAvatar from "./KakaoBlankAvatar.jsx";

/**
 * 사용자 프로필/로고 슬롯 — VLUE 공식 마크는 절대 표시하지 않고 카카오식 무지로 대체.
 */
export default function UserProfileAvatar({
  src = "",
  className = "",
  imgClassName = "h-full w-full object-cover object-top",
  blankClassName = "",
  alt = ""
}) {
  const [broken, setBroken] = useState(false);
  const safeSrc = useMemo(() => {
    const s = String(src || "").trim();
    if (!s || isVlueBrandAssetUrl(s)) return "";
    return s;
  }, [src]);

  if (!safeSrc || broken) {
    return <KakaoBlankAvatar className={blankClassName} />;
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={imgClassName}
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}
