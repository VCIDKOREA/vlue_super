import { useEffect, useState } from "react";
import { writeAppSettings } from "../../lib/vlueAppSettings.js";

const MAX_LEN = 200;

function renderLinkedText(text) {
  const parts = String(text || "").split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={`link-${i}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

/**
 * 케이스함 프로필 — 이름 아래 케이스 소개글 (텍스트·링크)
 */
export default function MyCaseIntroEditor({ value = "", onSaved }) {
  const saved = String(value || "").trim();
  const [editing, setEditing] = useState(!saved);
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    if (!editing) setDraft(saved);
  }, [saved, editing]);

  const persist = (next) => {
    const trimmed = String(next || "").trim().slice(0, MAX_LEN);
    writeAppSettings({ statusMessage: trimmed });
    onSaved?.(trimmed);
    setEditing(!trimmed);
    setDraft(trimmed);
  };

  if (editing) {
    return (
      <div className="ig-mycase__intro">
        <textarea
          className="ig-mycase__intro-input"
          value={draft}
          maxLength={MAX_LEN}
          rows={2}
          placeholder="케이스 소개글 또는 링크를 입력하세요"
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="ig-mycase__intro-actions">
          <button
            type="button"
            className="ig-mycase__intro-btn ig-mycase__intro-btn--primary"
            onClick={() => persist(draft)}
          >
            확인
          </button>
          {saved ? (
            <button
              type="button"
              className="ig-mycase__intro-btn"
              onClick={() => {
                setDraft(saved);
                setEditing(false);
              }}
            >
              취소
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!saved) return null;

  return (
    <div className="ig-mycase__intro">
      <p className="ig-mycase__status ig-mycase__status--linked">{renderLinkedText(saved)}</p>
      <div className="ig-mycase__intro-actions">
        <button
          type="button"
          className="ig-mycase__intro-btn"
          onClick={() => {
            setDraft(saved);
            setEditing(true);
          }}
        >
          수정
        </button>
        <button
          type="button"
          className="ig-mycase__intro-btn ig-mycase__intro-btn--danger"
          onClick={() => persist("")}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
