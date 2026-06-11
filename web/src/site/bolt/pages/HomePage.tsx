import type { View } from '../types';
import HeroSection from '../sections/HeroSection';
import PhishingSection from '../sections/PhishingSection';
import StoreSection from '../sections/StoreSection';
import EventsSection from '../sections/EventsSection';
import DownloadSection from '../sections/DownloadSection';

interface HomePageProps {
  onSearch: (query: string) => void;
  onNavigate: (view: View) => void;
}

export default function HomePage({ onSearch, onNavigate }: HomePageProps) {
  return (
    <main>
      <HeroSection onSearch={onSearch} onNavigate={onNavigate} />
      <PhishingSection />
      <div className="mkt-home-section--defer hidden md:block">
        <StoreSection onNavigate={onNavigate} />
        <EventsSection />
        <DownloadSection onNavigate={onNavigate} />
      </div>
    </main>
  );
}
