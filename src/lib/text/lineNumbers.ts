import { useSyncExternalStore } from 'react';
import type { Line } from '../../model/document';

/** Characters per row before the Arbeitsbereich has been measured. */
const DEFAULT_ROW_WIDTH = 70;

/**
 * Characters that fit on one visual line of the Arbeitsbereich. The text is
 * monospaced, so MarkableText measures its width and stores the result here;
 * the Arbeitsbereich, the excerpt references and the PDF export all wrap with
 * this same width, so they agree on which line number a passage sits on.
 */
let rowWidth = DEFAULT_ROW_WIDTH;
const listeners = new Set<() => void>();

export function getRowWidth(): number {
  return rowWidth;
}

export function setRowWidth(width: number) {
  if (width === rowWidth) return;
  rowWidth = width;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRowWidth(): number {
  return useSyncExternalStore(subscribe, getRowWidth);
}

export interface TextRow {
  /** [start, end) character range within the owning Line's text. */
  start: number;
  end: number;
  /** 1-based running line number; null for blank rows, which aren't counted. */
  number: number | null;
}

/** Splits a line's text into contiguous row ranges, breaking after the last space that still fits. */
function wrapRanges(text: string, width: number): [number, number][] {
  if (text.length <= width) return [[0, text.length]];
  const ranges: [number, number][] = [];
  let start = 0;
  while (text.length - start > width) {
    const windowEnd = start + width;
    const breakAt = text.lastIndexOf(' ', windowEnd);
    // Keep the space on the earlier row so rows stay contiguous (their
    // concatenation is exactly the line text, which mark offsets rely on).
    const end = breakAt > start ? breakAt + 1 : windowEnd;
    ranges.push([start, end]);
    start = end;
  }
  ranges.push([start, text.length]);
  return ranges;
}

/** Numbered rows for every line, keyed by line id, numbered continuously in reading order. */
export function computeTextRows(lines: Line[], width: number = rowWidth): Map<string, TextRow[]> {
  const rowsByLine = new Map<string, TextRow[]>();
  let next = 1;
  for (const line of [...lines].sort((a, b) => a.order - b.order)) {
    rowsByLine.set(
      line.id,
      wrapRanges(line.text, width).map(([start, end]) => ({
        start,
        end,
        number: line.text.slice(start, end).trim() ? next++ : null,
      })),
    );
  }
  return rowsByLine;
}

/** Line number of the character at `offset` within the given line. */
export function lineNumberAt(rowsByLine: Map<string, TextRow[]>, lineId: string, offset: number): number | null {
  const rows = rowsByLine.get(lineId);
  if (!rows) return null;
  const row = rows.find((r) => offset >= r.start && offset < r.end) ?? rows[rows.length - 1];
  return row?.number ?? null;
}

/** "Z. 3" or "Z. 3–5". */
export function formatLineRef(from: number | null, to: number | null): string {
  if (from === null) return '';
  return to === null || to === from ? `Z. ${from}` : `Z. ${from}–${to}`;
}
