import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Line, Mark, MarkStyle, NamedMarkGroup, Paragraph } from '../model/document';
import { captureSelectionAsSegments, segmentsToMarks } from '../lib/marks/captureSelection';
import { computeTextRows, type TextRow } from '../lib/text/lineNumbers';

export type MarkTool = 'wortfeld' | 'sinnabschnitt' | 'sprache' | 'lyrisches-ich' | 'figur' | 'formale-aspekte';

export type HighlightMode =
  | 'none'
  | 'all'
  | 'hidden'
  | { tool: MarkTool }
  | { group: { tool: MarkTool; id: string } }
  | { unassigned: MarkTool };
export type InteractionMode = 'mark' | 'assign';

interface MarkableTextProps {
  lines: Line[];
  paragraphs: Paragraph[];
  marks: Mark[];
  groups: Record<MarkTool, NamedMarkGroup[]>;
  highlightMode: HighlightMode;
  interactionMode: InteractionMode;
  assignTool: MarkTool | null;
  onCreateMarks: (marks: Mark[]) => void;
  onDeleteMarkGroup: (groupId: string) => void;
  onAssignGroup: (tool: MarkTool, groupId: string, entityId: string) => void;
  onCreateGroupAndAssign: (tool: MarkTool, groupId: string) => void;
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
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#2dd4bf',
  '#38bdf8',
  '#818cf8',
  '#e879f9',
  '#f472b6',
  '#a3a3a3',
  '#78716c',
  '#57534e',
];

// Every analysis tool that produces named, assignable marks. Extend here as
// further marking-based tools ship.
const TOOL_META: Record<MarkTool, { actionLabel: string; fallbackPrefix: string; newLabel: string }> = {
  wortfeld: { actionLabel: 'Wortfeld', fallbackPrefix: 'Wortfeld', newLabel: '+ Neues Wortfeld' },
  sinnabschnitt: {
    actionLabel: 'Beobachtungen Inhalt/Aufbau',
    fallbackPrefix: 'Abschnitt',
    newLabel: '+ Neuer Abschnitt',
  },
  sprache: {
    actionLabel: 'Sprache',
    fallbackPrefix: 'sprachliche Auffälligkeit',
    newLabel: '+ Neue sprachliche Auffälligkeit',
  },
  'lyrisches-ich': { actionLabel: 'Lyrisches Ich', fallbackPrefix: 'Beobachtung', newLabel: '+ Neue Beobachtung' },
  figur: { actionLabel: 'Figuren', fallbackPrefix: 'Figur', newLabel: '+ Neue Figur' },
  'formale-aspekte': {
    actionLabel: 'Formale Aspekte',
    fallbackPrefix: 'Beobachtung',
    newLabel: '+ Neue Beobachtung',
  },
};

const MARK_ACTIONS: { id: MarkTool; label: string }[] = (
  Object.keys(TOOL_META) as MarkTool[]
).map((id) => ({ id, label: TOOL_META[id].actionLabel }));

type CreationPopover =
  | { step: 'color'; rect: DOMRect }
  | { step: 'actions'; rect: DOMRect; groupId: string }
  | { step: MarkTool; rect: DOMRect; groupId: string };

function namedGroupLabel(item: { title: string; order: number }, fallbackPrefix: string): string {
  return item.title.trim() || `${fallbackPrefix} ${item.order + 1}`;
}

/** Whether the current highlight mode is a "show all wortfeld marks" view — the
 * only situation in which we draw connector lines between same-field marks. */
function isWortfeldToolView(highlightMode: HighlightMode): boolean {
  if (typeof highlightMode === 'string') return false;
  return 'tool' in highlightMode && highlightMode.tool === 'wortfeld';
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
  if ('tool' in highlightMode) return !!mark.labels[highlightMode.tool];
  if ('unassigned' in highlightMode) return !mark.labels[highlightMode.unassigned];
  return mark.labels[highlightMode.group.tool] === highlightMode.group.id;
}

