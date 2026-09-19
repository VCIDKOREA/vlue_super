/**
 * 통화 중 전달 슬롯 — 비회원일 때만 렌더
 */
export default function InCallKakaoShareSlot({ visible, description, label, busy, onShare }) {
  if (!visible) return null;

  return (
    <div className="incall-kakao-slot">
      <p className="incall-kakao-slot__desc">{description}</p>
      <button type="button" className="incall-kakao-slot__btn" disabled={busy} onClick={onShare}>
        {busy ? "전달 중…" : label || "쇼케이스 전달하기"}
      </button>
    </div>
  );
}
