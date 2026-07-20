interface NewDocumentConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onSaveAndProceed: () => void;
  onProceedWithoutSaving: () => void;
}

export function NewDocumentConfirmModal({
  open,
  onCancel,
  onSaveAndProceed,
  onProceedWithoutSaving,
}: NewDocumentConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-box">
        <button className="modal-close" onClick={onCancel} title="Schließen">
          ×
        </button>
        <div className="modal-title">Neues Dokument beginnen?</div>
        <p className="modal-sub">
          Bist du sicher? Der aktuelle Fortschritt wird danach nicht mehr automatisch geöffnet. Möchtest du ihn
          zuerst als Datei speichern?
        </p>
        <div className="new-doc-confirm-actions">
          <button className="btn" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn btn-danger" onClick={onProceedWithoutSaving}>
            Ohne Speichern fortfahren
          </button>
          <button className="btn primary" onClick={onSaveAndProceed}>
            💾 Speichern &amp; fortfahren
          </button>
        </div>
      </div>
    </div>
  );
}
