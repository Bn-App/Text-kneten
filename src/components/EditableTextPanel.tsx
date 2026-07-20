import type { Line, Mark, NamedMarkGroup, TextDocument } from '../model/document';
import { MarkableText, type HighlightMode, type InteractionMode, type MarkTool } from './MarkableText';

interface EditableTextPanelProps {
  text: string;
  lines: Line[];
  onChange: (text: string) => void;
  onConfirm: () => void;
  onShowOriginal?: () => void;
}

const LOW_CONFIDENCE_THRESHOLD = 70;

export function EditableTextPanel({ text, lines, onChange, onConfirm, onShowOriginal }: EditableTextPanelProps) {
  const lowConfidenceLines = lines.filter(
    (l) => l.confidence !== undefined && l.confidence < LOW_CONFIDENCE_THRESHOLD,
  );

  return (
    <div className="editable-text-panel">
      {(lowConfidenceLines.length > 0 || onShowOriginal) && (
        <div className="editable-text-hints-row">
          {lowConfidenceLines.length > 0 && (
            <p className="low-confidence-hint">
              {lowConfidenceLines.length} Zeile(n) mit niedriger Erkennungssicherheit — bitte prüfen.
            </p>
          )}
          {onShowOriginal && (
            <button className="btn" onClick={onShowOriginal}>
              🖼️ Originalseite anzeigen
            </button>
          )}
        </div>
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

const ASSIGN_HINT: Record<MarkTool, string> = {
  wortfeld: 'Klicke eine markierte Stelle, um ihr ein Wortfeld zuzuweisen.',
  sinnabschnitt: 'Klicke eine markierte Stelle, um sie einer Beobachtung Inhalt/Aufbau zuzuweisen.',
  sprache: 'Klicke eine markierte Stelle, um ihr eine sprachliche Auffälligkeit zuzuweisen.',
  'lyrisches-ich': 'Klicke eine markierte Stelle, um sie dem lyrischen Ich zuzuweisen.',
  figur: 'Klicke eine markierte Stelle, um sie einer Figur zuzuweisen.',
  'formale-aspekte': 'Klicke eine markierte Stelle, um sie einem formalen Aspekt zuzuweisen.',
};

interface ReadOnlyTextPanelProps {
  doc: TextDocument;
  highlightMode: HighlightMode;
  interactionMode: InteractionMode;
  assignTool: MarkTool | null;
  onCreateMarks: (marks: Mark[]) => void;
  onDeleteMarkGroup: (groupId: string) => void;
  onAssignGroup: (tool: MarkTool, groupId: string, entityId: string) => void;
  onCreateGroupAndAssign: (tool: MarkTool, groupId: string) => void;
  onExitAssignMode?: () => void;
  onShowOriginal?: () => void;
}

export function ReadOnlyTextPanel({
  doc,
  highlightMode,
  interactionMode,
  assignTool,
  onCreateMarks,
  onDeleteMarkGroup,
  onAssignGroup,
  onCreateGroupAndAssign,
  onExitAssignMode,
  onShowOriginal,
}: ReadOnlyTextPanelProps) {
  const hint =
    interactionMode === 'assign' && assignTool
      ? ASSIGN_HINT[assignTool]
      : 'Dieser Arbeitsbereich ist gesperrt. Wechsle zu „Bearbeiten“, um den Text zu ändern — markieren kannst du hier trotzdem.';

  const groups: Record<MarkTool, NamedMarkGroup[]> = {
    wortfeld: doc.wortfelder,
    sinnabschnitt: doc.sinnabschnitte,
    sprache: doc.sprachmittel,
    'lyrisches-ich': doc.lyrischesIch,
    figur: doc.figuren,
    'formale-aspekte': doc.formaleAspekte,
  };

  return (
    <div className="editable-text-panel">
      <div className="locked-hint-row">
        <p className="locked-hint">🔒 {hint}</p>
        {onShowOriginal && (
          <button className="btn" onClick={onShowOriginal}>
            🖼️ Originalseite anzeigen
          </button>
        )}
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
        groups={groups}
        highlightMode={highlightMode}
        interactionMode={interactionMode}
        assignTool={assignTool}
        onCreateMarks={onCreateMarks}
        onDeleteMarkGroup={onDeleteMarkGroup}
        onAssignGroup={onAssignGroup}
        onCreateGroupAndAssign={onCreateGroupAndAssign}
      />
    </div>
  );
}

