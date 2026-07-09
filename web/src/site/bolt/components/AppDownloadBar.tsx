import { useEffect, useState } from 'react';
import { Download, Monitor, Smartphone } from 'lucide-react';
import { getTopDownloadBarMessage, DOWNLOAD_BAR_BOTTOM } from '../data/appDownloadBarContent';
import { isWebPcDownloadEnabled } from '../../../lib/v1ReleaseScope.js';
import type { View } from '../types';

type Props = {
  onNavigate: (view: View) => void;
  currentView: View;
  variant?: 'top' | 'bottom';
};

/** 앱·PC 설치 유도 — 뷰(메뉴)별 문구 + 설치 버튼 */
export default function AppDownloadBar({ onNavigate, currentView, variant = 'top' }: Props) {
  const isTop = variant === 'top';
  const showPc = isWebPcDownloadEnabled();
  const [message, setMessage] = useState(() => getTopDownloadBarMessage(currentView));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isTop) return;
    setVisible(false);
    const t = window.setTimeout(() => {
      setMessage(getTopDownloadBarMessage(currentView));
      setVisible(true);
    }, 100);
    return () => window.clearTimeout(t);
  }, [currentView, isTop]);

  const text = isTop ? message : DOWNLOAD_BAR_BOTTOM;

  return (
    <div
      className={
        isTop
          ? `mkt-download-bar mkt-download-bar-shell mkt-download-bar--top${
              currentView === 'home' ? ' mkt-download-bar--home' : ''
            }`
          : 'mkt-download-bar mkt-download-bar--bottom'
      }
      role="region"
      aria-label={showPc ? 'VLUE 앱 및 PC 프로그램 설치' : 'VLUE 모바일 앱 설치'}
      aria-live="polite"
    >
      <div className="mkt-download-bar-wrap max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="mkt-download-bar-inner">
          <p
            className={`mkt-download-bar-message text-center sm:text-left transition-opacity duration-200 ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {text}
          </p>
          <div className="mkt-download-bar-actions">
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className="mkt-download-btn mkt-download-btn--primary"
            >
              <Smartphone className="mkt-download-btn-icon" aria-hidden />
              <span>모바일 앱</span>
            </button>
            {showPc ? (
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className="mkt-download-btn mkt-download-btn--ghost"
            >
              <Monitor className="mkt-download-btn-icon" aria-hidden />
              <span>PC 프로그램</span>
            </button>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className="mkt-download-btn mkt-download-btn--light"
            >
              <Download className="mkt-download-btn-icon" aria-hidden />
              <span>설치 안내</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
