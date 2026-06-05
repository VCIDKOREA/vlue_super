import { Newspaper, MapPin, Smartphone } from "lucide-react";
import { VlueBrandMark } from "../../components/VlueBrandLogo.jsx";
import { appEntryUrl } from "../../lib/siteMode.js";

/** web2 홈 하단 섹션 (요약 버전) */
export function PhishingSection() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16">
      <div className="card p-8 md:p-10">
        <div className="mb-6 flex items-center gap-2">
          <VlueBrandMark size={24} />
          <h2 className="section-title">보이스피싱, 이렇게 예방하세요</h2>
        </div>
        <p className="section-subtitle max-w-2xl">
          VLUE는 공공기관·금융사·의료기관 데이터와 자체 인증 DB를 교차 검증해, 통화 전에
          사칭 여부를 빠르게 확인할 수 있도록 돕습니다.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            "기관명·전화번호·사업자번호 통합 검색",
            "VLUE 인증 기관 실시간 대조",
            "의심 번호 신고 및 가족 알림 연동",
          ].map((text) => (
            <li
              key={text}
              className="rounded-2xl border border-primary-100 bg-primary-50/40 px-4 py-4 text-sm font-semibold text-gray-700"
            >
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function NewsSection({ onNavigate }) {
  const items = [
    { title: "VLUE, 전국 지역협력사 네트워크 확대", date: "2026.05.28" },
    { title: "부모님 폰 보안 가족 케어 이벤트 안내", date: "2026.05.20" },
    { title: "블루쇼핑 인증 판매자 가이드 업데이트", date: "2026.05.12" },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary-600">
            <Newspaper className="h-5 w-5" />
            <span className="text-sm font-bold">기업뉴스</span>
          </div>
          <h2 className="section-title">VLUE 소식</h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("news")}
          className="text-sm font-semibold text-primary-600 hover:underline"
        >
          전체보기
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="card p-5">
            <p className="text-xs font-medium text-gray-400">{item.date}</p>
            <h3 className="mt-2 line-clamp-2 text-base font-bold text-gray-900">{item.title}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EventsSection({ onNavigate }) {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-8">
      <div className="card bg-gradient-to-br from-primary-50/60 to-blue-tint p-8 md:p-10">
        <div className="mb-2 flex items-center gap-2 text-primary-600">
          <MapPin className="h-5 w-5" />
          <span className="text-sm font-bold">지역별행사</span>
        </div>
        <h2 className="section-title">전국 지역협력사와 함께하는 안심 캠페인</h2>
        <p className="section-subtitle mt-2 max-w-xl">
          지역 단위 보이스피싱 예방 교육·인증 설명회를 진행합니다. 일정은 고객지원에서
          확인하세요.
        </p>
        <button type="button" onClick={() => onNavigate("events")} className="btn-primary mt-6">
          행사 일정 보기
        </button>
      </div>
    </section>
  );
}

export function DownloadSection() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 pb-24">
      <div className="card flex flex-col items-center gap-6 p-8 text-center md:flex-row md:text-left">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100">
          <Smartphone className="h-8 w-8 text-primary-600" />
        </div>
        <div className="flex-1">
          <h2 className="section-title">VLUE 앱으로 더 안전하게</h2>
          <p className="section-subtitle">
            실시간 알림, 가족 보안 모니터링, 블루쇼핑까지 — 모바일 앱에서 이용하세요.
          </p>
        </div>
        <a href={appEntryUrl("download")} className="btn-primary shrink-0 no-underline">
          앱 설치하기
        </a>
      </div>
    </section>
  );
}
