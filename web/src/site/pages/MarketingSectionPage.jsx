import { MARKETING_VIEW_LABELS } from "../siteViews.js";
import { appEntryUrl } from "../../lib/siteMode.js";

const SECTION_COPY = {
  about: {
    title: "서비스소개",
    body: "웹(www)은 통합검색·AI엑셀에디터, 앱(PC·모바일)은 리모컨·실시간 알림·하드웨어 제어를 담당합니다. 쇼핑·결제·메일·자료실은 @vlue/api로 웹·앱 동일 데이터가 실시간 동기화됩니다.",
  },
  news: { title: "기업뉴스", body: "VLUE의 공지·보도자료·업데이트 소식이 이곳에 표시됩니다." },
  events: { title: "지역별행사", body: "전국 지역협력사와 함께하는 안심 캠페인 일정입니다." },
  support: { title: "고객지원", body: "문의·FAQ·원격 지원은 VLUE 앱 또는 고객센터를 이용해 주세요." },
  resources: { title: "자료실", body: "교육 자료, 가이드, 정책 문서를 제공합니다." },
  pricing: {
    title: "인증신청(요금제)",
    body: "무료(일반)·유료·기업(B2B) 멤버십 비교와 VLUER 추천(12개월 30%→15% 영구·추천인 15%→5% 영구) 안내입니다. 가입·결제는 VLUE 앱에서 진행합니다.",
  },
  jobs: { title: "구인구직", body: "VLUE 파트너·지역협력 채용 공고가 연동됩니다." },
  shopping: {
    title: "블루쇼핑",
    body: "인증 판매자만 입점하는 안전 쇼핑은 VLUE 앱에서 이용하세요.",
  },
  mail: { title: "보안메일", body: "보안 예약·암호화 메일 기능은 앱과 연동됩니다." },
  search: { title: "검색 결과", body: "검색 API 연동 후 결과 목록이 표시됩니다." },
  download: { title: "APP 다운로드", body: "iOS·Android 앱 설치 링크로 이동합니다." },
};

export default function MarketingSectionPage({ viewId, searchQuery, onNavigate }) {
  const copy = SECTION_COPY[viewId] || {
    title: MARKETING_VIEW_LABELS[viewId] || viewId,
    body: "콘텐츠를 준비 중입니다.",
  };

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-6 py-16 pb-24">
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="mb-8 text-sm font-semibold text-primary-600 hover:underline"
      >
        ← 홈으로
      </button>
      <h1 className="section-title">{copy.title}</h1>
      <p className="section-subtitle mt-4">{copy.body}</p>
      {viewId === "search" && searchQuery && (
        <p className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-800">
          검색어: <strong>{searchQuery}</strong>
        </p>
      )}
      <div className="mt-10 flex flex-wrap gap-3">
        <a href={appEntryUrl()} className="btn-primary no-underline">
          앱·PC 설치 안내
        </a>
        <button type="button" onClick={() => onNavigate("home")} className="btn-secondary">
          홈으로 돌아가기
        </button>
      </div>
    </main>
  );
}
