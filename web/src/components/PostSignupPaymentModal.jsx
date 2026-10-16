import PaymentModal from "./payment/PaymentModal.jsx";

/**
 * 가입·본인인증 완료 후 첫 구독 결제 (PaymentModal 래퍼)
 * @param {{ membershipKind: string, billingCycle: string, amountKrw: number, label?: string }} pending
 */
export default function PostSignupPaymentModal({ open, pending, onComplete, onSkip }) {
  return (
    <PaymentModal
      open={open}
      pending={pending}
      onClose={onSkip}
      onSkip={onSkip}
      onComplete={onComplete}
    />
  );
}
