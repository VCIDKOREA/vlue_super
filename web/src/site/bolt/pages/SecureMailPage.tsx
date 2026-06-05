import { useState } from 'react';
import { Mail, ChevronRight, Search, Star, Trash2, Archive, Send, Inbox, RefreshCw, Lock, CheckCircle, ArrowLeft, X, Reply, Forward } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';

interface MailItem {
  id: string;
  from: string;
  fromOrg: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  date: string;
  read: boolean;
  starred: boolean;
  certified: boolean;
  tag?: string;
  tagColor?: string;
}

const MOCK_MAILS: MailItem[] = [
  {
    id: 'm1',
    from: '명경채 요양병원',
    fromOrg: 'VLUE-MED-2024-0031',
    subject: '[명경채 요양병원] 2024년 건강검진 안내',
    preview: '안녕하세요. 명경채 요양병원입니다. 2024년 연간 건강검진 일정을 안내드립니다...',
    body: '안녕하세요. 명경채 요양병원입니다.\n\n2024년 연간 건강검진 일정을 안내드립니다.\n\n검진 일정: 2024년 12월 1일 ~ 2025년 1월 31일\n검진 항목: 기본 혈액 검사, 흉부 X-ray, 복부 초음파\n\n예약 문의: 02-1234-5678\n\n본 메일은 VLUE 인증 기관에서 발송된 안전한 메일입니다.',
    time: '오전 10:24',
    date: '2024.12.15',
    read: false,
    starred: true,
    certified: true,
    tag: '의료',
    tagColor: 'text-red-600 bg-red-50 border-red-100',
  },
  {
    id: 'm2',
    from: '다다오피스',
    fromOrg: 'VLUE-BIZ-2024-0087',
    subject: '[다다오피스] 12월 이용 요금 청구서',
    preview: '다다오피스를 이용해 주셔서 감사합니다. 12월 이용 요금 청구서를 첨부합니다...',
    body: '다다오피스를 이용해 주셔서 감사합니다.\n\n12월 이용 요금 청구서를 안내드립니다.\n\n청구 기간: 2024년 12월 1일 ~ 12월 31일\n청구 금액: 55,000원 (VAT 포함)\n납부 기한: 2025년 1월 10일\n\n자동이체 계좌로 출금 예정입니다.\n\n문의: 1588-0000',
    time: '어제',
    date: '2024.12.14',
    read: true,
    starred: false,
    certified: true,
    tag: '청구서',
    tagColor: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    id: 'm3',
    from: '한국신뢰금융',
    fromOrg: 'VLUE-FIN-2024-0012',
    subject: '[한국신뢰금융] 대출 상환 일정 안내',
    preview: '안녕하세요, 고객님. 대출 상환 일정과 관련하여 안내 말씀 드립니다...',
    body: '안녕하세요, 고객님.\n\n대출 상환 일정과 관련하여 안내 말씀 드립니다.\n\n다음 달 상환 예정 금액: 350,000원\n상환 예정일: 2025년 1월 5일\n잔여 원금: 8,200,000원\n\n자세한 내용은 앱에서 확인 가능합니다.\n\n본 메일은 VLUE 인증 발신으로 안전한 공식 메일입니다.',
    time: '2일 전',
    date: '2024.12.13',
    read: true,
    starred: false,
    certified: true,
    tag: '금융',
    tagColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    id: 'm4',
    from: 'VLUE 플랫폼',
    fromOrg: 'platform@vlue.kr',
    subject: 'VLUE 보안 메일 서비스에 오신 것을 환영합니다!',
    preview: 'VLUE 보안 메일 서비스를 이용해 주셔서 감사합니다. 인증 기관의 공식 메일만을...',
    body: 'VLUE 보안 메일 서비스를 이용해 주셔서 감사합니다.\n\nVLUE 인증 기관의 공식 메일만을 안전하게 수신할 수 있습니다.\n\n주요 기능:\n• VLUE 인증 발신자 확인\n• 피싱 메일 자동 차단\n• 발신 기관 실시간 인증 조회\n• 메일 암호화 전송\n\n더 안전한 디지털 생활을 위해 VLUE와 함께하세요.',
    time: '1주 전',
    date: '2024.12.08',
    read: true,
    starred: true,
    certified: false,
    tag: '안내',
    tagColor: 'text-gray-600 bg-gray-50 border-gray-200',
  },
];

const SIDEBAR_ITEMS = [
  { icon: Inbox, label: '받은 메일함', count: 1 },
  { icon: Send, label: '보낸 메일함', count: 0 },
  { icon: Star, label: '중요 메일', count: 2 },
  { icon: Archive, label: '보관함', count: 0 },
  { icon: Trash2, label: '휴지통', count: 0 },
];

interface SecureMailPageProps {
  onBack: () => void;
}

