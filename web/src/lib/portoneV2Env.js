import { envTrim } from "./portoneEnv.js";

/** 포트원 V2 Store ID (콘솔 › 결제 연동) */
export function getPortoneV2StoreId() {
  return (
    envTrim(import.meta.env.VITE_PORTONE_V2_STORE_ID) ||
    "store-2bead538-ca75-4e6c-8035-8b6512a5b1d2"
  );
}

/**
 * 포트원 V2 채널 키 — 콘솔에서 채널명 `VLUE_결제`(KPN)의 Channel Key.
 * 예: `channel-key-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
 */
export function getPortoneV2ChannelKey() {
  return envTrim(import.meta.env.VITE_PORTONE_V2_CHANNEL_KEY);
}

/** 채널 표시명 (로그만/문서용) */
export function getPortoneV2ChannelName() {
  return envTrim(import.meta.env.VITE_PORTONE_V2_CHANNEL_NAME) || "VLUE_결제";
}
