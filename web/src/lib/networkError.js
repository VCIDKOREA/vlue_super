/** 서버 API 실패 시 UI에 표시할 공통 메시지 */
export const VLUE_NETWORK_ERROR_MESSAGE =
  "네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요";

export class VlueNetworkError extends Error {
  constructor(message = VLUE_NETWORK_ERROR_MESSAGE, cause) {
    super(message);
    this.name = "VlueNetworkError";
    this.cause = cause;
  }
}

export function isVlueNetworkError(err) {
  return err instanceof VlueNetworkError;
}
