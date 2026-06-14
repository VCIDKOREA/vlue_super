import LegalDocumentLayout from '../components/LegalDocumentLayout';
import { TERMS_ARTICLES, TERMS_VERSION } from '../../../legal/vlueTermsArticles.js';

interface TermsPageProps {
  onBack: () => void;
}

export default function TermsPage({ onBack }: TermsPageProps) {
  return (
    <LegalDocumentLayout
      title="서비스 이용약관"
      version={TERMS_VERSION}
      articles={TERMS_ARTICLES}
      onBack={onBack}
    />
  );
}
