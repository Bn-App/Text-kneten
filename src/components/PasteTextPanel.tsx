import { useState } from 'react';

interface PasteTextPanelProps {
  onTextSubmit: (text: string) => void;
  disabled?: boolean;
}

export function PasteTextPanel({ onTextSubmit, disabled }: PasteTextPanelProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  if (!open) {
    return (
      <button className="btn paste-text-toggle" onClick={() => setOpen(true)} disabled={disabled}>
        ✍️ Stattdessen Text einfügen
      </button>
    );
  }

  function submit() {
    if (!text.trim()) return;
    onTextSubmit(text);
    setOpen(false);
    setText('');
  }

  return (
    <div className="paste-text-panel">
      <textarea
        autoFocus
        rows={10}
        value={text}
        placeholder="Text hier einfügen oder eintippen…"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="paste-text-actions">
        <button
          className="btn"
          onClick={() => {
            setOpen(false);
            setText('');
          }}
        >
          Abbrechen
        </button>
        <button className="btn primary" disabled={!text.trim()} onClick={submit}>
          ✓ Text übernehmen
        </button>
      </div>
    </div>
  );
}
