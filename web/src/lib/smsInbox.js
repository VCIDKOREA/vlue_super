import { apiUrl } from "./apiBase.js";
import { getLocalVlueUserId } from "./showcase/resolveShowcaseOwnerUserId.js";

function bridge() {
  if (typeof window === "undefined") return null;
  return window.VlueLettering || window.Android || null;
}

function parseJson(raw, fallback) {
  try {
    return typeof raw === "string" ? JSON.parse(raw || "") : raw || fallback;
  } catch {
    return fallback;
  }
}

export function fetchSmsThreads() {
  const raw = bridge()?.getDeviceSmsThreadsJson?.() || '{"ok":false,"permission":false,"threads":[]}';
  const data = parseJson(raw, { ok: false, permission: false, threads: [] });
  return {
    ok: Boolean(data?.ok),
    permission: data?.permission !== false,
    threads: Array.isArray(data?.threads) ? data.threads : []
  };
}

export function fetchSmsMessages(threadId, address) {
  const raw =
    bridge()?.getDeviceSmsMessagesJson?.(String(threadId || ""), String(address || "")) ||
    '{"ok":false,"messages":[]}';
  const data = parseJson(raw, { ok: false, messages: [] });
  return {
    ok: Boolean(data?.ok),
    permission: data?.permission !== false,
    messages: Array.isArray(data?.messages) ? data.messages : []
  };
}

export function requestSmsReadPermission() {
  bridge()?.requestSmsReadPermission?.();
}

export function markSmsThreadRead(threadId, address, dateMs) {
  const raw = bridge()?.markSmsThreadRead?.(String(threadId || ""), String(address || ""), String(dateMs || 0));
  return parseJson(raw, { ok: false });
}

function waitEvent(name, requestId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(name, onEvent);
      reject(new Error("응답 시간이 초과되었습니다."));
    }, timeoutMs);
    function onEvent(event) {
      const detail = event?.detail || {};
      if (requestId && String(detail.requestId || "") !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener(name, onEvent);
      resolve(detail);
    }
    window.addEventListener(name, onEvent);
  });
}

export function waitSmsPermission() {
  return waitEvent("vlue-sms-permission", "", 60_000);
}

/** 무료 회원 — 15초 보상형 광고 시청 완료 후에만 분석을 진행한다. */
export async function watchSmsAnalyzeAd() {
  const native = bridge();
  if (typeof native?.showRewardedAd !== "function") {
    throw new Error("보상형 광고는 VLUÉ Android 앱에서 이용할 수 있습니다.");
  }
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}`;
  const userId = getLocalVlueUserId() || "sms-local";
  const pending = waitEvent("vlue-rewarded-ad-result", requestId, 120_000);
  const raw = native.showRewardedAd(requestId, "sms_analyze", userId, "sms-analyze");
  const accepted = parseJson(raw, { ok: false });
  if (!accepted?.ok) throw new Error("보상형 광고를 시작하지 못했습니다.");
  const detail = await pending;
  if (detail.status !== "earned") throw new Error("광고 시청을 완료해야 분석할 수 있습니다.");
}

/** 말풍선 1건만 analyze-sms 로 전달한다. */
export async function analyzeSmsMessage(sender, messageText) {
  const native = bridge();
  if (typeof native?.analyzeSms !== "function") {
    throw new Error("문자 분석은 VLUÉ Android 앱에서 이용할 수 있습니다.");
  }
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}`;
  const pending = waitEvent("vlue-sms-analysis", requestId, 45_000);
  const raw = native.analyzeSms(requestId, sender, messageText);
  const accepted = parseJson(raw, { ok: false });
  if (!accepted?.ok) throw new Error("분석을 시작하지 못했습니다.");
  const detail = await pending;
  if (!detail?.ok) throw new Error(detail?.error || "분석에 실패했습니다.");
  return {
    status: detail.status,
    dangerScore: Number(detail.dangerScore) || 0,
    unshortenedUrl: detail.unshortenedUrl || null,
    summary: String(detail.summary || ""),
    actionGuide: String(detail.actionGuide || ""),
    senderBadge: String(detail.senderBadge || ""),
    senderBand: String(detail.senderBand || ""),
    senderReason: String(detail.senderReason || "")
  };
}

const STATUS_RANK = { SAFE: 0, SUSPICIOUS: 1, DANGER: 2 };

function statusFromBadge(badge) {
  if (badge === "phishing") return "DANGER";
  if (badge === "suspect") return "SUSPICIOUS";
  return "SAFE";
}

function badgeFromStatus(status) {
  if (status === "DANGER") return "phishing";
  if (status === "SUSPICIOUS") return "suspect";
  return "safe";
}

/** 문자 본문 분석과 별도로, 발신번호를 VLUE DB·카카오·네이버·공공데이터와 대조한다. */
export async function fetchSmsSenderContext(phone, messageText) {
  try {
    const res = await fetch(apiUrl("/api/lettering/sms-sender-context"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: String(phone || "").slice(0, 40),
        messageText: String(messageText || "").slice(0, 2000)
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export function mergeSmsAnalysis(analysis, context) {
  const base = analysis || {
    status: "SAFE",
    dangerScore: 0,
    unshortenedUrl: null,
    summary: "",
    actionGuide: ""
  };
  if (!context?.ok && !base.senderReason) return base;
  const contextStatus = context?.ok ? statusFromBadge(context.badge) : "SAFE";
  const geminiStatus = STATUS_RANK[base.status] >= 0 ? base.status : "SAFE";
  const status = (STATUS_RANK[contextStatus] || 0) > (STATUS_RANK[geminiStatus] || 0) ? contextStatus : geminiStatus;
  const reason = String(context?.reason || base.senderReason || "").trim();
  const summary = reason && !String(base.summary || "").includes(reason.slice(0, 16))
    ? [base.summary, reason].filter(Boolean).join("\n")
    : String(base.summary || reason);
  return {
    ...base,
    status,
    dangerScore: Math.max(Number(base.dangerScore) || 0, Number(context?.dangerFloor) || 0),
    summary,
    senderBadge: status === geminiStatus && base.senderBadge ? base.senderBadge : badgeFromStatus(status),
    senderBand: context?.bandLabel || base.senderBand || "",
    senderReason: reason,
    senderLookups: context?.lookups || null
  };
}
