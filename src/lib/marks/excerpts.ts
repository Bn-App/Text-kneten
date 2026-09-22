import type { Line, Mark } from '../../model/document';
import type { MarkTool } from '../../components/MarkableText';
import { computeTextRows, formatLineRef, lineNumberAt } from '../text/lineNumbers';

export interface Excerpt {
  text: string;
  /** Where the excerpt sits in the numbered text, e.g. "Z. 3" or "Z. 3–5". */
  lineRef: string;
}

/** Quoted, reading-order snippets of text that were marked and assigned to a given named entry. */
export function excerptsForItem(itemId: string, tool: MarkTool, marks: Mark[], lines: Line[]): Excerpt[] {
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const rowsByLine = computeTextRows(lines);
  const groupsById = new Map<string, Mark[]>();
  for (const mark of marks) {
    if (mark.labels[tool] !== itemId) continue;
    const arr = groupsById.get(mark.groupId) ?? [];
    arr.push(mark);
    groupsById.set(mark.groupId, arr);
  }

  const excerpts: { order: number; start: number; text: string; lineRef: string }[] = [];
  groupsById.forEach((segments) => {
    const sorted = [...segments].sort((a, b) => {
      const orderDiff = (lineById.get(a.lineId)?.order ?? 0) - (lineById.get(b.lineId)?.order ?? 0);
      return orderDiff !== 0 ? orderDiff : a.startOffset - b.startOffset;
    });
    const text = sorted
      .map((seg) => lineById.get(seg.lineId)?.text.slice(seg.startOffset, seg.endOffset) ?? '')
      .join(' ')
      .trim();
    if (!text) return;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const lineRef = formatLineRef(
      lineNumberAt(rowsByLine, first.lineId, first.startOffset),
      lineNumberAt(rowsByLine, last.lineId, Math.max(last.startOffset, last.endOffset - 1)),
    );
    excerpts.push({ order: lineById.get(first.lineId)?.order ?? 0, start: first.startOffset, text, lineRef });
  });

  return excerpts
    .sort((a, b) => a.order - b.order || a.start - b.start)
    .map(({ text, lineRef }) => ({ text, lineRef }));
}
