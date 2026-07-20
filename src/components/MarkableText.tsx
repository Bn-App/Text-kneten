import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Line, Mark, Paragraph, Sinnabschnitt } from '../model/document';
import { captureSelectionAsSegments, segmentsToMarks } from '../lib/marks/captureSelection';

export type HighlightMode =
  | 'none'
  | 'all'
  | 'hidden'
  | { wortfeld: string | 'none' }
  | { sinnabschnitt: string }
  | { tool: 'wortfeld' | 'sinnabschnitt' };
export type InteractionMode = 'mark' | 'assign';

interface MarkableTextProps {
  lines: Line[];
  paragraphs: Paragraph[];
  marks: Mark[];
  sinnabschnitte: Sinnabschnitt[];
  highlightMode: HighlightMode;
  interactionMode: InteractionMode;
  onCreateMarks: (marks: Mark[]) => void;
  onDeleteMarkGroup: (groupId: string) => void;
  onSetWortfeldLabel: (groupId: string, value: string) => void;
  onAssignSinnabschnitt: (groupId: string, sinnabschnittId: string) => void;
  onCreateSinnabschnittAndAssign: (groupId: string) => void;
}

const MARK_COLORS = [
  '#fde68a',
  '#fca5a5',
  '#fdba74',
  '#fef08a',
  '#bbf7d0',
  '#86efac',
  '#99f6e4',
  '#a5f3fc',
  '#bfdbfe',
  '#c7d2fe',
  '#ddd6fe',
  '#fbcfe8',
];

// List of things you can do with a marking. More entries will be added here
// as further analysis tools ship.
const MARK_ACTIONS: { id: 'wortfeld' | 'sinnabschnitt'; label: string }[] = [
  { id: 'wortfeld', label: 'Wortfeld' },
  { id: 'sinnabschnitt', label: 'Sinnabschnitt' },
];

type CreationPopover =
  | { step: 'color'; rect: DOMRect }
  | { step: 'actions'; rect: DOMRect; groupId: string }
  | { step: 'wortfeld'; rect: DOMRect; groupId: string }
  | { step: 'sinnabschnitt'; rect: DOMRect; groupId: string };

function sinnabschnittLabel(s: Sinnabschnitt): string {
  return s.title.trim() || `Abschnitt ${s.order + 1}`;
}

/** Whether the current highlight mode is a "show wortfeld marks" view — the
 * only situation in which we draw connector lines between same-field marks. */
function isWortfeldView(highlightMode: HighlightMode): boolean {
  if (typeof highlightMode === 'string') return false;
  if ('tool' in highlightMode) return highlightMode.tool === 'wortfeld';
  return 'wortfeld' in highlightMode && highlightMode.wortfeld !== 'none';
}

interface ConnectionLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function isMarkVisible(mark: Mark, highlightMode: HighlightMode): boolean {
  if (highlightMode === 'hidden') return false;
  if (highlightMode === 'none' || highlightMode === 'all') return true;
  if ('tool' in highlightMode) {
    return highlightMode.tool === 'wortfeld' ? !!mark.labels.wortfeld : !!mark.labels.sinnabschnitt;
  }
  if ('sinnabschnitt' in highlightMode) return mark.labels.sinnabschnitt === highlightMode.sinnabschnitt;
  const wf = mark.labels.wortfeld;
  return highlightMode.wortfeld === 'none' ? !wf : wf === highlightMode.wortfeld;
}

