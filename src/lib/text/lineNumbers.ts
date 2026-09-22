import type { Line } from '../../model/document';

/** Maximum characters per numbered text row. Longer lines (typically reflowed
 * prose paragraphs) are word-wrapped at this width — deterministically, so the
 * Arbeitsbereich, the excerpt references and the PDF export all agree on which
 * line number a passage sits on, independent of screen width. */
export const ROW_WIDTH = 60;

export interface TextRow {
  /** [start, end) character range within the owning Line's text. */
  start: number;
  end: number;
  /** 1-based running line number; null for blank rows, which aren't counted. */
  number: number | null;
}

/** Splits a line's text into contiguous row ranges, breaking after the last space that still fits. */
function wrapRanges(text: string): [number, number][] {
  if (text.length <= ROW_WIDTH) return [[0, text.length]];
  const ranges: [number, number][] = [];
  let start = 0;
  while (text.length - start > ROW_WIDTH) {
    const windowEnd = start + ROW_WIDTH;
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
export function computeTextRows(lines: Line[]): Map<string, TextRow[]> {
  const rowsByLine = new Map<string, TextRow[]>();
  let next = 1;
  for (const line of [...lines].sort((a, b) => a.order - b.order)) {
    rowsByLine.set(
      line.id,
      wrapRanges(line.text).map(([start, end]) => ({
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
