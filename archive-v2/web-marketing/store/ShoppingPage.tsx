import type { MarketingAuthUser } from '../components/AuthModal';
import MarketingMediaCommerceStore from '../components/MarketingMediaCommerceStore';

interface ShoppingPageProps {
  user?: MarketingAuthUser | null;
  onLoginClick?: () => void;
}

export default function ShoppingPage({ user, onLoginClick }: ShoppingPageProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      <MarketingMediaCommerceStore user={user} onLoginClick={onLoginClick} />
    </main>
  );
}
