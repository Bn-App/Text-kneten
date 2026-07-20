import type { Mark } from '../../model/document';

export interface CapturedSegment {
  lineId: string;
  startOffset: number;
  endOffset: number;
}

function textOffsetOfBoundary(lineEl: Element, node: Node, nodeOffset: number): number {
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) {
      return offset + nodeOffset;
    }
    offset += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  // Boundary node not found as a text node itself (e.g. it's the line element with a child offset) — fall back.
  if (node === lineEl) {
    const walker2 = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
    let total = 0;
    let n = walker2.nextNode();
    let childIndex = 0;
    for (const child of Array.from(lineEl.childNodes)) {
      if (childIndex >= nodeOffset) break;
      total += child.textContent?.length ?? 0;
      childIndex++;
    }
    void n;
    return total;
  }
  return offset;
}

function lineTextLength(lineEl: Element): number {
  return lineEl.textContent?.length ?? 0;
}

/**
 * Reads the current window selection over a MarkableText DOM tree (elements
 * carrying data-line-id) and converts it into per-line character-offset
 * segments, clamped to each intersected line's own bounds.
 */
export function captureSelectionAsSegments(root: HTMLElement): CapturedSegment[] {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];
  const range = sel.getRangeAt(0);

  const lineEls = Array.from(root.querySelectorAll<HTMLElement>('[data-line-id]')).filter((el) =>
    range.intersectsNode(el),
  );

  const segments: CapturedSegment[] = [];
  for (const lineEl of lineEls) {
    const lineId = lineEl.dataset.lineId;
    if (!lineId) continue;

    const startOffset =
      range.startContainer === lineEl || lineEl.contains(range.startContainer)
        ? textOffsetOfBoundary(lineEl, range.startContainer, range.startOffset)
        : 0;
    const endOffset =
      range.endContainer === lineEl || lineEl.contains(range.endContainer)
        ? textOffsetOfBoundary(lineEl, range.endContainer, range.endOffset)
        : lineTextLength(lineEl);

    const clampedStart = Math.max(0, Math.min(startOffset, endOffset));
    const clampedEnd = Math.max(clampedStart, Math.max(startOffset, endOffset));
    if (clampedEnd > clampedStart) {
      segments.push({ lineId, startOffset: clampedStart, endOffset: clampedEnd });
    }
  }

  return segments;
}

export function segmentsToMarks(segments: CapturedSegment[], color: string): Mark[] {
  const groupId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  return segments.map((seg) => ({
    id: crypto.randomUUID(),
    groupId,
    lineId: seg.lineId,
    startOffset: seg.startOffset,
    endOffset: seg.endOffset,
    color,
    labels: {},
    createdAt,
  }));
}
