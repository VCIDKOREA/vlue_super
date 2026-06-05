import { Lock, X, LogIn } from 'lucide-react';

interface LoginRequiredModalProps {
  onClose: () => void;
  onLogin: () => void;
}

export default function LoginRequiredModal({ onClose, onLogin }: LoginRequiredModalProps) {
  const handleLogin = () => {
    onClose();
    onLogin();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center relative"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'loginModalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes loginModalIn {
            from { opacity: 0; transform: scale(0.88) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-primary-500" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ wordBreak: 'keep-all' }}>
          로그인이 필요한 서비스입니다
        </h2>
        <p className="text-sm text-gray-500 mb-7 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
          VLUE 회원이라면 지금 바로 로그인하고
          <br />
          모든 서비스를 이용해보세요.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all duration-150 shadow-soft"
          >
            <LogIn className="w-4 h-4" />
            로그인 / 회원가입
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-all duration-150"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