function markStyleFor(mark: Mark): CSSProperties {
  return mark.style === 'underline'
    ? {
        backgroundColor: 'transparent',
        textDecorationLine: 'underline',
        textDecorationColor: mark.color,
        textDecorationThickness: '3px',
        textUnderlineOffset: '3px',
      }
    : { backgroundColor: mark.color };
}

/**
 * Renders [rangeStart, rangeEnd) of a line, nesting marks whose ranges
 * overlap within it instead of letting an earlier mark's segment silently
 * swallow a later, overlapping one (which used to happen whenever the same
 * passage was marked twice, e.g. once per category — only the first mark's
 * color ever showed). The mark with the widest/earliest range becomes the
 * outer element; whatever overlaps it nests inside, so the most recently
 * created mark's color visually wins wherever ranges coincide, while both
 * marks stay independently clickable.
 */
function renderRange(
  text: string,
  rangeStart: number,
  rangeEnd: number,
  marks: Mark[],
  onMarkClick: (mark: Mark, rect: DOMRect) => void,
): ReactNode {
  if (rangeStart >= rangeEnd) return null;
  const relevant = marks.filter((m) => m.startOffset < rangeEnd && m.endOffset > rangeStart);
  if (relevant.length === 0) return text.slice(rangeStart, rangeEnd);

  const outer = [...relevant].sort((a, b) => {
    if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset;
    if (a.endOffset !== b.endOffset) return b.endOffset - a.endOffset;
    return a.createdAt.localeCompare(b.createdAt);
  })[0];

  const segStart = Math.max(outer.startOffset, rangeStart);
  const segEnd = Math.min(outer.endOffset, rangeEnd);
  const inner = relevant.filter((m) => m.id !== outer.id);

  const parts: ReactNode[] = [];
  const before = renderRange(text, rangeStart, segStart, marks, onMarkClick);
  if (before !== null) parts.push(before);

  const innerContent = inner.length > 0 ? renderRange(text, segStart, segEnd, inner, onMarkClick) : text.slice(segStart, segEnd);
  parts.push(
    <mark
      key={outer.id}
      data-mark-id={outer.id}
      className={`mt-mark${outer.style === 'underline' ? ' mt-mark-underline' : ''}`}
      style={markStyleFor(outer)}
      onClick={(e) => {
        e.stopPropagation();
        onMarkClick(outer, (e.target as HTMLElement).getBoundingClientRect());
      }}
    >
      {innerContent}
    </mark>,
  );

  const after = renderRange(text, segEnd, rangeEnd, marks, onMarkClick);
  if (after !== null) parts.push(after);

  return parts;
}

/** Renders a line as its numbered rows. Rows are contiguous slices of the line
 * text, so the line element's textContent still equals line.text exactly. */
function renderLineRows(
  text: string,
  rows: TextRow[],
  lineMarks: Mark[],
  highlightMode: HighlightMode,
  onMarkClick: (mark: Mark, rect: DOMRect) => void,
): ReactNode {
  const visible = lineMarks.filter((m) => isMarkVisible(m, highlightMode));
  return rows.map((row) => (
    <div
      key={row.start}
      className={`mt-row${row.number !== null && row.number % 5 === 0 ? ' mt-row-fifth' : ''}`}
      data-line-no={row.number ?? undefined}
    >
      {visible.length === 0 ? text.slice(row.start, row.end) : renderRange(text, row.start, row.end, visible, onMarkClick)}
    </div>
  ));
}