export default function SecureMailPage({ onBack }: SecureMailPageProps) {
  const [mails, setMails] = useState<MailItem[]>(MOCK_MAILS);
  const [selected, setSelected] = useState<MailItem | null>(null);
  const [activeFolder, setActiveFolder] = useState('받은 메일함');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = mails.filter((m) =>
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.from.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unread = mails.filter((m) => !m.read).length;

  const handleSelect = (mail: MailItem) => {
    setSelected(mail);
    setMails((prev) => prev.map((m) => m.id === mail.id ? { ...m, read: true } : m));
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMails((prev) => prev.map((m) => m.id === id ? { ...m, starred: !m.starred } : m));
  };

  return (
    <main className="min-h-screen bg-blue-tint pt-16">
      {/* 내 보안 메일 주소 배너 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium mb-0.5">내 VLUE메일 주소</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-base tracking-tight" style={{ letterSpacing: '-0.02em' }}>user@vlue.kr</span>
                <span className="inline-flex items-center gap-1 text-xs text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-full font-semibold">
                  <CheckCircle className="w-3 h-3" />
                  보안 인증
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/15 border border-white/25">
              <Lock className="w-3 h-3 text-white/80" />
              <span className="text-white/90 text-xs font-semibold">1GB 무료 제공</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary-500 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>VLUE메일</h1>
              <p className="text-gray-400 text-xs">VLUE 인증 기관 공식 메일만 수신됩니다</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-100">
              <VlueBrandMark size={12} />
              <span className="text-primary-600 text-xs font-semibold">보안 활성화</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[600px]">
          <div className="w-52 flex-shrink-0 hidden md:flex flex-col gap-2">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-2xl transition-colors shadow-soft mb-2">
              <Mail className="w-4 h-4" />
              메일 쓰기
            </button>
            <nav className="space-y-0.5">
              {SIDEBAR_ITEMS.map(({ icon: Icon, label, count }) => (
                <button
                  key={label}
                  onClick={() => setActiveFolder(label)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm transition-all ${
                    activeFolder === label
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {label === '받은 메일함' && unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                  {count > 0 && label !== '받은 메일함' && (
                    <span className="text-xs text-gray-400 font-inter">{count}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-primary-700 text-xs font-semibold">피싱 차단 중</span>
                </div>
                <p className="text-primary-600 text-xs leading-relaxed">인증되지 않은 발신자의 메일이 자동으로 차단됩니다.</p>
              </div>
            </div>
          </div>

          <div className={`flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="메일 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-100"
                  style={{ letterSpacing: '-0.01em' }}
                />
              </div>
              <button className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <Mail className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">메일이 없습니다.</p>
                </div>
              ) : (
                filtered.map((mail) => (
                  <button
                    key={mail.id}
                    onClick={() => handleSelect(mail)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 group ${
                      selected?.id === mail.id ? 'bg-primary-50 border-b-primary-100' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${mail.read ? 'bg-transparent' : 'bg-primary-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs font-semibold truncate ${mail.read ? 'text-gray-700' : 'text-gray-900'}`} style={{ letterSpacing: '-0.01em' }}>
                            {mail.from}
                          </span>
                          {mail.certified && (
                            <VlueBrandMark size={12} className="flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {mail.tag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium border ${mail.tagColor}`}>
                              {mail.tag}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-inter">{mail.time}</span>
                        </div>
                      </div>
                      <p className={`text-xs truncate mb-0.5 ${mail.read ? 'text-gray-600' : 'text-gray-800 font-semibold'}`} style={{ letterSpacing: '-0.01em' }}>
                        {mail.subject}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{mail.preview}</p>
                    </div>
                    <button
                      onClick={(e) => toggleStar(mail.id, e)}
                      className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className={`w-4 h-4 ${mail.starred ? 'text-amber-400 fill-amber-400 opacity-100' : 'text-gray-300'}`} />
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>

          {selected && (
            <div className="flex-1 lg:flex-none lg:w-[55%] flex flex-col bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden animate-fade-in">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-gray-900 font-bold text-sm truncate" style={{ letterSpacing: '-0.02em' }}>{selected.subject}</h2>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors">
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors">
                    <Forward className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${selected.certified ? 'bg-primary-500' : 'bg-gray-200'}`}>
                      {selected.certified
                        ? <VlueBrandMark size={20} />
                        : <Mail className="w-5 h-5 text-gray-500" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-900 font-bold text-sm" style={{ letterSpacing: '-0.015em' }}>{selected.from}</span>
                        {selected.certified && (
                          <span className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            VLUE 인증
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs font-inter">{selected.fromOrg}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-xs font-inter">{selected.date}</p>
                    <p className="text-gray-400 text-xs font-inter">{selected.time}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {selected.certified && (
                  <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-100 rounded-2xl mb-5">
                    <Lock className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <p className="text-primary-700 text-xs leading-relaxed">
                      이 메일은 <strong>VLUE 인증 기관</strong>에서 발송된 공식 안전 메일입니다. 개인정보 피싱 위험이 없습니다.
                    </p>
                  </div>
                )}
                <div className="text-gray-700 text-sm leading-loose whitespace-pre-line" style={{ letterSpacing: '-0.01em' }}>
                  {selected.body}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-gray-600 hover:text-primary-600 text-sm font-semibold rounded-2xl transition-all">
                  <Reply className="w-4 h-4" />
                  답장하기
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
