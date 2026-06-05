import HeroSection from "../sections/HeroSection.jsx";
import {
  PhishingSection,
  NewsSection,
  EventsSection,
  DownloadSection,
} from "../sections/MarketingHomeSections.jsx";

export default function MarketingHomePage({ onSearch, onNavigate }) {
  return (
    <main className="relative z-10">
      <HeroSection onSearch={onSearch} onNavigate={onNavigate} />
      <PhishingSection />
      <NewsSection onNavigate={onNavigate} />
      <EventsSection onNavigate={onNavigate} />
      <DownloadSection />
    </main>
  );
}
