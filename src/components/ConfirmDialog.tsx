interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Löschen', onCancel, onConfirm }: ConfirmDialogProps) {
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
        <div className="modal-title">{title}</div>
        <p className="modal-sub">{message}</p>
        <div className="new-doc-confirm-actions">
          <button className="btn" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
