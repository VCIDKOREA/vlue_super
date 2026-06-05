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
      <StoreSection onNavigate={onNavigate} />
      <EventsSection />
      <DownloadSection onNavigate={onNavigate} />
    </main>
  );
}
