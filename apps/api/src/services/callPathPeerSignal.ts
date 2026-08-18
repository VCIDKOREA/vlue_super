/**
 * 발신 측 폰에서 원격제어·악성앱이 *실행 중*일 때 짧은 TTL 로 남긴다.
 * 수신 VLUE 회원 lookup 이 상대 프로세스를 볼 수 없으므로, 발신 앱이 스스로 보고한다.
 * 설치만 된 원격앱은 클라이언트가 보고하지 않는다.
 */
import { kvGet, kvSetEx } from "../lib/redisKv.js";
import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";

const TTL_SEC = 90;
const KEY_PREFIX = "vlue:callpath:out:";

export type CallPathPeerSignal = {
  reasons: string[];
  at: number;
};

function keyFor(e164: string): string {
  return `${KEY_PREFIX}${e164}`;
}

export async function reportOutgoingCallPath(opts: {
  userId: string;
  reasons: string[];
}): Promise<{ ok: boolean; phoneE164?: string }> {
  const reasons = (opts.reasons || []).map((r) => String(r || "").trim()).filter(Boolean).slice(0, 8);
  if (reasons.length === 0) return { ok: false };
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { phoneE164: true }
  });
  const e164 = normalizeToE164KR(String(user?.phoneE164 || "").trim());
  if (!e164) return { ok: false };
  const payload: CallPathPeerSignal = { reasons, at: Date.now() };
  await kvSetEx(keyFor(e164), JSON.stringify(payload), TTL_SEC);
  return { ok: true, phoneE164: e164 };
}

export async function readOutgoingCallPathSignal(rawNumber: string): Promise<CallPathPeerSignal | null> {
  const e164 = normalizeToE164KR(String(rawNumber || "").trim());
  if (!e164) return null;
  try {
    const raw = await kvGet(keyFor(e164));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CallPathPeerSignal;
    const reasons = Array.isArray(parsed?.reasons)
      ? parsed.reasons.map((r) => String(r || "").trim()).filter(Boolean)
      : [];
    if (reasons.length === 0) return null;
    return { reasons, at: Number(parsed.at) || Date.now() };
  } catch {
    return null;
  }
}

export const PEER_REMOTE_SUMMARY =
  "상대 폰에서 원격제어 앱이 실행된 채 걸려 온 전화입니다.";
