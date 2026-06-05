import { useState } from 'react';
import { Phone, CheckCircle, X, Volume2, MessageSquare, ArrowLeft, AlertTriangle } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import SensitiveRightClickGuard from '../components/SensitiveRightClickGuard';

interface BusinessCardPageProps {
  onBack: () => void;
}

type Grade = 'basic' | 'standard' | 'premium';
type DeviceType = 'galaxy' | 'iphone';

const CARD_EXAMPLES = [
  {
    name: '국민은행 대표번호',
    number: '1588-9999',
    org: '국민은행',
    dept: '고객상담센터',
    grade: 'premium' as Grade,
  },
  {
    name: '삼성서울병원',
    number: '02-3410-2114',
    org: '삼성서울병원',
    dept: '원무과',
    grade: 'standard' as Grade,
  },
  {
    name: '명경채 요양병원',
    number: '02-1234-5678',
    org: '명경채 요양병원',
    dept: '입원상담팀',
    grade: 'basic' as Grade,
  },
];

function GalaxyReceiveScreen({
  name, number, org, dept, grade,
}: { name: string; number: string; org: string; dept: string; grade: Grade }) {
  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 40%, #0F172A 100%)',
        borderRadius: '2.5rem',
        aspectRatio: '9/19.5',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" />

      <div className="absolute inset-0 flex flex-col items-center justify-between py-8 px-4 z-10">
        <div className="text-center mt-4">
          <div className="text-white/50 text-xs mb-1 font-medium tracking-wider">수신 전화</div>
          <div className="text-white/70 text-xs">{number}</div>
        </div>

        <div className="w-full flex flex-col items-center">
          {grade !== 'basic' ? (
            <CardOverlay org={org} dept={dept} grade={grade} />
          ) : (
            <BasicCard org={org} dept={dept} number={number} />
          )}
        </div>

        <div className="w-full">
          <p className="text-white/40 text-center text-xs mb-4" style={{ wordBreak: 'keep-all' }}>밀어서 응답</p>
          <div className="flex justify-between items-center px-4">
            <button className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <X className="w-6 h-6 text-white" strokeWidth={2.5} />
            </button>
            <div className="flex flex-col items-center gap-1">
              <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-white/70" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white/70" />
              </button>
            </div>
            <button className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <Phone className="w-6 h-6 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IphoneReceiveScreen({
  number, org, dept, grade,
}: { number: string; org: string; dept: string; grade: Grade }) {
  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        borderRadius: '3rem',
        aspectRatio: '9/19.5',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)',
        border: '2.5px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-b-3xl z-20" />

      <div className="absolute inset-0 flex flex-col items-center py-10 px-4 z-10">
        <div className="text-center mb-6 mt-2">
          <div className="text-white/50 text-xs mb-2 tracking-widest uppercase font-semibold">INCOMING CALL</div>
          <div className="text-white text-2xl font-black mb-1" style={{ letterSpacing: '-0.02em' }}>{number}</div>
          <div className="text-white/60 text-sm">알 수 없음</div>
        </div>

        <div className="w-full flex-1 flex items-center justify-center">
          {grade !== 'basic' ? (
            <CardOverlay org={org} dept={dept} grade={grade} />
          ) : (
            <BasicCard org={org} dept={dept} number={number} />
          )}
        </div>

        <div className="w-full">
          <div className="flex justify-between items-center px-4 mt-4">
            <div className="flex flex-col items-center gap-1">
              <button className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl">
                <Phone className="w-7 h-7 text-white rotate-135" strokeWidth={2} style={{ transform: 'rotate(135deg)' }} />
              </button>
              <span className="text-white/60 text-xs">거절</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl">
                <Phone className="w-7 h-7 text-white" strokeWidth={2} />
              </button>
              <span className="text-white/60 text-xs">수락</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BasicCard({ org, dept, number }: { org: string; dept: string; number: string }) {
  return (
    <div
      className="w-4/5 rounded-2xl p-4 text-center"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(100,180,255,0.4)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 0 20px rgba(100,180,255,0.15)',
      }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <VlueBrandMark size={16} />
        <span className="text-primary-300 text-xs font-bold">VLUE 인증기관</span>
      </div>
      <div className="text-white font-black text-base mb-0.5" style={{ letterSpacing: '-0.02em' }}>{org}</div>
      <div className="text-white/60 text-xs">{dept}</div>
      <div className="text-primary-300 text-xs mt-1 font-mono">{number}</div>
    </div>
  );
}

