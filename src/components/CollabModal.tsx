import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { CollabStatus } from '../lib/collab/useCollab';

interface CollabModalProps {
  open: boolean;
  roomUrl: string | null;
  status: CollabStatus;
  connectedCount: number;
  isHost: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onLeave: () => void;
}

export function CollabModal({
  open,
  roomUrl,
  status,
  connectedCount,
  isHost,
  errorMessage,
  onClose,
  onLeave,
}: CollabModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!roomUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(roomUrl, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [roomUrl]);

  if (!open) return null;

  const statusText =
    status === 'connecting'
      ? 'Verbinde…'
      : status === 'waiting'
        ? 'Warte auf Verbindung…'
        : status === 'connected'
          ? isHost
            ? `${connectedCount} Gerät${connectedCount === 1 ? '' : 'e'} verbunden`
            : 'Verbunden'
          : status === 'error'
            ? (errorMessage ?? 'Fehler')
            : 'Nicht verbunden';

  const dotClass = status === 'waiting' || status === 'connected' ? 'on' : status === 'error' ? 'err' : '';

  function copyLink() {
    if (roomUrl) navigator.clipboard.writeText(roomUrl);
  }

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-title">🤝 Gemeinsam arbeiten</div>
        <p className="modal-sub">
          Scanne den QR-Code oder teile den Link — Änderungen werden live synchronisiert.
        </p>
        {qrDataUrl && (
          <div id="qr-wrap">
            <img src={qrDataUrl} alt="QR-Code für Kollaborations-Link" width={160} height={160} />
          </div>
        )}
        <div className="collab-url-row">
          <input id="collab-url-inp" readOnly value={roomUrl ?? ''} />
          <button className="btn primary" onClick={copyLink}>
            Kopieren
          </button>
        </div>
        <div className="s-row">
          <div className={`s-dot ${dotClass}`.trim()} />
          <span>{statusText}</span>
        </div>
        <button className="btn btn-danger" onClick={onLeave}>
          Raum beenden
        </button>
      </div>
    </div>
  );
}
