import type { Line, Mark, TextDocument } from '../model/document';
import { MarkableText, type HighlightMode, type InteractionMode } from './MarkableText';

interface EditableTextPanelProps {
  text: string;
  lines: Line[];
  onChange: (text: string) => void;
  onConfirm: () => void;
}

const LOW_CONFIDENCE_THRESHOLD = 70;

export function EditableTextPanel({ text, lines, onChange, onConfirm }: EditableTextPanelProps) {
  const lowConfidenceLines = lines.filter(
    (l) => l.confidence !== undefined && l.confidence < LOW_CONFIDENCE_THRESHOLD,
  );

  return (
    <div className="editable-text-panel">
      {lowConfidenceLines.length > 0 && (
        <p className="low-confidence-hint">
          {lowConfidenceLines.length} Zeile(n) mit niedriger Erkennungssicherheit — bitte prüfen.
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        spellCheck={false}
      />
      <div className="editable-text-actions">
        <button className="btn primary" onClick={onConfirm}>
          ✓ Als Arbeitsbereich übernehmen
        </button>
      </div>
    </div>
  );
}

interface ReadOnlyTextPanelProps {
  doc: TextDocument;
  highlightMode: HighlightMode;
  interactionMode: InteractionMode;
  onCreateMarks: (marks: Mark[]) => void;
  onDeleteMarkGroup: (groupId: string) => void;
  onSetWortfeldLabel: (groupId: string, value: string) => void;
  onAssignSinnabschnitt: (groupId: string, sinnabschnittId: string) => void;
  onCreateSinnabschnittAndAssign: (groupId: string) => void;
  onExitAssignMode?: () => void;
}

export function ReadOnlyTextPanel({
  doc,
  highlightMode,
  interactionMode,
  onCreateMarks,
  onDeleteMarkGroup,
  onSetWortfeldLabel,
  onAssignSinnabschnitt,
  onCreateSinnabschnittAndAssign,
  onExitAssignMode,
}: ReadOnlyTextPanelProps) {
  const hint =
    interactionMode === 'assign'
      ? 'Klicke eine markierte Stelle, um ihr ein Wortfeld zuzuweisen.'
      : 'Dieser Arbeitsbereich ist gesperrt. Wechsle zu „Bearbeiten“, um den Text zu ändern — markieren kannst du hier trotzdem.';

  return (
    <div className="editable-text-panel">
      <div className="locked-hint-row">
        <p className="locked-hint">🔒 {hint}</p>
        {interactionMode === 'assign' && onExitAssignMode && (
          <button className="btn" onClick={onExitAssignMode}>
            Fertig
          </button>
        )}
      </div>
      <MarkableText
        lines={doc.lines}
        paragraphs={doc.paragraphs}
        marks={doc.marks}
        sinnabschnitte={doc.sinnabschnitte}
        highlightMode={highlightMode}
        interactionMode={interactionMode}
        onCreateMarks={onCreateMarks}
        onDeleteMarkGroup={onDeleteMarkGroup}
        onSetWortfeldLabel={onSetWortfeldLabel}
        onAssignSinnabschnitt={onAssignSinnabschnitt}
        onCreateSinnabschnittAndAssign={onCreateSinnabschnittAndAssign}
      />
    </div>
  );
}