function CardOverlay({ org, dept, grade }: { org: string; dept: string; grade: Grade }) {
  if (grade === 'standard') {
    return (
      <div className="w-4/5 relative">
        <style>{`
          @keyframes goldRotate {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .gold-border-wrap {
            position: absolute;
            inset: -3px;
            border-radius: 18px;
            overflow: hidden;
          }
          .gold-border-spin {
            position: absolute;
            inset: -50%;
            background: conic-gradient(
              from 0deg,
              transparent 0deg 270deg,
              #F59E0B 270deg 300deg,
              #FDE68A 300deg 330deg,
              #F59E0B 330deg 360deg
            );
            animation: goldRotate 2s linear infinite;
          }
          .gold-border-inner {
            position: absolute;
            inset: 3px;
            border-radius: 15px;
            background: rgba(15,23,42,0.95);
          }
        `}</style>
        <div className="gold-border-wrap">
          <div className="gold-border-spin" />
          <div className="gold-border-inner" />
        </div>
        <div
          className="relative z-10 rounded-2xl p-4 text-center"
          style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <VlueBrandMark size={16} />
            <span className="text-amber-300 text-xs font-bold">VLUE 인증기관</span>
          </div>
          <div className="text-white font-black text-base mb-0.5">{org}</div>
          <div className="text-white/60 text-xs">{dept}</div>
          <div className="flex items-center justify-center gap-1 mt-2">
            <CheckCircle className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 text-xs font-semibold">스탠다드 인증</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-4/5 relative">
      <style>{`
        @keyframes hologramRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hologramPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        .hologram-border-wrap {
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          overflow: hidden;
        }
        .hologram-border-spin {
          position: absolute;
          inset: -50%;
          background: conic-gradient(
            from 0deg,
            #FF0080, #FF8C00, #FFD700, #00FF88, #00BFFF, #8B5CF6, #FF0080
          );
          animation: hologramRotate 3s linear infinite;
        }
        .hologram-border-inner {
          position: absolute;
          inset: 4px;
          border-radius: 16px;
          background: rgba(10,15,30,0.97);
        }
        .hologram-card {
          animation: hologramPulse 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hologram-text {
          background: linear-gradient(90deg, #FF0080, #FF8C00, #FFD700, #00FF88, #00BFFF, #FF0080);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>
      <div className="hologram-border-wrap">
        <div className="hologram-border-spin" />
        <div className="hologram-border-inner" />
      </div>
      <div
        className="relative z-10 rounded-2xl p-4 text-center hologram-card"
        style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <VlueBrandMark size={16} />
          <span className="hologram-text text-xs font-black">VLUE 프리미엄 인증</span>
        </div>
        <div className="text-white font-black text-base mb-0.5">{org}</div>
        <div className="text-white/60 text-xs">{dept}</div>
        <div className="flex items-center justify-center gap-1 mt-2">
          <CheckCircle className="w-3 h-3 text-cyan-400" />
          <span className="hologram-text text-xs font-bold">홀로그램 인증</span>
        </div>
      </div>
    </div>
  );
}

function LetteringCompare({ number }: { number: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1A1A2E 0%, #0F172A 100%)',
            border: '2px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div className="px-4 py-5 text-center">
            <div className="text-white/40 text-xs mb-3 font-medium tracking-wider">수신 전화</div>
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 text-xs font-bold">스팸 주의</span>
              </div>
              <div className="text-white/50 text-xs font-mono">{number}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-white/50 text-lg">?</span>
            </div>
            <div className="flex justify-between mt-3 px-2">
              <div className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/80 flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
        <span className="text-xs text-red-500 font-semibold mt-2">BEFORE</span>
        <span className="text-xs text-gray-400">일반 수신 화면</span>
      </div>

      <div className="flex flex-col items-center">
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
            border: '2px solid rgba(49,130,246,0.3)',
            boxShadow: '0 8px 24px rgba(49,130,246,0.2)',
          }}
        >
          <div className="px-4 py-5 text-center">
            <div className="text-white/40 text-xs mb-3 font-medium tracking-wider">수신 전화</div>
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: 'rgba(49,130,246,0.15)', border: '1px solid rgba(49,130,246,0.4)' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <VlueBrandMark size={14} />
                <span className="text-primary-300 text-xs font-bold">[VLUE 인증기관]</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <div
                  className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#3182F6' }}
                >
                  <VlueBrandMark size={6} />
                </div>
                <div className="text-white text-xs font-black">국민은행</div>
              </div>
              <div className="text-white/50 text-xs font-mono mt-0.5">{number}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center mx-auto mb-3">
              <VlueBrandMark size={20} />
            </div>
            <div className="flex justify-between mt-3 px-2">
              <div className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                <Phone className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
        <span className="text-xs text-primary-500 font-semibold mt-2">AFTER</span>
        <span className="text-xs text-gray-400">VLUE 인증 화면</span>
      </div>
    </div>
  );
}

export default function BusinessCardPage({ onBack }: BusinessCardPageProps) {
  const [selectedCard, setSelectedCard] = useState(0);
  const [deviceType, setDeviceType] = useState<DeviceType>('galaxy');
  const [activeTab, setActiveTab] = useState<'card' | 'lettering'>('card');

  const card = CARD_EXAMPLES[selectedCard];

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <SensitiveRightClickGuard className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.03em', wordBreak: 'keep-all' }}>
            VLUE 디지털 명함
          </h1>
          <p className="text-gray-500 text-sm" style={{ wordBreak: 'keep-all' }}>
            실제 기기 수신 화면에 나타나는 인증 명함을 미리 확인하세요
          </p>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          {[
            { key: 'card', label: '등급별 명함' },
            { key: 'lettering', label: '레터링 서비스' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === key ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'card' && (
          <>
            <div className="flex gap-2 mb-4">
              {CARD_EXAMPLES.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCard(i)}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-2xl border transition-all ${
                    selectedCard === i
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                  style={{ wordBreak: 'keep-all' }}
                >
                  {c.grade === 'basic' ? '기본형' : c.grade === 'standard' ? '스탠다드' : '프리미엄'}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              {(['galaxy', 'iphone'] as DeviceType[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDeviceType(d)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    deviceType === d ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {d === 'galaxy' ? 'Galaxy' : 'iPhone'}
                </button>
              ))}
            </div>

            <div className="flex justify-center mb-6">
              <div style={{ width: 'min(260px, 65vw)' }}>
                {deviceType === 'galaxy' ? (
                  <GalaxyReceiveScreen
                    name={card.name}
                    number={card.number}
                    org={card.org}
                    dept={card.dept}
                    grade={card.grade}
                  />
                ) : (
                  <IphoneReceiveScreen
                    number={card.number}
                    org={card.org}
                    dept={card.dept}
                    grade={card.grade}
                  />
                )}
              </div>
            </div>

            <div className="card p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  card.grade === 'premium' ? 'bg-gradient-to-br from-cyan-500 to-purple-600' :
                  card.grade === 'standard' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                  'bg-primary-100'
                }`}>
                  <VlueBrandMark size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{card.org} · {card.dept}</div>
                  <div className="text-xs text-gray-500">{card.number}</div>
                </div>
                <div className="ml-auto">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    card.grade === 'premium' ? 'bg-gradient-to-r from-cyan-100 to-purple-100 text-purple-700' :
                    card.grade === 'standard' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-primary-50 text-primary-700 border border-primary-100'
                  }`}>
                    {card.grade === 'basic' ? '기본형' : card.grade === 'standard' ? '골드 애니메이션' : '홀로그램'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'lettering' && (
          <div>
            <div className="mb-5">
              <p className="text-sm text-gray-600 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                VLUE 인증 기관의 전화번호를 수신할 때, 일반 스팸 경고 대신{' '}
                <strong className="text-primary-600">VLUE 인증 마크와 기관명</strong>이 즉시 표시됩니다.
              </p>
            </div>
            <LetteringCompare number="1588-9999" />
            <div className="card p-4 mt-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3">레터링 서비스 혜택</h4>
              <div className="space-y-2">
                {[
                  '수신 즉시 기관명·인증 마크 표시',
                  '스팸 경고 없이 안심 수신 가능',
                  '사칭 전화 자동 구분 및 경보',
                  '스탠다드/프리미엄 요금제 기본 포함',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700" style={{ wordBreak: 'keep-all' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SensitiveRightClickGuard>
    </div>
  );
}
