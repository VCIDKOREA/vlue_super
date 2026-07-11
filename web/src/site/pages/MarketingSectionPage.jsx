import { MARKETING_VIEW_LABELS } from "../siteViews.js";
import { appEntryUrl } from "../../lib/siteMode.js";
import { isWebPcDownloadEnabled } from "../../lib/v1ReleaseScope.js";

function aboutSectionBody() {
  const webPart = "웹(www)은 통합검색·V1 요금 안내";
  const appPart = isWebPcDownloadEnabled()
    ? "앱(PC·모바일)은 블루 쇼케이스·디지털 인증명함·가족보호"
    : "모바일 앱은 블루 쇼케이스·디지털 인증명함·가족보호";
  return `${webPart}, ${appPart}를 담당합니다. 개인케이스는 웹·앱 동일 구성(명함저장·저장된케이스·내문서)으로 @vlue/api 계정 데이터와 동기화됩니다.`;
}

const SECTION_COPY = {
  about: {
    title: "서비스소개",
    get body() {
      return aboutSectionBody();
    },
  },
  news: { title: "기업뉴스", body: "VLUE의 공지·보도자료·업데이트 소식이 이곳에 표시됩니다." },
  events: { title: "지역별행사", body: "전국 지역협력사와 함께하는 안심 캠페인 일정입니다." },
  support: {
    title: "고객지원",
    body: "V1 FAQ·1:1 문의는 쇼케이스·인증명함·가족보호·개인케이스·요금제 중심으로 안내합니다.",
  },
  resources: {
    title: "개인케이스",
    body: "앱과 동일하게 명함저장·저장된케이스·내문서를 제공합니다.",
  },
  pricing: {
    title: "인증신청(요금제)",
    body: "V1 요금제: 무료·유료(월 9,900원·정가 28,300원 65% 특별 할인)·B2B 풀 패키지(직원 회선 이벤트 5,200원)·SOHO 영업 송출(+4,200원). 쇼케이스·디지털 인증명함·가족보호 중심. 가입·결제는 VLUE 앱에서 진행합니다.",
  },
  jobs: { title: "구인구직", body: "VLUE 파트너·지역협력 채용 공고가 연동됩니다." },
  shopping: {
    title: "블루쇼핑",
    body: "쇼핑·스토어는 V1에서 제공하지 않습니다. 블루 쇼케이스·디지털 인증명함·가족보호를 이용해 주세요.",
  },
  mail: { title: "보안메일", body: "보안 메일은 V1에서 제공하지 않습니다." },
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
