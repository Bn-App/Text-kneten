import { useState } from 'react';
import type { Page } from '../model/document';

interface OriginalPageModalProps {
  pages: Page[];
  open: boolean;
  onClose: () => void;
}

export function OriginalPageModal({ pages, open, onClose }: OriginalPageModalProps) {
  const [index, setIndex] = useState(0);
  if (!open) return null;

  const sorted = [...pages].sort((a, b) => a.index - b.index);
  const page = sorted[Math.min(index, Math.max(0, sorted.length - 1))];

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box original-page-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Schließen">
          ×
        </button>
        <div className="modal-title">Originalseite</div>

        {!page?.imageDataUrl ? (
          <p className="text-muted">Keine Originalseite verfügbar.</p>
        ) : (
          <>
            <img className="original-page-image" src={page.imageDataUrl} alt={`Originalseite ${page.index + 1}`} />
            {sorted.length > 1 && (
              <div className="original-page-nav">
                <button className="btn" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                  ‹ Zurück
                </button>
                <span>
                  Seite {index + 1} / {sorted.length}
                </span>
                <button
                  className="btn"
                  disabled={index === sorted.length - 1}
                  onClick={() => setIndex((i) => Math.min(sorted.length - 1, i + 1))}
                >
                  Weiter ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