export function MarkableText({
  lines,
  paragraphs,
  marks,
  groups,
  highlightMode,
  interactionMode,
  assignTool,
  onCreateMarks,
  onDeleteMarkGroup,
  onAssignGroup,
  onCreateGroupAndAssign,
}: MarkableTextProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pendingSegmentsRef = useRef<ReturnType<typeof captureSelectionAsSegments>>([]);
  const [creationPopover, setCreationPopover] = useState<CreationPopover | null>(null);
  const [markPopover, setMarkPopover] = useState<{ mark: Mark; rect: DOMRect; step?: MarkTool } | null>(null);
  const [connectionLines, setConnectionLines] = useState<ConnectionLine[]>([]);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const lastTouchAtRef = useRef(0);

  const showWortfeldConnections = isWortfeldToolView(highlightMode);

  useLayoutEffect(() => {
    if (!showWortfeldConnections || !textRef.current) {
      setConnectionLines([]);
      return;
    }
    const container = textRef.current;

    function recompute() {
      const containerRect = container.getBoundingClientRect();
      const centersByField = new Map<string, { x: number; y: number }[]>();
      const seenMarkIds = new Set<string>();

      container.querySelectorAll<HTMLElement>('mark[data-mark-id]').forEach((el) => {
        // A mark wrapped across two numbered rows renders as two elements — connect it only once.
        const markId = el.dataset.markId ?? '';
        if (seenMarkIds.has(markId)) return;
        seenMarkIds.add(markId);
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

  const paragraphOrder = [...paragraphs].sort((a, b) => a.order - b.order).map((p) => p.id);
  const linesByParagraph = new Map<string, Line[]>();
  for (const line of [...lines].sort((a, b) => a.order - b.order)) {
    const arr = linesByParagraph.get(line.paragraphId) ?? [];
    arr.push(line);
    linesByParagraph.set(line.paragraphId, arr);
  }
  const rowsByLine = useMemo(() => computeTextRows(lines), [lines]);
  const marksByLine = new Map<string, Mark[]>();
  for (const mark of marks) {
    const arr = marksByLine.get(mark.lineId) ?? [];
    arr.push(mark);
    marksByLine.set(mark.lineId, arr);
  }

  function trySelection() {
    if (interactionMode !== 'mark' || !rootRef.current) return;
    const segments = captureSelectionAsSegments(rootRef.current);
    if (segments.length === 0) return;
    const sel = window.getSelection();
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (!rect) return;
    pendingSegmentsRef.current = segments;
    setCreationPopover({ step: 'color', rect });
  }

  function handleMouseUp() {
    // Android/touch: a synthetic 'mouseup' compatibility event usually follows
    // 'touchend' — skip it so it doesn't re-run selection capture against a
    // selection that may have changed (or been consumed) in the meantime.
    if (Date.now() - lastTouchAtRef.current < 500) return;
    trySelection();
  }

  function handleTouchEnd() {
    lastTouchAtRef.current = Date.now();
    // Android finalizes a touch text-selection slightly after 'touchend' fires,
    // so read the selection on the next tick rather than immediately.
    window.setTimeout(trySelection, 60);
  }

  function pickColor(color: string, style: MarkStyle) {
    const segments = pendingSegmentsRef.current;
    if (segments.length === 0 || !creationPopover) {
      setCreationPopover(null);
      return;
    }
    const newMarks = segmentsToMarks(segments, color, style);
    onCreateMarks(newMarks);
    window.getSelection()?.removeAllRanges();
    setCreationPopover({ step: 'actions', rect: creationPopover.rect, groupId: newMarks[0].groupId });
  }

  function pickAction(actionId: MarkTool) {
    if (!creationPopover || creationPopover.step !== 'actions') return;
    setCreationPopover({ step: actionId, rect: creationPopover.rect, groupId: creationPopover.groupId });
  }

  function handleMarkClick(mark: Mark, rect: DOMRect) {
    setMarkPopover({ mark, rect });
  }

  function namedGroupPickerBody(tool: MarkTool, groupId: string, onPicked: () => void) {
    const meta = TOOL_META[tool];
    const sorted = [...groups[tool]].sort((a, b) => a.order - b.order);
    return (
      <div className="mt-wortfeld-existing">
        {sorted.map((item) => (
          <button
            key={item.id}
            className="mt-wortfeld-chip"
            onClick={() => {
              onAssignGroup(tool, groupId, item.id);
              onPicked();
            }}
          >
            {namedGroupLabel(item, meta.fallbackPrefix)}
          </button>
        ))}
        <button
          className="mt-wortfeld-chip new"
          onClick={() => {
            onCreateGroupAndAssign(tool, groupId);
            onPicked();
          }}
        >
          {meta.newLabel}
        </button>
      </div>
    );
  }

  const popoverRect = creationPopover?.rect ?? markPopover?.rect ?? null;
  const popoverContentKey = creationPopover?.step ?? markPopover?.step ?? (markPopover ? 'menu' : null);

  // Measure the popover after it (re-)renders and clamp it fully inside the
  // viewport — horizontally AND vertically — so it never gets cut off or
  // pushed off-screen, e.g. when marking near the bottom edge while scrolled.
  useLayoutEffect(() => {
    if (!popoverRect || !popoverRef.current) {
      setPopoverPos(null);
      return;
    }
    const margin = 8;
    const { width, height } = popoverRef.current.getBoundingClientRect();

    let left = popoverRect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    let top = popoverRect.bottom + 6;
    if (top + height > window.innerHeight - margin) {
      const above = popoverRect.top - height - 6;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }
    setPopoverPos({ top, left });
    // popoverContentKey changes whenever the popover's step (and therefore its
    // size) changes, so we re-measure and re-clamp for the new content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRect, popoverContentKey]);

  return (
    <div
      ref={rootRef}
      className={`markable-text${highlightMode === 'all' ? ' mt-dimmed' : ''}`}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={textRef} className="mt-text-body">
        {paragraphOrder.map((paragraphId) => (
          <div key={paragraphId} className="mt-paragraph">
            {(linesByParagraph.get(paragraphId) ?? []).map((line) => (
              <div key={line.id} data-line-id={line.id} className="mt-line">
                {renderLineRows(
                  line.text,
                  rowsByLine.get(line.id) ?? [],
                  marksByLine.get(line.id) ?? [],
                  highlightMode,
                  handleMarkClick,
                )}
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
          style={{
            position: 'fixed',
            top: (popoverPos ?? { top: popoverRect.bottom + 6, left: popoverRect.left }).top,
            left: (popoverPos ?? { top: popoverRect.bottom + 6, left: popoverRect.left }).left,
          }}
        >
          {creationPopover?.step === 'color' && (
            <div className="mt-color-step">
              <div className="mt-color-step-label">Markieren</div>
              <div className="mt-color-swatches">
                {MARK_COLORS.map((c) => (
                  <button
                    key={c}
                    className="mt-color-swatch"
                    style={{ backgroundColor: c }}
                    onClick={() => pickColor(c, 'highlight')}
                    title={c}
                  />
                ))}
              </div>
              <div className="mt-color-step-label">Unterstreichen</div>
              <div className="mt-color-swatches">
                {MARK_COLORS.map((c) => (
                  <button
                    key={c}
                    className="mt-color-underline-swatch"
                    onClick={() => pickColor(c, 'underline')}
                    title={c}
                  >
                    <span className="mt-color-underline-line" style={{ backgroundColor: c }} />
                  </button>
                ))}
              </div>
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

          {creationPopover &&
            creationPopover.step !== 'color' &&
            creationPopover.step !== 'actions' &&
            namedGroupPickerBody(creationPopover.step, creationPopover.groupId, () => setCreationPopover(null))}

          {markPopover && interactionMode === 'mark' && !markPopover.step && (
            <div className="mt-action-list">
              {MARK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  className="mt-action-item"
                  onClick={() => setMarkPopover((p) => (p ? { ...p, step: action.id } : p))}
                >
                  {action.label}
                </button>
              ))}
              <button
                className="mt-action-item muted"
                onClick={() => {
                  onDeleteMarkGroup(markPopover.mark.groupId);
                  setMarkPopover(null);
                }}
              >
                × Markierung entfernen
              </button>
            </div>
          )}

          {markPopover &&
            interactionMode === 'mark' &&
            markPopover.step &&
            namedGroupPickerBody(markPopover.step, markPopover.mark.groupId, () => setMarkPopover(null))}

          {markPopover &&
            interactionMode === 'assign' &&
            assignTool &&
            namedGroupPickerBody(assignTool, markPopover.mark.groupId, () => setMarkPopover(null))}
        </div>
      )}
    </div>
  );
}
