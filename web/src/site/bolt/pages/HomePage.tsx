import type { View } from '../types';
import HeroSection from '../sections/HeroSection';
import PhishingSection from '../sections/PhishingSection';
import StoreSection from '../sections/StoreSection';
import EventsSection from '../sections/EventsSection';
import DownloadSection from '../sections/DownloadSection';
import { v1WebShell } from '../../../lib/v1ReleaseScope.js';

interface HomePageProps {
  onSearch: (query: string) => void;
  onNavigate: (view: View) => void;
}

export default function HomePage({ onSearch, onNavigate }: HomePageProps) {
  const showStore = Boolean(v1WebShell.vlueStore);
  const showEvents = Boolean(v1WebShell.events);
  const showDownload = Boolean(v1WebShell.download);
  const showDeferred = showStore || showEvents || showDownload;

  return (
    <main>
      <HeroSection onSearch={onSearch} onNavigate={onNavigate} />
      <PhishingSection />
      {showDeferred ? (
        <div className="mkt-home-section--defer hidden md:block">
          {showStore ? <StoreSection onNavigate={onNavigate} /> : null}
          {showEvents ? <EventsSection /> : null}
          {showDownload ? <DownloadSection onNavigate={onNavigate} /> : null}
        </div>
      ) : null}
    </main>
  );
}
