import HomeBizDirectorySearch from "./HomeBizDirectorySearch.jsx";
import CallBigPushPreviewSection from "./CallBigPushPreviewSection.jsx";
import SponsorAdSwiper from "./SponsorAdSwiper.jsx";
import AnsimPatchButton from "./AnsimPatchButton.jsx";
import SecurityNewsFeed from "./SecurityNewsFeed.jsx";

/**
 * [VLUÉ] 메인 홈 화면 개편 구조:
 * 1. 상단 검색바 (#해시태그 · @아이디 · 상호 검색)
 * 2. 쇼케이스 프로필 미리보기 (VCID KOREA Showcase)
 * 3. 추천 스폰서 세로 AD 영역 (최대 6개 좌우 스와이프 캐러셀 & 브랜드 타겟팅, 일일 1회/24시간 캐싱 로테이션)
 * 4. TODAY 안심패치 버튼 (고정 블록형 필수 포함)
 * 5. 네이버 뉴스 API 연동 보안/생활정보 뉴스 피드 (중간 스폰서 카드 교차 삽입)
 */
export default function MainHomeScreen({
  membershipTier = "free",
  isDarkMode = false,
  categoryExposedPosts = [],
  onOpenBusinessRoom = null
}) {
  return (
    <div className="main-home-screen flex min-h-0 flex-1 flex-col overflow-y-auto px-0 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* 1. 상단 상호/해시태그/아이디 검색 바 */}
      <div data-home-anchor="search" className="shrink-0">
        <HomeBizDirectorySearch
          categoryExposedPosts={categoryExposedPosts}
          onOpenBusinessRoom={onOpenBusinessRoom}
        />
      </div>

      {/* 2. 쇼케이스 프로필 미리보기 */}
      <div data-home-anchor="showcase" className="shrink-0 px-2.5">
        <CallBigPushPreviewSection membershipTier={membershipTier} isDarkMode={isDarkMode} />
      </div>

      {/* 3. 추천 스폰서 세로 AD 광고 영역 (최대 6개 좌우 스와이프 캐러셀, 하루 1회/24시간 캐싱 로테이션) */}
      <SponsorAdSwiper className="mt-1" />

      {/* 4. TODAY 안심패치 버튼 (고정 블록형 필수 포함) */}
      <AnsimPatchButton className="my-1" isDarkMode={isDarkMode} />

      {/* 5. 네이버 뉴스 API 연동 보안/생활정보 뉴스 피드 (중간 스폰서 카드 교차 삽입) */}
      <SecurityNewsFeed isDarkMode={isDarkMode} />
    </div>
  );
}
