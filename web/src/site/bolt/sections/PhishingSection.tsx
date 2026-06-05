import { PhoneOff, Eye, ShieldX, AlertTriangle, PhoneCall } from 'lucide-react';

const WARNINGS = [
  {
    icon: PhoneOff,
    title: '즉시 전화 끊기',
    desc: '금융기관·수사기관을 사칭하며 돈, 계좌, 앱 설치를 요구하면 즉시 전화를 끊으세요.',
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  {
    icon: Eye,
    title: '공식 번호로 확인',
    desc: '의심스러운 전화를 받으면 반드시 해당 기관의 공식 대표번호로 직접 재발신하여 사실 여부를 확인하세요.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: ShieldX,
    title: '앱 설치 절대 금지',
    desc: '문자·전화로 유도하는 어떤 앱도 절대 설치하지 마세요. 원격제어 앱(팀뷰어, 애니덱 등)은 즉시 삭제하세요.',
    color: 'text-primary-600',
    bg: 'bg-primary-50',
    border: 'border-primary-100',
  },
];

const TIPS = [
  '금융기관은 절대 전화로 비밀번호·OTP를 요구하지 않습니다',
  '검찰·경찰·금감원 사칭 전화는 100% 사기입니다',
  '가족 납치·사고 빙자 송금 요구 — 반드시 직접 확인하세요',
  '대출 승인 빙자 수수료 요구는 전형적인 사기 수법입니다',
  '의심스러우면 즉시 끊고 112 또는 1332에 신고하세요',
];

export default function PhishingSection() {
  return (
    <section className="bg-white py-20 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            보이스피싱 경각심
          </div>
          <h2 className="section-title">이렇게 당하지 마세요</h2>
          <p className="section-subtitle max-w-lg mx-auto">
            보이스피싱 피해는 누구에게나 발생할 수 있습니다.<br />
            아래 3가지 원칙만 기억하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {WARNINGS.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div key={title} className={`card p-6 ${bg} border ${border}`}>
              <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-gray-900 font-bold text-base mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <PhoneCall className="w-5 h-5 text-white" />
                <h3 className="text-white font-bold text-lg">보이스피싱 주요 수법 안내</h3>
              </div>
              <ul className="space-y-2.5">
                {TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-white/90 text-sm leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:text-right flex-shrink-0">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-white">
                <p className="text-white/70 text-xs mb-1">피해 신고 즉시 연락</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 justify-start lg:justify-end">
                    <span className="text-white/70 text-sm">금융감독원</span>
                    <span className="text-xl font-black font-inter">1332</span>
                  </div>
                  <div className="flex items-center gap-2 justify-start lg:justify-end">
                    <span className="text-white/70 text-sm">경찰청</span>
                    <span className="text-xl font-black font-inter">112</span>
                  </div>
                  <div className="flex items-center gap-2 justify-start lg:justify-end">
                    <span className="text-white/70 text-sm">인터넷진흥원</span>
                    <span className="text-xl font-black font-inter">118</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
