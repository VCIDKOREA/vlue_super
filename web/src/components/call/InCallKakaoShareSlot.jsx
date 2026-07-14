/**
 * 통화 중 카톡 전달 슬롯 — 미회원+주소록일 때만 렌더 (그 외 null)
 */
export default function InCallKakaoShareSlot({ visible, description, label, busy, onShare }) {
  if (!visible) return null;

  return (
    <div className="incall-kakao-slot">
      <p className="incall-kakao-slot__desc">{description}</p>
      <button type="button" className="incall-kakao-slot__btn" disabled={busy} onClick={onShare}>
        {busy ? "전달 중…" : label || "카톡으로 쇼케이스 전달하기"}
      </button>
    </div>
  );
}
