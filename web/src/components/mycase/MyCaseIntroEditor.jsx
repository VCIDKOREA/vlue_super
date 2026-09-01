import { useEffect, useState } from "react";
import { writeAppSettings } from "../../lib/vlueAppSettings.js";
import {
  clipIntroLines,
  introNeedsMoreLines,
  INTRO_PREVIEW_LINES
} from "../../lib/mycase/mycaseIntroRichText.js";
import MyCaseIntroRichText from "./MyCaseIntroRichText.jsx";

const MAX_LEN = 200;

/**
 * 케이스함 프로필 — 이름 아래 케이스 소개글 (텍스트·링크)
 */
export default function MyCaseIntroEditor({ value = "", onSaved }) {
  const saved = String(value || "");
  const [editing, setEditing] = useState(!saved.trim());
  const [draft, setDraft] = useState(saved);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(saved);
  }, [saved, editing]);

  useEffect(() => {
    setExpanded(false);
  }, [saved]);

  const persist = (next) => {
    const normalized = String(next || "")
      .replace(/\r\n/g, "\n")
      .trim()
      .slice(0, MAX_LEN);
    writeAppSettings({ statusMessage: normalized });
    onSaved?.(normalized);
    setEditing(!normalized);
    setDraft(normalized);
    setExpanded(false);
  };

  if (editing) {
    return (
      <div className="ig-mycase__intro">
        <textarea
          className="ig-mycase__intro-input"
          value={draft}
          maxLength={MAX_LEN}
          rows={4}
          placeholder="케이스 소개글 또는 링크를 입력하세요"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              persist(draft);
            }
          }}
        />
        <div className="ig-mycase__intro-actions">
          <button
            type="button"
            className="ig-mycase__intro-btn ig-mycase__intro-btn--primary"
            onClick={() => persist(draft)}
          >
            확인
          </button>
          {saved.trim() ? (
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

  if (!saved.trim()) return null;

  const needsMore = introNeedsMoreLines(saved, INTRO_PREVIEW_LINES);
  const visibleText = expanded || !needsMore ? saved : clipIntroLines(saved, INTRO_PREVIEW_LINES);

  return (
    <div className="ig-mycase__intro">
      <p className="ig-mycase__status ig-mycase__status--linked">
        <MyCaseIntroRichText text={visibleText} />
        {needsMore && !expanded ? (
          <button
            type="button"
            className="ig-mycase__intro-more"
            onClick={() => setExpanded(true)}
          >
            …더보기
          </button>
        ) : null}
      </p>
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
