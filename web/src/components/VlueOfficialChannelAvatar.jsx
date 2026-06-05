import VLUE_BRAND_LOGO from "../assets/vlue-shield-logo.svg?url";

/**
 * VLUE 공식 채널(알림함) 아바타 — 전용 규격
 *
 * - 채팅 목록·공식방 상단 등 **브랜드 타일**에만 사용합니다.
 * - **그라데이션/글로우 링 없음** — 일반 프로필처럼 테두리+배경만 둡니다.
 * - 앱·웹 Navbar 로고는 `VlueNavLogoMark.jsx`(여기 img 타일과 별도).
 */
export function VlueOfficialChannelAvatar({ variant = "list" }) {
  if (variant === "header") {
    return (
      <span className="mr-2 inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
        <img
          src={VLUE_BRAND_LOGO}
          alt=""
          draggable={false}
          className="vlue-chat-official-logo h-full w-full object-cover object-center"
        />
      </span>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center">
      <div className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-[10px] border border-blue-100 bg-white">
        <img src={VLUE_BRAND_LOGO} alt="" draggable={false} className="vlue-chat-official-logo h-full w-full object-cover object-center" />
      </div>
    </div>
  );
}
