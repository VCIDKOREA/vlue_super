import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, LayoutGrid, MessageCircle, Plus, X } from 'lucide-react';
import type { View } from '../types';
import ChatBot from './ChatBot';
import EmergencyButton from './EmergencyButton';
import { requestStoreUpload } from '../../../lib/storeUploadBridge.js';

interface MarketingFabDockProps {
  currentView: View;
  onLoginRequired?: () => void;
  isLoggedIn?: boolean;
}

export default function MarketingFabDock({
  currentView,
  onLoginRequired,
  isLoggedIn = false,
}: MarketingFabDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const showUpload = currentView === 'shopping';

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
    setChatOpen(false);
    setEmergencyOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  const openUpload = () => {
    closeMenu();
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    requestStoreUpload();
  };

  const openChat = () => {
    closeMenu();
    setEmergencyOpen(false);
    setChatOpen(true);
  };

  const openEmergency = () => {
    closeMenu();
    setChatOpen(false);
    setEmergencyOpen(true);
  };

  const panelOpen = chatOpen || emergencyOpen;

  return (
    <div className="mkt-fab-dock fixed z-50 flex flex-col items-end gap-3">
      <ChatBot
        hideTrigger
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
      <EmergencyButton
        hideTrigger
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
      />

      {menuOpen && !panelOpen ? (
        <>
          <button
            type="button"
            className="mkt-fab-dock__backdrop"
            aria-label="메뉴 닫기"
            onClick={closeMenu}
          />
          <div className="mkt-fab-dock__menu" role="menu" aria-label="빠른 실행">
            {showUpload ? (
              <button type="button" role="menuitem" className="mkt-fab-dock__item" onClick={openUpload}>
                <span className="mkt-fab-dock__item-icon mkt-fab-dock__item-icon--blue">
                  <Plus className="w-5 h-5" aria-hidden />
                </span>
                <span className="mkt-fab-dock__item-label">상품 등록</span>
              </button>
            ) : null}
            <button type="button" role="menuitem" className="mkt-fab-dock__item" onClick={openChat}>
              <span className="mkt-fab-dock__item-icon mkt-fab-dock__item-icon--primary">
                <MessageCircle className="w-5 h-5" aria-hidden />
              </span>
              <span className="mkt-fab-dock__item-label">AI 상담</span>
            </button>
            <button type="button" role="menuitem" className="mkt-fab-dock__item" onClick={openEmergency}>
              <span className="mkt-fab-dock__item-icon mkt-fab-dock__item-icon--danger">
                <AlertTriangle className="w-5 h-5" aria-hidden />
              </span>
              <span className="mkt-fab-dock__item-label">긴급 신고</span>
            </button>
          </div>
        </>
      ) : null}

      {!panelOpen ? (
        <button
          type="button"
          className={`mkt-fab-dock__main ${menuOpen ? 'is-open' : ''}`}
          aria-label={menuOpen ? '메뉴 닫기' : '빠른 실행 메뉴'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="w-6 h-6" aria-hidden /> : <LayoutGrid className="w-6 h-6" aria-hidden />}
        </button>
      ) : null}
    </div>
  );
}
