import type { Line, Mark } from '../../model/document';
import type { MarkTool } from '../../components/MarkableText';

/** Quoted, reading-order snippets of text that were marked and assigned to a given named entry. */
export function excerptsForItem(itemId: string, tool: MarkTool, marks: Mark[], lines: Line[]): string[] {
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const groupsById = new Map<string, Mark[]>();
  for (const mark of marks) {
    if (mark.labels[tool] !== itemId) continue;
    const arr = groupsById.get(mark.groupId) ?? [];
    arr.push(mark);
    groupsById.set(mark.groupId, arr);
  }

  const excerpts: { order: number; text: string }[] = [];
  groupsById.forEach((segments) => {
    const sorted = [...segments].sort((a, b) => {
      const orderDiff = (lineById.get(a.lineId)?.order ?? 0) - (lineById.get(b.lineId)?.order ?? 0);
      return orderDiff !== 0 ? orderDiff : a.startOffset - b.startOffset;
    });
    const text = sorted
      .map((seg) => lineById.get(seg.lineId)?.text.slice(seg.startOffset, seg.endOffset) ?? '')
      .join(' ')
      .trim();
    if (text) excerpts.push({ order: lineById.get(sorted[0].lineId)?.order ?? 0, text });
  });

  return excerpts.sort((a, b) => a.order - b.order).map((e) => e.text);
}
