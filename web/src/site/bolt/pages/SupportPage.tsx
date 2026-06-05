import { useState } from 'react';
import { HelpCircle, MessageCircle, ChevronDown, Send, ArrowLeft, CheckCircle } from 'lucide-react';

interface SupportPageProps {
  user?: { email: string } | null;
  onLoginClick?: () => void;
  onBack: () => void;
}

const FAQS = [
  {
    q: 'VLUE 인증은 어떤 절차로 진행되나요?',
    a: '신청서 제출 → 서류 검토 (3~5일) → 현장 또는 비대면 심사 → 인증 마크 발급 순으로 진행됩니다. 전체 기간은 영업일 기준 5~10일 이내입니다.',
  },
  {
    q: '보이스피싱 의심 번호를 신고하려면 어떻게 해야 하나요?',
    a: '홈 화면 검색창에 의심 번호 또는 기관명을 입력하시면 즉시 조회됩니다. 조회 결과 하단의 "신고하기" 버튼을 통해 VLUE 데이터베이스에 직접 신고하실 수 있습니다.',
  },
  {
    q: '디지털 명함은 어떻게 발급받나요?',
    a: '회원가입 후 베이직 이상의 요금제를 선택하시면 자동으로 발급됩니다. 스탠다드·프리미엄 등급은 각각 골드 애니메이션·홀로그램 디자인이 적용된 명함이 발급됩니다.',
  },
  {
    q: 'VLUE 스토어 입점은 어떻게 신청하나요?',
    a: '유료·기업 요금제 가입 후 VLUE 스토어 입점 신청 폼을 통해 신청하실 수 있습니다. 심사 후 최대 3영업일 이내에 입점이 완료됩니다.',
  },
  {
    q: '블루페이 안심결제 분쟁은 어떻게 처리되나요?',
    a: '구매자가 수령 확인 전 분쟁을 신청하면 VLUE 중재팀이 72시간 이내 개입하여 처리합니다. 판매자의 귀책으로 확인될 경우 전액 환불이 보장됩니다.',
  },
];

export default function SupportPage({ user, onLoginClick, onBack }: SupportPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && onLoginClick) { onLoginClick(); return; }
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-blue-tint pt-[60px]">
      <div className="bg-primary-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-semibold">VLUE 고객지원</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">고객지원</h1>
          <p className="text-white/70 text-sm">자주 묻는 질문과 1:1 문의를 통해 도움을 받으세요.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <section className="mb-12">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-gray-900 font-black text-lg" style={{ letterSpacing: '-0.03em' }}>자주 묻는 질문 (FAQ)</h2>
            <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full font-semibold border border-primary-100">{FAQS.length}건</span>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-black flex items-center justify-center mt-0.5">
                      Q
                    </span>
                    <span className="text-gray-900 font-semibold text-sm" style={{ wordBreak: 'keep-all' }}>{faq.q}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform mt-0.5 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center mt-0.5">
                        A
                      </span>
                      <p className="text-gray-600 text-sm leading-relaxed" style={{ wordBreak: 'keep-all' }}>{faq.a}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-gray-900 font-black text-lg" style={{ letterSpacing: '-0.03em' }}>1:1 문의</h2>
          </div>

          {submitted ? (
            <div className="card p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-gray-900 font-bold text-base mb-2">문의가 접수되었습니다</h3>
              <p className="text-gray-400 text-sm max-w-sm" style={{ wordBreak: 'keep-all' }}>
                영업일 기준 1~2일 이내에 이메일로 답변드립니다. 감사합니다.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              {!user && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-sm font-medium" style={{ wordBreak: 'keep-all' }}>
                  로그인이 필요한 서비스입니다. 문의 제출 시 로그인 화면으로 이동합니다.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 입력해 주세요"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="답변받을 이메일"
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">문의 유형</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">선택해 주세요</option>
                  <option>인증 신청 관련</option>
                  <option>VLUE 스토어 / 블루페이</option>
                  <option>디지털 명함</option>
                  <option>공식 채용</option>
                  <option>기타 문의</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">문의 내용</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="문의하실 내용을 자세히 입력해 주세요."
                  rows={5}
                  className="input-field resize-none"
                  required
                  style={{ wordBreak: 'keep-all' }}
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                <Send className="w-4 h-4" />
                문의 제출하기
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
