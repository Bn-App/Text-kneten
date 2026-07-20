import { useRef } from 'react';
import { HypothesisGenerator } from '../HypothesisGenerator';

interface HypothesePanelProps {
  hypothese: string;
  onChange: (value: string) => void;
}

export function HypothesePanel({ hypothese, onChange }: HypothesePanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(snippet: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(hypothese + (hypothese ? ' ' : '') + snippet);
      return;
    }
    const start = ta.selectionStart ?? hypothese.length;
    const end = ta.selectionEnd ?? hypothese.length;
    const before = hypothese.slice(0, start);
    const after = hypothese.slice(end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const insertion = (needsLeadingSpace ? ' ' : '') + snippet;
    onChange(before + insertion + after);

    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="panel-box">
      <h3>Hypothese</h3>
      <HypothesisGenerator onInsert={insertAtCursor} />
      <textarea
        ref={textareaRef}
        className="panel-textarea"
        value={hypothese}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Formuliere hier deine Lese-Hypothese…"
      />
    </div>
  );
}
