import LegalDocumentLayout from '../components/LegalDocumentLayout';
import { REFUND_POLICY_ARTICLES, REFUND_POLICY_VERSION } from '../../../legal/vlueRefundPolicy.js';

interface RefundPageProps {
  onBack: () => void;
  scrollToId?: string;
}

export default function RefundPage({ onBack, scrollToId }: RefundPageProps) {
  return (
    <LegalDocumentLayout
      title="환불·청약철회 규정"
      version={REFUND_POLICY_VERSION}
      articles={REFUND_POLICY_ARTICLES}
      onBack={onBack}
      scrollToId={scrollToId}
    />
  );
}
