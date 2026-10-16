import MembershipModal from "./profile/MembershipModal.jsx";

/**
 * 마이페이지 — VLUÉ 멤버십 플랜 안내·변경 모달 (MembershipModal 래퍼)
 */
export default function MembershipUpgradeModal({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onMembershipTierChange,
  onRequestTierChange
}) {
  return (
    <MembershipModal
      open={open}
      onClose={onClose}
      membershipTier={membershipTier}
      isDarkMode={isDarkMode}
      onMembershipTierChange={onMembershipTierChange}
    />
  );
}
