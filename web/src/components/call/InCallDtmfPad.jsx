import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { nativePlayDtmf, nativeStopDtmf } from "../../lib/call/nativeCallControl.js";
import { addPersonalCaseNote } from "../../lib/personalCaseNotesStorage.js";

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const EXIT_MS = 220;
const TAP_MS = 320;
const MAX_DIGITS = 24;
const SAVE_TOAST = "개인케이스함에 저장되었습니다.";

/**
 * 쇼케이스/명함 뷰포트에 맞춰 표시·사라지는 DTMF 키패드
 */
export default function InCallDtmfPad({
  demoMode = false,
  onClose,
  onToast,
  className = "",
  /** 컨테이너에 꽉 채울 때 (절대배치 레이어) */
  fill = false
}) {
  const [leaving, setLeaving] = useState(false);
  const [tapped, setTapped] = useState(null);
  const [digits, setDigits] = useState("");
  const [digitPulse, setDigitPulse] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveContent, setSaveContent] = useState("");
  const tapTimer = useRef(0);

  useEffect(() => {
    setLeaving(false);
    return () => {
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
    };
  }, []);

  const pulseKey = (digit) => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    setTapped(null);
    window.requestAnimationFrame(() => {
      setTapped(digit);
      tapTimer.current = window.setTimeout(() => setTapped(null), TAP_MS);
    });
  };

  const onPadDown = (digit) => {
    pulseKey(digit);
    setDigits((prev) => `${prev}${digit}`.slice(-MAX_DIGITS));
    setDigitPulse((n) => n + 1);
    if (!demoMode) nativePlayDtmf(digit);
  };
  const onPadUp = () => {
    if (!demoMode) nativeStopDtmf();
  };

  const onBackspace = () => {
    setDigits((prev) => prev.slice(0, -1));
    setDigitPulse((n) => n + 1);
  };

  const handleClose = () => {
    if (leaving) return;
    setSaveOpen(false);
    setLeaving(true);
    window.setTimeout(() => onClose?.(), EXIT_MS);
  };

  const openSaveForm = () => {
    if (!digits) {
      onToast?.("번호를 먼저 입력해 주세요.");
      return;
    }
    setSaveName("");
    setSaveContent(digits);
    setSaveOpen(true);
  };

  const confirmSave = () => {
    const name = saveName.trim();
    const content = saveContent.trim();
    if (!name) {
      onToast?.("이름을 입력해 주세요.");
      return;
    }
    const note = addPersonalCaseNote({
      name,
      content: content || digits,
      digits,
      source: "keypad"
    });
    if (!note) {
      onToast?.("저장에 실패했습니다.");
      return;
    }
    setSaveOpen(false);
    onToast?.(SAVE_TOAST);
  };

  return (
    <div
      className={`incall-dtmf-pad incall-dtmf-pad--stage${fill ? " incall-dtmf-pad--fill" : ""} ${
        leaving ? "is-leaving" : "is-entering"
      } ${className}`.trim()}
      role="group"
      aria-label="다이얼 패드"
    >
      <div
        className={`incall-dtmf-pad__display${digits ? " has-digits" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="incall-dtmf-pad__display-main">
          {digits ? (
            <span key={digitPulse} className="incall-dtmf-pad__display-value">
              {digits}
            </span>
          ) : (
            <span className="incall-dtmf-pad__display-placeholder">번호를 입력하세요</span>
          )}
        </div>
        <button
          type="button"
          className="incall-dtmf-pad__backspace"
          onClick={onBackspace}
          disabled={!digits}
          aria-label="한 글자 지우기"
        >
          <Delete className="incall-dtmf-pad__backspace-icon" strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      <div className="incall-dtmf-pad__grid">
        {DTMF_KEYS.map((d) => (
          <button
            key={d}
            type="button"
            className={`incall-dtmf-pad__key${tapped === d ? " is-tap" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              onPadDown(d);
            }}
            onPointerUp={onPadUp}
            onPointerLeave={onPadUp}
            onPointerCancel={onPadUp}
          >
            <span className="incall-dtmf-pad__key-label" aria-hidden>
              {d}
            </span>
            <span className="incall-dtmf-pad__key-flash" aria-hidden />
          </button>
        ))}
      </div>

      <div className="incall-dtmf-pad__actions">
        <button type="button" className="incall-dtmf-pad__save" onClick={openSaveForm} disabled={!digits}>
          저장
        </button>
        <button type="button" className="incall-dtmf-pad__close" onClick={handleClose}>
          닫기
        </button>
      </div>

      {saveOpen ? (
        <div
          className="incall-dtmf-save-modal"
          role="dialog"
          aria-modal="true"
          aria-label="개인케이스 저장"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="incall-dtmf-save-modal__card">
            <h3 className="incall-dtmf-save-modal__title">개인케이스함 저장</h3>
            <p className="incall-dtmf-save-modal__digits">{digits}</p>
            <label className="incall-dtmf-save-modal__field">
              <span>이름</span>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="이름 입력"
                autoFocus
                maxLength={40}
              />
            </label>
            <label className="incall-dtmf-save-modal__field">
              <span>내용</span>
              <textarea
                value={saveContent}
                onChange={(e) => setSaveContent(e.target.value)}
                placeholder="내용 입력"
                rows={3}
                maxLength={500}
              />
            </label>
            <div className="incall-dtmf-save-modal__actions">
              <button type="button" className="incall-dtmf-save-modal__cancel" onClick={() => setSaveOpen(false)}>
                취소
              </button>
              <button type="button" className="incall-dtmf-save-modal__confirm" onClick={confirmSave}>
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
