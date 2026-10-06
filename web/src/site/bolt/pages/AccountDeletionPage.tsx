import { ArrowLeft } from 'lucide-react';

interface AccountDeletionPageProps {
  onBack: () => void;
}

/**
 * Google Play 데이터 보안 — 계정 삭제 요청용 공개 페이지
 * URL: https://www.vlue.kr/account-deletion
 */
export default function AccountDeletionPage({ onBack }: AccountDeletionPageProps) {
  return (
    <main className="min-h-screen bg-blue-tint pt-[60px] pb-16">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </button>
          <p className="text-[12px] font-bold uppercase tracking-wide text-blue-600">VCID KOREA · VLUÉ / VLUÉ Kids</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">계정 및 데이터 삭제 요청</h1>
          <p className="mt-2 text-sm text-slate-500">
            이 페이지는 Google Play 데이터 보안 요구사항에 따라 계정 삭제 방법을 안내합니다.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-slate-900">1. 앱 안에서 삭제 (권장)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            <li>VLUÉ 또는 VLUÉ Kids 앱에 로그인합니다.</li>
            <li>설정(또는 프로필) → <strong>회원 탈퇴</strong>를 선택합니다.</li>
            <li>
              안내에 따라 본인 확인을 완료합니다.
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                <li>VLUÉ(부모 앱): PASS 본인인증 또는 등록 이메일 인증, 또는 탈퇴 신청(24시간 유예)</li>
                <li>VLUÉ Kids: 자녀 계정 로그인 후 회원 탈퇴. 보호자(부모) 앱에서 가족 연결을 해지할 수도 있습니다.</li>
              </ul>
            </li>
            <li>탈퇴가 완료되면 계정과 관련 개인정보가 삭제됩니다.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-slate-900">2. 웹·이메일로 삭제 요청</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            앱에서 탈퇴가 어려운 경우, 아래 이메일로 계정 삭제를 요청해 주세요.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
            support@vlue.kr
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">메일에는 다음을 적어 주세요.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>앱 이름: VLUÉ 또는 VLUÉ Kids</li>
            <li>로그인 ID(또는 닉네임)</li>
            <li>등록 휴대폰 번호(있는 경우)</li>
            <li>제목: 계정 삭제 요청</li>
          </ul>
          <p className="mt-3 text-sm text-slate-700">
            요청을 확인한 뒤 합리적 기간 내(통상 수일 이내) 처리합니다. Kids 계정은 법정대리인(보호자) 확인이 필요할 수 있습니다.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-slate-900">3. 삭제·보관되는 데이터</h2>
          <p className="mt-3 text-sm font-bold text-slate-800">삭제되는 항목 (탈퇴 완료 시)</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>계정 프로필, 로그인 정보, 표시 이름</li>
            <li>위치 공유·가족 보호 연결 정보</li>
            <li>쇼케이스·채팅 등 서비스 이용 데이터(서비스 운영에 필요한 최소 범위 제외)</li>
          </ul>
          <p className="mt-4 text-sm font-bold text-slate-800">법령에 따라 일정 기간 보관될 수 있는 항목</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>전자상거래법 등: 계약·결제·소비자 분쟁 관련 기록(해당 시 최대 5년 등)</li>
            <li>부정 가입 방지용 CI·휴대폰 일방향 해시(식별 가능한 개인정보 제외)</li>
          </ul>
          <p className="mt-4 text-sm text-slate-700">
            탈퇴 신청(수동)은 24시간 유예 후 완료되며, 유예 기간 안에는 복구할 수 있습니다. 자세한 내용은{' '}
            <a href="https://www.vlue.kr/privacy" className="font-bold text-blue-600 underline">
              개인정보처리방침
            </a>
            을 참고하세요.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-slate-900">4. 개발자 정보</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>운영사: 주식회사 VCID KOREA</li>
            <li>앱: VLUÉ · VLUÉ Kids</li>
            <li>문의: support@vlue.kr</li>
            <li>주소: 서울 강남구 테헤란로 427</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