function renderLineContent(
  text: string,
  lineMarks: Mark[],
  highlightMode: HighlightMode,
  onMarkClick: (mark: Mark, rect: DOMRect) => void,
): ReactNode {
  if (lineMarks.length === 0) return text;
  const sorted = [...lineMarks].sort((a, b) => a.startOffset - b.startOffset);
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const mark of sorted) {
    const start = Math.max(mark.startOffset, cursor);
    const end = Math.max(mark.endOffset, start);
    if (start > cursor) parts.push(text.slice(cursor, start));
    const segText = text.slice(start, end);
    if (segText) {
      if (isMarkVisible(mark, highlightMode)) {
        parts.push(
          <mark
            key={mark.id}
            data-mark-id={mark.id}
            className="mt-mark"
            style={{ backgroundColor: mark.color }}
            onClick={(e) => {
              e.stopPropagation();
              onMarkClick(mark, (e.target as HTMLElement).getBoundingClientRect());
            }}
          >
            {segText}
          </mark>,
        );
      } else {
        parts.push(segText);
      }
    }
    cursor = end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function MarkableText({
  lines,
  paragraphs,
  marks,
  sinnabschnitte,
  highlightMode,
  interactionMode,
  onCreateMarks,
  onDeleteMarkGroup,
  onSetWortfeldLabel,
  onAssignSinnabschnitt,
  onCreateSinnabschnittAndAssign,
}: MarkableTextProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pendingSegmentsRef = useRef<ReturnType<typeof captureSelectionAsSegments>>([]);
  const [creationPopover, setCreationPopover] = useState<CreationPopover | null>(null);
  const [markPopover, setMarkPopover] = useState<{ mark: Mark; rect: DOMRect } | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [connectionLines, setConnectionLines] = useState<ConnectionLine[]>([]);

  const showWortfeldConnections = isWortfeldView(highlightMode);

  useLayoutEffect(() => {
    if (!showWortfeldConnections || !textRef.current) {
      setConnectionLines([]);
      return;
    }
    const container = textRef.current;

    function recompute() {
      const containerRect = container.getBoundingClientRect();
      const centersByField = new Map<string, { x: number; y: number }[]>();

      container.querySelectorAll<HTMLElement>('mark[data-mark-id]').forEach((el) => {
        const mark = marks.find((m) => m.id === el.dataset.markId);
        const field = mark?.labels.wortfeld;
        if (!field) return;
        const r = el.getBoundingClientRect();
        const point = { x: r.left + r.width / 2 - containerRect.left, y: r.top + r.height / 2 - containerRect.top };
        const arr = centersByField.get(field) ?? [];
        arr.push(point);
        centersByField.set(field, arr);
      });

      const lines: ConnectionLine[] = [];
      centersByField.forEach((points, field) => {
        for (let i = 0; i < points.length - 1; i++) {
          lines.push({
            id: `${field}-${i}`,
            x1: points[i].x,
            y1: points[i].y,
            x2: points[i + 1].x,
            y2: points[i + 1].y,
          });
        }
      });
      setConnectionLines(lines);
    }

    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [showWortfeldConnections, marks, lines, highlightMode]);

  const anyPopoverOpen = creationPopover !== null || markPopover !== null;
  useEffect(() => {
    if (!anyPopoverOpen) return;
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCreationPopover(null);
        setMarkPopover(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [anyPopoverOpen]);

  const existingWortfelder = Array.from(
    new Set(marks.map((m) => m.labels.wortfeld).filter((v): v is string => !!v)),
  ).sort((a, b) => a.localeCompare(b));

  const paragraphOrder = [...paragraphs].sort((a, b) => a.order - b.order).map((p) => p.id);
  const linesByParagraph = new Map<string, Line[]>();
  for (const line of [...lines].sort((a, b) => a.order - b.order)) {
    const arr = linesByParagraph.get(line.paragraphId) ?? [];
    arr.push(line);
    linesByParagraph.set(line.paragraphId, arr);
  }
  const marksByLine = new Map<string, Mark[]>();
  for (const mark of marks) {
    const arr = marksByLine.get(mark.lineId) ?? [];
    arr.push(mark);
    marksByLine.set(mark.lineId, arr);
  }

  function handleMouseUp() {
    if (interactionMode !== 'mark' || !rootRef.current) return;
    const segments = captureSelectionAsSegments(rootRef.current);
    if (segments.length === 0) return;
    const sel = window.getSelection();
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (!rect) return;
    pendingSegmentsRef.current = segments;
    setCreationPopover({ step: 'color', rect });
  }

  function pickColor(color: string) {
    const segments = pendingSegmentsRef.current;
    if (segments.length === 0 || !creationPopover) {
      setCreationPopover(null);
      return;
    }
    const newMarks = segmentsToMarks(segments, color);
    onCreateMarks(newMarks);
    window.getSelection()?.removeAllRanges();
    setCreationPopover({ step: 'actions', rect: creationPopover.rect, groupId: newMarks[0].groupId });
  }

  function pickAction(actionId: 'wortfeld' | 'sinnabschnitt') {
    if (!creationPopover || creationPopover.step !== 'actions') return;
    setLabelInput('');
    setCreationPopover({ step: actionId, rect: creationPopover.rect, groupId: creationPopover.groupId });
  }

  function submitCreationWortfeld(value: string) {
    if (creationPopover?.step === 'wortfeld') onSetWortfeldLabel(creationPopover.groupId, value.trim());
    setCreationPopover(null);
  }

  function handleMarkClick(mark: Mark, rect: DOMRect) {
    setMarkPopover({ mark, rect });
    setLabelInput(mark.labels.wortfeld ?? '');
  }

  function submitMarkLabel(value: string) {
    if (markPopover) onSetWortfeldLabel(markPopover.mark.groupId, value.trim());
    setMarkPopover(null);
  }

  function wortfeldPickerBody(onSubmit: (value: string) => void) {
    return (
      <>
        {existingWortfelder.length > 0 && (
          <div className="mt-wortfeld-existing">
            {existingWortfelder.map((name) => (
              <button key={name} className="mt-wortfeld-chip" onClick={() => onSubmit(name)}>
                {name}
              </button>
            ))}
          </div>
        )}
        <input
          autoFocus
          className="mt-label-input"
          value={labelInput}
          placeholder="Neues Wortfeld…"
          onChange={(e) => setLabelInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit(labelInput);
            if (e.key === 'Escape') {
              setCreationPopover(null);
              setMarkPopover(null);
            }
          }}
        />
      </>
    );
  }

  function sinnabschnittPickerBody() {
    const sorted = [...sinnabschnitte].sort((a, b) => a.order - b.order);
    return (
      <div className="mt-wortfeld-existing">
        {sorted.map((s) => (
          <button
            key={s.id}
            className="mt-wortfeld-chip"
            onClick={() => {
              if (creationPopover?.step === 'sinnabschnitt') onAssignSinnabschnitt(creationPopover.groupId, s.id);
              setCreationPopover(null);
            }}
          >
            {sinnabschnittLabel(s)}
          </button>
        ))}
        <button
          className="mt-wortfeld-chip new"
          onClick={() => {
            if (creationPopover?.step === 'sinnabschnitt') onCreateSinnabschnittAndAssign(creationPopover.groupId);
            setCreationPopover(null);
          }}
        >
          + Neuer Abschnitt
        </button>
      </div>
    );
  }

  const popoverRect = creationPopover?.rect ?? markPopover?.rect ?? null;

  return (
    <div
      ref={rootRef}
      className={`markable-text${highlightMode === 'all' ? ' mt-dimmed' : ''}`}
      onMouseUp={handleMouseUp}
    >
      <div ref={textRef} className="mt-text-body">
        {paragraphOrder.map((paragraphId) => (
          <div key={paragraphId} className="mt-paragraph">
            {(linesByParagraph.get(paragraphId) ?? []).map((line) => (
              <div key={line.id} data-line-id={line.id} className="mt-line">
                {renderLineContent(line.text, marksByLine.get(line.id) ?? [], highlightMode, handleMarkClick)}
              </div>
            ))}
          </div>
        ))}

        {connectionLines.length > 0 && (
          <svg className="mt-connections" aria-hidden="true">
            {connectionLines.map((l) => (
              <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </svg>
        )}
      </div>

      {popoverRect && (creationPopover || markPopover) && (
        <div
          ref={popoverRef}
          className="mt-popover"
          style={{ position: 'fixed', top: popoverRect.bottom + 6, left: popoverRect.left }}
        >
          {creationPopover?.step === 'color' && (
            <div className="mt-color-swatches">
              {MARK_COLORS.map((c) => (
                <button
                  key={c}
                  className="mt-color-swatch"
                  style={{ backgroundColor: c }}
                  onClick={() => pickColor(c)}
                  title={c}
                />
              ))}
            </div>
          )}

          {creationPopover?.step === 'actions' && (
            <div className="mt-action-list">
              {MARK_ACTIONS.map((action) => (
                <button key={action.id} className="mt-action-item" onClick={() => pickAction(action.id)}>
                  {action.label}
                </button>
              ))}
              <button className="mt-action-item muted" onClick={() => setCreationPopover(null)}>
                Fertig
              </button>
            </div>
          )}

          {creationPopover?.step === 'wortfeld' && wortfeldPickerBody(submitCreationWortfeld)}
          {creationPopover?.step === 'sinnabschnitt' && sinnabschnittPickerBody()}

          {markPopover && interactionMode === 'mark' && (
            <button
              className="btn btn-danger"
              onClick={() => {
                onDeleteMarkGroup(markPopover.mark.groupId);
                setMarkPopover(null);
              }}
            >
              × Markierung entfernen
            </button>
          )}

          {markPopover && interactionMode === 'assign' && wortfeldPickerBody(submitMarkLabel)}
        </div>
      )}
    </div>
  );
}
