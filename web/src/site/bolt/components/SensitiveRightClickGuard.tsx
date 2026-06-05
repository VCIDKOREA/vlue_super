import { useCallback, useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert } from 'lucide-react';
import './sensitive-right-click-guard.css';

const WARNING_MESSAGE = '무단 복제 및 도용 시 법적 책임을 피할 수 없습니다.';
const TIP_DISMISS_MS = 2600;
const TIP_WIDTH_ESTIMATE = 280;
const TIP_HEIGHT_ESTIMATE = 56;

type TipState = { x: number; y: number; key: number };

type SensitiveRightClickGuardProps = {
  children: ReactNode;
  className?: string;
};

/** 자료실·엑셀·디지털인증명함 등 — 우클릭 시 브라우저 메뉴 대신 경고 툴팁 */
export default function SensitiveRightClickGuard({ children, className = '' }: SensitiveRightClickGuardProps) {
  const [tip, setTip] = useState<TipState | null>(null);

  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const offset = 10;
    const x = Math.min(e.clientX + offset, window.innerWidth - TIP_WIDTH_ESTIMATE - 12);
    const y = Math.min(e.clientY + offset, window.innerHeight - TIP_HEIGHT_ESTIMATE - 12);

    setTip({ x: Math.max(12, x), y: Math.max(12, y), key: Date.now() });
  }, []);

  useEffect(() => {
    if (!tip) return undefined;
    const id = window.setTimeout(() => setTip(null), TIP_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [tip]);

  return (
    <>
      <div className={className} onContextMenu={handleContextMenu}>
        {children}
      </div>
      {tip && typeof document !== 'undefined'
        ? createPortal(
            <div
              key={tip.key}
              className="vlue-sensitive-rc-tip"
              style={{ left: tip.x, top: tip.y }}
              role="alert"
              aria-live="assertive"
            >
              <ShieldAlert className="vlue-sensitive-rc-tip__icon" aria-hidden />
              <p className="vlue-sensitive-rc-tip__text">{WARNING_MESSAGE}</p>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
