import React, { useState } from 'react';

const FamilySafety = () => {
  const [isLinked, setIsLinked] = useState(false);

  // 시니어 특화 스타일
  const seniorTitleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    letterSpacing: '-0.02em'
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-100 overflow-hidden">
      {/* 상단 상태 바 */}
      <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
        <span className="font-bold flex items-center gap-2">
          🛡️ VLUE AI 보안팀
        </span>
        <span className="text-xs bg-blue-500 px-2 py-1 rounded-full animate-pulse">
          실시간 분석 중..
        </span>
      </div>

      <div className="p-6">
        <h2 style={seniorTitleStyle} className="mb-2">부모님 안심 결합 (효 구독)</h2>
        <p className="text-gray-600 mb-6 text-lg">부모님 폰을 보이스피싱으로부터 안전하게 지켜드립니다.</p>

        {!isLinked ? (
          <div className="space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-600 text-center mb-4">
                "아직 연결된 부모님 계정이 없습니다."
              </p>
              <button 
                onClick={() => setIsLinked(true)}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-md transition-all active:scale-95"
              >
                🎁 가족인증 링크 보내기
                <span className="block text-sm font-normal text-indigo-100 mt-1">인증 즉시 부모님 1개월 무료 이용권 발급</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 보안 리포트 시각화 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-green-50 rounded-2xl border border-green-200">
                <p className="text-green-700 font-bold mb-1">안전 상태</p>
                <p className="text-2xl font-black text-green-800">매우 안전함</p>
                <p className="text-sm text-green-600 mt-2">최근 위협 감지 없음</p>
              </div>
              
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200">
                <p className="text-blue-700 font-bold mb-1">대리 결제</p>
                <p className="text-xl font-black text-blue-800">결제 수단 공유 중</p>
                <p className="text-sm text-blue-600 mt-2">현대카드 **** 1234</p>
              </div>
            </div>

            {/* 시니어 특화 배너 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-orange-50 rounded-2xl text-center border border-orange-200 cursor-pointer hover:bg-orange-100">
                <span className="text-3xl block mb-2">🏠</span>
                <p className="font-bold text-orange-800">우리 동네<br/>복지 혜택</p>
              </div>
              <div className="p-6 bg-rose-50 rounded-2xl text-center border border-rose-200 cursor-pointer hover:bg-rose-100">
                <span className="text-3xl block mb-2">🏥</span>
                <p className="font-bold text-rose-800">시니어<br/>건강 알림</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilySafety;