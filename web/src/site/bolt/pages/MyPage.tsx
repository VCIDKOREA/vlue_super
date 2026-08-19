import { useState } from 'react';
import { Shield, CheckCircle, Clock, Camera, Grid2x2 as Grid, Plus, Star, MapPin, Bell, ChevronRight, Award, Lock, Upload, Video, AlertTriangle, TrendingUp, Eye, Heart, MessageCircle, Bookmark, User, Settings, LogOut } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import { isWebViewV1Enabled } from '../../../lib/v1ReleaseScope.js';

interface MyPageProps {
  user: { email: string; grade?: 'basic' | 'certified' };
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const FEED_ITEMS = [
  {
    id: 1, type: 'product', img: 'https://images.pexels.com/photos/305565/pexels-photo-305565.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '요양병원 입원 상담', likes: 128, certified: true,
  },
  {
    id: 2, type: 'security', img: 'https://images.pexels.com/photos/5935794/pexels-photo-5935794.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '보이스피싱 경보', likes: 342, certified: false, alert: true,
  },
  {
    id: 3, type: 'product', img: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '공유오피스 월 이용권', likes: 204, certified: true,
  },
  {
    id: 4, type: 'news', img: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'VLUE × 경찰청 MOU', likes: 89, certified: false,
  },
  {
    id: 5, type: 'product', img: 'https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '보안 교육 패키지', likes: 67, certified: true,
  },
  {
    id: 6, type: 'security', img: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'API 연동 서비스', likes: 156, certified: true,
  },
  {
    id: 7, type: 'product', img: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '스마트 보안 컨설팅', likes: 45, certified: true,
  },
  {
    id: 8, type: 'news', img: 'https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '예방 교육 행사', likes: 93, certified: false,
  },
  {
    id: 9, type: 'product', img: 'https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: '사무용 에르고의자', likes: 189, certified: false,
  },
];

type CertStep = 'idle' | 'pass' | 'id' | 'face' | 'review' | 'done';

export default function MyPage({ user, onNavigate, onLogout }: MyPageProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'cert' | 'security'>('feed');
  const [certStep, setCertStep] = useState<CertStep>('idle');
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());

  const isCertified = user.grade === 'certified';
  const reviewProgress = 30;
  const isUnderReview = certStep === 'review';

  const username = user.email.split('@')[0];

  const toggleLike = (id: number) => {
    setLikedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <div className="max-w-2xl mx-auto">

        <div className="bg-white border-b border-gray-100">
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg"
                  style={{
                    background: isCertified
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                      : 'linear-gradient(135deg, #3182F6, #1D4ED8)',
                  }}
                >
                  {username.charAt(0).toUpperCase()}
                </div>
                {isCertified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow">
                    <Award className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
                {!isCertified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center shadow">
                    <User className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-black text-gray-900 truncate" style={{ letterSpacing: '-0.02em' }}>
                    {username}
                  </h2>
                  {isCertified ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700">
                      <Award className="w-3 h-3" /> 신뢰인증
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-500">
                      <User className="w-3 h-3" /> 일반회원
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2 truncate">{user.email}</p>

                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-700 font-medium">최근 로그인: 서울 강남 (정상)</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-lg font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>9</div>
                <div className="text-xs text-gray-400">게시물</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>142</div>
                <div className="text-xs text-gray-400">팔로워</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>38</div>
                <div className="text-xs text-gray-400">팔로잉</div>
              </div>
              <div className="ml-auto flex items-end">
                <button
                  onClick={() => onNavigate('pricing')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-xl transition-all shadow-soft"
                >
                  <Star className="w-3 h-3" />
                  요금제 업그레이드
                </button>
              </div>
            </div>
          </div>

          {isUnderReview && (
            <div className="mx-5 mb-4 p-4 bg-primary-50 border border-primary-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-bold text-primary-700" style={{ wordBreak: 'keep-all' }}>AI 신뢰인증 검토 중</span>
                </div>
                <span className="text-xs font-bold text-primary-500">{reviewProgress}%</span>
              </div>
              <div className="w-full h-2 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700"
                  style={{ width: `${reviewProgress}%` }}
                />
              </div>
              <p className="text-xs text-primary-600 mt-2" style={{ wordBreak: 'keep-all' }}>
                현재 일반 회원 권한으로 모든 서비스를 정상 이용 중입니다 (약 5~10일 소요)
              </p>
            </div>
          )}

          {!isCertified && !isUnderReview && (
            <div className="mx-5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800" style={{ wordBreak: 'keep-all' }}>신뢰인증 회원으로 상향 신청</p>
                  <p className="text-xs text-amber-600" style={{ wordBreak: 'keep-all' }}>더 많은 혜택과 프리미엄 명함을 받으세요</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('cert')}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl whitespace-nowrap transition-all"
              >
                신청
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex border-t border-gray-100">
            {[
              { key: 'feed', label: '피드', icon: Grid },
              { key: 'cert', label: '인증관리', icon: Shield },
              { key: 'security', label: '보안리포트', icon: TrendingUp },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                  activeTab === key
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'feed' && (
          <div className="p-2">
            <div className="grid grid-cols-3 gap-0.5">
              {FEED_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square overflow-hidden cursor-pointer group"
                  style={{ borderRadius: '4px' }}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="w-4 h-4" strokeWidth={2.5} />
                      <span className="text-xs font-bold">{likedItems.has(item.id) ? item.likes + 1 : item.likes}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                      <span className="text-xs font-bold">{Math.floor(item.likes / 5)}</span>
                    </div>
                  </div>
                  {item.certified && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shadow">
                      <CheckCircle className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                  {item.alert && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
                      <AlertTriangle className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                    className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Bookmark className={`w-4 h-4 ${likedItems.has(item.id) ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cert' && (
          <div className="p-5 space-y-4">
            {certStep === 'idle' && (
              <>
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm" style={{ wordBreak: 'keep-all' }}>신뢰인증 회원 상향 신청</h3>
                      <p className="text-xs text-gray-500">AI 기반 본인 인증 절차를 진행합니다</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 mb-5">
                    {[
                      { step: 1, label: 'PASS / 소셜 인증서 선택', icon: Shield, done: false },
                      { step: 2, label: '신분증 제출', icon: Camera, done: false },
                      { step: 3, label: 'AI 본인 대조 영상통화', icon: Video, done: false },
                      { step: 4, label: '승인 완료 → 프리미엄 활성화', icon: CheckCircle, done: false },
                    ].map(({ step, label, icon: Icon, done }) => (
                      <div key={step} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-primary-100 text-primary-600'}`}>
                          {done ? <CheckCircle className="w-3.5 h-3.5" /> : step}
                        </div>
                        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-700 font-medium" style={{ wordBreak: 'keep-all' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setCertStep('pass')}
                    className="btn-primary w-full justify-center"
                  >
                    <VlueBrandMark size={16} />
                    신뢰인증 신청 시작
                  </button>
                </div>
              </>
            )}

            {certStep === 'pass' && (
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">1</div>
                  인증 수단 선택
                </h3>
                <div className="space-y-2.5">
                  {[
                    { id: 'pass', label: 'PASS 인증서', desc: '이동통신사 공인 인증', icon: '📱' },
                    { id: 'kakao_cert', label: '카카오 인증서', desc: '카카오톡 인증서 활용', icon: '💬' },
                    { id: 'naver_cert', label: '네이버 인증서', desc: '네이버 인증서 활용', icon: 'N' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setCertStep('id')}
                      className="w-full flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-primary-50 border border-transparent hover:border-primary-200 rounded-2xl text-left transition-all"
                    >
                      <span className="w-9 h-9 flex items-center justify-center text-lg rounded-xl bg-white shadow-sm border border-gray-100">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{opt.label}</div>
                        <div className="text-xs text-gray-400">{opt.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {certStep === 'id' && (
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">2</div>
                  신분증 제출
                </h3>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer"
                  onClick={() => setCertStep('face')}
                >
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600" style={{ wordBreak: 'keep-all' }}>주민등록증 또는 운전면허증</p>
                  <p className="text-xs text-gray-400 mt-1">클릭하여 파일 선택 또는 촬영</p>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-2xl">
                  <p className="text-xs text-blue-600" style={{ wordBreak: 'keep-all' }}>
                    <Lock className="w-3 h-3 inline mr-1" />
                    제출된 신분증 정보는 암호화되어 인증 후 즉시 삭제됩니다
                  </p>
                </div>
              </div>
            )}

            {certStep === 'face' && (
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">3</div>
                  AI 본인 대조 영상통화
                </h3>
                <div className="bg-gray-900 rounded-2xl aspect-video flex flex-col items-center justify-center mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
                  <Video className="w-12 h-12 text-white/50 relative z-10 mb-2" />
                  <p className="text-white/70 text-sm relative z-10" style={{ wordBreak: 'keep-all' }}>카메라를 활성화하여 얼굴을 인식시키세요</p>
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-full relative z-10">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-xs font-bold">LIVE</span>
                  </div>
                  <div
                    className="absolute inset-4 border-2 border-white/30 rounded-2xl"
                    style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)' }}
                  />
                </div>
                <button
                  onClick={() => setCertStep('review')}
                  className="btn-primary w-full justify-center"
                >
                  <Video className="w-4 h-4" />
                  AI 얼굴 인식 시작
                </button>
              </div>
            )}

            {certStep === 'review' && (
              <div className="card p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2" style={{ wordBreak: 'keep-all' }}>AI 검토 진행 중</h3>
                <p className="text-sm text-gray-500 mb-5" style={{ wordBreak: 'keep-all' }}>
                  제출하신 정보를 AI가 검토하고 있습니다.<br />
                  약 <strong>5~10일</strong> 이내에 결과를 알려드립니다.
                </p>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                    style={{ width: `${reviewProgress}%`, transition: 'width 1s ease' }}
                  />
                </div>
                <p className="text-xs text-primary-500 font-semibold mb-5">AI 검토 단계 {reviewProgress}%</p>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-xs text-emerald-700 font-medium" style={{ wordBreak: 'keep-all' }}>
                    <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                    검토 중에도 일반 회원 권한으로 모든 서비스 정상 이용 가능
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-5 space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                최근 보안 활동
              </h3>
              <div className="space-y-3">
                {[
                  { time: '오늘 09:32', action: '로그인', location: '서울 강남구', safe: true },
                  { time: '어제 18:15', action: '명함 조회', location: '국민은행 대표번호', safe: true },
                  { time: '3일 전 14:22', action: '검색', location: '한국신뢰금융 검증', safe: true },
                  { time: '5일 전 11:04', action: '로그인 시도', location: '부산 (차단됨)', safe: false },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.safe ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{log.action}</span>
                        {!log.safe && <span className="text-xs text-red-500 font-bold">[차단]</span>}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{log.location}</div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '이번 달 검증', value: '23건', icon: Eye, color: 'text-primary-500', bg: 'bg-primary-50' },
                { label: '사기 차단', value: '2건', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
                { label: '저장된 명함', value: '8개', icon: Bookmark, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: '알림 수신', value: '15건', icon: Bell, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`card p-4 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <div className="text-xl font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {isWebViewV1Enabled('safezone') ? (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                안심 구역 설정
              </h3>
              <p className="text-xs text-gray-500 mb-3" style={{ wordBreak: 'keep-all' }}>
                위치 기반 안심 구역을 설정하면 해당 지역 외 접근 시 즉시 알림을 받습니다
              </p>
              <button
                onClick={() => onNavigate('safezone')}
                className="btn-secondary w-full justify-center text-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                안심 구역 관리하기
              </button>
            </div>
            ) : null}
          </div>
        )}

        <div style={{ height: '100px' }} />
      </div>
    </div>
  );
}
