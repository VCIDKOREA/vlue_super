export type ChatLogLine = {
  user_id: string;
  user_name: string;
  content: string;
  [key: string]: unknown;
};

const PHONE_RE = /\d{3}-\d{4}-\d{4}|\d{10,11}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const RRN_RE = /\d{6}-\d{7}/g;
const ACCOUNT_RE = /\d{3,4}-\d{2,4}-\d{4,8}/g;

export function maskNonConsentedUsers(
  chatLogs: ChatLogLine[],
  maskedUserIds?: string[]
): ChatLogLine[] {
  if (!maskedUserIds?.length) return chatLogs;

  const maskMap: Record<string, string> = {};

  return chatLogs.map((log) => {
    if (!maskedUserIds.includes(log.user_id)) return log;

    if (!maskMap[log.user_id]) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      maskMap[log.user_id] = `익명_유저_${randomNum}`;
    }
    const alias = maskMap[log.user_id];
    let content = String(log.content || "");
    if (log.user_name) {
      content = content.replace(new RegExp(log.user_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), alias);
    }
    content = content
      .replace(PHONE_RE, "***-****-****")
      .replace(EMAIL_RE, "****@*****.***")
      .replace(RRN_RE, "******-*******")
      .replace(ACCOUNT_RE, "***-**-******");

    return {
      ...log,
      user_id: "MASKED",
      user_name: alias,
      content
    };
  });
}
