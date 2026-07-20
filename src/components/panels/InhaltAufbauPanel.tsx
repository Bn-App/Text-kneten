import type { Sinnabschnitt } from '../../model/document';

interface InhaltAufbauPanelProps {
  sinnabschnitte: Sinnabschnitt[];
  onRename: (id: string, title: string) => void;
  onUpdateSummary: (id: string, summary: string) => void;
}

export function InhaltAufbauPanel({ sinnabschnitte, onRename, onUpdateSummary }: InhaltAufbauPanelProps) {
  const sorted = [...sinnabschnitte].sort((a, b) => a.order - b.order);

  return (
    <div className="panel-box">
      <h3>Inhalt/Aufbau</h3>
      {sorted.length === 0 ? (
        <p className="text-muted">
          Noch keine Sinnabschnitte markiert. Markiere im Arbeitsbereich einen Textabschnitt und wähle
          „Sinnabschnitt“.
        </p>
      ) : (
        <div className="sinnabschnitt-list">
          {sorted.map((s) => (
            <div key={s.id} className="sinnabschnitt-item">
              <label className="panel-field">
                <span className="panel-field-label">Überschrift Abschnitt {s.order + 1}</span>
                <input
                  type="text"
                  value={s.title}
                  placeholder={`Abschnitt ${s.order + 1}`}
                  onChange={(e) => onRename(s.id, e.target.value)}
                />
              </label>
              <label className="panel-field">
                <span className="panel-field-label">Kurze Zusammenfassung</span>
                <textarea
                  className="panel-textarea"
                  rows={3}
                  value={s.summary}
                  placeholder="Worum geht es in diesem Abschnitt?"
                  onChange={(e) => onUpdateSummary(s.id, e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
