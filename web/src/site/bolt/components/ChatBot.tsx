import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time: string;
}

const RESPONSES: [RegExp, string][] = [
  [/보이스피싱|사기|피해/, '보이스피싱 피해가 의심되시나요? 즉시 해당 전화를 끊고, 금융감독원(1332) 또는 경찰청(112)에 신고하세요. VLUE 검색창에서 해당 기관 번호를 확인하실 수 있습니다.'],
  [/인증|vlue인증|vlue 인증/, 'VLUE 멤버십은 일반(무료), 유료(월 28,300원·추천인 30% 시 19,800원), 기업 B2B(10회선↑ 단체)입니다. [인증신청] 또는 서비스소개에서 비교하세요.'],
  [/검색|기관확인|조회/, '검색창에 기관명, 전화번호 또는 사업자번호를 입력하면 공공데이터와 VLUE 인증 데이터를 동시에 비교하여 결과를 보여드립니다.'],
  [new RegExp('요금|가격|비용|얼마|추천|vluer', 'i'), '무료·유료·기업 3단계입니다. 유료 추천 할인은 12개월 30% 후 15% 영구, 추천인 적립은 12개월 등급별(최대 15%) 후 5% 영구입니다. [서비스소개·요금제] 또는 [인증신청]을 확인하세요.'],
  [/쇼핑|블루쇼핑|vlue 스토어|구매/, 'VLUE 스토어는 VLUE 인증 업체만 입점 가능한 안전한 커머스입니다. 상단 메뉴 [VLUE 스토어]에서 이용하세요.'],
  [/자료|템플릿|서류|개인자료실/, '개인자료실에서 거래처 안전 확인서, 피해 신고서 등 템플릿을 무료로 이용하실 수 있습니다. 웹에서 편집 후 .vlue 보안 파일로 저장 가능합니다.'],
  [new RegExp('엑셀|excel|장부|스프레드시트', 'i'), 'AI엑셀에디터는 웹 전용 기능입니다. 상단 메뉴의 보라색 [AI엑셀에디터]에서 작업실을 열 수 있습니다.'],
  [/연락|전화|이메일/, 'VLUE 고객센터: 1588-0000 (평일 09:00~18:00) / support@vlue.kr 로 문의하시면 됩니다.'],
  [/안녕|반가워|안녕하세요/, '안녕하세요! VLUE AI 고객센터입니다. 보이스피싱 예방, 기관 인증, 서비스 이용에 관해 무엇이든 도와드릴게요.'],
  [/감사|고마워|고맙습니다/, '도움이 되어 기쁩니다! 추가로 궁금한 사항이 있으시면 언제든지 질문해 주세요.'],
];

function getBotResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [pattern, response] of RESPONSES) {
    if (pattern.test(lower)) return response;
  }
  return '안녕하세요! VLUE AI 고객센터입니다. 보이스피싱 예방, 기관 인증 조회, 서비스 이용 방법 등 궁금하신 점을 말씀해 주세요. 더 자세한 상담은 고객센터(1588-0000)로 연락 주시기 바랍니다.';
}

const now = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const INITIAL: Message = {
  id: 'init',
  role: 'bot',
  text: '안녕하세요! VLUE AI 고객센터입니다.\n보이스피싱 예방, 기관 인증 조회, 요금제 안내 등 무엇이든 도와드릴게요.',
  time: now(),
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim(), time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: getBotResponse(userMsg.text),
        time: now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up" style={{ height: '460px' }}>
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">VLUE AI 고객센터</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span className="text-white/70 text-xs">온라인</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-white/70 hover:text-white transition-colors">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'bot' ? 'bg-primary-100' : 'bg-primary-600'
                }`}>
                  {msg.role === 'bot'
                    ? <Bot className="w-3.5 h-3.5 text-primary-600" />
                    : <User className="w-3.5 h-3.5 text-white" />
                  }
                </div>
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'bot'
                      ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                      : 'bg-primary-600 text-white rounded-tr-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-xs text-gray-400">{msg.time}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-3 py-2.5 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-1.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-white" style={{ color: input.trim() ? 'white' : '#9CA3AF' }} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          open ? 'bg-gray-600' : 'bg-primary-600 hover:bg-primary-700'
        }`}
        style={{ width: '52px', height: '52px' }}
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-5.5 h-5.5 text-white" style={{ width: '22px', height: '22px' }} />
        }
      </button>
    </div>
  );
}
