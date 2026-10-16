import ProfilePanel from "../ProfilePanel.jsx";
import MembershipModal from "./MembershipModal.jsx";

/**
 * [VLUÉ] 마이페이지 프로필 모달 (ProfileModal)
 * Apple · Toss 프리미엄 스타일 적용
 * - 모달 최상단(유저 프로필 및 이름 직하단)에 플랜 상태 및 플랜 변경 배치
 * - '등급' ➔ '플랜' 전면 통일
 * - 추천 리워드/정산 대시보드 목록 삭제 (관리자 전용 운영)
 * - 끊김 없는 원스톱 결제 퍼널(MembershipModal) 일체형 지원
 */
export const ProfileModal = ProfilePanel;
export { MembershipModal };
export default ProfilePanel;
