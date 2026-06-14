import LegalDocumentLayout from '../components/LegalDocumentLayout';
import { PRIVACY_POLICY_ARTICLES, PRIVACY_POLICY_VERSION } from '../../../legal/vluePrivacyPolicy.js';

interface PrivacyPageProps {
  onBack: () => void;
}

export default function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <LegalDocumentLayout
      title="개인정보처리방침"
      version={PRIVACY_POLICY_VERSION}
      articles={PRIVACY_POLICY_ARTICLES}
      onBack={onBack}
    />
  );
}
