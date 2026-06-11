/** 자주 쓰는 일상 구문 — 모델 호출 없이 즉시 반환 */
export type PhraseLang = "ko" | "en" | "ja" | "zh" | "vi";

type PhraseRow = Partial<Record<PhraseLang, string>> & { ko: string };

const PHRASES: PhraseRow[] = [
  { ko: "안녕하세요", en: "Hello", ja: "こんにちは", zh: "你好", vi: "Xin chào" },
  { ko: "감사합니다", en: "Thank you", ja: "ありがとうございます", zh: "谢谢", vi: "Cảm ơn" },
  { ko: "죄송합니다", en: "I'm sorry", ja: "すみません", zh: "对不起", vi: "Xin lỗi" },
  { ko: "네", en: "Yes", ja: "はい", zh: "是", vi: "Vâng" },
  { ko: "아니요", en: "No", ja: "いいえ", zh: "不是", vi: "Không" },
  { ko: "도와주세요", en: "Please help me", ja: "助けてください", zh: "请帮帮我", vi: "Giúp tôi với" },
  { ko: "어디에 있어요", en: "Where are you?", ja: "どこにいますか", zh: "你在哪里？", vi: "Bạn ở đâu?" },
  { ko: "지금 출발할게요", en: "I'm leaving now", ja: "今から出発します", zh: "我现在出发", vi: "Tôi sẽ đi ngay" },
  { ko: "곧 도착해요", en: "I'll arrive soon", ja: "もうすぐ着きます", zh: "快到了", vi: "Tôi sắp đến" },
  { ko: "연락 주세요", en: "Please contact me", ja: "連絡してください", zh: "请联系我", vi: "Hãy liên lạc với tôi" },
  { ko: "잘 지내세요", en: "Take care", ja: "お元気で", zh: "保重", vi: "Chúc bạn khỏe" },
  { ko: "무엇이 궁금하신가요", en: "What would you like to know?", ja: "何が気になりますか", zh: "您想了解什么？", vi: "Bạn muốn biết gì?" },
  { ko: "메시지를 입력하세요", en: "Enter a message", ja: "メッセージを入力", zh: "请输入消息", vi: "Nhập tin nhắn" },
  { ko: "문서를 프레임 안에 맞춰 주세요", en: "Fit the document inside the frame", ja: "書類を枠内に合わせてください", zh: "请将文档对准框内", vi: "Đặt tài liệu trong khung" },
  { ko: "카메라 권한이 필요합니다", en: "Camera permission is required", ja: "カメラの許可が必要です", zh: "需要相机权限", vi: "Cần quyền camera" },
  { ko: "스캔 완료", en: "Scan complete", ja: "スキャン完了", zh: "扫描完成", vi: "Quét xong" },
  { ko: "전체 번역", en: "Full translation", ja: "全文翻訳", zh: "全文翻译", vi: "Dịch toàn bộ" },
  { ko: "추천제 혜택", en: "Referral benefits", ja: "紹介制度の特典", zh: "推荐奖励", vi: "Ưu đãi giới thiệu" },
  { ko: "가족보호시스템 사용법", en: "How to use family protection", ja: "家族保護の使い方", zh: "家庭保护系统用法", vi: "Cách dùng bảo vệ gia đình" }
];

function compactKo(s: string) {
  return s.replace(/\s+/g, "").trim();
}

export function lookupPhraseDictionary(text: string, targetLang: PhraseLang): string | null {
  const compact = compactKo(text);
  if (!compact) return null;
  const hit = PHRASES.find((p) => compactKo(p.ko) === compact || compact.includes(compactKo(p.ko)));
  if (!hit) return null;
  return hit[targetLang] || null;
}
