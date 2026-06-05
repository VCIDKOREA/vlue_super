import { useState } from 'react';
import { AlertTriangle, X, Phone, Shield, ChevronRight, Bell } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = () => {
    setReported(true);
    setTimeout(() => {
      setReported(false);
      setOpen(false);
    }, 2500);
  };

  return (
    <>
      <style>{`
        @keyframes sirenPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%        { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
        @keyframes emergencyIn {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .emergency-btn {
          animation: sirenPulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3">
        {open && (
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-72 overflow-hidden"
            style={{ animation: 'emergencyIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-bold text-sm">긴급 신고 / 피싱 경보</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!reported ? (
              <div className="p-4 space-y-2.5">
                <a
                  href="tel:112"
                  className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-700">경찰청 신고</div>
                      <div className="text-xs text-red-500">112 즉시 연결</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="tel:1332"
                  className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-orange-700">금융감독원</div>
                      <div className="text-xs text-orange-500">1332 금융사기 신고</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <button
                  onClick={handleReport}
                  className="w-full flex items-center justify-between p-3 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-primary-700">VLUE 피싱 경보</div>
                      <div className="text-xs text-primary-500">실시간 위험 번호 신고</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-center text-xs text-gray-400 pt-1" style={{ wordBreak: 'keep-all' }}>
                  보이스피싱 피해를 입었다면 즉시 신고하세요
                </p>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
                  <VlueBrandMark size={24} />
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">피싱 경보 신고 완료</p>
                <p className="text-xs text-gray-500" style={{ wordBreak: 'keep-all' }}>
                  신고하신 번호는 즉시 VLUE 경보 데이터베이스에 등록됩니다
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          className="emergency-btn w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-2xl transition-all active:scale-95"
          aria-label="긴급 신고"
        >
          {open ? (
            <X className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </>
  );
}
