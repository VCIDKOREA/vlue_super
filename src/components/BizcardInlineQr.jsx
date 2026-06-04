import { useBizcardSecurityQr } from "../lib/bizcardSecurityQr.js";

/** 앞면 이름·직책 아래 인라인 QR */
export default function BizcardInlineQr({ card, cardId = "" }) {
  const { qrSrc } = useBizcardSecurityQr(card, cardId);
  return (
    <img
      className="lettering-bizcard__inline-qr"
      src={qrSrc}
      width={36}
      height={36}
      alt="진본 검증 QR"
    />
  );
}
