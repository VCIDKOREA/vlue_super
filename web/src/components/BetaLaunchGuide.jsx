import ScreenBackHeader from "./common/ScreenBackHeader";

export default function BetaLaunchGuide({ onGoMain }) {
  return (
    <section className="mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden">
      <ScreenBackHeader title="베타 운영 가이드" onBack={onGoMain} />
      <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[12px] text-gray-500">외부 테스터 운영 시 필요한 최소 체크리스트입니다.</p>

          <div className="mt-4 space-y-3 text-[12px]">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="font-black text-gray-900">1) 외부 접속 열기</p>
              <p className="mt-1 text-gray-700">Cloudflare Tunnel 또는 ngrok으로 `localhost:5173`를 HTTPS 공개 URL로 연결합니다.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="font-black text-gray-900">2) 베타 계정 분리</p>
              <p className="mt-1 text-gray-700">운영/관리자 계정 공유 금지, 테스트 전용 계정만 배포합니다.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="font-black text-gray-900">3) 핵심 플로우 점검</p>
              <p className="mt-1 text-gray-700">로그인, 채팅 읽음, Making 발송, 활동 자동업로드, 만료 자동삭제를 순서대로 확인합니다.</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="font-black text-blue-900">운영 문서 위치</p>
              <p className="mt-1 text-blue-800">`docs/BETA_TESTING_SETUP.md`</p>
              <p className="text-blue-800">`docs/MVP_QA_CHECKLIST.md`</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
